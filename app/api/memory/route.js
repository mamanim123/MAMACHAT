export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { loadAllMemory } from "../../lib/memoryLoader.js";
import { readWorkspaceConfig } from "../../lib/workspaceManager.js";

export async function GET() {
  try {
    const cfg = readWorkspaceConfig();
    const workspaceRoot = cfg.currentWorkspace || "";

    const memory = loadAllMemory(workspaceRoot);

    return NextResponse.json({
      ok: true,
      workspaceRoot,
      fileCount: memory.fileCount,
      totalChars: memory.totalChars,
      items: memory.items.map((x) => ({
        name: x.name,
        section: x.section,
        path: x.path,
        size: x.size,
        preview: x.content.slice(0, 200)
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}