export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getConfigRoot } from "../../../lib/portablePaths.js";

function getConfigPath() {
  return path.join(getConfigRoot(), "hermes.json");
}

function defaultConfig() {
  return {
    mode: "wsl",
    mainRuntime: "hermes",
    dashboard: {
      enabled: true,
      host: "127.0.0.1",
      port: 9119,
      command: "hermes dashboard --no-open"
    },
    gateway: {
      enabled: false,
      command: "hermes gateway"
    },
    apiServer: {
      enabled: false,
      baseUrl: "http://127.0.0.1:8642/v1",
      apiKeyEnv: "HERMES_API_KEY"
    },
    paths: {
      windowsWorkspaceRoot: "",
      wslWorkspaceRoot: "",
      memoryRoot: "memory",
      skillsRoot: "skills"
    },
    features: {
      memory: true,
      soul: true,
      skills: true,
      cron: true,
      sessions: true,
      logs: true,
      analytics: true,
      gateway: true,
      obsidian: true,
      omi: false,
      swarms: true
    }
  };
}

export async function GET() {
  try {
    const filePath = getConfigPath();

    if (!fs.existsSync(filePath)) {
      const config = defaultConfig();
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf8");

      return NextResponse.json({
        ok: true,
        config
      });
    }

    const config = JSON.parse(fs.readFileSync(filePath, "utf8"));

    return NextResponse.json({
      ok: true,
      config
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error.message || String(error)
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const filePath = getConfigPath();

    const current = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, "utf8"))
      : defaultConfig();

    const next = {
      ...current,
      ...body,
      dashboard: {
        ...current.dashboard,
        ...(body.dashboard || {})
      },
      gateway: {
        ...current.gateway,
        ...(body.gateway || {})
      },
      apiServer: {
        ...current.apiServer,
        ...(body.apiServer || {})
      },
      paths: {
        ...current.paths,
        ...(body.paths || {})
      },
      features: {
        ...current.features,
        ...(body.features || {})
      }
    };

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(next, null, 2), "utf8");

    return NextResponse.json({
      ok: true,
      config: next
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error.message || String(error)
    }, { status: 500 });
  }
}