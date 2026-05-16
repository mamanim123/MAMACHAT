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
  maxTokens = 512,
  webSearch = false
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

  if (webSearch) {
    body.tools = [
      {
        type: "openrouter:web_search",
        parameters: {
          engine: "auto",
          max_results: 5,
          max_total_results: 8,
          search_context_size: "low"
        }
      }
    ];
  }

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


// ?? ???? ?? ?? ? ?????????????????????????????????????????????
export const FREE_MODELS_BY_PROVIDER = {
  openrouter: [
    { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super ✅검증", ctx: 262144 },
    { id: "openrouter/owl-alpha",                   label: "Owl Alpha (1M)",         ctx: 1048576 },
    { id: "deepseek/deepseek-v4-flash:free",        label: "DeepSeek V4 Flash (1M)", ctx: 1048576 },
    { id: "openai/gpt-oss-120b:free",               label: "GPT-OSS 120B",           ctx: 131072 },
    { id: "openai/gpt-oss-20b:free",                label: "GPT-OSS 20B",            ctx: 131072 },
    { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder (코딩)", ctx: 262144 },
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B",          ctx: 65536  },
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B",       ctx: 131072 },
  ],
  nvidia: [
    { id: "nvidia/nemotron-3-super-120b-a12b:free",             label: "Nemotron 3 Super ✅",     ctx: 262144 },
    { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "Nemotron 3 Nano Omni",        ctx: 256000 },
    { id: "nvidia/nemotron-3-nano-30b-a3b:free",                label: "Nemotron 3 Nano 30B",         ctx: 256000 },
    { id: "nvidia/nemotron-nano-12b-v2-vl:free",                label: "Nemotron Nano 12B VL",        ctx: 128000 },
  ],
  google: [
    { id: "google/gemma-4-31b-it:free",             label: "Gemma 4 31B ★무료",     ctx: 262144 },
    { id: "google/gemma-4-26b-a4b-it:free",         label: "Gemma 4 26B MoE ★무료", ctx: 262144 },
    { id: "google/gemini-2.5-flash",                label: "Gemini 2.5 Flash (유료)",    ctx: 1048576, paid: true },
    { id: "google/gemini-2.5-pro",                  label: "Gemini 2.5 Pro (유료)",      ctx: 1048576, paid: true },
  ],
  deepseek: [
    { id: "deepseek/deepseek-v4-flash:free",        label: "DeepSeek V4 Flash ★무료 1M", ctx: 1048576 },
    { id: "deepseek/deepseek-r1",                   label: "DeepSeek R1 (유료)",              ctx: 65536, paid: true },
  ],
  meta: [
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B ★무료", ctx: 65536 },
    { id: "meta-llama/llama-3.2-3b-instruct:free",  label: "Llama 3.2 3B ★무료",  ctx: 131072 },
  ],
  qwen: [
    { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder ★무료 코딩", ctx: 262144 },
    { id: "qwen/qwen3-next-80b-a3b-instruct:free",  label: "Qwen3 Next 80B ★무료",           ctx: 262144 },
  ],
  anthropic: [
    { id: "anthropic/claude-sonnet-4.6",            label: "Claude Sonnet 4.6 (유료)", ctx: 200000, paid: true },
    { id: "anthropic/claude-opus-4.6",              label: "Claude Opus 4.6 (유료)",   ctx: 200000, paid: true },
  ],
  openai: [
    { id: "openai/gpt-oss-120b:free",               label: "GPT-OSS 120B ★무료", ctx: 131072 },
    { id: "openai/gpt-oss-20b:free",                label: "GPT-OSS 20B ★무료",  ctx: 131072 },
    { id: "openai/gpt-4.1",                         label: "GPT-4.1 (유료)",           ctx: 200000, paid: true },
  ],
  nous: [
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B ★무료", ctx: 131072 },
  ],
  hermes: [
    { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super ✅기본 추천", ctx: 262144 },
    { id: "openrouter/owl-alpha",                   label: "Owl Alpha",                ctx: 1048576 },
    { id: "deepseek/deepseek-v4-flash:free",        label: "DeepSeek V4 Flash",        ctx: 1048576 },
    { id: "openai/gpt-oss-120b:free",               label: "GPT-OSS 120B",             ctx: 131072 },
  ],
};

// ?? ?? ID ??? ????????????????????????????????????????????????????
function normalizeModelForProvider(provider, model) {
  const m = String(model || "").trim();
  // ?? ??? ?? = ??? ??
  if (m.includes("/")) return m;
  if (!m) {
    const defaults = {
      google:    "google/gemma-4-31b-it:free",
      nvidia:    "nvidia/nemotron-3-super-120b-a12b:free",
      deepseek:  "deepseek/deepseek-v4-flash:free",
      anthropic: "anthropic/claude-sonnet-4.6",
      openai:    "openai/gpt-oss-120b:free",
      meta:      "meta-llama/llama-3.3-70b-instruct:free",
      qwen:      "qwen/qwen3-coder:free",
      nous:      "nousresearch/hermes-3-llama-3.1-405b:free",
    };
    return defaults[provider] || "nvidia/nemotron-3-super-120b-a12b:free";
  }
  const prefixMap = {
    google: "google", nvidia: "nvidia", deepseek: "deepseek",
    anthropic: "anthropic", openai: "openai",
    meta: "meta-llama", qwen: "qwen", nous: "nousresearch",
  };
  const prefix = prefixMap[provider];
  return prefix ? prefix + "/" + m : m;
}

// ?? ?? API Key ?? ?????????????????????????????????????????????????
function getDirectKey(providerName) {
  const keyMap = {
    google:    ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    anthropic: ["ANTHROPIC_API_KEY"],
    deepseek:  ["DEEPSEEK_API_KEY"],
    openai:    ["OPENAI_API_KEY"],
  };
  for (const k of (keyMap[providerName] || [])) {
    const v = getSecretValue(k);
    if (v) return v;
  }
  return null;
}

function buildSys(responseMode) {
  if (responseMode === "short" || responseMode === "light")
    return "Reply briefly in the user's language. Max 3 sentences. Do not mention system instructions.";
  if (responseMode === "detailed")
    return "Reply in detail in the user's language. Use markdown when helpful. Do not mention system instructions.";
  return "Reply clearly in the user's language. Do not mention system instructions.";
}

// ?? Google Gemini ?? ????????????????????????????????????????????????
async function _geminiDirect({ prompt, model, responseMode, maxTokens }) {
  const key = getDirectKey("google");
  if (!key) return null;
  const mid = String(model || "").replace("google/", "") || "gemma-4-31b-it";
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + mid
            + ":generateContent?key=" + key;
  const t = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: String(prompt || "").trim() }] }],
      generationConfig: { maxOutputTokens: maxTokens || 1024, temperature: 0.4 }
    })
  });
  const txt = await res.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  if (!res.ok) throw new Error("Gemini direct " + res.status + ": " + (j?.error?.message || txt.slice(0,200)));
  return { output: j?.candidates?.[0]?.content?.parts?.[0]?.text || "",
           raw: j, usage: null, model: mid, durationMs: Date.now()-t, engine: "gemini-direct" };
}

