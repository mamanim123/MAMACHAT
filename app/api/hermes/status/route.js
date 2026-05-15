export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFileSync, execSync } from "child_process";
import { getConfigRoot, getPortableRoot } from "../../../lib/portablePaths.js";
import { toWslPath, joinWslPath } from "../../../lib/wslPath.js";

let cachedWslIp = "";

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

function runCommand(command) {
  try {
    const result = execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    }).trim();

    return { ok: true, result };
  } catch (error) {
    const stdout = error && error.stdout ? String(error.stdout) : "";
    const stderr = error && error.stderr ? String(error.stderr) : "";
    return { ok: false, result: stderr || stdout || error.message || String(error) };
  }
}

function runWsl(script) {
  try {
    const result = execFileSync("wsl.exe", ["-d", "Ubuntu-22.04", "-e", "bash", "-lc", script], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    }).trim();

    return { ok: true, result };
  } catch (error) {
    const stdout = error && error.stdout ? String(error.stdout) : "";
    const stderr = error && error.stderr ? String(error.stderr) : "";
    return { ok: false, result: stderr || stdout || error.message || String(error) };
  }
}

function getWslIp() {
  if (cachedWslIp) {
    return cachedWslIp;
  }

  try {
    const raw = execFileSync(
      "wsl.exe",
      ["-d", "Ubuntu-22.04", "-e", "bash", "-lc", "hostname -I | awk '{print $1}'"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      }
    ).trim();

    cachedWslIp = raw.split(/\s+/)[0] || "";
    return cachedWslIp;
  } catch {
    return "";
  }
}

function checkWsl() {
  if (process.platform !== "win32") {
    return { ok: false, result: "WSL check is only needed on Windows." };
  }

  const result = runCommand("wsl.exe -l -v");

  return {
    ok: result.ok,
    result: result.ok ? "WSL detected" : "WSL not available",
    detail: result.ok ? "" : result.result
  };
}

function checkDocker() {
  const result = runCommand("docker --version");

  return {
    ok: result.ok,
    result: result.ok ? result.result : "Docker not available"
  };
}

