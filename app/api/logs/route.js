export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getLogsRoot } from "../../lib/portablePaths.js";

export async function GET() {
  try {
    const filePath = path.join(getLogsRoot(), "runtime-check.log");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: true, log: "" });
    }

    const text = fs.readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/).slice(-200).join("\n");

    return NextResponse.json({ ok: true, log: lines });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}