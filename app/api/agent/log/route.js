export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getPortableRoot } from "../../../lib/portablePaths.js";

function getLogPath() {
  const root = getPortableRoot();
  return path.join(root, "runtime", "hermes", "logs", "mamabot-agent-run.log");
}

function tailLines(lines, count) {
  return lines.slice(Math.max(0, lines.length - count));
}

function findLatestRunId(lines) {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const match = lines[i].match(/\[(run-\d+)\]/);
    if (match) {
      return match[1];
    }
  }

  return "";
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const count = Number(url.searchParams.get("lines") || 160);
    const latestOnly = url.searchParams.get("latest") === "true";
    const requestedRunId = url.searchParams.get("runId") || "";
    const logPath = getLogPath();

    if (!fs.existsSync(logPath)) {
      return NextResponse.json({
        ok: true,
        logPath,
        runId: "",
        lines: [],
        text: ""
      });
    }

    const raw = fs.readFileSync(logPath, "utf8");
    let lines = raw.split(/\r?\n/).filter(Boolean);
    let runId = requestedRunId;

    if (latestOnly && !runId) {
      runId = findLatestRunId(lines);
    }

    if (runId) {
      lines = lines.filter((line) => line.includes(`[${runId}]`));
    }

    const picked = tailLines(lines, count);

    return NextResponse.json({
      ok: true,
      logPath,
      runId,
      latestOnly,
      lines: picked,
      text: picked.join("\n")
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || String(error)
      },
      { status: 500 }
    );
  }
}