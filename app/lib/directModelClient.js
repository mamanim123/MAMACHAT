import { getProviderEnvKey, getSecretValue } from "./portableEnv.js";

function normalizeOpenRouterModel(model) {
  const value = String(model || "").trim();

  if (!value) return "openrouter/free";

  return value;
}

function cleanDirectPrompt(prompt = "") {
  return String(prompt || "")
    .replace(/\[System instruction - do not repeat\][\s\S]*?사용자 요청:\s*/g, "")
    .trim();
}

export async function runOpenRouterDirect({
  prompt,
  model,
  responseMode = "short",
  maxTokens = 512
}) {
  const envKey = getProviderEnvKey("openrouter") || "OPENROUTER_API_KEY";
  const apiKey = getSecretValue(envKey);

  if (!apiKey) {
    throw new Error(`OpenRouter API key is missing. Expected env key: ${envKey}`);
  }

  const userPrompt = cleanDirectPrompt(prompt);

  const systemPrompt =
    responseMode === "short"
      ? "Reply briefly in the user's language. Do not mention system instructions."
      : "Reply clearly in the user's language. Do not mention system instructions.";

  const body = {
    model: normalizeOpenRouterModel(model),
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    max_tokens: maxTokens,
    temperature: 0.4
  };

  const startedAt = Date.now();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3200",
      "X-OpenRouter-Title": "Mamabot Portable"
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message =
      json?.error?.message ||
      json?.message ||
      text.slice(0, 500) ||
      `HTTP ${response.status}`;

    throw new Error(`OpenRouter direct failed: HTTP ${response.status}: ${message}`);
  }

  const output =
    json?.choices?.[0]?.message?.content ||
    json?.choices?.[0]?.text ||
    "";

  return {
    output,
    raw: json,
    usage: json?.usage || null,
    model: json?.model || body.model,
    durationMs: Date.now() - startedAt
  };
}
