export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getLogsRoot } from "../../../../lib/portablePaths.js";

export async function GET() {
  try {
    const logPath = path.join(getLogsRoot(), "hermes-install-wsl.log");

    if (!fs.existsSync(logPath)) {
      return NextResponse.json({
        ok: true,
        log: "아직 설치 로그가 없습니다."
      });
    }

    const log = fs.readFileSync(logPath, "utf8");

    return NextResponse.json({
      ok: true,
      log
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error.message || String(error)
    }, { status: 500 });
  }
}
