import { searchWorkspaceIndex } from "../../../../lib/workspaceIndex.js";
import { readWorkspaceConfig } from "../../../../lib/workspaceManager.js";

function resolveWorkspaceRoot(body = {}, request = null) {
  const url = request ? new URL(request.url) : null;
  const fromQuery = url?.searchParams?.get("workspaceRoot") || "";
  const config = readWorkspaceConfig();

  return body.workspaceRoot || fromQuery || config.currentWorkspace || "";
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const workspaceRoot = resolveWorkspaceRoot({}, request);
    const query = url.searchParams.get("query") || "";
    const limit = url.searchParams.get("limit") || 8;

    const result = searchWorkspaceIndex(workspaceRoot, {
      query,
      limit
    });

    return Response.json(result);
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
    const workspaceRoot = resolveWorkspaceRoot(body, request);

    const result = searchWorkspaceIndex(workspaceRoot, {
      query: body.query || "",
      limit: body.limit || 8,
      rebuild: body.rebuild === true
    });

    return Response.json(result);
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
