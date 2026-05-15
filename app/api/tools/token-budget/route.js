import { assessTokenBudget } from "../../../lib/tokenBudgetGuard.js";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const tokenBudget = assessTokenBudget({
      prompt: body.prompt || "",
      userPrompt: body.userPrompt || body.prompt || "",
      model: body.model || "",
      executionProfile: body.executionProfile || "agent",
      responseMode: body.responseMode || "normal",
      skills: body.skills || "",
      toolsets: body.toolsets || "",
      workspaceCandidates: Array.isArray(body.workspaceCandidates)
        ? body.workspaceCandidates
        : []
    });

    return Response.json({
      ok: true,
      tokenBudget
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
