export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSkillsRoot } from "../../lib/portablePaths.js";

export async function GET() {
  try {
    const root = getSkillsRoot();

    if (!fs.existsSync(root)) {
      return NextResponse.json({ ok: true, skills: [] });
    }

    const skills = fs
      .readdirSync(root)
      .filter((name) => name.endsWith(".md"))
      .map((name) => ({
        name,
        path: path.join(root, name)
      }));

    return NextResponse.json({ ok: true, skills });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}