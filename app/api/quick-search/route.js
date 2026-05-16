export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runDirect } from "../../lib/directModelClient.js";
import { saveRun } from "../../lib/runStore.js";
import { createSession, getSession, updateSession } from "../../lib/sessionStore.js";
import { buildSessionMemoryPack, updateSessionMemoryFromTurn, createQuickSessionId } from "../../lib/sessionMemory.js";

const OUTPUT_LIMIT = {
  short: 900,
  normal: 1200,
  detailed: 1800
};

const MAX_QUERY_CHARS = 400;
const MAX_RESULTS = 2;
const MAX_SNIPPET_CHARS = 350;

function getEnvFilePath() {
  return path.join(process.cwd(), "runtime", "hermes", "home", ".env");
}

function parseEnv(text) {
  const out = {};

  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

function readEnv() {
  const filePath = getEnvFilePath();
  const fileEnv = fs.existsSync(filePath)
    ? parseEnv(fs.readFileSync(filePath, "utf8"))
    : {};

  return { ...fileEnv, ...process.env };
}

function normalizeProvider(provider) {
  const p = String(provider || "").trim();

  if (p === "gemini-api") return "gemini";
  if (p === "groq-api") return "groq";
  if (p === "nvidia-api") return "nvidia";
  if (p === "cloudflare-api") return "cloudflare";
  if (p === "openrouter-api") return "openrouter";
  if (p === "deepseek-api") return "deepseek";

  if (["gemini", "groq", "nvidia", "cloudflare", "openrouter", "deepseek", "openai", "anthropic"].includes(p)) {
    return p;
  }

  return "gemini";
}

function compactForSave(value, max = 500) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + "...";
}

function makeQuickTitle(question) {
  const title = compactForSave(question, 48);
  return title || "Quick Search";
}

function isLowValueSearchQuestion(question) {
  const raw = String(question || "").trim();
  const q = raw.toLowerCase();
  const compact = raw.replace(/[\s.?!,，。！？~]/g, "").toLowerCase();

  const smallTalk = [
    "안녕",
    "안녕하세요",
    "고마워",
    "감사",
    "땡큐",
    "thanks",
    "thankyou",
    "hello",
    "hi"
  ];

  if (smallTalk.includes(compact)) return true;
  if (compact.length <= 3) return true;

  const internalWords = [
    "세션",
    "대화기록",
    "대화 기록",
    "저장",
    "기록",
    "메모리",
    "기억",
    "호칭",
    "뭐라고 부르",
    "부르기로",
    "나를 뭐라고",
    "테스트",
    "저장되는지",
    "기억하",
    "remember",
    "call me",
    "session",
    "history",
    "memory",
    "save",
    "saved"
  ];

  if (internalWords.some((word) => q.includes(String(word).toLowerCase()) || raw.includes(word))) {
    return true;
  }

  return false;
}

function shouldUseQuickSearch(question, intent, needsFreshInfo) {
  // Internal/session/memory questions must never use external search.
  if (isLowValueSearchQuestion(question)) return false;

  // Fresh/current questions should use Tavily.
  if (needsFreshInfo) return true;

  // For Quick Search, normal factual questions use search by default.
  return true;
}