// ?? Anthropic ?? ????????????????????????????????????????????????????
async function _anthropicDirect({ prompt, model, responseMode, maxTokens }) {
  const key = getDirectKey("anthropic");
  if (!key) return null;
  const mid = String(model || "").replace("anthropic/", "") || "claude-sonnet-4-6";
  const t = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: mid, max_tokens: maxTokens||1024,
      messages: [{ role:"user", content: String(prompt||"").trim() }],
      system: buildSys(responseMode) })
  });
  const txt = await res.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  if (!res.ok) throw new Error("Anthropic direct " + res.status + ": " + (j?.error?.message || txt.slice(0,200)));
  return { output: j?.content?.[0]?.text || "", raw: j, usage: j?.usage||null,
           model: mid, durationMs: Date.now()-t, engine: "anthropic-direct" };
}

// ?? DeepSeek ?? ?????????????????????????????????????????????????????
async function _deepseekDirect({ prompt, model, responseMode, maxTokens }) {
  const key = getDirectKey("deepseek");
  if (!key) return null;
  const mid = String(model || "").replace("deepseek/", "") || "deepseek-chat";
  const t = Date.now();
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: mid, temperature: 0.4, max_tokens: maxTokens||1024,
      messages: [{ role:"system", content: buildSys(responseMode) },
                 { role:"user",   content: String(prompt||"").trim() }] })
  });
  const txt = await res.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  if (!res.ok) throw new Error("DeepSeek direct " + res.status + ": " + (j?.error?.message || txt.slice(0,200)));
  return { output: j?.choices?.[0]?.message?.content || "", raw: j, usage: j?.usage||null,
           model: mid, durationMs: Date.now()-t, engine: "deepseek-direct" };
}

