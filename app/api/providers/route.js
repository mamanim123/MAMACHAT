export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getConfigRoot } from "../../lib/portablePaths.js";

export async function GET() {
  try {
    const filePath = path.join(getConfigRoot(), "providers.json");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: true, data: {} });
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    return NextResponse.json({
      ok: true,
      data
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}