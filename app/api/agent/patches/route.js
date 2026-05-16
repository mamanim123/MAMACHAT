import { createPatch, listPatches } from "../../../lib/patchManager.js";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const result = listPatches({
      status: url.searchParams.get("status") || "",
      limit: url.searchParams.get("limit") || 50
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const patch = createPatch(body);

    return Response.json({
      ok: true,
      patch
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 400 }
    );
  }
}
