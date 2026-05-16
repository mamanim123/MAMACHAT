import { listRuns, rebuildRunsIndex } from "../../../lib/runStore.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const items = listRuns({
      limit: searchParams.get("limit") || 50,
      status: searchParams.get("status") || "",
      dryRun: searchParams.get("dryRun") || "",
      provider: searchParams.get("provider") || "",
      query: searchParams.get("query") || "",
    });

    return Response.json({
      ok: true,
      items,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = rebuildRunsIndex();

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}