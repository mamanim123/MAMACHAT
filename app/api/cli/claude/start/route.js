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

export async function POST() {
  try {
    const portableRootWin = getPortableRoot();
    const portableRootWsl = toWslPath(portableRootWin);

    if (!portableRootWsl) {
      return NextResponse.json(
        { ok: false, error: "failed to convert portable root to WSL path" },
        { status: 500 }
      );
    }

    const logsDir = path.join(portableRootWin, "runtime", "hermes", "logs");
    fs.mkdirSync(logsDir, { recursive: true });

    const claudeHomeWsl = joinWslPath(portableRootWsl, "runtime/claude-home");
    const claudeConfigWsl = joinWslPath(portableRootWsl, "runtime/claude-home/.claude");
    const authWorkdirWsl = joinWslPath(portableRootWsl, "runtime/claude-auth-workdir");
    const claudeBinWsl = joinWslPath(portableRootWsl, "runtime/cli/node_modules/.bin/claude");

    const launcherPath = path.join(logsDir, "claude-code-login.ps1");

    const bashCommand = [
      "set -e",
      "export HOME=" + shellQuote(claudeHomeWsl),
      "export USERPROFILE=" + shellQuote(claudeHomeWsl),
      "export CLAUDE_CONFIG_DIR=" + shellQuote(claudeConfigWsl),
      "export CLAUDE_HOME=" + shellQuote(claudeConfigWsl),
      "export CLAUDE_CODE_DISABLE_CLAUDE_MDS=1",
      "export CLAUDE_CODE_DISABLE_AUTO_MEMORY=1",
      "mkdir -p " + shellQuote(claudeConfigWsl),
      "mkdir -p " + shellQuote(authWorkdirWsl),
      "cd " + shellQuote(authWorkdirWsl),
      "echo Root: " + shellQuote(authWorkdirWsl),
      "echo Claude config: " + shellQuote(claudeConfigWsl),
      "echo Claude bin: " + shellQuote(claudeBinWsl),
      "if [ ! -x " + shellQuote(claudeBinWsl) + " ]; then echo Claude Code local binary not found.; exit 1; fi",
      shellQuote(claudeBinWsl) + " login"
    ].join("; ");

    const ps = [
      "$ErrorActionPreference = \"Continue\"",
      "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()",
      "Write-Host \"=== Claude Code CLI Agent Login ===\" -ForegroundColor Cyan",
      "Write-Host \"This uses Mamabot-local runtime/claude-home and an empty auth workdir.\" -ForegroundColor Yellow",
      "",
      "$bash = @'",
      bashCommand,
      "'@",
      "",
      "wsl -d Ubuntu -u root -e bash -lc $bash",
      "",
      "Write-Host \"\"",
      "Write-Host \"Login command finished. Press Enter to close.\" -ForegroundColor Green",
      "Read-Host"
    ].join("\r\n");

    fs.writeFileSync(launcherPath, ps, "utf8");

    const child = spawn(
      "cmd.exe",
      [
        "/c",
        "start",
        "Mamabot Claude Code Login",
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
      message: "Claude Code login terminal opened.",
      mode: "terminal",
      launcherPath,
      claudeHomeWsl,
      claudeConfigWsl,
      authWorkdirWsl,
      claudeBinWsl
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
