export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getPortableRoot } from "../../../lib/portablePaths.js";
import {
  readWorkspaceConfig,
  ensureHermesWorkspace
} from "../../../lib/workspaceManager.js";
import { saveRun } from "../../../lib/runStore.js";
import { syncMemoryToWorkspace } from "../../../lib/memorySync.js";
import { runDirect } from "../../../lib/directModelClient.js";
import { searchWorkspaceIndex } from "../../../lib/workspaceIndex.js";
import { compressCommandOutput } from "../../../lib/commandOutputCompressor.js";
import { assessTokenBudget } from "../../../lib/tokenBudgetGuard.js";
import { checkPermission, buildModePrefix } from "../../../lib/permissionGuard.js";
import { ensureSession, appendRunToSession, buildSessionPrompt } from "../../../lib/sessionStore.js";

function toWslPath(winPath) {
  const normalized = String(winPath || "").replaceAll("\\", "/");
  const match = normalized.match(/^([A-Za-z]):\/(.*)$/);

  if (!match) return normalized;

  const drive = match[1].toLowerCase();
  const rest = match[2];

  return `/mnt/${drive}/${rest}`;
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function isAuthCliProvider(provider = "") {
  return ["claude-code", "codex-cli", "gemini-cli", "opencode", "codex", "claude_code", "openclaude"].includes(
    String(provider || "").trim()
  );
}

function getAuthCliProviderLabel(provider = "") {
  const id = String(provider || "").trim();

  if (id === "claude-code" || id === "claude_code") return "Claude Code";
  if (id === "codex-cli" || id === "codex") return "Codex CLI";
  if (id === "gemini-cli") return "Gemini CLI";
  if (id === "opencode" || id === "openclaude") return "OpenCode/OpenClaude";
  return id || "Auth CLI Agent";
}

function buildAuthCliCommand({ provider = "", model = "", prompt = "", workspaceRoot = "", mode = "suggest" }) {
  const providerId = String(provider || "").trim();
  const selectedModel = String(model || "").trim();
  const safePrompt = String(prompt || "").trim();

  if (providerId === "claude-code" || providerId === "claude_code") {
    const args = ["-p", safePrompt];

    if (selectedModel) {
      args.push("--model", selectedModel);
    }

    if (mode === "suggest") {
      args.push("--permission-mode", "plan");
    } else {
      args.push("--permission-mode", "default");
    }

    return {
      command: "claude",
      args,
      homeDirName: "claude-home",
      scrubKeys: ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_API_KEY", "OPENROUTER_API_KEY"],
      extraEnv: {}
    };
  }

  if (providerId === "codex-cli" || providerId === "codex") {
    const args = ["exec"];

    // Codex???좊ː ?붾젆?좊━ 泥댄겕瑜?諛섎뱶???고쉶?댁빞 ??쒕낫??workspace?먯꽌???ㅽ뻾?쒕떎.
    args.push("--skip-git-repo-check");

    if (workspaceRoot) {
      args.push("-C", workspaceRoot);
    }

    args.push("--sandbox", "read-only");

    // codex-default??紐⑤뜽紐낆쓣 鍮꾩썙??怨꾩젙 ?먮룞 紐⑤뜽濡??ㅽ뻾?쒕떎.
    if (model && model !== "codex-default") {
      args.push("-m", model);
    }

    args.push(prompt);

    return {
      command: "codex",
      args,
      homeDirName: "codex-home",
      usePortableHome: false,
      scrubKeys: ["OPENROUTER_API_KEY"]
    };
  }

  if (providerId === "gemini-cli") {
    const args = ["-p", safePrompt, "--skip-trust", "--output-format", "text"];

    if (selectedModel) {
      args.push("-m", selectedModel);
    }

    if (mode === "suggest") {
      args.push("--approval-mode", "plan");
    } else {
      args.push("--approval-mode", "default");
    }

    return {
      command: "gemini",
      args,
      homeDirName: "gemini-home",
      scrubKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
      extraEnv: {}
    };
  }

  return null;
}

function psArg(value = "") {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function buildPowerShellCliInvocation(command = "", args = []) {
  return "& " + psArg(command) + " " + args.map((arg) => psArg(arg)).join(" ");
}


function buildAuthCliPrompt({ prompt = "", responseMode = "", responseStyle = "", executionProfile = "" }) {
  const raw = String(prompt || "").trim();
  const styleText = [responseMode, responseStyle, executionProfile]
    .map((v) => String(v || "").toLowerCase())
    .join(" ");

  const isQuick =
    styleText.includes("quick") ||
    styleText.includes("short") ||
    styleText.includes("light") ||
    styleText.includes("brief") ||
    styleText.includes("짧") ||
    styleText.includes("간략") ||
    styleText.includes("요약");

  if (!isQuick) return raw;

  return [
    "[Mamabot response rule - highest priority]",
    "Reply in Korean unless the user asks for another language.",
    "Do not introduce yourself.",
    "Do not mention which CLI, model, provider, or agent you are.",
    "Do not add a greeting unless the user explicitly asks for one.",
    "Answer only the user's request.",
    "Keep the answer very short: 1 sentence for simple chat, 3 bullets maximum for explanations.",
    "User request:",
    raw
  ].join("\n");
}

function runAuthCliOneshot({ runId, provider, model, prompt, workspaceRoot, mode }) {
  return new Promise((resolve) => {
    const root = process.cwd();
    const spec = buildAuthCliCommand({ provider, model, prompt, workspaceRoot, mode });

    if (!spec) {
      resolve({
        ok: false,
        stdout: "",
        stderr: "Unsupported auth-cli provider: " + provider,
        exitCode: 1,
        command: "auth-cli"
      });
      return;
    }

    const runtimeHome = path.join(root, "runtime", spec.homeDirName);
    fs.mkdirSync(runtimeHome, { recursive: true });

    const env = { ...process.env };

    // ?몄쬆??CLI???ъ슜?먭? ?대? 濡쒓렇?명븳 怨듭떇 CLI credential store瑜?洹몃?濡??ъ슜?쒕떎.
    // HOME/USERPROFILE??runtime ?대뜑濡?諛붽씀硫?Claude/Gemini/Codex 濡쒓렇?몄씠 ?由щ뒗 臾몄젣媛 ?앷릿??
    if (spec.usePortableHome === true) {
      env.HOME = runtimeHome;
      env.USERPROFILE = runtimeHome;
    }

    for (const key of spec.scrubKeys || []) {
      delete env[key];
    }

    for (const [key, value] of Object.entries(spec.extraEnv || {})) {
      env[key] = path.isAbsolute(value) ? value : path.join(root, value);
    }

    // [PORTABLE CLI] runtime/cli/node_modules/.bin??PATH 留??욎뿉 媛뺤젣 二쇱엯
    const portableBinDir = path.join(root, "runtime", "cli", "node_modules", ".bin");
    if (fs.existsSync(portableBinDir)) {
      const sep = process.platform === "win32" ? ";" : ":";
      env.PATH = portableBinDir + sep + (env.PATH || env.Path || "");
      if (process.platform === "win32") env.Path = env.PATH;
    }

    // [PORTABLE CLI] ?덈?寃쎈줈濡?CLI瑜?吏곸젒 ?〓뒗??(?꾩뿭 PATH ?ㅼ뿼 臾댁떆)
    let resolvedCommand = spec.command;
    if (process.platform === "win32") {
      const cmdCandidate = path.join(portableBinDir, spec.command + ".cmd");
      if (fs.existsSync(cmdCandidate)) resolvedCommand = cmdCandidate;
    } else {
      const binCandidate = path.join(portableBinDir, spec.command);
      if (fs.existsSync(binCandidate)) resolvedCommand = binCandidate;
    }

    logLine(runId, `START auth-cli provider=${provider} model=${model || "-"} command=${resolvedCommand}`);
    logLine(runId, `auth-cli cwd=${workspaceRoot || root}`);

    let spawnCommand = resolvedCommand;
    let spawnArgs = spec.args;
    let spawnUseShell = false;

    if (process.platform === "win32") {
      // Node v18+ .cmd 蹂댁븞 ?⑥튂 ?뚰뵾: shell:true濡??몄텧?섎릺 ?몄옄瑜??덉쟾?섍쾶 quoting.
      const SAFE_ARG = /^[A-Za-z0-9_.\/:=\\-]+$/;
      const quoteArg = (a) => {
        const s = String(a == null ? "" : a);
        if (s === "") return '""';
        const escaped = s.replace(/"/g, '\\"');
        return SAFE_ARG.test(s) ? s : `"${escaped}"`;
      };
      const quotedCmd = SAFE_ARG.test(resolvedCommand) ? resolvedCommand : `"${resolvedCommand}"`;
      spawnCommand = quotedCmd + " " + spec.args.map(quoteArg).join(" ");
      spawnArgs = [];
      spawnUseShell = true;
    }

    logLine(runId, `SPAWN ${process.platform === "win32" ? "[win32 shell]" : "[posix]"} ${spawnCommand}`);

    const child = spawn(spawnCommand, spawnArgs, {
      cwd: workspaceRoot || root,
      env,
      shell: spawnUseShell,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {}
      stderr += "\n[Mamabot] auth-cli timeout after 5 minutes.";
    }, 5 * 60 * 1000);

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stdout += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) logLine(runId, `[auth-cli stdout] ${line}`);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) logLine(runId, `[auth-cli stderr] ${line}`);
      }
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        stdout,
        stderr: stderr || error.message || String(error),
        exitCode: 1,
        command: spec.command
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      logLine(runId, `END auth-cli exitCode=${code}`);

      resolve({
        ok: code === 0,
        stdout,
        stderr,
        exitCode: code,
        command: spec.command + " " + spec.args.map((item) => String(item).includes(" ") ? "'" + String(item).slice(0, 60) + "'" : String(item)).join(" ")
      });
    });
  });
}


