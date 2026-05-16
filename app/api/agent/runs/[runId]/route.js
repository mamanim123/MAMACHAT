import { getRun, deleteRun } from "../../../../lib/runStore.js";

export async function GET(request, context) {
  try {
    const params = await Promise.resolve(context.params);
    const runId = params?.runId;

    const run = getRun(runId);

    if (!run) {
      return Response.json(
        {
          ok: false,
          error: "실행 기록을 찾지 못했습니다.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      run,
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

export async function DELETE(request, context) {
  try {
    const params = await Promise.resolve(context.params);
    const runId = params?.runId;

    const deleted = deleteRun(runId);

    return Response.json({
      ok: true,
      deleted,
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