function buildLocalQuickAnswer({ question, memoryPack, shouldSearch }) {
  if (shouldSearch) return "";

  const raw = String(question || "").trim();
  const q = raw.toLowerCase();
  const displayName = String(memoryPack?.userDisplayName || "").trim();

  const asksName =
    raw.includes("뭐라고 부르") ||
    raw.includes("부르기로") ||
    raw.includes("호칭") ||
    raw.includes("나를 뭐라고") ||
    q.includes("what do you call me");

  if (asksName) {
    if (displayName) {
      return [
        "* **확인:** 이 세션에서는 사용자를 '" + displayName + "'이라고 부르기로 했습니다.",
        "* **이유:** 해당 호칭은 현재 대화창의 세션 기억에 저장되어 있습니다.",
        "* **참고:** 다른 대화창에서는 별도로 다시 지정해야 합니다."
      ].join("\n");
    }

    return [
      "* **확인:** 아직 이 세션에 저장된 호칭이 없습니다.",
      "* **방법:** '앞으로 나를 마마님이라고 불러'처럼 말하면 이 대화창 안에서 기억합니다.",
      "* **참고:** 세션별 기억이라 다른 대화창에는 적용되지 않습니다."
    ].join("\n");
  }

  const asksSessionStatus =
    raw.includes("세션") ||
    raw.includes("대화기록") ||
    raw.includes("대화 기록") ||
    raw.includes("저장") ||
    raw.includes("기록") ||
    raw.includes("메모리") ||
    raw.includes("저장되는지") ||
    q.includes("session") ||
    q.includes("history") ||
    q.includes("saved");

  if (asksSessionStatus) {
    return [
      "* **확인:** 네, 이 Quick 대화는 현재 세션 기록에 저장됩니다.",
      "* **이유:** 사용자 질문과 답변이 같은 sessionId 아래에 메시지와 실행 기록으로 함께 저장됩니다.",
      "* **참고:** 같은 대화창에서는 이전 대화와 세션별 기억을 이어서 사용할 수 있습니다."
    ].join("\n");
  }

  const compact = raw.replace(/[\s.?!,，。！？~]/g, "").toLowerCase();

  if (["안녕", "안녕하세요", "hello", "hi"].includes(compact)) {
    return displayName
      ? displayName + ", 안녕하세요! 무엇을 도와드릴까요?"
      : "안녕하세요! 무엇을 도와드릴까요?";
  }

  return "";
}

function saveQuickSearchConversation({
  runId,
  sessionId,
  question,
  output,
  provider,
  providerUsed,
  model,
  intent,
  searchUsed,
  searchCount,
  durationMs,
  usage,
  evidencePack
}) {
  const now = new Date().toISOString();
  const safeSessionId = String(sessionId || "").trim();

  if (!safeSessionId) {
    return { ok: false, reason: "missing-session-id" };
  }

  const searchSummary = Array.isArray(evidencePack?.searches)
    ? evidencePack.searches.map((item) => ({
        label: item.label || "",
        query: item.query || "",
        resultCount: Array.isArray(item.results) ? item.results.length : 0
      }))
    : [];

  const record = {
    runId,
    sessionId: safeSessionId,
    status: "completed",
    ok: true,
    dryRun: false,
    mode: "quick-search",
    engine: "quick-search",
    executionProfile: "quick",
    provider,
    providerUsed,
    model,
    prompt: question,
    promptPreview: compactForSave(question, 240),
    output,
    outputPreview: compactForSave(output, 240),
    intent,
    searchUsed,
    searchCount,
    searchSummary,
    usage: usage || null,
    durationMs: durationMs || null,
    createdAt: now,
    updatedAt: now
  };

  try {
    const saved = saveRun(record);
    const finalRunId = saved.runId || runId;

    const userMessage = {
      id: finalRunId + "-user",
      role: "user",
      content: question,
      runId: finalRunId,
      createdAt: now,
      mode: "quick-search"
    };

    const assistantMessage = {
      id: finalRunId + "-assistant",
      role: "assistant",
      content: output,
      runId: finalRunId,
      createdAt: now,
      mode: "quick-search",
      providerUsed,
      model,
      searchUsed,
      searchCount
    };

    const existing = getSession(safeSessionId);

    if (existing?.sessionId) {
      const currentMessages = Array.isArray(existing.messages) ? existing.messages : [];
      const currentRuns = Array.isArray(existing.runs) ? existing.runs : [];

      const nextMessages = [
        ...currentMessages.filter((msg) => msg.runId !== finalRunId),
        userMessage,
        assistantMessage
      ].slice(-60);

      const nextRuns = [
        ...currentRuns.filter((item) => item !== finalRunId),
        finalRunId
      ].slice(-100);

      updateSession(safeSessionId, {
        title: existing.title || makeQuickTitle(question),
        updatedAt: now,
        messages: nextMessages,
        runs: nextRuns,
        memory: {
          ...(existing.memory || {}),
          currentGoal: existing.memory?.currentGoal || compactForSave(question, 160),
          summary: existing.memory?.summary || "Quick Search conversation"
        }
      });
    } else {
      createSession({
        sessionId: safeSessionId,
        title: makeQuickTitle(question),
        prompt: question,
        workspaceRoot: "",
        status: "active",
        messages: [userMessage, assistantMessage],
        runs: [finalRunId],
        memory: {
          summary: "Quick Search conversation",
          currentGoal: compactForSave(question, 160),
          decisions: [],
          nextActions: ["Continue this Quick Search conversation."],
          knownRisks: []
        }
      });
    }

    return {
      ok: true,
      runId: finalRunId,
      sessionId: safeSessionId
    };
  } catch (error) {
    return {
      ok: false,
      runId,
      sessionId: safeSessionId,
      error: error.message || String(error)
    };
  }
}

