export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getPortableRoot } from "../../../../lib/portablePaths.js";
import { toWslPath, joinWslPath } from "../../../../lib/wslPath.js";

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function psQuote(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function normalizeProvider(provider) {
  return String(provider || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function buildCodexPs({ portableRootWin, portableRootWsl }) {
  const hermesHomeWsl = joinWslPath(portableRootWsl, "runtime/hermes/home");
  const hermesAgentWsl = joinWslPath(hermesHomeWsl, "hermes-agent");
  const hermesBinWsl = joinWslPath(hermesAgentWsl, "venv/bin/hermes");

  const bashCommand =
    "export HOME=" + shellQuote(hermesHomeWsl) + "; " +
    "export HERMES_HOME=" + shellQuote(hermesHomeWsl) + "; " +
    "cd " + shellQuote(hermesHomeWsl) + "; " +
    shellQuote(hermesBinWsl) + " model";

  return [
    "$ErrorActionPreference = \"Continue\"",
    "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()",
    "Write-Host \"=== OpenAI Codex Auth ===\" -ForegroundColor Cyan",
    "Write-Host \"Follow the terminal instructions. Close this window after login.\" -ForegroundColor Yellow",
    "$bash = @'",
    bashCommand,
    "'@",
    "wsl -d Ubuntu -u root -e bash -lc $bash",
    "Write-Host \"\"",
    "Write-Host \"Auth command finished. Press Enter to close.\" -ForegroundColor Green",
    "Read-Host"
  ].join("\r\n");
}

function buildClaudePs({ portableRootWin }) {
  const root = portableRootWin;
  const claudeExe = path.join(
    root,
    "runtime",
    "cli",
    "node_modules",
    "@anthropic-ai",
    "claude-code",
    "bin",
    "claude.exe"
  );

  const claudeHome = path.join(root, "runtime", "claude-home");
  const claudeConfig = path.join(claudeHome, ".claude");

  return [
    "$ErrorActionPreference = \"Continue\"",
    "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()",
    "Write-Host \"=== Claude Code Auth ===\" -ForegroundColor Cyan",
    "Write-Host \"Using Mamabot-local Claude home/config.\" -ForegroundColor Yellow",
    "",
    "$Root = " + psQuote(root),
    "$ClaudeExe = " + psQuote(claudeExe),
    "$ClaudeHome = " + psQuote(claudeHome),
    "$ClaudeConfig = " + psQuote(claudeConfig),
    "",
    "New-Item -ItemType Directory -Force $ClaudeHome | Out-Null",
    "New-Item -ItemType Directory -Force $ClaudeConfig | Out-Null",
    "",
    "$env:USERPROFILE = $ClaudeHome",
    "$env:HOME = $ClaudeHome",
    "$env:CLAUDE_CONFIG_DIR = $ClaudeConfig",
    "$env:CLAUDE_HOME = $ClaudeConfig",
    "",
    "Set-Location $Root",
    "",
    "Write-Host \"Root: $Root\"",
    "Write-Host \"Claude config: $ClaudeConfig\"",
    "Write-Host \"Claude exe: $ClaudeExe\"",
    "",
    "if (!(Test-Path $ClaudeExe)) {",
    "  Write-Host \"Claude Code local executable not found.\" -ForegroundColor Red",
    "  Write-Host \"Expected: $ClaudeExe\" -ForegroundColor Red",
    "  Read-Host",
    "  exit 1",
    "}",
    "",
    "& $ClaudeExe login",
    "",
    "Write-Host \"\"",
    "Write-Host \"Auth command finished. Press Enter to close.\" -ForegroundColor Green",
    "Read-Host"
  ].join("\r\n");
}

function writeLauncher({ provider, psContent, portableRootWin }) {
  const logsDir = path.join(portableRootWin, "runtime", "hermes", "logs");
  fs.mkdirSync(logsDir, { recursive: true });

  const filePath = path.join(logsDir, "auth-launch-" + provider + ".ps1");
  fs.writeFileSync(filePath, psContent, "utf8");

  return filePath;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const providerRaw = body.provider || body.id || "";
    const provider = normalizeProvider(providerRaw);

    if (!provider) {
      return NextResponse.json(
        { ok: false, error: "provider is required" },
        { status: 400 }
      );
    }

    if (!["openai-codex", "codex", "claude-code", "claude"].includes(provider)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Only Claude Code and OpenAI Codex auth are enabled.",
          provider: providerRaw
        },
        { status: 400 }
      );
    }

    const portableRootWin = getPortableRoot();
    const portableRootWsl = toWslPath(portableRootWin);

    if (!portableRootWsl) {
      return NextResponse.json(
        { ok: false, error: "failed to convert portable root to WSL path" },
        { status: 500 }
      );
    }

    let planId = provider;
    let label = "";
    let psContent = "";

    if (provider === "openai-codex" || provider === "codex") {
      planId = "openai-codex";
      label = "OpenAI Codex";
      psContent = buildCodexPs({ portableRootWin, portableRootWsl });
    } else {
      planId = "claude-code";
      label = "Claude Code";
      psContent = buildClaudePs({ portableRootWin });
    }

    const launcherPath = writeLauncher({
      provider: planId,
      psContent,
      portableRootWin
    });

    const child = spawn(
      "cmd.exe",
      [
        "/c",
        "start",
        "Mamabot Auth - " + label,
        "powershell.exe",
        "-NoExit",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        launcherPath
      ],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: false
      }
    );

    child.unref();

    return NextResponse.json({
      ok: true,
      provider: planId,
      mode: "terminal",
      launcherPath,
      message: "Authentication terminal opened.",
      dashboardUrl: "http://127.0.0.1:9119"
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
