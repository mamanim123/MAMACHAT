export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession, updateSession, deleteSession } from "../../../../lib/sessionStore.js";

function getParamSessionId(params) {
  return String(params?.sessionId || "").trim();
}

export async function GET(request, { params }) {
  try {
    const sessionId = getParamSessionId(params);

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found", sessionId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      session
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const sessionId = getParamSessionId(params);
    const body = await request.json().catch(() => ({}));

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = updateSession(sessionId, body || {});

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found", sessionId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      session
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const sessionId = getParamSessionId(params);

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    const result = deleteSession(sessionId);

    return NextResponse.json({
      ok: true,
      sessionId,
      deleted: !!result
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
