import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const AGENTS = {
  "claude-code": {
    label: "Claude Code",
    exe: "claude",
    exeCmd: "claude.cmd",
    homeDir: "runtime/claude-home",
    commandArgs: ["auth", "login"],
    extraEnv: {
      CLAUDE_CONFIG_DIR: "runtime/claude-home"
    },
    scrub: [
      "ANTHROPIC_API_KEY",
      "ANTHROPIC_AUTH_TOKEN",
      "CLAUDE_API_KEY",
      "OPENROUTER_API_KEY"
    ]
  },
  "codex-cli": {
    label: "Codex CLI",
    exe: "codex",
    exeCmd: "codex.cmd",
    homeDir: "runtime/codex-home",
    commandArgs: ["login"],
    extraEnv: {},
    scrub: [
      "OPENAI_API_KEY",
      "OPENROUTER_API_KEY"
    ]
  },
  "gemini-cli": {
    label: "Gemini CLI",
    exe: "gemini",
    exeCmd: "gemini.cmd",
    homeDir: "runtime/gemini-home",
    commandArgs: [],
    extraEnv: {},
    scrub: [
      "GEMINI_API_KEY",
      "GOOGLE_API_KEY"
    ]
  }
};

function psQuote(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function buildLoginScript({ root, agentId, agent }) {
  const cliBin = path.join(root, "runtime", "cli", "node_modules", ".bin");
  const homeDir = path.join(root, agent.homeDir);
  const exePath = path.join(cliBin, agent.exeCmd);
  const commandArgs = agent.commandArgs.map(psQuote).join(" ");

  const extraEnvLines = Object.entries(agent.extraEnv || {})
    .map(([key, relativePath]) => {
      const value = path.join(root, relativePath);
      return `$env:${key} = ${psQuote(value)}`;
    })
    .join("\n");

  const scrubLines = (agent.scrub || [])
    .map((key) => `Remove-Item Env:${key} -ErrorAction SilentlyContinue`)
    .join("\n");

  return `
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

$Root = ${psQuote(root)}
$CliBin = ${psQuote(cliBin)}
$HomeDir = ${psQuote(homeDir)}
$ExePath = ${psQuote(exePath)}

New-Item -ItemType Directory -Force $HomeDir | Out-Null
$env:PATH = "$CliBin;$env:PATH"
$env:HOME = $HomeDir
$env:USERPROFILE = $HomeDir

${extraEnvLines}

# OAuth/구독형 CLI 로그인에서는 API Key 환경변수를 제거해 충돌을 막는다.
${scrubLines}

Write-Host ""
Write-Host "Mamabot CLI Auth Login" -ForegroundColor Cyan
Write-Host "Agent: ${agent.label}" -ForegroundColor Green
Write-Host "Agent ID: ${agentId}"
Write-Host "Home: $HomeDir"
Write-Host ""

if (Test-Path $ExePath) {
  Write-Host "Using local CLI: $ExePath" -ForegroundColor Green
  & $ExePath ${commandArgs}
} else {
  Write-Host "Local CLI not found. Trying PATH command: ${agent.exe}" -ForegroundColor Yellow
  & ${agent.exe} ${commandArgs}
}

Write-Host ""
Write-Host "로그인이 끝났으면 이 창을 닫아도 됩니다." -ForegroundColor Cyan
Read-Host "Enter를 누르면 창을 닫습니다"
`.trimStart();
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const agentId = String(body.agentId || "").trim();
    const agent = AGENTS[agentId];

    if (!agent) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported auth-cli agent",
          supported: Object.keys(AGENTS)
        },
        { status: 400 }
      );
    }

    const root = process.cwd();
    const scriptsDir = path.join(root, "runtime", "cli-auth");
    fs.mkdirSync(scriptsDir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const scriptPath = path.join(scriptsDir, `${agentId}-login-${stamp}.ps1`);
    const script = buildLoginScript({ root, agentId, agent });

    fs.writeFileSync(scriptPath, script, "utf8");

    const child = spawn(
      "cmd.exe",
      [
        "/c",
        "start",
        "Mamabot CLI Auth - " + agent.label,
        "powershell.exe",
        "-NoExit",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath
      ],
      {
        cwd: root,
        detached: true,
        stdio: "ignore",
        windowsHide: false
      }
    );

    child.unref();

    return NextResponse.json({
      ok: true,
      agentId,
      label: agent.label,
      scriptPath,
      message: "Login terminal opened."
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error && error.message ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
