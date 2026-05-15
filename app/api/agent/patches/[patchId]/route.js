import { readPatch } from "../../../../lib/patchManager.js";

async function getPatchId(context) {
  const params = await context.params;
  return params.patchId || "";
}

export async function GET(request, context) {
  try {
    const patchId = await getPatchId(context);
    const patch = readPatch(patchId);

    return Response.json({
      ok: true,
      patch
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 404 }
    );
  }
}
