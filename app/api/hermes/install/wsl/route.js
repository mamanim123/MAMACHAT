export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getLogsRoot, getPortableRoot } from "../../../../lib/portablePaths.js";
import { toWslPath, joinWslPath } from "../../../../lib/wslPath.js";

let installing = false;

function nowKst() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return formatter.format(new Date()).replace(" ", "T") + "+09:00";
}

function appendLog(message) {
  const logsRoot = getLogsRoot();
  fs.mkdirSync(logsRoot, { recursive: true });

  const logPath = path.join(logsRoot, "hermes-install-wsl.log");
  const line = "[" + nowKst() + "] " + message + "\n";

  fs.appendFileSync(logPath, line, "utf8");
}

function shellSingleQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function writeInstallScript(scriptPathWin, values) {
  const content = `#!/usr/bin/env bash
set -o pipefail

PORTABLE_ROOT_WSL=${shellSingleQuote(values.portableRootWsl)}
HERMES_ROOT=${shellSingleQuote(values.hermesRootWsl)}
HERMES_HOME=${shellSingleQuote(values.hermesHomeWsl)}
HERMES_INSTALL_DIR=${shellSingleQuote(values.hermesInstallDirWsl)}
HERMES_INSTALL_PARENT=${shellSingleQuote(values.hermesInstallParentWsl)}
HERMES_LOGS=${shellSingleQuote(values.hermesLogsWsl)}

export PORTABLE_ROOT_WSL HERMES_ROOT HERMES_HOME HERMES_INSTALL_DIR HERMES_INSTALL_PARENT HERMES_LOGS

echo "[Mamabot] Starting Portable Hermes Agent install..."
echo "[Mamabot] PORTABLE_ROOT_WSL=$PORTABLE_ROOT_WSL"
echo "[Mamabot] HERMES_ROOT=$HERMES_ROOT"
echo "[Mamabot] HERMES_HOME=$HERMES_HOME"
echo "[Mamabot] HERMES_INSTALL_DIR=$HERMES_INSTALL_DIR"

if [ -z "$PORTABLE_ROOT_WSL" ] || [ -z "$HERMES_HOME" ] || [ -z "$HERMES_INSTALL_DIR" ]; then
  echo "[Mamabot] ERROR: required path variable is empty"
  exit 20
fi

mkdir -p "$HERMES_ROOT" "$HERMES_HOME" "$HERMES_LOGS" "$HERMES_INSTALL_PARENT"

echo "[Mamabot] Checking WSL prerequisites..."
command -v git || echo "[Mamabot] git not found in WSL"
command -v curl || echo "[Mamabot] curl not found in WSL"

echo "[Mamabot] Checking existing install directory..."
if [ -d "$HERMES_INSTALL_DIR" ] && [ ! -d "$HERMES_INSTALL_DIR/.git" ] && [ -z "$(ls -A "$HERMES_INSTALL_DIR" 2>/dev/null)" ]; then
  echo "[Mamabot] Removing empty broken install dir"
  rmdir "$HERMES_INSTALL_DIR"
fi

if [ -d "$HERMES_INSTALL_DIR" ] && [ ! -d "$HERMES_INSTALL_DIR/.git" ]; then
  echo "[Mamabot] ERROR: install dir exists but is not a git repo and is not empty"
  ls -la "$HERMES_INSTALL_DIR"
  exit 22
fi

echo "[Mamabot] Downloading official installer..."
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh -o /tmp/mamabot-hermes-install.sh
chmod +x /tmp/mamabot-hermes-install.sh

echo "[Mamabot] Running installer with explicit portable paths..."
echo "[Mamabot] Installer command: bash /tmp/mamabot-hermes-install.sh --dir $HERMES_INSTALL_DIR --hermes-home $HERMES_HOME --skip-setup"

bash /tmp/mamabot-hermes-install.sh --dir "$HERMES_INSTALL_DIR" --hermes-home "$HERMES_HOME" --skip-setup
INSTALL_CODE=$?

echo "[Mamabot] Installer exit code: $INSTALL_CODE"

echo "[Mamabot] Checking portable hermes executable..."
if [ -f "$HERMES_INSTALL_DIR/hermes" ]; then
  chmod +x "$HERMES_INSTALL_DIR/hermes"
fi

if [ -x "$HERMES_INSTALL_DIR/hermes" ]; then
  "$HERMES_INSTALL_DIR/hermes" --version || true
  echo "[Mamabot] PORTABLE_HERMES_FOUND"
else
  echo "[Mamabot] PORTABLE_HERMES_NOT_FOUND"
fi

echo "[Mamabot] Portable install flow finished."
exit $INSTALL_CODE
`;

  fs.mkdirSync(path.dirname(scriptPathWin), { recursive: true });
  fs.writeFileSync(scriptPathWin, content, "utf8");
}

