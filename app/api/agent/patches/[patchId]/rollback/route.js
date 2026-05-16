import { rollbackPatch } from "../../../../../lib/patchManager.js";

async function getPatchId(context) {
  const params = await context.params;
  return params.patchId || "";
}

export async function POST(request, context) {
  try {
    const patchId = await getPatchId(context);
    const patch = rollbackPatch(patchId);

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
