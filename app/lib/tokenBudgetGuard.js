function estimateTextTokens(value = "") {
  const text = String(value || "");

  if (!text) return 0;

  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const asciiChars = text.length - koreanChars;

  // Rough but useful heuristic:
  // Korean tends to tokenize denser than simple ASCII.
  return Math.ceil(koreanChars / 1.7 + asciiChars / 4);
}

function getPracticalInputLimit(model = "", executionProfile = "") {
  const value = String(model || "").toLowerCase();

  // Observed OpenRouter credit/context practical limit in current Mamabot tests.
  if (value.includes("gemini-2.5-flash")) return 13343;
  if (value.includes("gemini-2.0-flash")) return 16000;
  if (value.includes("gpt-4o-mini")) return 24000;
  if (value.includes("qwen")) return 24000;
  if (value.includes("claude")) return 32000;

  if (executionProfile === "quick") return 16000;

  return 16000;
}

function getHermesOverheadTokens({
  executionProfile = "",
  skills = "",
  toolsets = "",
  workspaceCandidates = []
}) {
  if (executionProfile === "quick") {
    return 80;
  }

  // Hermes Agent has a large fixed system/tool/runtime context.
  // We saw Quick-through-Hermes exceed 14k even with memory/session/skills off.
  let overhead = 11000;

  if (String(skills || "").trim()) overhead += 1200;
  if (String(toolsets || "").trim()) overhead += 800;

  const candidateCount = Array.isArray(workspaceCandidates) ? workspaceCandidates.length : 0;
  overhead += Math.min(candidateCount, 8) * 80;

  if (executionProfile === "coding") overhead += 800;
  if (executionProfile === "automation") overhead += 1000;
  if (executionProfile === "review") overhead += 400;

  return overhead;
}

function decideSeverity(estimatedInputTokens, practicalLimit) {
  if (!practicalLimit || practicalLimit <= 0) return "unknown";

  const ratio = estimatedInputTokens / practicalLimit;

  if (ratio >= 1) return "danger";
  if (ratio >= 0.82) return "warn";
  return "ok";
}

function recommendationFor({ severity, executionProfile, estimatedInputTokens, practicalLimit }) {
  if (severity === "ok") {
    return "Token budget looks acceptable.";
  }

  if (executionProfile === "quick") {
    return "Use a shorter prompt or a model with a larger context window.";
  }

  if (severity === "danger") {
    return [
      "High token risk before execution.",
      "Prefer Quick Mode for simple questions.",
      "For Agent/Coding Mode, reduce session context, avoid large plan files, and use workspace candidates only.",
      `Estimated ${estimatedInputTokens} input tokens exceeds practical limit ${practicalLimit}.`
    ].join(" ");
  }

  return [
    "Token budget is close to the practical limit.",
    "Continue only if this is an Agent/Coding task.",
    "Consider Quick Mode or reducing context."
  ].join(" ");
}

export function assessTokenBudget(input = {}) {
  const prompt = String(input.prompt || "");
  const userPrompt = String(input.userPrompt || "");
  const model = String(input.model || "");
  const executionProfile = String(input.executionProfile || "agent");
  const responseMode = String(input.responseMode || "normal");
  const skills = String(input.skills || "");
  const toolsets = String(input.toolsets || "");
  const workspaceCandidates = Array.isArray(input.workspaceCandidates)
    ? input.workspaceCandidates
    : [];

  const promptTokens = estimateTextTokens(prompt);
  const userPromptTokens = estimateTextTokens(userPrompt);
  const hermesOverheadTokens = getHermesOverheadTokens({
    executionProfile,
    skills,
    toolsets,
    workspaceCandidates
  });

  const estimatedInputTokens =
    executionProfile === "quick"
      ? promptTokens + hermesOverheadTokens
      : promptTokens + hermesOverheadTokens;

  const practicalLimit = getPracticalInputLimit(model, executionProfile);
  const severity = decideSeverity(estimatedInputTokens, practicalLimit);
  const ratio =
    practicalLimit > 0 ? Number((estimatedInputTokens / practicalLimit).toFixed(4)) : null;

  return {
    severity,
    executionProfile,
    responseMode,
    model,
    estimatedInputTokens,
    promptTokens,
    userPromptTokens,
    hermesOverheadTokens,
    practicalLimit,
    ratio,
    workspaceCandidateCount: workspaceCandidates.length,
    skillsUsed: Boolean(skills.trim()),
    toolsetsUsed: Boolean(toolsets.trim()),
    recommendation: recommendationFor({
      severity,
      executionProfile,
      estimatedInputTokens,
      practicalLimit
    })
  };
}
