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
    { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash ? FREE TIER ? ?? 1", ctx: 1048576 },
    { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro ? ??? ? ?? 5", ctx: 1048576, paidPossible: true },
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
    groq:      ["GROQ_API_KEY"],
    nvidia:    ["NVIDIA_API_KEY", "NGC_API_KEY"],
    cloudflare:["CLOUDFLARE_API_TOKEN"],
  };
  for (const k of (keyMap[providerName] || [])) {
    const v = getSecretValue(k);
    if (v) return v;
  }
  return null;
}

function getCloudflareAccountId() {
  return getSecretValue("CLOUDFLARE_ACCOUNT_ID") || getSecretValue("CF_ACCOUNT_ID") || "";
}

function stripProviderPrefix(model, provider) {
  const value = String(model || "").trim();
  if (!value) return "";
  if (provider === "groq") return value.replace(/^groq\//, "");
  if (provider === "cloudflare") return value.replace(/^cloudflare\//, "");
  return value;
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
  if (!key) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY missing");
  const mid = String(model || "").replace("google/", "") || "gemma-4-31b-it";
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + mid
            + ":generateContent?key=" + key;
  const t = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: String(prompt || "").trim() }] }],
      generationConfig: {
        maxOutputTokens: maxTokens || 1024,
        temperature: 0.4,
        ...(String(mid).includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {})
      }
    })
  });
  const txt = await res.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  if (!res.ok) throw new Error("Gemini direct " + res.status + ": " + (j?.error?.message || txt.slice(0,200)));
  const candidate = j?.candidates?.[0] || null;
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const output = parts
    .map((part) => part?.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();

  return {
    output,
    raw: j,
    usage: j?.usageMetadata || null,
    finishReason: candidate?.finishReason || "",
    model: mid,
    durationMs: Date.now() - t,
    engine: "gemini-direct"
  };
}

async function _groqDirect({ prompt, model, responseMode, maxTokens }) {
  const key = getDirectKey("groq");
  if (!key) throw new Error("GROQ_API_KEY missing");
  const mid = stripProviderPrefix(model, "groq") || "llama-3.1-8b-instant";
  const t = Date.now();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: mid,
      temperature: 0.4,
      max_tokens: maxTokens || 1024,
      messages: [
        { role: "system", content: buildSys(responseMode) },
        { role: "user", content: String(prompt || "").trim() }
      ]
    })
  });

  const txt = await res.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  if (!res.ok) throw new Error("Groq direct " + res.status + ": " + (j?.error?.message || txt.slice(0,200)));

  return {
    output: j?.choices?.[0]?.message?.content || "",
    raw: j,
    usage: j?.usage || null,
    model: j?.model || mid,
    durationMs: Date.now() - t,
    engine: "groq-direct"
  };
}

async function _nvidiaDirect({ prompt, model, responseMode, maxTokens }) {
  const key = getDirectKey("nvidia");
  if (!key) throw new Error("NVIDIA_API_KEY or NGC_API_KEY missing");
  const mid = String(model || "").trim() || "nvidia/llama-3.1-nemotron-ultra-253b-v1";
  const t = Date.now();

  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: mid,
      temperature: 0.4,
      max_tokens: maxTokens || 1024,
      messages: [
        { role: "system", content: buildSys(responseMode) },
        { role: "user", content: String(prompt || "").trim() }
      ]
    })
  });

  const txt = await res.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  if (!res.ok) throw new Error("NVIDIA direct " + res.status + ": " + (j?.error?.message || txt.slice(0,200)));

  return {
    output: j?.choices?.[0]?.message?.content || "",
    raw: j,
    usage: j?.usage || null,
    model: j?.model || mid,
    durationMs: Date.now() - t,
    engine: "nvidia-direct"
  };
}

