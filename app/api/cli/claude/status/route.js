export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { getPortableRoot } from "../../../../lib/portablePaths.js";
import { toWslPath, joinWslPath } from "../../../../lib/wslPath.js";

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

export async function GET() {
  try {
    const portableRootWin = getPortableRoot();
    const portableRootWsl = toWslPath(portableRootWin);

    const claudeBinWin = path.join(portableRootWin, "runtime", "cli", "node_modules", ".bin", "claude");
    const claudePackageWin = path.join(portableRootWin, "runtime", "cli", "node_modules", "@anthropic-ai", "claude-code");
    const claudeHomeWin = path.join(portableRootWin, "runtime", "claude-home");
    const claudeConfigWin = path.join(claudeHomeWin, ".claude");
    const authWorkdirWin = path.join(portableRootWin, "runtime", "claude-auth-workdir");

    const claudeBinWsl = joinWslPath(portableRootWsl, "runtime/cli/node_modules/.bin/claude");
    const claudeHomeWsl = joinWslPath(portableRootWsl, "runtime/claude-home");
    const claudeConfigWsl = joinWslPath(portableRootWsl, "runtime/claude-home/.claude");
    const authWorkdirWsl = joinWslPath(portableRootWsl, "runtime/claude-auth-workdir");

    const installed = fs.existsSync(claudePackageWin);

    let version = "";
    let checkError = "";

    if (installed && portableRootWsl) {
      const command = [
        "mkdir -p " + shellQuote(claudeConfigWsl),
        "mkdir -p " + shellQuote(authWorkdirWsl),
        "if [ -x " + shellQuote(claudeBinWsl) + " ]; then " + shellQuote(claudeBinWsl) + " --version; else echo MISSING; fi"
      ].join("; ");

      const result = spawnSync("wsl.exe", ["-d", "Ubuntu", "-u", "root", "-e", "bash", "-lc", command], {
        encoding: "utf8",
        timeout: 10000
      });

      version = String(result.stdout || "").trim();
      checkError = String(result.stderr || "").trim();
    }

    const credentialCandidates = [
      path.join(claudeConfigWin, ".credentials.json"),
      path.join(claudeConfigWin, "credentials.json"),
      path.join(claudeHomeWin, ".credentials.json"),
      path.join(claudeHomeWin, ".claude.json")
    ];

    const credentialPath = credentialCandidates.find((item) => fs.existsSync(item)) || "";

    return NextResponse.json({
      ok: true,
      id: "claude-code",
      name: "Claude Code",
      type: "cli-agent",
      installed,
      version,
      checkError,
      connected: Boolean(credentialPath),
      credentialPath,
      portableRootWin,
      portableRootWsl,
      claudeBinWin,
      claudeBinWsl,
      claudeHomeWin,
      claudeConfigWin,
      authWorkdirWin,
      authWorkdirWsl
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