export async function POST() {
  try {
    if (process.platform !== "win32") {
      return NextResponse.json({
        ok: false,
        error: "Portable WSL install is only available from Windows."
      }, { status: 400 });
    }

    if (installing) {
      return NextResponse.json({
        ok: false,
        error: "Portable Hermes install is already running."
      }, { status: 409 });
    }

    installing = true;

    const portableRootWin = getPortableRoot();
    const portableRootWsl = toWslPath(portableRootWin);

    if (!portableRootWsl) {
      throw new Error("Failed to convert PORTABLE_ROOT to WSL path.");
    }

    const hermesRootWsl = joinWslPath(portableRootWsl, "runtime/hermes");
    const hermesHomeWsl = joinWslPath(portableRootWsl, "runtime/hermes/home");
    const hermesInstallDirWsl = joinWslPath(portableRootWsl, "runtime/hermes/home/hermes-agent");
    const hermesInstallParentWsl = joinWslPath(portableRootWsl, "runtime/hermes/home");
    const hermesLogsWsl = joinWslPath(portableRootWsl, "runtime/hermes/logs");

    const scriptPathWin = path.join(portableRootWin, "runtime", "hermes", "install-portable.sh");
    const scriptPathWsl = joinWslPath(portableRootWsl, "runtime/hermes/install-portable.sh");

    writeInstallScript(scriptPathWin, {
      portableRootWsl,
      hermesRootWsl,
      hermesHomeWsl,
      hermesInstallDirWsl,
      hermesInstallParentWsl,
      hermesLogsWsl
    });

    appendLog("============================================================");
    appendLog("Portable Hermes install requested with generated shell script.");
    appendLog("PORTABLE_ROOT_WIN=" + portableRootWin);
    appendLog("PORTABLE_ROOT_WSL=" + portableRootWsl);
    appendLog("HERMES_ROOT=" + hermesRootWsl);
    appendLog("HERMES_HOME=" + hermesHomeWsl);
    appendLog("HERMES_INSTALL_DIR=" + hermesInstallDirWsl);
    appendLog("INSTALL_SCRIPT_WIN=" + scriptPathWin);
    appendLog("INSTALL_SCRIPT_WSL=" + scriptPathWsl);

    const child = spawn("wsl.exe", ["bash", "-lc", "chmod +x " + JSON.stringify(scriptPathWsl) + " && " + JSON.stringify(scriptPathWsl)], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", function (data) {
      appendLog(String(data));
    });

    child.stderr.on("data", function (data) {
      appendLog(String(data));
    });

    child.on("close", function (code) {
      appendLog("Portable Hermes install process closed with code: " + code);
      installing = false;
    });

    child.on("error", function (error) {
      appendLog("Portable Hermes install process error: " + (error.message || String(error)));
      installing = false;
    });

    return NextResponse.json({
      ok: true,
      message: "Portable Hermes install started.",
      portableRootWin,
      portableRootWsl,
      hermesHomeWsl,
      hermesInstallDirWsl,
      scriptPathWin,
      scriptPathWsl,
      note: "Hermes files will be installed under Mamabot/runtime/hermes, not WSL home."
    });
  } catch (error) {
    installing = false;

    return NextResponse.json({
      ok: false,
      error: error.message || String(error)
    }, { status: 500 });
  }
}