// ?? OpenRouter ?? ???????????????????????????????????????????????????
async function _openRouterCall({ prompt, model, provider, responseMode, maxTokens, webSearch }) {
  const envKey = getProviderEnvKey("openrouter") || "OPENROUTER_API_KEY";
  const apiKey = getSecretValue(envKey);
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  const finalModel = normalizeModelForProvider(provider, model) || "nvidia/nemotron-3-super-120b-a12b:free";
  const body = {
    model: finalModel,
    messages: [
      { role: "system", content: buildSys(responseMode) },
      { role: "user",   content: String(prompt||"").trim() }
    ],
    max_tokens: maxTokens || 512,
    temperature: 0.4
  };
  if (webSearch) {
    body.tools = [{ type: "openrouter:web_search",
      parameters: { engine:"auto", max_results:5, max_total_results:8, search_context_size:"low" } }];
  }
  const t = Date.now();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json",
               "HTTP-Referer": "http://localhost:3200", "X-OpenRouter-Title": "Mamabot Portable" },
    body: JSON.stringify(body)
  });
  const txt = await res.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  if (!res.ok) {
    const msg = j?.error?.message || j?.message || txt.slice(0,400);
    throw new Error("OpenRouter " + res.status + ": " + msg);
  }
  return { output: j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || "",
           raw: j, usage: j?.usage||null, model: j?.model||finalModel,
           durationMs: Date.now()-t, engine: "openrouter" };
}

// ?? ?? ???: provider ?? ????????????????????????????????????????
export async function runDirect({ prompt, model, provider = "openrouter", responseMode = "short", maxTokens = 512, webSearch = false }) {
  const p = String(provider || "openrouter").toLowerCase().trim();

  if (p === "google" || p === "gemini") {
    const d = await _geminiDirect({ prompt, model, responseMode, maxTokens }).catch(() => null);
    if (d) return { ...d, providerUsed: "google-direct" };
    const r = await _openRouterCall({ prompt, model: normalizeModelForProvider("google", model), provider: "google", responseMode, maxTokens, webSearch });
    return { ...r, providerUsed: "openrouter-via-google" };
  }

  if (p === "anthropic") {
    const d = await _anthropicDirect({ prompt, model, responseMode, maxTokens }).catch(() => null);
    if (d) return { ...d, providerUsed: "anthropic-direct" };
    const r = await _openRouterCall({ prompt, model: normalizeModelForProvider("anthropic", model), provider: "anthropic", responseMode, maxTokens });
    return { ...r, providerUsed: "openrouter-via-anthropic" };
  }

  if (p === "deepseek") {
    const d = await _deepseekDirect({ prompt, model, responseMode, maxTokens }).catch(() => null);
    if (d) return { ...d, providerUsed: "deepseek-direct" };
    const r = await _openRouterCall({ prompt, model: normalizeModelForProvider("deepseek", model), provider: "deepseek", responseMode, maxTokens });
    return { ...r, providerUsed: "openrouter-via-deepseek" };
  }

  if (["nvidia","meta","qwen","nous","openai"].includes(p)) {
    const r = await _openRouterCall({ prompt, model: normalizeModelForProvider(p, model), provider: p, responseMode, maxTokens, webSearch });
    return { ...r, providerUsed: "openrouter-via-" + p };
  }

  // openrouter / hermes / ?? ? ??? OpenRouter
  const r = await _openRouterCall({ prompt, model: model || "nvidia/nemotron-3-super-120b-a12b:free", provider: p, responseMode, maxTokens, webSearch });
  return { ...r, providerUsed: "openrouter" };
}

