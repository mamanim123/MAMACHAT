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
import { runOpenRouterDirect } from "../../../lib/directModelClient.js";
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

function buildAuthCliCommand({ provider = "", model = "", prompt = "", workspaceRoot = "", mode = "suggest", executionProfile = "" }) {
  const providerId = String(provider || "").trim();
  const selectedModel = String(model || "").trim();
  const safePrompt = String(prompt || "").trim();
  const profile = String(executionProfile || "").toLowerCase();
  const useProjectWorkspace = profile !== "quick";

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

    // Codex는 신뢰 디렉토리 체크를 반드시 우회해야 대시보드 workspace에서도 실행된다.
    args.push("--skip-git-repo-check");

    if (workspaceRoot && useProjectWorkspace) {
      args.push("-C", workspaceRoot);
    }

    args.push("--sandbox", "read-only");

    // codex-default는 모델명을 비워서 계정 자동 모델로 실행한다.
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
      extraEnv: {
        GEMINI_CLI_TRUST_WORKSPACE: "true"
      },
      cwdOverride:
        String(executionProfile || "").toLowerCase() === "quick"
          ? path.join(process.cwd(), "runtime", "gemini-chat-cwd")
          : ""
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


function buildAuthCliPrompt({ prompt = "", responseMode = "", responseStyle = "", executionProfile = "", provider = "" }) {
  const raw = String(prompt || "").trim();
  const style = String(responseMode || responseStyle || "").toLowerCase();
  const profile = String(executionProfile || "").toLowerCase();
  const providerIdForPrompt = String(provider || "").toLowerCase();

  const isShort =
    style.includes("quick") ||
    style.includes("short") ||
    style.includes("light") ||
    style.includes("짧") ||
    profile === "quick";

  const isNormal =
    style.includes("normal") ||
    style.includes("보통");

  const isDetail =
    style.includes("detail") ||
    style.includes("long") ||
    style.includes("자세") ||
    style.includes("detailed");

  const isCoding =
    profile.includes("coding") ||
    style.includes("coding") ||
    style.includes("코딩");

  const isReview =
    profile.includes("review") ||
    style.includes("review") ||
    style.includes("검토");

  const isAutomation =
    profile.includes("automation") ||
    style.includes("automation") ||
    style.includes("자동화");

  const isAgent =
    profile.includes("agent") ||
    style.includes("agent") ||
    style.includes("분석");

  let guide = "";

  if (isShort) {
    guide = [
      "응답 스타일: Quick / 짧게.",
      "사용자의 언어로 답하세요.",
      "가능하면 1~2문장으로 직접 답하세요.",
      "단순히 'Understood', '알겠습니다'만 말하지 말고 사용자 요청에 대한 실제 답을 주세요.",
      "불필요한 설명, 서론, 반복 문구는 생략하세요."
    ].join("\n");
  } else if (isDetail) {
    guide = [
      "응답 스타일: 자세히.",
      "사용자의 언어로 답하세요.",
      "핵심 결론을 먼저 말한 뒤, 이유와 단계별 설명을 충분히 제공하세요.",
      "필요하면 항목을 나누되, 불필요하게 장황하게 늘리지 마세요."
    ].join("\n");
  } else if (isCoding) {
    guide = [
      "응답 스타일: Coding / 코드작업.",
      "사용자의 언어로 답하세요.",
      "수정 전 원인 분석, 수정 대상 파일, 변경 방향, 검증 방법을 명확히 구분하세요.",
      "파일을 직접 수정하라는 요청이 아니라면 명령어와 패치 계획 중심으로 답하세요.",
      "위험한 명령은 피하고, 수정 전 백업을 우선 안내하세요."
    ].join("\n");
  } else if (isReview) {
    guide = [
      "응답 스타일: Review / 검토.",
      "사용자의 언어로 답하세요.",
      "장점보다 문제점, 리스크, 개선 우선순위를 중심으로 검토하세요.",
      "수정이 필요한 부분은 구체적으로 짚어주세요."
    ].join("\n");
  } else if (isAutomation) {
    guide = [
      "응답 스타일: Automation / 자동화.",
      "사용자의 언어로 답하세요.",
      "반복 작업을 자동화할 수 있는 절차, 스크립트, 체크포인트 중심으로 답하세요.",
      "실행 전 확인해야 할 위험 요소를 함께 말하세요."
    ].join("\n");
  } else if (isAgent) {
    guide = [
      "응답 스타일: Agent / 분석.",
      "사용자의 언어로 답하세요.",
      "현재 상태, 원인, 다음 작업 순서 중심으로 분석하세요.",
      "작업에 바로 쓸 수 있는 명령어나 확인 절차를 우선 제시하세요."
    ].join("\n");
  } else if (isNormal) {
    guide = [
      "응답 스타일: 보통.",
      "사용자의 언어로 자연스럽게 답하세요.",
      "핵심 답변과 필요한 설명만 적당한 길이로 제공하세요."
    ].join("\n");
  } else {
    guide = [
      "응답 스타일: 기본.",
      "사용자의 언어로 자연스럽게 답하세요.",
      "요청에 직접 답하고 불필요한 서론은 줄이세요."
    ].join("\n");
  }

  return [
    "[Mamabot response instruction - do not repeat]",
    guide,
    "",
    "사용자 요청:",
    raw
  ].join("\n");
}

function runAuthCliOneshot({ runId, provider, model, prompt, workspaceRoot, mode, executionProfile }) {
  return new Promise((resolve) => {
    const root = process.cwd();
    const spec = buildAuthCliCommand({ provider, model, prompt, workspaceRoot, mode, executionProfile });

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

    const isQuickAuthCli = String(executionProfile || "").toLowerCase() === "quick";
    const authChatCwd = path.join(root, "runtime", "auth-chat-cwd", String(provider || "auth-cli"));
    if (isQuickAuthCli) {
      fs.mkdirSync(authChatCwd, { recursive: true });

      // 일반 대화용 cwd에는 프로젝트 지시문/plan.md를 두지 않는다.
      // CLI가 F:\mamabot의 plan.md, CLAUDE.md, GEMINI.md, AGENTS.md를 자동으로 읽는 것을 막는다.
      const guardFiles = ["GEMINI.md", "CLAUDE.md", "AGENTS.md"];
      for (const guard of guardFiles) {
        const guardPath = path.join(authChatCwd, guard);
        if (!fs.existsSync(guardPath)) {
          fs.writeFileSync(
            guardPath,
            "General chat mode only. Do not inspect or mention project files, plan.md, CLAUDE.md, GEMINI.md, AGENTS.md, git commits, or workspace status unless the user explicitly asks.\n",
            "utf8"
          );
        }
      }
    }

    if (spec.cwdOverride) {
      fs.mkdirSync(spec.cwdOverride, { recursive: true });
    }

    const env = { ...process.env };

    // 인증형 CLI는 사용자가 이미 로그인한 공식 CLI credential store를 그대로 사용한다.
    // HOME/USERPROFILE을 runtime 폴더로 바꾸면 Claude/Gemini/Codex 로그인이 풀리는 문제가 생긴다.
    if (spec.usePortableHome === true) {
      env.HOME = runtimeHome;
      env.USERPROFILE = runtimeHome;
    }

    for (const key of spec.scrubKeys || []) {
      delete env[key];
    }

    for (const [key, value] of Object.entries(spec.extraEnv || {})) {
      // extraEnv는 환경변수 literal 값으로 넣는다.
      // 예: GEMINI_CLI_TRUST_WORKSPACE="true"를 경로로 바꾸면 Gemini trust 처리가 실패한다.
      env[key] = String(value);
    }

    // [PORTABLE CLI] runtime/cli/node_modules/.bin을 PATH 맨 앞에 강제 주입
    const portableBinDir = path.join(root, "runtime", "cli", "node_modules", ".bin");
    if (fs.existsSync(portableBinDir)) {
      const sep = process.platform === "win32" ? ";" : ":";
      env.PATH = portableBinDir + sep + (env.PATH || env.Path || "");
      if (process.platform === "win32") env.Path = env.PATH;
    }

    // [PORTABLE CLI] 절대경로로 CLI를 직접 잡는다 (전역 PATH 오염 무시)
    let resolvedCommand = spec.command;
    if (process.platform === "win32") {
      const cmdCandidate = path.join(portableBinDir, spec.command + ".cmd");
      if (fs.existsSync(cmdCandidate)) resolvedCommand = cmdCandidate;
    } else {
      const binCandidate = path.join(portableBinDir, spec.command);
      if (fs.existsSync(binCandidate)) resolvedCommand = binCandidate;
    }

    const spawnCwd = spec.cwdOverride || workspaceRoot || root;

    logLine(runId, `START auth-cli provider=${provider} model=${model || "-"} command=${resolvedCommand}`);
    logLine(runId, `auth-cli cwd=${spawnCwd}`);
    if (spec.cwdOverride) {
      logLine(runId, `auth-cli workspaceRoot=${workspaceRoot || "-"}`);
    }

    let spawnCommand = resolvedCommand;
    let spawnArgs = spec.args;
    let spawnUseShell = false;

    if (process.platform === "win32") {
      // Node v18+ .cmd 보안 패치 회피: shell:true로 호출하되 인자를 안전하게 quoting.
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
      cwd: spawnCwd,
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
    // Windows 작업 종료/프로세스 메시지, 깨진 문자 라인 제거
    .filter((line) => !/PID\s+\d+/i.test(line))
    .filter((line) => !line.includes("ï¿½"))
    .filter((line) => !line.includes("�"));

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
    .replace(/\[System instruction - do not repeat\][\s\S]*?사용자 요청:\s*/g, "")
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

function shouldUseLightweightPrompt({ prompt = "", responseMode = "", skills = "", toolsets = "", executionProfile = "" }) {
  const text = String(prompt || "").trim();
  const plainText = text
    .replace(/\[System instruction - do not repeat\][\s\S]*?사용자 요청:\s*/g, "")
    .trim();

  if (String(toolsets || "").trim()) return false;
  if (String(skills || "").trim()) return false;
  if (executionProfile === "quick") return true;

  const shortMode = responseMode === "short" || responseMode === "light";
  const shortPrompt = plainText.length > 0 && plainText.length <= 120;

  const simpleKorean = /^(안녕|안녕하세요|하이|hi|hello|오늘.*날씨|날씨|고마워|감사|ㅇㅋ|오케이)/i.test(plainText);

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
    // auth-cli runner는 workspaceRoot 계산 전에 실행될 수 있으므로 body에서 먼저 묶는다.
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

    // AUTH_CLI_RUNNER_V1
    // Claude Code / Codex CLI / Gemini CLI는 OpenRouter가 아니라 각 공식 CLI로 실행한다.
    if (isAuthCliProvider(provider)) {
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
        executionProfile,
        provider
      });

      const execution = await runAuthCliOneshot({
        runId,
        provider,
        model,
        prompt: authCliPrompt,
        workspaceRoot,
        mode,
        executionProfile
      });


      const stderrText = cleanAgentText(execution.stderr || "");
      const output = cleanAuthCliOutput(execution.stdout || "", execution.stderr || "") || stderrText || "Auth CLI 실행 결과가 비어 있습니다.";
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
          error: executionOk ? "" : (stderrText || "Auth CLI 실행이 실패했습니다."),
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
        error: executionOk ? "" : (stderrText || "Auth CLI 실행이 실패했습니다."),
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
    

    // permissionGuard: 모드별 실행 허용 검사
    // Quick 모드는 파일 수정/명령 실행이 아니라 Direct API 호출이므로
    // suggest 권한에서도 read 성격으로 허용한다.
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
        "[토큰 예산 차단]",
        "",
        "상태: " + (tokenBudget.severity === "danger" ? "위험" : "주의") + " (" + tokenBudget.severity + ")",
        "예상 입력 토큰: " + tokenBudget.estimatedInputTokens,
        "실용 제한: " + tokenBudget.practicalLimit,
        "사용률: " + Math.round(Number(tokenBudget.ratio || 0) * 100) + "%",
        "",
        "권장:",
        "- 단순 질문이면 Quick 모드를 사용하세요.",
        "- Agent/Coding 작업이면 세션 문맥이나 후보 파일 수를 줄이세요.",
        "- 그래도 진행하려면 아래 버튼으로 확인 후 강제 실행하세요."
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
        provider: "openrouter",
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
      logLine(runId, "engine=direct provider=openrouter skills=- toolsets=-");

      void (async () => {
        try {
          const direct = await runOpenRouterDirect({
            prompt,
            model,
            responseMode
          });

          saveAndAttach({
            runId,
            createdAt,
            status: "success",
            ok: true,
            dryRun: false,
            provider: "openrouter",
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
            provider: "openrouter",
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
        provider: "openrouter",
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
            "??Provider???꾩쭅 Hermes dry-run plan saved. No model call executed.",
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
          error: executionOk ? "" : (logicalError || "Hermes 실행이 실패했습니다."),
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
      message: "백그라운드 실행을 시작했습니다."
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