function containsAny(text, words) {
  const q = String(text || "").toLowerCase();
  return words.some((word) => q.includes(String(word).toLowerCase()));
}

function detectFreshNeed(question) {
  return containsAny(question, [
    "\uC624\uB298",
    "\uD604\uC7AC",
    "\uCD5C\uC2E0",
    "\uCD5C\uADFC",
    "\uC9C0\uAE08",
    "\uC2E4\uC2DC\uAC04",
    "\uB274\uC2A4",
    "\uAC00\uACA9",
    "\uC2DC\uC138",
    "\uC8FC\uAC00",
    "\uCF54\uC778",
    "\uBE44\uD2B8\uCF54\uC778",
    "\uD658\uC728",
    "\uB0A0\uC528",
    "\uC77C\uC815",
    "\uC7A5\uC560",
    "\uC5C5\uB370\uC774\uD2B8",
    "\uBB34\uB8CC",
    "\uAC00\uACA9\uD45C",
    "\uC5D0\uB7EC\uCF54\uB4DC",
    "\uD2F0\uC5B4",
    "pricing",
    "free tier",
    "latest",
    "current",
    "today",
    "stock",
    "weather",
    "crypto",
    "exchange rate",
    "news",
    "status",
    "error code",
    "api"
  ]);
}

function detectIntent(question) {
  if (containsAny(question, ["\uB0A0\uC528", "weather"])) return "weather";
  if (containsAny(question, ["\uC8FC\uAC00", "stock", "nasdaq", "\uC5D4\uBE44\uB514\uC544", "nvidia"])) return "finance";
  if (containsAny(question, ["\uCF54\uC778", "\uBE44\uD2B8\uCF54\uC778", "crypto", "btc"])) return "crypto";
  if (containsAny(question, ["\uD658\uC728", "exchange rate", "usd", "\uB2EC\uB7EC"])) return "fx";
  if (containsAny(question, ["\uAC00\uACA9", "pricing", "\uBB34\uB8CC", "free tier", "\uD2F0\uC5B4"])) return "pricing_search";
  if (containsAny(question, ["\uC5D0\uB7EC", "error", "status code"])) return "official_doc_search";
  if (containsAny(question, ["\uB274\uC2A4", "latest", "\uCD5C\uC2E0", "\uC624\uB298"])) return "fresh_search";

  return detectFreshNeed(question) ? "fresh_search" : "general";
}

function sanitizeEvidenceContent(value) {
  const text = String(value || "");
  return text
    .split(/(?<=[.!??])\s+/)
    .filter((sentence) => {
      const s = sentence.toLowerCase();
      return (
        !s.includes("audio") &&
        !s.includes("image") &&
        !s.includes("video") &&
        !s.includes("???") &&
        !s.includes("???") &&
        !s.includes("???")
      );
    })
    .join(" ")
    .trim();
}

function compactText(value, maxChars = MAX_SNIPPET_CHARS) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trim() + "...";
}

