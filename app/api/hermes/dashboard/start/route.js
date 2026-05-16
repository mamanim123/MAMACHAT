export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getConfigRoot, getPortableRoot } from "../../../../lib/portablePaths.js";
import { toWslPath, joinWslPath } from "../../../../lib/wslPath.js";

function readHermesConfig() {
  const filePath = path.join(getConfigRoot(), "hermes.json");

  if (!fs.existsSync(filePath)) {
    return {
      mode: "portable_wsl",
      dashboard: {
        host: "127.0.0.1",
        port: 9119
      }
    };
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function startPortableWslDashboard(config) {
  const portableRootWin = getPortableRoot();
  const portableRootWsl = toWslPath(portableRootWin);

  if (!portableRootWsl) {
    throw new Error("Failed to convert PORTABLE_ROOT to WSL path.");
  }

  const hermesHomeWsl = joinWslPath(portableRootWsl, "runtime/hermes/home");
  const hermesInstallDirWsl = joinWslPath(portableRootWsl, "runtime/hermes/home/hermes-agent");
  const hermesVenvBinWsl = joinWslPath(portableRootWsl, "runtime/hermes/home/hermes-agent/venv/bin/hermes");
  const hermesWrapperWsl = joinWslPath(portableRootWsl, "runtime/hermes/home/hermes-agent/hermes");
  const logPath = joinWslPath(portableRootWsl, "runtime/hermes/logs/dashboard.log");

  const host = config.dashboard && config.dashboard.host ? config.dashboard.host : "127.0.0.1";
  const port = String(config.dashboard && config.dashboard.port ? config.dashboard.port : 9119);

  const bashCommand = `
set -e
export HERMES_HOME=${shellQuote(hermesHomeWsl)}
export HOME="$HERMES_HOME"
export PATH="$HERMES_HOME/hermes-agent/venv/bin:$PATH"

mkdir -p "$(dirname ${shellQuote(logPath)})"

if [ -x ${shellQuote(hermesVenvBinWsl)} ]; then
  HERMES_BIN=${shellQuote(hermesVenvBinWsl)}
elif [ -x ${shellQuote(hermesWrapperWsl)} ]; then
  HERMES_BIN=${shellQuote(hermesWrapperWsl)}
else
  echo "Portable Hermes not installed" > ${shellQuote(logPath)}
  exit 127
fi

cd ${shellQuote(hermesInstallDirWsl)}

echo "[Mamabot] starting dashboard" > ${shellQuote(logPath)}
echo "[Mamabot] HERMES_HOME=$HERMES_HOME" >> ${shellQuote(logPath)}
echo "[Mamabot] HERMES_BIN=$HERMES_BIN" >> ${shellQuote(logPath)}

BROWSER=/bin/true nohup "$HERMES_BIN" dashboard --host ${shellQuote(host)} --port ${shellQuote(port)} > ${shellQuote(logPath)} 2>&1 & echo $!
`;

  const child = spawn("wsl.exe", ["-d", "Ubuntu-22.04", "-e", "bash", "-lc", bashCommand], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });

  child.unref();

  return {
    mode: "portable_wsl",
    portableRootWin,
    portableRootWsl,
    hermesHomeWsl,
    hermesInstallDirWsl,
    hermesVenvBinWsl,
    hermesWrapperWsl,
    wslLogPath: logPath,
    command: "hermes dashboard --host " + host + " --port " + port
  };
}

export async function POST() {
  try {
    const config = readHermesConfig();

    if (config.mode === "remote") {
      return NextResponse.json({
        ok: false,
        error: "Remote mode does not start local Hermes. Use Open Dashboard."
      }, { status: 400 });
    }

    if (config.mode === "docker") {
      return NextResponse.json({
        ok: false,
        error: "Docker start is not implemented yet. Use Portable WSL first."
      }, { status: 400 });
    }

    const result = startPortableWslDashboard(config);
    const host = config.dashboard && config.dashboard.host ? config.dashboard.host : "127.0.0.1";
    const port = config.dashboard && config.dashboard.port ? config.dashboard.port : 9119;

    return NextResponse.json({
      ok: true,
      message: "Portable Hermes dashboard start requested in WSL.",
      result,
      dashboardUrl: "http://" + host + ":" + port
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error.message || String(error)
    }, { status: 500 });
  }
}
