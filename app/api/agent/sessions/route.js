import { listSessions, createSession } from "../../../lib/sessionStore.js";
import { readWorkspaceConfig } from "../../../lib/workspaceManager.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const items = listSessions({
      limit: searchParams.get("limit") || 50,
      query: searchParams.get("query") || ""
    });

    return Response.json({
      ok: true,
      items
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const workspaceConfig = readWorkspaceConfig();
    const workspaceRoot = body.workspaceRoot || workspaceConfig.currentWorkspace || "";

    const session = createSession({
      title: body.title || "",
      prompt: body.prompt || "",
      workspaceRoot
    });

    return Response.json({
      ok: true,
      session
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