function getTavilyTopic(intent) {
  if (intent === "finance" || intent === "crypto" || intent === "fx") return "finance";
  if (intent === "fresh_search") return "news";
  return "general";
}

function buildSearchQuery(question, intent = "general") {
  const q = String(question || "")
    .replace(/\s+/g, " ")
    .trim();

  const lower = q.toLowerCase();

  if (intent === "pricing_search") {
    return (q + " official API pricing free tier docs current").slice(0, MAX_QUERY_CHARS);
  }

  if (lower.includes("gemini") && lower.includes("groq")) {
    return "Gemini API free tier Groq API free tier pricing official docs current";
  }

  return q.slice(0, MAX_QUERY_CHARS);
}

function buildSearchPlans(question, intent = "general") {
  const raw = String(question || "");
  const q = raw.toLowerCase();

  const hasGemini = q.includes("gemini") || raw.includes("\uC81C\uBBF8\uB098\uC774");
  const hasGroq = q.includes("groq") || raw.includes("\uADF8\uB85D");
  const hasNvidia = q.includes("nvidia") || raw.includes("\uC5D4\uBE44\uB514\uC544");
  const hasCloudflare = q.includes("cloudflare") || raw.includes("\uD074\uB77C\uC6B0\uB4DC\uD50C\uB808\uC5B4");

  const hasFreeOrPricing =
    q.includes("free") ||
    q.includes("tier") ||
    q.includes("pricing") ||
    q.includes("price") ||
    q.includes("api") ||
    raw.includes("\uBB34\uB8CC") ||
    raw.includes("\uD2F0\uC5B4") ||
    raw.includes("\uAC00\uACA9");

  const shouldSplit =
    hasFreeOrPricing ||
    intent === "pricing_search" ||
    intent === "fresh_search";

  const plans = [];

  if (shouldSplit && hasGemini) {
    plans.push({
      label: "Gemini API official pricing/free tier",
      query: "Gemini API pricing free tier official docs current",
      domains: ["ai.google.dev"]
    });
  }

  if (shouldSplit && hasGroq) {
    plans.push({
      label: "Groq API official free tier/rate limits",
      query: "Groq API free tier rate limits official docs current",
      domains: ["console.groq.com"]
    });
  }

  if (shouldSplit && hasNvidia) {
    plans.push({
      label: "NVIDIA NIM official API pricing/free credits",
      query: "NVIDIA NIM API pricing free credits official docs current",
      domains: ["build.nvidia.com", "docs.nvidia.com"]
    });
  }

  if (shouldSplit && hasCloudflare) {
    plans.push({
      label: "Cloudflare Workers AI official pricing/free quota",
      query: "Cloudflare Workers AI pricing free quota official docs current",
      domains: ["developers.cloudflare.com"]
    });
  }

  if (plans.length > 0) return plans.slice(0, 4);

  return [{
    label: "General fresh search",
    query: buildSearchQuery(question, intent),
    domains: []
  }];
}

async function searchTavily({ query, intent, apiKey, domains = [] }) {
  if (!apiKey) {
    return {
      ok: false,
      source: "tavily",
      query,
      error: "TAVILY_API_KEY is not configured",
      results: []
    };
  }

  const body = {
    query,
    topic: getTavilyTopic(intent),
    search_depth: "basic",
    max_results: MAX_RESULTS,
    include_answer: true,
    include_raw_content: false,
    include_images: false
  };

  if (Array.isArray(domains) && domains.length > 0) {
    body.include_domains = domains;
  }

  body.exclude_domains = [
    "community.groq.com",
    "reddit.com",
    "x.com",
    "twitter.com",
    "medium.com"
  ];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey
    },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      source: "tavily",
      query,
      error: json?.error || json?.message || "Tavily search failed: " + res.status,
      results: []
    };
  }

  const results = Array.isArray(json.results) ? json.results : [];

  return {
    ok: true,
    source: "tavily",
    query,
    topic: getTavilyTopic(intent),
    answer: "",
    results: results.slice(0, MAX_RESULTS).map((item, index) => ({
      rank: index + 1,
      title: compactText(item.title, 120),
      url: item.url || "",
      content: compactText(sanitizeEvidenceContent(item.content || item.snippet || ""), 240),
      score: item.score ?? null
    }))
  };
}