async function _cloudflareDirect({ prompt, model, responseMode, maxTokens }) {
  const key = getDirectKey("cloudflare");
  const accountId = getCloudflareAccountId();
  if (!key) throw new Error("CLOUDFLARE_API_TOKEN missing");
  if (!accountId) throw new Error("CLOUDFLARE_ACCOUNT_ID missing");

  const mid = stripProviderPrefix(model, "cloudflare") || "@cf/meta/llama-3.1-8b-instruct";
  const t = Date.now();

  const res = await fetch("https://api.cloudflare.com/client/v4/accounts/" + encodeURIComponent(accountId) + "/ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: mid,
      temperature: 0.4,
      max_tokens: maxTokens || 1024,
      messages: [
        { role: "system", content: buildSys(responseMode) },
        { role: "user", content: String(prompt || "").trim() }
      ]
    })
  });

  const txt = await res.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  if (!res.ok) throw new Error("Cloudflare direct " + res.status + ": " + (j?.error?.message || txt.slice(0,200)));

  return {
    output: j?.choices?.[0]?.message?.content || j?.result?.response || "",
    raw: j,
    usage: j?.usage || null,
    model: j?.model || mid,
    durationMs: Date.now() - t,
    engine: "cloudflare-direct"
  };
}


// ?? Anthropic ?? ????????????????????????????????????????????????????
async function _anthropicDirect({ prompt, model, responseMode, maxTokens }) {
  const key = getDirectKey("anthropic");
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
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
async function _openAiDirect({ prompt, model, responseMode, maxTokens }) {
  const key = getDirectKey("openai");
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const mid = String(model || "").replace("openai/", "") || "gpt-4.1";
  const t = Date.now();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: mid,
      temperature: 0.4,
      max_tokens: maxTokens || 1024,
      messages: [
        { role: "system", content: buildSys(responseMode) },
        { role: "user", content: String(prompt || "").trim() }
      ]
    })
  });

  const txt = await res.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  if (!res.ok) throw new Error("OpenAI direct " + res.status + ": " + (j?.error?.message || txt.slice(0,200)));

  return {
    output: j?.choices?.[0]?.message?.content || "",
    raw: j,
    usage: j?.usage || null,
    model: j?.model || mid,
    durationMs: Date.now() - t,
    engine: "openai-direct"
  };
}

async function _deepseekDirect({ prompt, model, responseMode, maxTokens }) {
  const key = getDirectKey("deepseek");
  if (!key) throw new Error("DEEPSEEK_API_KEY missing");
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
  const p = String(provider || "openrouter").toLowerCase().trim().replace(/_/g, "-");

  if (p === "openrouter" || p === "hermes") {
    const r = await _openRouterCall({
      prompt,
      model: model || "nvidia/nemotron-3-super-120b-a12b:free",
      provider: "openrouter",
      responseMode,
      maxTokens,
      webSearch
    });
    return { ...r, providerUsed: "openrouter" };
  }

  if (p === "google" || p === "gemini" || p === "gemini-api") {
    const d = await _geminiDirect({ prompt, model, responseMode, maxTokens });
    return { ...d, providerUsed: "gemini-direct" };
  }

  if (p === "anthropic" || p === "anthropic-api") {
    const d = await _anthropicDirect({ prompt, model, responseMode, maxTokens });
    return { ...d, providerUsed: "anthropic-direct" };
  }

  if (p === "openai" || p === "openai-api") {
    const d = await _openAiDirect({ prompt, model, responseMode, maxTokens });
    return { ...d, providerUsed: "openai-direct" };
  }

  if (p === "groq" || p === "groq-api") {
    const d = await _groqDirect({ prompt, model, responseMode, maxTokens });
    return { ...d, providerUsed: "groq" };
  }

  if (p === "nvidia" || p === "nvidia-api") {
    const d = await _nvidiaDirect({ prompt, model, responseMode, maxTokens });
    return { ...d, providerUsed: "nvidia" };
  }

  if (p === "cloudflare" || p === "cloudflare-api") {
    const d = await _cloudflareDirect({ prompt, model, responseMode, maxTokens });
    return { ...d, providerUsed: "cloudflare" };
  }

  if (p === "deepseek" || p === "deepseek-api") {
    const d = await _deepseekDirect({ prompt, model, responseMode, maxTokens });
    return { ...d, providerUsed: "deepseek-direct" };
  }

  throw new Error("Direct provider is not supported without explicit adapter: " + p);
}