function cleanAuthCliOutput(stdout = "", stderr = "") {
  const outLines = String(stdout || "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    // Windows ?묒뾽 醫낅즺/?꾨줈?몄뒪 硫붿떆吏, 源⑥쭊 臾몄옄 ?쇱씤 ?쒓굅
    .filter((line) => !/PID\s+\d+/i.test(line))
    .filter((line) => !line.includes("챦쩔쩍"))
    .filter((line) => line.trim() !== "");

  if (outLines.length > 0) {
    return outLines[outLines.length - 1];
  }

  const errLines = String(stderr || "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const codexIndex = errLines.lastIndexOf("codex");
  if (codexIndex >= 0 && errLines[codexIndex + 1]) {
    return errLines[codexIndex + 1];
  }

  return errLines.slice(-1)[0] || "";
}

function cleanAgentText(value = "") {
  return String(value || "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function maskPrompt(prompt) {
  if (!prompt) return "";
  if (prompt.length <= 180) return prompt;
  return prompt.slice(0, 180) + "...";
}

function getLogPath() {
  const root = getPortableRoot();
  const logsDir = path.join(root, "runtime", "hermes", "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  return path.join(logsDir, "mamabot-agent-run.log");
}

function logLine(runId, message) {
  const logPath = getLogPath();
  const time = new Date().toISOString();
  fs.appendFileSync(logPath, `[${time}] [${runId}] ${message}
`, "utf8");
}

function buildHermesArgs({ prompt, provider, model, skills, toolsets }) {
  const args = [];

  args.push("-z");
  args.push(prompt);

  if (model && String(model).trim()) {
    args.push("--model");
    args.push(String(model).trim());
  }

  const providerOverride = String(provider || "").trim();

  if (
    providerOverride &&
    providerOverride !== "hermes" &&
    !["codex", "claude_code", "openclaude"].includes(providerOverride)
  ) {
    args.push("--provider");
    args.push(providerOverride);
  }

  if (skills && String(skills).trim()) {
    args.push("--skills");
    args.push(String(skills).trim());
  }

  if (toolsets && String(toolsets).trim()) {
    args.push("--toolsets");
    args.push(String(toolsets).trim());
  }

  return args;
}

function runHermesOneshot({
  runId,
  prompt,
  provider,
  model,
  skills,
  toolsets,
  mode,
  workspaceRoot
}) {
  return new Promise((resolve, reject) => {
    const portableRootWin = getPortableRoot();
    const portableRootWsl = toWslPath(portableRootWin);
    const workspaceWsl = toWslPath(workspaceRoot);

    const hermesHomeWsl = `${portableRootWsl}/runtime/hermes/home`;
    const hermesBinWsl = `${hermesHomeWsl}/hermes-agent/venv/bin/hermes`;

    const finalPrompt =
      mode === "suggest"
        ? `[Important]
Suggest mode is read-only.
Analyze and give suggestions only.
Do not modify files, delete files, install packages, or run commands.
Respond in the same language as the user.

${prompt}`
        : prompt;

    const promptB64 = Buffer.from(finalPrompt, "utf8").toString("base64");

    const args = buildHermesArgs({
      prompt: "__PROMPT_PLACEHOLDER__",
      provider,
      model,
      skills,
      toolsets
    });

    const renderedArgs = args
      .map((arg) => {
        if (arg === "__PROMPT_PLACEHOLDER__") {
          return '"$PROMPT"';
        }

        return shellQuote(arg);
      })
      .join(" ");

    const script = `
set -euo pipefail

export HERMES_HOME=${shellQuote(hermesHomeWsl)}
export HOME="$HERMES_HOME"
export PATH="$HERMES_HOME/hermes-agent/venv/bin:$PATH"

PORTABLE_ROOT=${shellQuote(portableRootWsl)}
WORKSPACE=${shellQuote(workspaceWsl)}
HERMES_BIN=${shellQuote(hermesBinWsl)}

echo "[mamabot] portable root: $PORTABLE_ROOT"
echo "[mamabot] workspace: $WORKSPACE"
echo "[mamabot] hermes home: $HERMES_HOME"
echo "[mamabot] hermes bin: $HERMES_BIN"

if [ ! -d "$PORTABLE_ROOT" ]; then
  echo "Portable root not found: $PORTABLE_ROOT" >&2
  exit 30
fi

if [ ! -x "$HERMES_BIN" ]; then
  echo "Hermes binary not found: $HERMES_BIN" >&2
  exit 127
fi

if [ ! -d "$WORKSPACE" ]; then
  echo "Workspace not found: $WORKSPACE" >&2
  exit 40
fi

mkdir -p "$WORKSPACE/.hermes-workspace"
cd "$WORKSPACE"

echo "[mamabot] cwd: $(pwd)"
echo "[mamabot] preparing prompt..."
PROMPT="$(printf '%s' ${shellQuote(promptB64)} | base64 -d)"

echo "[mamabot] running hermes oneshot..."
"$HERMES_BIN" ${renderedArgs}
`;

    logLine(runId, "START Hermes real execution");
    logLine(runId, `provider=${provider || "-"} model=${model || "-"} mode=${mode || "-"}`);
    logLine(runId, `skills=${skills || "-"} toolsets=${toolsets || "-"}`);
    logLine(runId, `workspaceWin=${workspaceRoot}`);
    logLine(runId, `workspaceWsl=${workspaceWsl}`);
    logLine(runId, `promptPreview=${maskPrompt(prompt)}`);

    const child = spawn(
      "wsl.exe",
      ["-d", "Ubuntu-22.04", "-e", "bash", "-lc", script],
      {
        windowsHide: true
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;

      for (const line of text.split(/\\r?\\n/)) {
        if (line.trim()) logLine(runId, `[stdout] ${line}`);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;

      for (const line of text.split(/\\r?\\n/)) {
        if (line.trim()) logLine(runId, `[stderr] ${line}`);
      }
    });

    const timer = setTimeout(() => {
      logLine(runId, "TIMEOUT after 5 minutes. Killing process.");
      child.kill("SIGTERM");
    }, 1000 * 60 * 5);

    child.on("error", (error) => {
      clearTimeout(timer);
      logLine(runId, `SPAWN ERROR ${error.message || String(error)}`);
      reject({
        message: error.message || String(error),
        stdout,
        stderr,
        code: null,
        portableRootWin,
        portableRootWsl,
        workspaceWsl,
        hermesHomeWsl,
        hermesBinWsl
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      logLine(runId, `END exitCode=${code}`);

      const result = {
        stdout,
        stderr,
        code,
        portableRootWin,
        portableRootWsl,
        workspaceWsl,
        hermesHomeWsl,
        hermesBinWsl,
        logPath: getLogPath()
      };

      if (code === 0) {
        resolve(result);
      } else {
        reject({
          ...result,
          message: `Hermes command failed with exit code ${code}`
        });
      }
    });
  });
}

function buildWorkspaceCandidateBlock(candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) return "";

  const lines = [
    "[WORKSPACE INDEX CANDIDATES]",
    "Use these candidate files as starting points. Do not scan the whole project unless necessary.",
    ...candidates.slice(0, 8).map((item, index) => {
      return [
        index + 1 + ". " + item.path,
        "   kind=" + (item.kind || "-"),
        "score=" + (item.score || 0),
        "size=" + (item.size || 0)
      ].join(" ");
    }),
    ""
  ];

  return lines.join("\n");
}

function attachWorkspaceCandidatesToPrompt(prompt, candidates = []) {
  const block = buildWorkspaceCandidateBlock(candidates);
  if (!block) return prompt;

  return [block, "[CURRENT USER REQUEST]", prompt].join("\n");
}

function normalizeExecutionProfile(value) {
  const profile = String(value || "").trim().toLowerCase();
  return ["quick", "agent", "coding", "review", "automation"].includes(profile)
    ? profile
    : "";
}

function resolveExecutionProfile({
  executionProfile = "",
  responseMode = "",
  prompt = "",
  skills = "",
  toolsets = "",
  mode = ""
}) {
  const explicit = normalizeExecutionProfile(executionProfile);
  const hasTools = Boolean(String(toolsets || "").trim());
  const hasSkills = Boolean(String(skills || "").trim());
  const text = String(prompt || "")
    .replace(/\[System instruction - do not repeat\][\s\S]*?User request:\s*/g, "")
    .trim();

  if (explicit) {
    return {
      executionProfile: explicit,
      contextPolicy:
        explicit === "quick"
          ? "minimal"
          : explicit === "review"
            ? "review-only"
            : explicit === "automation"
              ? "approved-task"
              : explicit === "coding"
                ? "full"
                : "balanced"
    };
  }

  if (!hasTools && !hasSkills && responseMode === "short" && text.length > 0 && text.length <= 160) {
    return { executionProfile: "quick", contextPolicy: "minimal" };
  }

  if (mode === "edit" || mode === "auto") {
    return { executionProfile: "coding", contextPolicy: "full" };
  }

  return { executionProfile: "agent", contextPolicy: "balanced" };
}

function needsRealtimeData(prompt = "") {
  const text = String(prompt || "").toLowerCase();
  return [
    "오늘",
    "현재",
    "지금",
    "최신",
    "실시간",
    "주가",
    "시세",
    "뉴스",
    "환율",
    "날씨",
    "검색",
    "조회",
    "마감",
    "장 마감"
  ].some((word) => text.includes(word));
}
function shouldUseLightweightPrompt({ prompt = "", responseMode = "", skills = "", toolsets = "", executionProfile = "" }) {
  const text = String(prompt || "").trim();
  const plainText = text
    .replace(/\[System instruction - do not repeat\][\s\S]*?User request:\s*/g, "")
    .trim();

  if (String(toolsets || "").trim()) return false;
  if (String(skills || "").trim()) return false;
  if (executionProfile === "quick") return true;

  const shortMode = responseMode === "short" || responseMode === "light";
  const shortPrompt = plainText.length > 0 && plainText.length <= 120;

  const simpleKorean = /^(hi|hello|hey|thanks?|thank you|ok|okay)$/i.test(plainText);

  return shortMode && (shortPrompt || simpleKorean);
}

function getLogicalHermesError(output = "", stderr = "") {
  const text = [output, stderr].filter(Boolean).join("\n");

  const failurePatterns = [
    /API call failed/i,
    /HTTP\s+402/i,
    /Prompt tokens limit exceeded/i,
    /tokens limit exceeded/i,
    /credit/i,
    /rate limit/i,
    /context window/i,
    /minimum\s+64,?000/i,
    /model .* below the minimum/i
  ];

  for (const pattern of failurePatterns) {
    if (pattern.test(text)) {
      const line = text
        .split(/\r?\n/)
        .map((item) => item.trim())
        .find((item) => pattern.test(item));

      return line || "Hermes output contains a provider/API failure.";
    }
  }

  return "";
}

export async function POST(request) {
  const runId = `run-${Date.now()}`;
  const startedAt = Date.now();
  const createdAt = new Date().toISOString();

  let body = {};
  let prompt = "";
  let displayPrompt = "";
  let provider = "hermes";
  let mode = "suggest";
  let dryRun = true;
  let model = "";
  let skills = "";
  let toolsets = "";
  let responseMode = "normal";
  let executionProfile = "agent";
  let contextPolicy = "balanced";
  let sessionContextUsed = true;
  let workspaceCandidates = [];
  let tokenBudget = null;
  let allowHighTokenRisk = false;
  let workspaceRoot = "";
  
  let memorySync = { used: false, reason: "not-run" };
let workspaceWsl = "";
  let sessionId = "";
  let activeSession = null;
  let runPrompt = "";

  try {
    body = await request.json();

    prompt = body.prompt || "";
    displayPrompt = body.displayPrompt || prompt;
    provider = body.provider || "hermes";
    mode = body.mode || "suggest";
    dryRun = body.dryRun !== false;
    model = body.model || "";
    skills = body.skills || "";
    toolsets = body.toolsets || "";
    responseMode = body.responseMode || body.responseStyle || "normal";
    executionProfile = body.executionProfile || "";
    allowHighTokenRisk = body.allowHighTokenRisk === true;
    sessionId = body.sessionId || "";

    // AUTH_CLI_WORKSPACE_EARLY_BIND
    // auth-cli runner??workspaceRoot 怨꾩궛 ?꾩뿉 ?ㅽ뻾?????덉쑝誘濡?body?먯꽌 癒쇱? 臾띕뒗??
    if (!workspaceRoot) {
      const earlyWorkspaceRoot =
        body.workspaceRoot ||
        body.workspace ||
        body.cwd ||
        body.projectRoot ||
        body.workspacePath ||
        "";

      if (earlyWorkspaceRoot) {
        workspaceRoot = String(earlyWorkspaceRoot);
      }
    }

    const earlyResolvedProfile = resolveExecutionProfile({
      executionProfile,
      responseMode,
      prompt,
      skills,
      toolsets,
      mode
    });

    executionProfile = earlyResolvedProfile.executionProfile;
    contextPolicy = earlyResolvedProfile.contextPolicy;
    // AUTH_CLI_RUNNER_V1
    // Claude Code / Codex CLI / Gemini CLI??OpenRouter媛 ?꾨땲??媛?怨듭떇 CLI濡??ㅽ뻾?쒕떎.
    if (isAuthCliProvider(provider) && executionProfile !== "quick") {
      if (!prompt.trim()) {
        return NextResponse.json(
          { ok: false, error: "prompt is required", runId },
          { status: 400 }
        );
      }

      if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
        return NextResponse.json(
          { ok: false, error: "workspace is not selected", runId },
          { status: 400 }
        );
      }

      const authCliPrompt = buildAuthCliPrompt({
        prompt,
        responseMode,
        responseStyle: body.responseStyle || "",
        executionProfile
      });

      const execution = await runAuthCliOneshot({
        runId,
        provider,
        model,
        prompt: authCliPrompt,
        workspaceRoot,
        mode
      });


      const stderrText = cleanAgentText(execution.stderr || "");
      const output = cleanAuthCliOutput(execution.stdout || "", execution.stderr || "") || stderrText || "Auth CLI ?ㅽ뻾 寃곌낵媛 鍮꾩뼱 ?덉뒿?덈떎.";
      const stdoutText = output;
      const executionOk = Boolean(execution.ok && output.trim());
      const durationMs = Date.now() - startedAt;
      const status = executionOk ? "success" : "failed";

      let compressedOutput = "";
      let outputCompression = null;

      try {
        const compressed = compressCommandOutput({
          command: execution.command || "auth-cli",
          stdout: output || "",
          stderr: stderrText || ""
        });

        compressedOutput = compressed.compressed || compressed.output || "";
        outputCompression = {
          kind: compressed.kind || "unknown",
          ...(compressed.meta || {})
        };
      } catch (compressionError) {
        outputCompression = {
          kind: "failed",
          error: compressionError?.message || String(compressionError)
        };
        logLine(runId, "auth-cli outputCompression failed=" + outputCompression.error);
      }

      try {
        const saved = saveRun({
          runId,
          createdAt,
          status,
          ok: executionOk,
          dryRun: false,
          sessionId,
          provider,
          model,
          mode,
          skills,
          toolsets,
          responseMode,
          executionProfile: executionProfile || "quick",
          contextPolicy: contextPolicy || "minimal",
          sessionContextUsed: false,
          memorySyncUsed: false,
          engine: "auth-cli",
          workspaceRoot,
          workspaceWsl,
          prompt: displayPrompt || prompt,
          output,
          stderr: stderrText || "",
          compressedOutput,
          outputCompression,
          error: executionOk ? "" : (stderrText || "Auth CLI ?ㅽ뻾???ㅽ뙣?덉뒿?덈떎."),
          exitCode: execution.exitCode,
          durationMs,
          usage: null,
          tokenBudget: null,
          memorySync: null,
          workspaceCandidates: [],
          command: execution.command || "auth-cli",
          logPath: getLogPath()
        });

        logLine(runId, "SAVE auth-cli run=" + saved.runId + " status=" + saved.status);
      } catch (saveError) {
        logLine(runId, "SAVE ERROR auth-cli " + (saveError?.message || String(saveError)));
      }

      return NextResponse.json({
        ok: Boolean(executionOk),
        runId,
        provider,
        model,
        mode,
        status,
        engine: "auth-cli",
        command: execution.command,
        output,
        error: executionOk ? "" : (stderrText || "Auth CLI ?ㅽ뻾???ㅽ뙣?덉뒿?덈떎."),
        exitCode: execution.exitCode,
        durationMs,
        message: executionOk ? "Auth CLI execution finished." : "Auth CLI execution failed."
      }, { status: executionOk ? 200 : 500 });
    }

    if (!prompt.trim()) {
      return NextResponse.json(
        { ok: false, error: "prompt is required", runId },
        { status: 400 }
      );
    }

    const workspaceConfig = readWorkspaceConfig();
    workspaceRoot = workspaceConfig.currentWorkspace || "";

    if (!workspaceRoot) {
      return NextResponse.json(
        { ok: false, error: "workspace is not selected", runId },
        { status: 400 }
      );
    }

    if (!fs.existsSync(workspaceRoot)) {
      return NextResponse.json(
        {
          ok: false,
          error: "workspace path does not exist: " + workspaceRoot,
          runId
        },
        { status: 400 }
      );
    }

    const hermesWorkspaceRoot = ensureHermesWorkspace(workspaceRoot);
    

    // permissionGuard: 紐⑤뱶蹂??ㅽ뻾 ?덉슜 寃??
    // Quick 紐⑤뱶???뚯씪 ?섏젙/紐낅졊 ?ㅽ뻾???꾨땲??Direct API ?몄텧?대?濡?    // suggest 沅뚰븳?먯꽌??read ?깃꺽?쇰줈 ?덉슜?쒕떎.
    const permissionProfile = resolveExecutionProfile({
      executionProfile,
      responseMode,
      prompt,
      skills,
      toolsets,
      mode
    });

    const permCheck = checkPermission({
      mode,
      action: permissionProfile.executionProfile === "quick" ? "read" : (dryRun ? "read" : "execute"),
      target: prompt.slice(0, 200),
    });
    if (!permCheck.allowed) {
      logLine(runId, "BLOCKED by permissionGuard: " + permCheck.reason);
      return NextResponse.json(
        { ok: false, error: permCheck.reason, blocked: true, runId },
        { status: 403 }
      );
    }
    const resolvedProfile = resolveExecutionProfile({
      executionProfile,
      responseMode,
      prompt,
      skills,
      toolsets,
      mode
    });

    executionProfile = resolvedProfile.executionProfile;
    contextPolicy = resolvedProfile.contextPolicy;

    if (executionProfile !== "quick") {
      try {
        const candidateResult = searchWorkspaceIndex(workspaceRoot, {
          query: displayPrompt || prompt,
          limit: executionProfile === "coding" ? 8 : 5
        });

        workspaceCandidates = candidateResult.items || [];

        if (workspaceCandidates.length > 0) {
          logLine(runId, "workspaceCandidates count=" + workspaceCandidates.length);

          for (const item of workspaceCandidates.slice(0, 8)) {
            logLine(
              runId,
              "workspaceCandidate path=" +
                (item.path || "-") +
                " kind=" +
                (item.kind || "-") +
                " score=" +
                (item.score || 0)
            );
          }
        } else {
          logLine(runId, "workspaceCandidates count=0");
        }
      } catch (error) {
        workspaceCandidates = [];
        logLine(runId, "workspaceCandidates failed=" + (error?.message || String(error)));
      }
    }

    if (executionProfile === "quick") {
      memorySync = { used: false, reason: "skipped-quick-profile" };
      logLine(runId, "memorySync skipped=quick-profile");
    } else {
      try {
        memorySync = await syncMemoryToWorkspace(workspaceRoot);
        logLine(runId, "memorySync used=" + memorySync.used + " synced=" + (memorySync.synced || 0) + " skipped=" + (memorySync.skipped || 0) + " chars=" + (memorySync.chars || 0));
      } catch (error) {
        memorySync = { used: false, reason: error?.message || String(error) };
        logLine(runId, "memorySync failed=" + memorySync.reason);
      }
    }
const portableRootWin = getPortableRoot();
    const portableRootWsl = toWslPath(portableRootWin);
    workspaceWsl = toWslPath(workspaceRoot);

    activeSession = ensureSession({
      sessionId,
      workspaceRoot,
      prompt: displayPrompt || prompt,
      title: body.sessionTitle || ""
    });
    sessionId = activeSession.sessionId;
    const useLightweightPrompt = shouldUseLightweightPrompt({
      prompt,
      responseMode,
      skills,
      toolsets,
      executionProfile
    });

    sessionContextUsed = !useLightweightPrompt;

    const indexedPrompt =
      executionProfile === "quick"
        ? prompt
        : attachWorkspaceCandidatesToPrompt(prompt, workspaceCandidates);

    runPrompt = sessionContextUsed ? buildSessionPrompt(indexedPrompt, activeSession) : indexedPrompt;

    tokenBudget = assessTokenBudget({
      prompt: runPrompt || prompt,
      userPrompt: displayPrompt || prompt,
      model,
      executionProfile,
      responseMode,
      skills,
      toolsets,
      workspaceCandidates
    });

    logLine(
      runId,
      "tokenBudget severity=" +
        tokenBudget.severity +
        " estimatedInputTokens=" +
        tokenBudget.estimatedInputTokens +
        " limit=" +
        tokenBudget.practicalLimit +
        " ratio=" +
        tokenBudget.ratio
    );

    if (
      ["warn", "danger"].includes(tokenBudget?.severity) &&
      executionProfile !== "quick" &&
      dryRun !== true &&
      allowHighTokenRisk !== true
    ) {
      const blockedMessage = [
        "[?좏겙 ?덉궛 李⑤떒]",
        "",
        "?곹깭: " + (tokenBudget.severity === "danger" ? "?꾪뿕" : "二쇱쓽") + " (" + tokenBudget.severity + ")",
        "?덉긽 ?낅젰 ?좏겙: " + tokenBudget.estimatedInputTokens,
        "?ㅼ슜 ?쒗븳: " + tokenBudget.practicalLimit,
        "?ъ슜瑜? " + Math.round(Number(tokenBudget.ratio || 0) * 100) + "%",
        "",
        "沅뚯옣:",
        "- ?⑥닚 吏덈Ц?대㈃ Quick 紐⑤뱶瑜??ъ슜?섏꽭??",
        "- Agent/Coding ?묒뾽?대㈃ ?몄뀡 臾몃㎘?대굹 ?꾨낫 ?뚯씪 ?섎? 以꾩씠?몄슂.",
        "- 洹몃옒??吏꾪뻾?섎젮硫??꾨옒 踰꾪듉?쇰줈 ?뺤씤 ??媛뺤젣 ?ㅽ뻾?섏꽭??"
      ].join("\n");

      logLine(runId, "tokenBudget " + tokenBudget.severity + " blocked estimatedInputTokens=" + tokenBudget.estimatedInputTokens);

      saveAndAttach({
        runId,
        createdAt,
        status: "blocked",
        ok: false,
        dryRun: false,
        provider,
        model,
        mode,
        skills,
        toolsets,
        responseMode,
        executionProfile,
        contextPolicy,
        sessionContextUsed,
        memorySyncUsed: memorySync.used === true,
        engine: executionProfile === "quick" ? "direct" : "hermes",
        workspaceCandidates,
        tokenBudget,
        workspaceRoot,
        workspaceWsl,
        prompt: displayPrompt || prompt,
        output: blockedMessage,
        stderr: "",
        error: "Token budget " + tokenBudget.severity + " blocked",
        exitCode: null,
        durationMs: Date.now() - startedAt,
        logPath: getLogPath()
      });

      return NextResponse.json({
        ok: true,
        runId,
        sessionId,
        status: "blocked",
        message: blockedMessage,
        output: blockedMessage,
        tokenBudget,
        executionProfile,
        contextPolicy,
        workspaceCandidateCount: workspaceCandidates.length,
        workspaceCandidates
      });
    }

    if (useLightweightPrompt) {
      logLine(runId, "lightweightPrompt=true sessionContext=skipped");
    }

    const plan = {
      ok: true,
      runId,
      sessionId,
      dryRun,
      status: dryRun ? "dryrun" : "running",
      message: dryRun
        ? "Hermes dry-run plan saved. No model call executed."
        : "Agent execution accepted.",
      mainRuntime: "hermes",
      provider,
      mode,
      model,
      skills,
      toolsets,
      responseMode,
      executionProfile,
      contextPolicy,
      sessionContextUsed,
      memorySyncUsed: memorySync.used === true,
      workspaceCandidateCount: workspaceCandidates.length,
      workspaceCandidates,
      tokenBudget,
      portableRootWin,
      portableRootWsl,
      workspaceRoot,
      workspaceWsl,
      hermesWorkspaceRoot,
      cwd: workspaceRoot,
      promptPreview: maskPrompt(displayPrompt || prompt),
      logPath: getLogPath()
    };

    function saveAndAttach(record) {
      const contextMeta = {
        responseMode,
        executionProfile,
        contextPolicy,
        sessionContextUsed,
        memorySyncUsed: memorySync.used === true,
        engine: record.engine || (executionProfile === "quick" ? "direct" : "hermes")
      };

      let compressedOutput = record.compressedOutput || "";
      let outputCompression = record.outputCompression || null;

      const outputText = record.output || "";
      const stderrText = record.stderr || "";

      if (!compressedOutput && (outputText || stderrText)) {
        try {
          const compressed = compressCommandOutput({
            command: record.command || record.engine || record.provider || "agent-run",
            stdout: outputText,
            stderr: stderrText
          });

          compressedOutput = compressed.compressed || compressed.output || "";
          outputCompression = {
            kind: compressed.kind || "unknown",
            ...(compressed.meta || {})
          };

          logLine(
            runId,
            "outputCompression auto kind=" +
              outputCompression.kind +
              " savedChars=" +
              (outputCompression.savedChars ?? 0) +
              " ratio=" +
              (outputCompression.ratio ?? 1)
          );
        } catch (compressionError) {
          outputCompression = {
            kind: "failed",
            error: compressionError?.message || String(compressionError)
          };

          logLine(runId, "outputCompression failed=" + outputCompression.error);
        }
      }

      const enrichedRecord = {
        ...record,
        compressedOutput,
        outputCompression
      };

      const saved = saveRun({
        ...enrichedRecord,
        ...contextMeta,
        sessionId
      });

      appendRunToSession(sessionId, {
        runId: saved.runId,
        prompt: displayPrompt || prompt,
        output: enrichedRecord.output || "",
        stderr: enrichedRecord.stderr || "",
        error: enrichedRecord.error || "",
        compressedOutput: enrichedRecord.compressedOutput || "",
        outputCompression: enrichedRecord.outputCompression || null,
        status: saved.status,
        provider,
        model,
        mode,
        skills,
        workspaceRoot,
        responseMode,
        executionProfile,
        contextPolicy,
        sessionContextUsed,
        memorySyncUsed: memorySync.used === true
      });

      return saved;
    }

    if (dryRun) {
      logLine(runId, "DRY RUN complete");

      saveAndAttach({
        runId,
        createdAt,
        status: "dryrun",
        ok: true,
        dryRun: true,
        provider,
        model,
        mode,
        skills,
        toolsets,
        tokenBudget,
        memorySync,
        workspaceCandidates,
        workspaceRoot,
        workspaceWsl,
        prompt: displayPrompt || prompt,
        output: "",
        stderr: "",
        exitCode: null,
        durationMs: Date.now() - startedAt,
        logPath: getLogPath()
      });

      return NextResponse.json({
        ...plan,
        nextCommand:
          mode === "suggest"
            ? "hermes -z '[read-only prompt]'"
            : "hermes -z '<prompt>'"
      });
    }

    if (executionProfile === "quick") {
      const quickEngine = "direct";

      saveRun({
        runId,
        createdAt,
        status: "running",
        ok: true,
        dryRun: false,
        sessionId,
        provider: provider || "openrouter",
        model,
        mode,
        skills: "",
        toolsets: "",
        responseMode,
        executionProfile,
        contextPolicy,
        sessionContextUsed: false,
        memorySyncUsed: false,
        engine: quickEngine,
        tokenBudget,
        workspaceRoot,
        workspaceWsl,
        prompt: displayPrompt || prompt,
        output: "",
        stderr: "",
        error: "",
        exitCode: null,
        durationMs: null,
        logPath: getLogPath()
      });

      logLine(runId, "QUICK DIRECT execution accepted");
      logLine(runId, "QUICK DIRECT execution accepted provider=" + (provider || "openrouter"));

      void (async () => {
        try {
          const direct = await runDirect({
            prompt,
            model: model || "nvidia/nemotron-3-super-120b-a12b:free",
            provider: provider || "openrouter",
            responseMode
          });

          saveAndAttach({
            runId,
            createdAt,
            status: "success",
            ok: true,
            dryRun: false,
            provider: direct?.providerUsed || provider || "openrouter",
            model: direct.model || model,
            mode,
            skills: "",
            toolsets: "",
            responseMode,
            executionProfile,
            contextPolicy,
            sessionContextUsed: false,
            memorySyncUsed: false,
            engine: quickEngine,
            workspaceRoot,
            workspaceWsl,
            prompt: displayPrompt || prompt,
            output: direct.output || "",
            stderr: "",
            error: "",
            exitCode: 0,
            durationMs: direct.durationMs,
            usage: direct.usage || null,
            logPath: getLogPath()
          });

          logLine(runId, "QUICK DIRECT finished success");
        } catch (error) {
          saveAndAttach({
            runId,
            createdAt,
            status: "failed",
            ok: false,
            dryRun: false,
            provider: provider || "openrouter",
            model,
            mode,
            skills: "",
            toolsets: "",
            responseMode,
            executionProfile,
            contextPolicy,
            sessionContextUsed: false,
            memorySyncUsed: false,
            engine: quickEngine,
            workspaceRoot,
            workspaceWsl,
            prompt: displayPrompt || prompt,
            output: "",
            stderr: "",
            error: error?.message || String(error),
            exitCode: 1,
            durationMs: Date.now() - startedAt,
            logPath: getLogPath()
          });

          logLine(runId, "QUICK DIRECT failed=" + (error?.message || String(error)));
        }
      })();

      return NextResponse.json({
        ...plan,
        sessionId,
        status: "running",
        provider: provider || "openrouter",
        engine: quickEngine,
        message: "Quick Mode direct execution started."
      });
    }

    if (["codex", "claude_code", "openclaude"].includes(provider)) {
      logLine(runId, `BLOCKED unsupported provider=${provider}`);

      saveAndAttach({
        runId,
        createdAt,
        status: "blocked",
        ok: false,
        dryRun: false,
        provider,
        model,
        mode,
        skills,
        toolsets,
        workspaceRoot,
        workspaceWsl,
        prompt: displayPrompt || prompt,
        error: "Provider not supported in current Hermes oneshot flow",
        durationMs: Date.now() - startedAt,
        logPath: getLogPath()
      });

      return NextResponse.json(
        {
          ok: false,
          runId,
          error:
            "??Provider???袁⑹춦 Hermes dry-run plan saved. No model call executed.",
          logPath: getLogPath()
        },
        { status: 400 }
      );
    }

    saveRun({
      runId,
      createdAt,
      status: "running",
      ok: true,
      dryRun: false,
      sessionId,
      provider,
      model,
      mode,
      skills,
      toolsets,
      responseMode,
      executionProfile,
      contextPolicy,
      sessionContextUsed,
      memorySyncUsed: memorySync.used === true,
      workspaceCandidates,
      tokenBudget,
      workspaceRoot,
      workspaceWsl,
      prompt: displayPrompt || prompt,
      output: "",
      stderr: "",
      error: "",
      exitCode: null,
      durationMs: null,
      logPath: getLogPath()
    });

    logLine(runId, "BACKGROUND Hermes real execution accepted");

    void (async () => {
      try {
        const execution = await runHermesOneshot({
          runId,
          prompt: runPrompt || prompt,
          provider,
          model,
          skills,
          toolsets,
          mode,
          workspaceRoot
        });

        const logicalError = getLogicalHermesError(execution.stdout, execution.stderr);
        const executionOk = execution.code === 0 && !logicalError;

        const compressedExecutionOutput = compressCommandOutput({
          command: "hermes oneshot",
          stdout: execution.stdout || "",
          stderr: execution.stderr || ""
        });

        logLine(
          runId,
          "outputCompression kind=" +
            compressedExecutionOutput.kind +
            " savedChars=" +
            compressedExecutionOutput.meta.savedChars +
            " ratio=" +
            compressedExecutionOutput.meta.ratio
        );

        saveAndAttach({
          runId,
          createdAt,
          status: executionOk ? "success" : "failed",
          ok: executionOk,
          dryRun: false,
          provider,
          model,
          mode,
          skills,
          toolsets,
          workspaceRoot,
          workspaceWsl,
          prompt,
          output: execution.stdout,
          stderr: execution.stderr,
          error: executionOk ? "" : (logicalError || "Hermes ?ㅽ뻾???ㅽ뙣?덉뒿?덈떎."),
          exitCode: execution.code,
          durationMs: Date.now() - startedAt,
          logPath: execution.logPath || getLogPath()
        });

        logLine(runId, "BACKGROUND Hermes real execution finished");
      } catch (error) {
        logLine(runId, "BACKGROUND ERROR " + (error.message || String(error)));

        try {
          saveAndAttach({
            runId,
            createdAt,
            status: "failed",
            ok: false,
            dryRun: false,
            provider,
            model,
            mode,
            skills,
            toolsets,
            workspaceRoot,
            workspaceWsl,
            prompt,
            output: error.stdout || "",
            stderr: error.stderr || "",
            error: error.message || String(error),
            exitCode: error.code ?? null,
            durationMs: Date.now() - startedAt,
            logPath: getLogPath()
          });
        } catch (saveError) {
          logLine(runId, "BACKGROUND SAVE ERROR " + (saveError.message || String(saveError)));
        }
      }
    })();

    return NextResponse.json({
      ...plan,
      ok: true,
      dryRun: false,
      background: true,
      status: "running",
      accepted: true,
      sessionId,
      message: "諛깃렇?쇱슫???ㅽ뻾???쒖옉?덉뒿?덈떎."
    });
  } catch (error) {
    logLine(runId, `ERROR ${error.message || String(error)}`);

    try {
      saveAndAttach({
        runId,
        createdAt,
        status: "failed",
        ok: false,
        dryRun,
        provider,
        model,
        mode,
        skills,
        toolsets,
        workspaceRoot,
        workspaceWsl,
        prompt: displayPrompt || prompt,
        output: error.stdout || "",
        stderr: error.stderr || "",
        error: error.message || String(error),
        exitCode: error.code ?? null,
        durationMs: Date.now() - startedAt,
        logPath: getLogPath()
      });
    } catch (saveError) {
      logLine(runId, `SAVE ERROR ${saveError.message || String(saveError)}`);
    }

    return NextResponse.json(
      {
        ok: false,
        runId,
        error: error.message || String(error),
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        code: error.code ?? null,
        logPath: getLogPath()
      },
      { status: 500 }
    );
  }
}