async function buildEvidencePack({ question, intent, needsFreshInfo, shouldSearch }) {
  const env = readEnv();
  const now = new Date();

  const evidence = [
    {
      type: "runtime",
      title: "Current date",
      summary: now.toISOString()
    },
    {
      type: "mode",
      title: "Quick Search policy",
      summary: "No workspace files, no project index, no local code reading, no patching."
    }
  ];

  let search = null;
  let searches = [];

  if (shouldSearch) {
    const plans = buildSearchPlans(question, intent);

    searches = await Promise.all(
      plans.map(async (plan) => {
        const result = await searchTavily({
          query: plan.query,
          intent,
          apiKey: env.TAVILY_API_KEY || "",
          domains: plan.domains || []
        });

        return {
          label: plan.label,
          ...result
        };
      })
    );

    const okSearches = searches.filter((item) => item.ok);
    search = okSearches[0] || searches[0] || null;

    if (okSearches.length > 0) {
      evidence.push({
        type: "web_search",
        title: "Tavily provider-split search results",
        summary: "Search results are split by provider and compacted to reduce token usage.",
        searches: okSearches.map((item) => ({
          label: item.label,
          query: item.query,
          topic: item.topic,
          answer: item.answer || "",
          results: item.results || []
        }))
      });
    } else {
      evidence.push({
        type: "search_error",
        title: "Tavily search unavailable",
        summary: search?.error || "Search failed"
      });
    }
  }

  return {
    question: String(question || "").trim(),
    intent,
    needsFreshInfo,
    searchProvider: shouldSearch ? "tavily" : "none",
    maxResults: MAX_RESULTS,
    maxSnippetChars: MAX_SNIPPET_CHARS,
    evidence,
    search,
    searches
  };
}

