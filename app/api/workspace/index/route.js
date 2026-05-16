import { buildWorkspaceIndex, getWorkspaceIndexSummary } from "../../../lib/workspaceIndex.js";
import { readWorkspaceConfig } from "../../../lib/workspaceManager.js";

function resolveWorkspaceRoot(body = {}, request = null) {
  const url = request ? new URL(request.url) : null;
  const fromQuery = url?.searchParams?.get("workspaceRoot") || "";
  const config = readWorkspaceConfig();

  return body.workspaceRoot || fromQuery || config.currentWorkspace || "";
}

export async function GET(request) {
  try {
    const workspaceRoot = resolveWorkspaceRoot({}, request);
    const summary = getWorkspaceIndexSummary(workspaceRoot);

    return Response.json({
      ok: true,
      summary
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
    const workspaceRoot = resolveWorkspaceRoot(body, request);

    if (!workspaceRoot) {
      return Response.json(
        {
          ok: false,
          error: "workspaceRoot is required"
        },
        { status: 400 }
      );
    }

    const result = buildWorkspaceIndex(workspaceRoot, {
      maxFiles: body.maxFiles || 8000,
      maxDepth: body.maxDepth || 16,
      maxFileSize: body.maxFileSize || 2 * 1024 * 1024
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
