import { readModelBadges, getCliAgentModelSummary } from "../../lib/modelBadges.js";

function jsonUtf8(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") || "";

  try {
    if (agentId) {
      return jsonUtf8({
        ok: true,
        ...getCliAgentModelSummary(agentId)
      });
    }

    return jsonUtf8({
      ok: true,
      data: readModelBadges()
    });
  } catch (error) {
    return jsonUtf8(
      {
        ok: false,
        error: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