function buildQuickPrompt({ question, responseStyle, evidencePack, memoryPack }) {
  const style = ["short", "normal", "detailed"].includes(responseStyle) ? responseStyle : "short";
  const searchProvider = String(evidencePack?.searchProvider || "none");
  const hasWebEvidence = searchProvider !== "none";

  const lines = [
    "You are Mamabot Quick Search mode.",
    "",
    "Goal:",
    "Answer the user's question with the smallest useful response.",
    "",
    "Rules:",
    "- Do not read workspace files, project index, or local code.",
    "- Do not modify files.",
    "- Respect the session memory pack when relevant.",
    "- If memoryPack.userDisplayName exists, address the user by that name naturally.",
    "- Answer in the user's language.",
    "- Start with the final answer first.",
    "- Do not greet unless the user only greeted you.",
    "- Finish the answer completely. Do not stop mid-sentence.",
    "- For internal/session/memory/save/history questions, answer from session memory only.",
    "- If searchProvider is none, do not mention sources, web results, official docs, citations, external sites, or '(source: ...)'.",
    "- If searchProvider is none, do not invent references.",
    "- Only mention sources when web_search evidence exists in the evidence pack.",
    "- For comparison questions, use this structure: Recommendation / Reason / Caveat.",
    "- For questions asking which provider is better for testing, answer as a practical recommendation, not a pricing report.",
    "- Do not recommend a provider only because its quota number is easier to state.",
    "- Do not list unrelated pricing details unless the user specifically asks for prices.",
    "- Ignore audio, image, or video pricing unless the user asks about it.",
    "- Never mention audio/image/video pricing in a text-model comparison.",
    "- Do not mention old experimental model IDs unless the user asks about old models.",
    "- Do not state exact prices, limits, quotas, or token counts unless the evidence explicitly and directly supports them.",
    "- Prefer cautious wording: exact limits may depend on account, region, model, and billing tier.",
    "",
    "Output budget:",
    style === "short" ? "- Exactly 3 short bullet points max. Max 100 Korean words total." : "",
    style === "normal" ? "- Max 5 lines, max 220 words." : "",
    style === "detailed" ? "- Max 450 words." : "",
    "- Avoid long introductions.",
    hasWebEvidence ? "- Add a very short source summary when web evidence is used." : "- Do not add a source summary.",
    "",
    "Session memory pack:",
    JSON.stringify(memoryPack || {}, null, 2),
    "",
    "Evidence pack:",
    JSON.stringify(evidencePack, null, 2),
    "",
    "User question:",
    question
  ];

  return lines.filter(Boolean).join("\n");
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const question = String(body.prompt || body.userPrompt || "").trim();
    const responseStyle = String(body.responseStyle || "short").trim();

    if (!question) {
      return NextResponse.json(
        { ok: false, error: "prompt is required" },
        { status: 400 }
      );
    }

    const provider = normalizeProvider(body.provider || body.requestProvider || "gemini");
    const model = String(body.model || "").trim();
    const sessionId = String(body.sessionId || body.activeSessionId || createQuickSessionId()).trim();
    const runId = "run-" + Date.now() + "-quick";
    const intent = detectIntent(question);
    const needsFreshInfo = detectFreshNeed(question);
    const shouldSearch = shouldUseQuickSearch(question, intent, needsFreshInfo);
    const evidencePack = await buildEvidencePack({ question, intent, needsFreshInfo, shouldSearch });
    const memoryPack = buildSessionMemoryPack(sessionId);
    const quickPrompt = buildQuickPrompt({ question, responseStyle, evidencePack, memoryPack });

    const localOutput = buildLocalQuickAnswer({
      question,
      memoryPack,
      shouldSearch
    });

    const result = localOutput
      ? {
          output: localOutput,
          providerUsed: "local-rule",
          model: "quick-local",
          usage: null,
          durationMs: 0,
          finishReason: "LOCAL"
        }
      : await runDirect({
          provider,
          model,
          prompt: quickPrompt,
          responseMode: responseStyle,
          maxTokens: OUTPUT_LIMIT[responseStyle] || OUTPUT_LIMIT.short
        });

    const updatedMemory = updateSessionMemoryFromTurn({
      sessionId,
      userText: question,
      assistantText: result.output || ""
    });

    const savedConversation = saveQuickSearchConversation({
      runId,
      sessionId,
      question,
      output: result.output || "",
      provider,
      providerUsed: result.providerUsed || provider,
      model: result.model || model || "",
      intent,
      searchUsed: shouldSearch,
      searchCount: Array.isArray(evidencePack.searches) ? evidencePack.searches.filter((item) => item.ok).length : 0,
      durationMs: result.durationMs || null,
      usage: result.usage || null,
      evidencePack
    });

    return NextResponse.json({
      ok: true,
      mode: "quick-search",
      executionProfile: "quick",
      sessionId,
      runId: savedConversation.runId || runId,
      savedToSession: !!savedConversation.ok,
      saveError: savedConversation.error || "",
      intent,
      needsFreshInfo,
      searchUsed: shouldSearch,
      searchProvider: evidencePack.searchProvider,
      searchOk: evidencePack.search?.ok ?? null,
      searchCount: Array.isArray(evidencePack.searches) ? evidencePack.searches.filter((item) => item.ok).length : 0,
      providerUsed: result.providerUsed || provider,
      model: result.model || model || "",
      output: result.output || "",
      usage: result.usage || null,
      durationMs: result.durationMs || null,
      finishReason: result.finishReason || result.raw?.candidates?.[0]?.finishReason || null,
      evidencePack,
      memoryPack: buildSessionMemoryPack(sessionId),
      memoryUpdatedAt: updatedMemory.updatedAt || null
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "quick-search",
        error: error.message || String(error),
        output: error.message || String(error)
      },
      { status: 500 }
    );
  }
}
