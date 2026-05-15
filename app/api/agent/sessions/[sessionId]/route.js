import { getSession, updateSession, deleteSession } from "../../../../lib/sessionStore.js";

export async function GET(request, context) {
  try {
    const params = await Promise.resolve(context.params);
    const sessionId = params?.sessionId;

    const session = getSession(sessionId);

    if (!session) {
      return Response.json(
        {
          ok: false,
          error: "Session not found."
        },
        { status: 404 }
      );
    }

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

export async function PATCH(request, context) {
  try {
    const params = await Promise.resolve(context.params);
    const sessionId = params?.sessionId;
    const body = await request.json().catch(() => ({}));

    const session = updateSession(sessionId, {
      title: body.title,
      status: body.status,
      memory: body.memory
    });

    if (!session) {
      return Response.json(
        {
          ok: false,
          error: "Session not found."
        },
        { status: 404 }
      );
    }

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

export async function DELETE(request, context) {
  try {
    const params = await Promise.resolve(context.params);
    const sessionId = params?.sessionId;

    const deleted = deleteSession(sessionId);

    return Response.json({
      ok: true,
      deleted
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