function getPortableHermesPaths() {
  const portableRootWin = getPortableRoot();
  const portableRootWsl = toWslPath(portableRootWin);

  return {
    portableRootWin,
    portableRootWsl,
    hermesRootWsl: joinWslPath(portableRootWsl, "runtime/hermes"),
    hermesHomeWsl: joinWslPath(portableRootWsl, "runtime/hermes/home"),
    hermesInstallDirWsl: joinWslPath(portableRootWsl, "runtime/hermes/home/hermes-agent"),
    hermesVenvBinWsl: joinWslPath(portableRootWsl, "runtime/hermes/home/hermes-agent/venv/bin/hermes"),
    hermesWrapperWsl: joinWslPath(portableRootWsl, "runtime/hermes/home/hermes-agent/hermes"),
    hermesLogsWsl: joinWslPath(portableRootWsl, "runtime/hermes/logs")
  };
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function checkPortableHermesInWsl() {
  const paths = getPortableHermesPaths();

  if (!paths.portableRootWsl) {
    return {
      ok: false,
      result: "Could not convert Mamabot path to WSL path"
    };
  }

  const venvHermes = joinWslPath(paths.hermesInstallDirWsl, "venv", "bin", "hermes");
  const dotVenvHermes = joinWslPath(paths.hermesInstallDirWsl, ".venv", "bin", "hermes");
  const rootHermes = joinWslPath(paths.hermesInstallDirWsl, "hermes");
  const cliPy = joinWslPath(paths.hermesInstallDirWsl, "cli.py");
  const pyproject = joinWslPath(paths.hermesInstallDirWsl, "pyproject.toml");

  const script = [
    "set +e",
    "export HERMES_HOME=" + shellQuote(paths.hermesHomeWsl),
    "export HOME=\"$HERMES_HOME\"",
    "cd " + shellQuote(paths.hermesInstallDirWsl) + " || { echo CD_FAILED; exit 20; }",
    "echo PORTABLE_ROOT=" + shellQuote(paths.portableRootWsl),
    "echo HERMES_HOME=$HERMES_HOME",
    "for bin in " + shellQuote(venvHermes) + " " + shellQuote(dotVenvHermes) + " " + shellQuote(rootHermes) + "; do",
    "  if [ -x \"$bin\" ]; then",
    "    echo HERMES_BIN=$bin",
    "    \"$bin\" --help >/tmp/mamabot-hermes-help.txt 2>&1",
    "    code=$?",
    "    head -5 /tmp/mamabot-hermes-help.txt",
    "    if [ \"$code\" -eq 0 ]; then",
    "      echo CHECK_OK",
    "      exit 0",
    "    fi",
    "  else",
    "    echo MISSING_OR_NOT_EXECUTABLE=$bin",
    "  fi",
    "done",
    "if [ -f " + shellQuote(cliPy) + " ] && [ -f " + shellQuote(pyproject) + " ]; then",
    "  echo FALLBACK_SOURCE_PRESENT",
    "  exit 0",
    "fi",
    "echo CHECK_FAILED",
    "exit 1"
  ].join("\n");

  const result = runWsl(script);
  const output = [result.result, result.stdout, result.stderr, result.error].filter(Boolean).join("\n").trim();
  const binLine = output.split(/\r?\n/).find((line) => line.startsWith("HERMES_BIN="));

  if (result.ok) {
    return {
      ok: true,
      result: "Portable Hermes found",
      bin: binLine ? binLine.replace("HERMES_BIN=", "") : "",
      details: output
    };
  }

  return {
    ok: false,
    result: "Portable Hermes check failed in WSL",
    details: output || result.error || ""
  };
}


function checkWslPathAccess() {
  const paths = getPortableHermesPaths();

  if (!paths.portableRootWsl) {
    return {
      ok: false,
      result: "WSL path conversion failed",
      paths
    };
  }

  const script = `
if [ -d ${shellQuote(paths.portableRootWsl)} ]; then
  echo PATH_ACCESS_OK
else
  echo PATH_ACCESS_FAILED
fi
`;

  const result = runWsl(script);

  return {
    ok: result.ok && result.result.includes("PATH_ACCESS_OK"),
    result: result.result,
    paths
  };
}

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, 1800);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timer);

    return {
      ok: true,
      status: res.status,
      url
    };
  } catch {
    clearTimeout(timer);

    return {
      ok: false,
      status: null,
      url,
      error: "Dashboard not responding"
    };
  }
}

async function checkDashboardWithFallback(host, port) {
  const localUrl = "http://" + host + ":" + port;
  const local = await checkUrl(localUrl + "/api/status");

  if (local.ok) {
    return {
      ok: true,
      status: local.status,
      url: localUrl,
      apiUrl: localUrl + "/api/status",
      accessMode: "localhost"
    };
  }

  const wslIp = getWslIp();

  if (wslIp) {
    const wslUrl = "http://" + wslIp + ":" + port;
    const wsl = await checkUrl(wslUrl + "/api/status");

    if (wsl.ok) {
      return {
        ok: true,
        status: wsl.status,
        url: wslUrl,
        apiUrl: wslUrl + "/api/status",
        accessMode: "wsl-ip",
        localhostError: local.error
      };
    }
  }

  return {
    ok: false,
    status: null,
    url: localUrl,
    apiUrl: localUrl + "/api/status",
    error: "Dashboard not responding from localhost or WSL IP"
  };
}

export async function GET() {
  try {
    const config = readHermesConfig();
    const host = config.dashboard && config.dashboard.host ? config.dashboard.host : "127.0.0.1";
    const port = config.dashboard && config.dashboard.port ? config.dashboard.port : 9119;

    const dashboardUrl = "http://" + host + ":" + port;
    const portableHermes = checkPortableHermesInWsl();
    const wslPathAccess = checkWslPathAccess();
    const dashboard = await checkDashboardWithFallback(host, port);

    const status = {
      mode: config.mode || "portable_wsl",
      configLoaded: true,
      dashboardUrl: dashboard.url || dashboardUrl,
      dashboardLocalUrl: dashboardUrl,
      dashboardAccessMode: dashboard.accessMode || "none",
      wsl: checkWsl(),
      docker: checkDocker(),
      wslPathAccess,
      portableHermes,
      hermesWsl: portableHermes,
      dashboard
    };

    return NextResponse.json({
      ok: true,
      config,
      status
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error.message || String(error)
    }, { status: 500 });
  }
}