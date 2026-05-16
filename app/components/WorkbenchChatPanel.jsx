"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FolderPickerModal from "./FolderPickerModal.jsx";

const PROVIDER_MODEL_ENDPOINTS = {
  hermes: "/api/models/openrouter",
  openrouter: "/api/models/openrouter",
  "gemini-api": "/api/models/gemini",
  deepseek: "/api/models/deepseek",
  groq: "/api/models/groq",
  nvidia: "/api/models/nvidia",
  cloudflare: "/api/models/cloudflare"
};

const providerOptions = [
  { id: "hermes",        label: "Hermes Agent",       kind: "agent",    note: "Hermes 실행 / 에이전트 작업" },
  { id: "claude-code",   label: "Claude Code CLI",    kind: "auth-cli", note: "구독/OAuth 기반 CLI" },
  { id: "codex-cli",     label: "Codex CLI",          kind: "auth-cli", note: "ChatGPT OAuth 기반 CLI" },
  { id: "gemini-cli",    label: "Gemini CLI",         kind: "auth-cli", note: "Google Login 기반 CLI" },
  { id: "openrouter",    label: "OpenRouter API",     kind: "api",      note: "OpenRouter API Key" },
  { id: "gemini-api",    label: "Gemini API",         kind: "api",      note: "GEMINI_API_KEY / GOOGLE_API_KEY" },
  { id: "openai-api",    label: "OpenAI API",         kind: "api",      note: "OPENAI_API_KEY" },
  { id: "anthropic-api", label: "Anthropic API",      kind: "api",      note: "ANTHROPIC_API_KEY" },
  { id: "groq",          label: "Groq API",           kind: "api",      note: "GROQ_API_KEY" },
  { id: "nvidia",        label: "NVIDIA NIM API",    kind: "api",      note: "NVIDIA_API_KEY / NGC_API_KEY" },
  { id: "cloudflare",    label: "Cloudflare Workers AI", kind: "api",  note: "CLOUDFLARE_API_TOKEN + ACCOUNT_ID" },
  { id: "deepseek",      label: "DeepSeek API",       kind: "api",      note: "DEEPSEEK_API_KEY" }
];


function isAuthCliProviderId(providerId = "") {
  return ["claude-code", "codex-cli", "gemini-cli"].includes(String(providerId || "").trim());
}

function isDirectApiProviderId(providerId = "") {
  return ["openrouter", "gemini-api", "openai-api", "anthropic-api", "deepseek", "groq", "nvidia", "cloudflare"].includes(String(providerId || "").trim());
}

function normalizeProviderModelGroup(providerId = "") {
  const id = String(providerId || "").trim();

  if (id === "gemini-api") return "google";
  if (id === "openai-api") return "openai";
  if (id === "anthropic-api") return "anthropic";

  return id;
}

function modelMatchesProvider(item, providerId = "") {
  const id = String(item?.id || "").toLowerCase();
  const group = normalizeProviderModelGroup(providerId);

  if (!id) return false;
  if (providerId === "hermes") return true;
  if (providerId === "openrouter") return true;
  if (group === "google") return id.startsWith("google/gemini") || id.startsWith("gemini-");
  if (group === "openai") return id.startsWith("openai/");
  if (group === "anthropic") return id.startsWith("anthropic/");
  if (group === "deepseek") return id.startsWith("deepseek/");
  if (group === "groq") return id.startsWith("groq/");
  if (group === "nvidia") return id.startsWith("nvidia/");
  if (group === "cloudflare") return id.startsWith("cloudflare/") || id.startsWith("@cf/");

  return false;
}

const FREE_MODELS_BY_PROVIDER = {
  openrouter: [
    { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super ✅검증" },
    { id: "openrouter/owl-alpha",                   label: "Owl Alpha (1M ctx)" },
    { id: "deepseek/deepseek-v4-flash:free",        label: "DeepSeek V4 Flash (1M)" },
    { id: "openai/gpt-oss-120b:free",               label: "GPT-OSS 120B" },
    { id: "openai/gpt-oss-20b:free",                label: "GPT-OSS 20B" },
    { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder (코딩)" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B" },
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B" },
    { id: "arcee-ai/trinity-large-thinking:free",   label: "Arcee Trinity Thinking" },
    { id: "inclusionai/ring-2.6-1t:free",           label: "Ring 2.6 1T (262K)" },
  ],
  nvidia: [
    { id: "nvidia/nemotron-3-super-120b-a12b:free",          label: "Nemotron 3 Super ✅검증" },
    { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "Nemotron 3 Nano Omni" },
    { id: "nvidia/nemotron-3-nano-30b-a3b:free",             label: "Nemotron 3 Nano 30B" },
    { id: "nvidia/nemotron-nano-12b-v2-vl:free",             label: "Nemotron Nano 12B VL" },
    { id: "nvidia/nemotron-nano-9b-v2:free",                 label: "Nemotron Nano 9B" },
  ],
  google: [],
  groq: [],
  nvidia: [],
  cloudflare: [],
  deepseek: [
    { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash ? API KEY" },
    { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro ? API KEY" },
  ],
  meta: [
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B ★무료" },
    { id: "meta-llama/llama-3.2-3b-instruct:free",  label: "Llama 3.2 3B ★무료" },
  ],
  qwen: [
    { id: "qwen/qwen3-coder:free",                  label: "Qwen3 Coder ★무료 코딩" },
    { id: "qwen/qwen3-next-80b-a3b-instruct:free",  label: "Qwen3 Next 80B ★무료" },
  ],
  anthropic: [
    { id: "anthropic/claude-sonnet-4.6",            label: "Claude Sonnet 4.6 (유료)" },
    { id: "anthropic/claude-opus-4.6",              label: "Claude Opus 4.6 (유료)" },
  ],
  openai: [
    { id: "openai/gpt-oss-120b:free",               label: "GPT-OSS 120B ★무료" },
    { id: "openai/gpt-oss-20b:free",                label: "GPT-OSS 20B ★무료" },
    { id: "openai/gpt-4.1",                         label: "GPT-4.1 (유료)" },
  ],
  nous: [
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B ★무료" },
  ],
  hermes: [
    { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super ✅기본 추천" },
    { id: "openrouter/owl-alpha",                   label: "Owl Alpha" },
    { id: "deepseek/deepseek-v4-flash:free",        label: "DeepSeek V4 Flash" },
    { id: "openai/gpt-oss-120b:free",               label: "GPT-OSS 120B" },
  ],
};


const modeOptions = [
  { id: "suggest", label: "Suggest · 파일 수정 금지" },
  { id: "edit", label: "Edit · 일반 실행" },
  { id: "auto", label: "Auto · 제한 권장" }
];

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const AUTH_CLI_MODEL_PREFIX = "__authcli__::";

function makeAuthCliModelValue(agentId, modelId) {
  return AUTH_CLI_MODEL_PREFIX + agentId + "::" + modelId;
}

function parseAuthCliModelValue(value = "") {
  const text = String(value || "");

  if (!text.startsWith(AUTH_CLI_MODEL_PREFIX)) return null;

  const rest = text.slice(AUTH_CLI_MODEL_PREFIX.length);
  const divider = rest.indexOf("::");

  if (divider === -1) return null;

  return {
    agentId: rest.slice(0, divider),
    modelId: rest.slice(divider + 2)
  };
}

function formatBadgeText(badges = []) {
  if (!Array.isArray(badges) || badges.length === 0) return "";
  return " · " + badges.slice(0, 4).join(" · ");
}

const DASHBOARD_AUTH_CLI_MODEL_GROUPS = [
  {
    agentId: "claude-code",
    label: "Claude Code",
    models: [
      { id: "claude-opus-4-7", label: "Claude Opus 4.7", badges: ["최신", "추론", "구독", "CLI"] },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", badges: ["추천", "코딩", "안정", "구독"] },
      { id: "claude-opus-4-6", label: "Claude Opus 4.6", badges: ["추론", "구독", "CLI"] },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", badges: ["빠름", "가벼움", "구독", "CLI"] },
      { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", badges: ["안정", "코딩", "구독", "CLI"] }
    ]
  },
  {
    agentId: "codex-cli",
    label: "Codex CLI",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5", badges: ["최신", "업데이트 필요", "계정/버전 확인", "CLI"] },
      { id: "gpt-5.4", label: "GPT-5.4", badges: ["기본 후보", "업데이트 필요", "CLI"] },
      { id: "gpt-5", label: "GPT-5", badges: ["계정 미지원 가능", "CLI"] },
      { id: "codex-default", label: "Codex 기본 모델", badges: ["자동선택", "테스트 필요", "CLI"] }
    ]
  },
  {
    agentId: "gemini-cli",
    label: "Gemini CLI",
    models: [
      { id: "auto-gemini-3", label: "Auto Gemini 3", badges: ["최신", "추천", "자동선택", "CLI"] },
      { id: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview", badges: ["최신", "Preview", "추론", "CLI"] },
      { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", badges: ["최신", "Preview", "빠름", "CLI"] },
      { id: "auto-gemini-2.5", label: "Auto Gemini 2.5", badges: ["추천", "안정", "자동선택", "CLI"] },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro ? ??? ? ?? 5", ctx: 1048576, paidPossible: true },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash ? FREE TIER ? ?? 1", ctx: 1048576 }
    ]
  }
];

function cleanAgentText(value) {
  const raw = String(value || "");

  const withoutLogs = raw
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("[mamabot]"))
    .join("\n")
    .trim();

  return withoutLogs
    .replace(/\[Answer style\][\s\S]*?(?=\n\n|$)/g, "")
    .replace(/\[System instruction[^\]]*\][\s\S]*?사용자 요청:\s*/g, "")
    .trim();
}

function cleanUserPrompt(value) {
  return String(value || "")
    .replace(/\[System instruction - do not repeat\][\s\S]*?사용자 요청:\s*/g, "")
    .replace(/\[Answer style\][\s\S]*?(?=\n\n|$)/g, "")
    .trim();
}

function buildAssistantText(data) {
  const raw = data?.output || data?.error || data?.stderr || data?.message || "응답이 없습니다.";
  return cleanAgentText(raw) || "응답이 없습니다.";
}

function applyResponseStyle(prompt, responseStyle) {
  const text = String(prompt || "").trim();

  if (responseStyle === "short") {
    return "[System instruction - do not repeat]\n답변은 1~2문장으로 짧게 하세요. 사용자의 언어로 답하세요. 이 지시문은 답변에 반복하지 마세요.\n\n사용자 요청:\n" + text;
  }

  if (responseStyle === "detailed") {
    return "[System instruction - do not repeat]\n충분히 자세히 설명하세요. 사용자의 언어로 답하세요. 이 지시문은 답변에 반복하지 마세요.\n\n사용자 요청:\n" + text;
  }

  return "[System instruction - do not repeat]\n자연스럽게 답하세요. 사용자의 언어로 답하세요. 이 지시문은 답변에 반복하지 마세요.\n\n사용자 요청:\n" + text;
}

function formatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getExecutionProfileHint(profile) {
  if (profile === "quick") {
    return "Quick Search: web/fresh-answer mode. No workspace files, no index, no code edits.";
  }
  if (profile === "agent") {
    return "Agent: project analysis mode. Uses workspace index and selected files.";
  }
  if (profile === "coding") {
    return "Coding: edit mode. Backup, patch, diff and verification are required.";
  }
  if (profile === "review") {
    return "Review: read-only inspection mode.";
  }
  if (profile === "automation") {
    return "Automation: approval-based repeated task mode.";
  }
  return "";
}

function formatMiniTokenCount(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "m";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(Math.round(n));
}

function getTokenTone(severity) {
  if (severity === "danger") {
    return {
      bg: "#fef2f2",
      border: "#fecaca",
      color: "#991b1b",
      dot: "#ef4444"
    };
  }

  if (severity === "warn" || severity === "warning") {
    return {
      bg: "#fffbeb",
      border: "#fde68a",
      color: "#92400e",
      dot: "#f59e0b"
    };
  }

  return {
    bg: "#ecfdf5",
    border: "#bbf7d0",
    color: "#166534",
    dot: "#22c55e"
  };
}

function isDoneStatus(status) {
  return ["success", "failed", "stopped", "blocked", "dryrun"].includes(String(status || ""));
}

export default function WorkbenchChatPanel({
  activeSessionId = "",
  activeRunId = "",
  resetKey = 0,
  workspaceRoot = "",
  onWorkspaceChanged = null,
  onSessionChanged = null,
  onRunOpened = null
} = {}) {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("hermes");
  const [mode, setMode] = useState("suggest");
  const [model, setModel] = useState("");
  const [responseStyle, setResponseStyle] = useState("short");
  const [executionProfile, setExecutionProfile] = useState("quick");
  const [favorites, setFavorites] = useState([]);
  const [liveModels, setLiveModels] = useState([]);
  const [cliModelGroups, setCliModelGroups] = useState(DASHBOARD_AUTH_CLI_MODEL_GROUPS);
  const [skills, setSkills] = useState("");
  const [toolsets, setToolsets] = useState("");
  const [workspacePath, setWorkspacePath] = useState(workspaceRoot || "");
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceIndexing, setWorkspaceIndexing] = useState(false);
  const [workspaceIndexToast, setWorkspaceIndexToast] = useState(null);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [quickSessionId, setQuickSessionId] = useState("");

  function notifySessionsRefresh(sessionId = "", select = false) {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("mamabot:sessions-refresh", {
        detail: {
          sessionId: sessionId || activeSessionId || quickSessionId || "",
          source: "quick-search",
          select
        }
      })
    );
  }
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [runningLabel, setRunningLabel] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsToast, setTtsToast] = useState(null);
  const ttsAudioRef = useRef(null);
  const [tokenPreview, setTokenPreview] = useState(null);
  const [tokenPreviewLoading, setTokenPreviewLoading] = useState(false);

  const abortRef = useRef(null);
  const recognitionRef = useRef(null);
  const timelineRef = useRef(null);
  const lastLoadedSessionRef = useRef("");
  const pollingRunRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("mamabot.ttsEnabled");
    setTtsEnabled(saved === "true");
  }, []);

  function showTtsToast(toast) {
    const next = {
      tone: toast?.tone || "info",
      message: toast?.message || String(toast || "")
    };

    setTtsToast(next);

    window.clearTimeout(window.__mamabotTtsToastTimer);
    window.__mamabotTtsToastTimer = window.setTimeout(() => {
      setTtsToast(null);
    }, 3200);
  }

  function stopTtsPlayback() {
    try {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.currentTime = 0;
        ttsAudioRef.current = null;
      }

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch {}

    setSpeaking(false);
  }

  function toggleTtsEnabled() {
    setTtsEnabled((prev) => {
      const next = !prev;

      if (typeof window !== "undefined") {
        window.localStorage.setItem("mamabot.ttsEnabled", String(next));
      }

      if (!next) {
        stopTtsPlayback();
      }

      showTtsToast({
        tone: next ? "info" : "warning",
        message: next ? "음성 사용 ON" : "음성 사용 OFF"
      });

      return next;
    });
  }

  function getLatestAssistantTextForTts() {
    const latest = [...messages]
      .reverse()
      .find((item) => item?.role === "assistant" && item?.content);

    return String(latest?.content || "")
      .replace(/[*_#>`]/g, " ")
      .replace(/\[[^\]]+\]\([^\)]+\)/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
  }

async function copyAssistantMessage(content) {
  const text = String(content || "").trim();

  if (!text) {
    showTtsToast({
      tone: "warning",
      message: "복사할 답변이 없습니다."
    });
    return;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.focus();
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }

    showTtsToast({
      tone: "info",
      message: "답변을 복사했습니다."
    });
  } catch (error) {
    showTtsToast({
      tone: "danger",
      message: "복사 실패: " + (error.message || String(error))
    });
  }
}

async function speakAssistantMessage(content) {
  if (!ttsEnabled) {
    showTtsToast({
      tone: "warning",
      message: "음성 사용이 꺼져 있습니다. 음성 ON으로 바꾼 뒤 다시 눌러주세요."
    });
    return;
  }

  if (speaking) {
    stopTtsPlayback();
    showTtsToast({
      tone: "info",
      message: "음성 재생을 중지했습니다."
    });
    return;
  }

  const text = String(content || "")
    .replace(/[*_#>\`]/g, " ")
    .replace(/\[[^\]]+\]\([^\)]+\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

  if (!text) {
    showTtsToast({
      tone: "warning",
      message: "읽어줄 답변이 없습니다."
    });
    return;
  }

  try {
    setSpeaking(true);

    const res = await fetch("/api/tts/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        languageCode: "ko-KR"
      })
    });

    const data = await res.json().catch(() => ({}));

    if (data?.toast) {
      showTtsToast(data.toast);
    }

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Google TTS 호출 실패");
    }

    if (!data.audioContent) {
      throw new Error("Google TTS 오디오가 비어 있습니다.");
    }

    const audio = new Audio("data:" + (data.mimeType || "audio/mpeg") + ";base64," + data.audioContent);
    ttsAudioRef.current = audio;

    audio.onended = () => {
      setSpeaking(false);
      ttsAudioRef.current = null;
    };

    audio.onerror = () => {
      setSpeaking(false);
      ttsAudioRef.current = null;
      showTtsToast({
        tone: "danger",
        message: "음성 재생 중 오류가 발생했습니다."
      });
    };

    await audio.play();
  } catch (error) {
    setSpeaking(false);
    showTtsToast({
      tone: "danger",
      message: error.message || String(error)
    });
  }
}

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (activeSessionId) {
      setQuickSessionId(activeSessionId);
      return;
    }

    let existing = window.localStorage.getItem("mamabot.quickSessionId") || "";

    if (!existing) {
      existing = "quick-" + Date.now() + "-" + Math.random().toString(16).slice(2, 10);
      window.localStorage.setItem("mamabot.quickSessionId", existing);
    }

    setQuickSessionId(existing);
  }, [activeSessionId]);

  useEffect(() => {
    function applyPendingWorkbenchPrompt() {
      try {
        const next = String(window.localStorage.getItem("mamabot.pendingWorkbenchPrompt") || "").trim();
        if (!next) return;

        setPrompt(next);
        console.log("[Mamabot] workflow prompt applied", next.length);

        window.setTimeout(() => {
          try {
            if (window.localStorage.getItem("mamabot.pendingWorkbenchPrompt") === next) {
              window.localStorage.removeItem("mamabot.pendingWorkbenchPrompt");
            }
          } catch {}
        }, 3500);
      } catch (err) {
        console.warn("[Mamabot] workflow prompt apply failed", err);
      }
    }

    const initialTimer = window.setTimeout(applyPendingWorkbenchPrompt, 1200);

    const handler = (event) => {
      const eventPrompt = String(event?.detail?.prompt || "").trim();

      if (eventPrompt) {
        try {
          window.localStorage.setItem("mamabot.pendingWorkbenchPrompt", eventPrompt);
        } catch {}
      }

      window.setTimeout(applyPendingWorkbenchPrompt, 500);
    };

    window.addEventListener("mamabot:send-to-workbench", handler);
    window.addEventListener("mamabot:workbench-prompt-ready", handler);
    window.addEventListener("focus", applyPendingWorkbenchPrompt);

    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener("mamabot:send-to-workbench", handler);
      window.removeEventListener("mamabot:workbench-prompt-ready", handler);
      window.removeEventListener("focus", applyPendingWorkbenchPrompt);
    };
  }, []);


  const favoriteModels = useMemo(() => {
    if (!Array.isArray(favorites) || favorites.length === 0) return [];

    const modelMap = new Map();
    for (const item of liveModels) {
      if (item?.id) modelMap.set(item.id, item);
    }

    return favorites.map((id) => {
      const found = modelMap.get(id);
      return {
        id,
        name: found?.name || id
      };
    });
  }, [favorites, liveModels]);

  const selectedProviderOption = useMemo(() => {
    return providerOptions.find((item) => item.id === provider) || providerOptions[0];
  }, [provider]);

  const selectedProviderLabel = selectedProviderOption?.label || provider || "Provider";

  const authCliSelected = isAuthCliProviderId(provider);

  const selectedCliModelGroup = useMemo(() => {
    return cliModelGroups.find((group) => group.agentId === provider) || null;
  }, [cliModelGroups, provider]);

  const providerPresetModels = useMemo(() => {
    const hasLiveModels = liveModels.some((item) => modelMatchesProvider(item, provider));

    if (hasLiveModels) return [];

    const group = normalizeProviderModelGroup(provider);
    return FREE_MODELS_BY_PROVIDER[group] || [];
  }, [provider, liveModels]);

  const providerLiveModels = useMemo(() => {
    if (authCliSelected) return [];
    return liveModels
      .filter((item) => modelMatchesProvider(item, provider))
      .slice(0, 200);
  }, [liveModels, provider, authCliSelected]);

  const providerFavoriteModels = useMemo(() => {
    if (authCliSelected) return [];
    return favoriteModels.filter((item) => modelMatchesProvider(item, provider));
  }, [favoriteModels, provider, authCliSelected]);

  async function loadWorkspace() {
    setWorkspaceError("");
    setWorkspaceMessage("");

    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "작업폴더를 불러오지 못했습니다.");
      }

      const current =
        data.config && data.config.currentWorkspace
          ? data.config.currentWorkspace
          : "";

      setWorkspacePath(current);

      if (onWorkspaceChanged) {
        onWorkspaceChanged(current);
      }
    } catch (err) {
      setWorkspaceError("");
      setError(err.message || String(err));
    }
  }

  async function saveWorkspace(pathOverride) {
    const target = pathOverride || workspacePath;
    const trimmed = target.trim();

    if (!trimmed) {
      setWorkspaceError("작업폴더 경로를 입력하세요.");
      return;
    }

    setWorkspaceSaving(true);
    setWorkspaceError("");
    setWorkspaceMessage("");

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspacePath: trimmed
        })
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "작업폴더 저장에 실패했습니다.");
      }

      const nextPath = data.config.currentWorkspace || trimmed;

      setWorkspacePath(nextPath);
      setWorkspaceMessage("");
      if (onWorkspaceChanged) {
        onWorkspaceChanged(nextPath);
      }
    } catch (err) {
      setWorkspaceError(err.message || String(err));
    } finally {
      setWorkspaceSaving(false);
    }
  }

  function handleSelectFolder(folderPath) {
    setPickerOpen(false);
    setWorkspacePath(folderPath);
    saveWorkspace(folderPath);
  }

  async function loadCliModelGroups() {
    try {
      const agentIds = [
        ["claude-code", "Claude Code"],
        ["codex-cli", "Codex CLI"],
        ["gemini-cli", "Gemini CLI"]
      ];

      const results = await Promise.all(
        agentIds.map(async ([agentId, label]) => {
          const res = await fetch("/api/model-badges?agentId=" + encodeURIComponent(agentId), {
            cache: "no-store"
          });

          const data = await res.json();

          return {
            agentId,
            label,
            models: Array.isArray(data.models) ? data.models : []
          };
        })
      );

      const nextGroups = results.filter((item) => item.models.length > 0);
      setCliModelGroups(nextGroups.length > 0 ? nextGroups : DASHBOARD_AUTH_CLI_MODEL_GROUPS);
    } catch (err) {
      setCliModelGroups(DASHBOARD_AUTH_CLI_MODEL_GROUPS);
    }
  }

  async function loadModels(refresh = false) {
    try {
      const endpoint = PROVIDER_MODEL_ENDPOINTS[provider] || "/api/models/openrouter";
      const url = endpoint + (refresh && endpoint.includes("openrouter") ? "?refresh=true" : "");

      const [favRes, modelsRes] = await Promise.all([
        fetch("/api/models/favorites", { cache: "no-store" }),
        fetch(url, { cache: "no-store" })
      ]);

      const favJson = await favRes.json().catch(() => ({}));
      const modelsJson = await modelsRes.json().catch(() => ({}));

      setFavorites(Array.isArray(favJson.favorites) ? favJson.favorites : []);

      if (!modelsRes.ok || modelsJson.ok === false) {
        throw new Error(modelsJson.error || "Failed to load provider models");
      }

      const nextModels = Array.isArray(modelsJson.models) ? modelsJson.models : [];
      setLiveModels(nextModels);
    } catch (err) {
      console.warn("[Mamabot] live model load failed", err);
      setLiveModels([]);
    }
  }

  useEffect(() => {
    if (!authCliSelected) {
      loadModels(false);
    }
  }, [provider, authCliSelected]);

  useEffect(() => {
    function handleModelsRefresh() {
      loadModels(true);
    }

    window.addEventListener("mamabot:models-refresh", handleModelsRefresh);

    return () => {
      window.removeEventListener("mamabot:models-refresh", handleModelsRefresh);
    };
  }, []);

  async function loadRun(runId) {
    if (!runId) return;

    try {
      const res = await fetch("/api/agent/runs/" + encodeURIComponent(runId), {
        cache: "no-store"
      });
      const data = await res.json();

      if (!res.ok || data.ok === false || !data.run) {
        throw new Error(data.error || "실행 이력을 불러오지 못했습니다.");
      }

      const run = data.run;
      const nextMessages = [];

      if (run.prompt) {
        nextMessages.push({
          role: "user",
          content: cleanUserPrompt(run.prompt),
          createdAt: run.createdAt,
          runId: run.runId
        });
      }

      nextMessages.push({
        role: "assistant",
        content: buildAssistantText(run),
        createdAt: run.createdAt,
        runId: run.runId,
        status: run.status
      });

      setMessages(nextMessages);
      setError("");

      if (run.sessionId && onSessionChanged) {
        onSessionChanged(run.sessionId);
      }
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function loadSessionMessages(sessionId) {
    if (!sessionId) return;

    try {
      const res = await fetch("/api/agent/sessions/" + encodeURIComponent(sessionId), {
        cache: "no-store"
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "대화창을 불러오지 못했습니다.");
      }

      const session = data.session || data.item || data;
      const rows = [];

      const sessionMessages = Array.isArray(session.messages) ? session.messages : [];
      const sessionRuns = Array.isArray(session.runs) ? session.runs : [];

      if (sessionMessages.length > 0) {
        for (const item of sessionMessages) {
          const role = item.role === "assistant" ? "assistant" : "user";
          const rawContent = item.content || item.text || item.prompt || item.output || item.error || "";

          rows.push({
            role,
            content: role === "user" ? cleanUserPrompt(rawContent) : buildAssistantText({ output: rawContent }),
            createdAt: item.createdAt || item.updatedAt || session.updatedAt || session.createdAt,
            runId: item.runId || "",
            status: item.status || ""
          });
        }
      } else {
        for (const item of sessionRuns) {
          if (item.prompt) {
            rows.push({
              role: "user",
              content: cleanUserPrompt(item.prompt),
              createdAt: item.createdAt || session.createdAt,
              runId: item.runId || ""
            });
          }

          rows.push({
            role: "assistant",
            content: buildAssistantText(item),
            createdAt: item.createdAt || session.createdAt,
            runId: item.runId || "",
            status: item.status || ""
          });
        }
      }

      setMessages(rows);
      setError("");
    } catch (err) {
      setError(err.message || String(err));
    }
  }




  useEffect(() => {
    if (!activeSessionId) return;
    if (activeRunId) return;

    loadSessionMessages(activeSessionId);
  }, [activeSessionId, activeRunId]);

  useEffect(() => {
    if (!activeRunId) return;

    const alreadyVisible = messages.some((msg) => {
      return msg.runId === activeRunId || msg.pendingRunId === activeRunId;
    });

    if (!alreadyVisible) {
      loadRun(activeRunId);
    }
  }, [activeRunId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem("mamabot.selectedModel", model || "");
    window.localStorage.setItem("mamabot.selectedProvider", provider || "");
    window.localStorage.setItem("mamabot.responseStyle", responseStyle || "short");
    window.localStorage.setItem("mamabot.executionProfile", executionProfile || "quick");
  }, [model, provider, responseStyle, executionProfile]);

  useEffect(() => {
    lastLoadedSessionRef.current = "";
    setPrompt("");
    setMessages([]);
    setError("");
    pollingRunRef.current = "";
    setRunning(false);
    setRunningLabel("");
  }, [resetKey]);

  useEffect(() => {
    setWorkspacePath(workspaceRoot || "");
  }, [workspaceRoot]);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [messages, running, error]);

  async function pollRunToCompletion(runId) {
    if (!runId) return null;
    pollingRunRef.current = runId;

    for (let i = 0; i < 240; i++) {
      if (pollingRunRef.current !== runId) return null;
      await sleep(3000);

      try {
        const res = await fetch("/api/agent/runs/" + encodeURIComponent(runId), {
          cache: "no-store"
        });

        const data = await res.json();
        const run = data?.run;

        if (!run) continue;

        if (run.status === "running") {
          setRunningLabel("백그라운드 실행 중");
          continue;
        }

        if (isDoneStatus(run.status)) {
          setMessages((prev) => {
            const withoutPending = prev.filter((msg) => msg.pendingRunId !== runId);

            return [
              ...withoutPending,
              {
                role: "assistant",
                content: buildAssistantText(run),
                createdAt: new Date().toISOString(),
                runId: run.runId,
                status: run.status
              }
            ];
          });

          pollingRunRef.current = "";
          setRunning(false);
          setRunningLabel("");
          return run;
        }
      } catch {
        // polling 오류는 다음 루프에서 다시 시도
      }
    }

    pollingRunRef.current = "";
    setRunning(false);
    setRunningLabel("");
    return null;
  }

  function showWorkspaceIndexToast(nextToast = {}) {
    const payload = {
      id: Date.now(),
      type: nextToast.type || "info",
      title: nextToast.title || "\uC54C\uB9BC",
      message: nextToast.message || "",
      createdAt: new Date().toISOString()
    };

    setWorkspaceIndexToast(payload);

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setWorkspaceIndexToast((current) => current?.id === payload.id ? null : current);
      }, 5000);
    }
  }

  async function refreshWorkspaceIndex(rootOverride = "") {
    const targetRoot = String(rootOverride || workspacePath || "").trim();

    if (!targetRoot) {
      const message = "\uC791\uC5C5\uD3F4\uB354\uB97C \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694.";
      setError(message);
      showWorkspaceIndexToast({
        type: "error",
        title: "\uC778\uB371\uC2A4 \uAC31\uC2E0 \uBD88\uAC00",
        message
      });
      return null;
    }

    setWorkspaceIndexing(true);
    setError("");

    try {
      const res = await fetch("/api/workspace/index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspaceRoot: targetRoot
        })
      });

      let data = null;

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "\uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4 \uC778\uB371\uC2A4 \uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      }

      const manifest = data.manifest || {};
      const files = data.files ?? manifest.fileCount ?? 0;
      const routes = data.routes ?? manifest.routeCount ?? 0;
      const ignored = data.ignored ?? manifest.ignoredCount ?? 0;
      const errors = Array.isArray(data.errors) ? data.errors.length : (manifest.errorCount ?? 0);

      const toastPayload = {
        type: errors > 0 ? "warning" : "success",
        title: errors > 0 ? "\uC778\uB371\uC2A4 \uAC31\uC2E0 \uC644\uB8CC \u00B7 \uC77C\uBD80 \uC624\uB958 \uC788\uC74C" : "\uC778\uB371\uC2A4 \uAC31\uC2E0 \uC644\uB8CC",
        message: "files " + files + " / routes " + routes + " / ignored " + ignored + " / errors " + errors
      };

      console.log("[Mamabot] workspace index toast", toastPayload);
      showWorkspaceIndexToast(toastPayload);

      return data;
    } catch (err) {
      const message = err.message || String(err);
      setError(message);
      showWorkspaceIndexToast({
        type: "error",
        title: "\uC778\uB371\uC2A4 \uAC31\uC2E0 \uC2E4\uD328",
        message
      });
      return null;
    } finally {
      setWorkspaceIndexing(false);
    }
  }

  useEffect(() => {
    const trimmed = String(prompt || "").trim();

    if (!trimmed) {
      setTokenPreview(null);
      setTokenPreviewLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setTokenPreviewLoading(true);

      try {
        const apiPrompt = applyResponseStyle(trimmed, responseStyle);

        const res = await fetch("/api/tools/token-budget", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: apiPrompt,
            userPrompt: trimmed,
            model,
            executionProfile,
            responseMode: responseStyle,
            skills,
            toolsets,
            workspaceCandidates: []
          })
        });

        const data = await res.json();

        if (!res.ok || data.ok === false) {
          throw new Error(data.error || "token preview failed");
        }

        setTokenPreview(data.tokenBudget || null);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("[Mamabot] mini token preview failed", err);
        }
      } finally {
        setTokenPreviewLoading(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [prompt, model, executionProfile, responseStyle, skills, toolsets]);


  function handleProviderChange(nextProvider) {
    setProvider(nextProvider);
    setModel("");
    setLiveModels([]);

    if (isDirectApiProviderId(nextProvider)) {
      setExecutionProfile("quick");
      setSkills("");
      setToolsets("");
    }
  }

  function handleModelChange(nextModel) {
    const parsedAuthModel = parseAuthCliModelValue(nextModel);

    setModel(nextModel);

    if (parsedAuthModel) {
      setProvider(parsedAuthModel.agentId);
    }
  }

  async function ensureRunSessionId({ dryRun, title, prompt, workspaceRoot }) {
    if (dryRun) return activeSessionId || "";
    if (activeSessionId) return activeSessionId;

    const sessionRes = await fetch("/api/agent/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: String(title || prompt || "새 작업").slice(0, 60),
        prompt: String(prompt || ""),
        workspaceRoot
      })
    });

    const sessionData = await sessionRes.json();

    if (!sessionRes.ok || sessionData.ok === false || !sessionData.session?.sessionId) {
      throw new Error(sessionData.error || "대화 세션 생성에 실패했습니다.");
    }

    const nextSessionId = sessionData.session.sessionId;

    return nextSessionId;
  }

  async function runAgent(dryRun, options = {}) {
    const promptSource = options.promptOverride ?? prompt;
    const trimmed = String(promptSource || "").trim();

    if (!trimmed) {
      setError("프롬프트를 입력하세요.");
      return;
    }

    const apiPrompt = applyResponseStyle(trimmed, responseStyle);

    const userMessage = {
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString()
    };

    if (options.skipUserMessage !== true) {
      setMessages((prev) => [...prev, userMessage]);
    }

    if (!options.promptOverride) {
      setPrompt("");
    }

    setRunning(true);
    setRunningLabel(dryRun ? "계획 확인 중" : "실행 중");
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    const parsedAuthModelForRun = parseAuthCliModelValue(model);
    const requestProvider = parsedAuthModelForRun ? parsedAuthModelForRun.agentId : provider;
    const requestModelRaw = parsedAuthModelForRun ? parsedAuthModelForRun.modelId : model;
    const requestModel =
      ["codex-default", "claude-default", "gemini-default"].includes(requestModelRaw)
        ? ""
        : requestModelRaw;

    const runWorkspace = String(
      workspacePath ||
      (typeof workspaceRoot !== "undefined" && workspaceRoot) ||
      "F:\\mamabot"
    ).trim();

    const requestMode =
      executionProfile === "quick" && isAuthCliProviderId(requestProvider)
        ? "edit"
        : mode;

    try {
      const runSessionId = await ensureRunSessionId({
        dryRun,
        title: trimmed,
        prompt: trimmed,
        workspaceRoot: runWorkspace
      });

      const res = await fetch(executionProfile === "quick" ? "/api/quick-search" : "/api/agent/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          workspaceRoot: runWorkspace,
          workspace: runWorkspace,
          prompt: apiPrompt,
          displayPrompt: trimmed,
          sessionId: activeSessionId || quickSessionId || "",
          provider: requestProvider,
          agentId: requestProvider,
          mode: requestMode,
          model: requestModel,
          skills,
          toolsets,
          responseMode: responseStyle,
          executionProfile,
          dryRun,
          sessionId: runSessionId,
          allowHighTokenRisk: options.allowHighTokenRisk === true
        })
      });

      const data = await res.json();

      if (data?.savedToSession && executionProfile === "quick") {
        notifySessionsRefresh(data.sessionId || activeSessionId || quickSessionId || "", false);
      }

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "에이전트 실행에 실패했습니다.");
      }

      if (data.runId && onRunOpened) {
        onRunOpened(data.runId);
      }

      const nextSessionId = data.sessionId || runSessionId;

      if (nextSessionId && onSessionChanged) {
        onSessionChanged(nextSessionId);
      }

      if (data.runId && data.status === "blocked") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.output || data.message || "Token budget blocked.",
            createdAt: new Date().toISOString(),
            runId: data.runId,
            status: "blocked",
            retryPrompt: trimmed
          }
        ]);

        setRunning(false);
        setRunningLabel("");
        return;
      }

      if (data.runId && data.status === "running") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message || "실행을 시작했습니다. 완료되면 이 메시지가 최종 결과로 바뀝니다.",
            createdAt: new Date().toISOString(),
            runId: data.runId,
            status: "running",
            pendingRunId: data.runId
          }
        ]);

        await pollRunToCompletion(data.runId);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: buildAssistantText(data),
          createdAt: new Date().toISOString(),
          runId: data.runId,
          status: data.status || (dryRun ? "dryrun" : "success")
        }
      ]);
    } catch (err) {
      const message =
        err.name === "AbortError"
          ? "요청을 중지했습니다. 서버 프로세스 강제 종료는 다음 단계에서 연결합니다."
          : err.message || String(err);

      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: message,
          createdAt: new Date().toISOString(),
          status: "failed"
        }
      ]);
    } finally {
      setRunning(false);
      setRunningLabel("");
      abortRef.current = null;
    }
  }

  function stopRun() {
    pollingRunRef.current = "";
    if (abortRef.current) abortRef.current.abort();
    setRunning(false);
    setRunningLabel("");
  }

  function handlePromptKeyDown(event) {
    if (event.key !== "Enter") return;

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!running) {
      runAgent(false);
    }
  }

  function toggleMic() {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setError("이 브라우저는 음성 입력을 지원하지 않습니다.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError("음성 입력 중 오류가 발생했습니다.");
    };
    recognition.onresult = (event) => {
      let text = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }

      if (text.trim()) {
        setPrompt((prev) => {
          const base = prev.trimEnd();
          return base ? base + " " + text.trim() : text.trim();
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  async function toggleSpeaker() {
  if (!ttsEnabled) {
    showTtsToast({
      tone: "warning",
      message: "음성 사용이 꺼져 있습니다. 음성 ON으로 바꾼 뒤 다시 눌러주세요."
    });
    return;
  }

  if (speaking) {
    stopTtsPlayback();
    showTtsToast({
      tone: "info",
      message: "음성 재생을 중지했습니다."
    });
    return;
  }

  const text = getLatestAssistantTextForTts();

  if (!text) {
    showTtsToast({
      tone: "warning",
      message: "읽어줄 답변이 아직 없습니다."
    });
    return;
  }

  try {
    setSpeaking(true);

    const res = await fetch("/api/tts/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        languageCode: "ko-KR"
      })
    });

    const data = await res.json().catch(() => ({}));

    if (data?.toast) {
      showTtsToast(data.toast);
    }

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Google TTS 호출 실패");
    }

    if (!data.audioContent) {
      throw new Error("Google TTS 오디오가 비어 있습니다.");
    }

    const audio = new Audio("data:" + (data.mimeType || "audio/mpeg") + ";base64," + data.audioContent);
    ttsAudioRef.current = audio;

    audio.onended = () => {
      setSpeaking(false);
      ttsAudioRef.current = null;
    };

    audio.onerror = () => {
      setSpeaking(false);
      ttsAudioRef.current = null;
      showTtsToast({
        tone: "danger",
        message: "음성 재생 중 오류가 발생했습니다."
      });
    };

    await audio.play();
  } catch (error) {
    setSpeaking(false);

    showTtsToast({
      tone: "danger",
      message: error.message || String(error)
    });
  }
}

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        borderRadius: 14,
        padding: 10,
        boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
        width: "100%",
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gap: 8
      }}
    >
      <style>
        {"@keyframes speakerPulse { 0% { box-shadow: 0 0 0 0 rgba(220,38,38,.6); } 70% { box-shadow: 0 0 0 12px rgba(220,38,38,0); } 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); } }"}
      </style>

      <div style={{ display: "flex", alignItems: "center",
          flexWrap: "wrap", gap: 8, flexWrap: "wrap" }}>
        <select
          value={provider}
          onChange={(event) => handleProviderChange(event.target.value)}
          style={{
            width: 190,
            minWidth: 170,
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer"
          }}
          title="실행 Provider"
        >
          {providerOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={model}
          onChange={(event) => handleModelChange(event.target.value)}
          style={{
            width: 360,
            minWidth: 260,
            maxWidth: 420,
            flex: "0 0 auto",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer"
          }}
          title={selectedProviderLabel + " 모델"}
        >
          <option value="">
            {authCliSelected ? selectedProviderLabel + " 기본 모델 사용" : selectedProviderLabel + " 기본 모델 사용"}
          </option>

          {authCliSelected && selectedCliModelGroup ? (
            <optgroup label={"CLI 모델 · " + selectedCliModelGroup.label}>
              {selectedCliModelGroup.models.map((item) => (
                <option key={selectedCliModelGroup.agentId + ":" + item.id} value={item.id}>
                  {"🌟 "}{item.label || item.id}{formatBadgeText(item.badges)}
                </option>
              ))}
            </optgroup>
          ) : null}

          {!authCliSelected && providerFavoriteModels.length > 0 ? (
            <optgroup label="즐겨찾기 모델">
              {providerFavoriteModels.map((item) => (
                <option key={"fav-" + item.id} value={item.id}>
                  🌟 {item.name || item.label || item.id}
                </option>
              ))}
            </optgroup>
          ) : null}

          {!authCliSelected && providerPresetModels.length > 0 ? (
            <optgroup label={selectedProviderLabel + " 추천 모델"}>
              {providerPresetModels.map((item) => (
                <option key={"preset-" + item.id} value={item.id}>
                  {item.label || item.id}
                </option>
              ))}
            </optgroup>
          ) : null}

          {!authCliSelected && providerLiveModels.length > 0 ? (
            <optgroup label={selectedProviderLabel + " Live 모델"}>
              {providerLiveModels.map((item) => (
                <option key={"live-" + item.id} value={item.id}>
                  {item.name || item.label || item.id}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>

        <input
          value={workspacePath}
          onChange={(event) => setWorkspacePath(event.target.value)}
          placeholder="작업폴더 경로"
          title={workspacePath || "작업폴더 경로"}
          style={{
            width: 210,
            minWidth: 180,
            maxWidth: 240,
            flex: "0 0 210px",
            height: 36,
            boxSizing: "border-box",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "0 10px",
            fontSize: 12,
            fontWeight: 900,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        />

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          찾아보기
        </button>

        {workspaceIndexToast && (
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: 18,
              transform: "translateX(-50%)",
              zIndex: 5000,
              minWidth: 320,
              maxWidth: 560,
              border: "2px solid " + (
                workspaceIndexToast.type === "success"
                  ? "#22c55e"
                  : workspaceIndexToast.type === "warning"
                    ? "#f59e0b"
                    : "#ef4444"
              ),
              background:
                workspaceIndexToast.type === "success"
                  ? "#ecfdf5"
                  : workspaceIndexToast.type === "warning"
                    ? "#fffbeb"
                    : "#fef2f2",
              color:
                workspaceIndexToast.type === "success"
                  ? "#166534"
                  : workspaceIndexToast.type === "warning"
                    ? "#92400e"
                    : "#991b1b",
              borderRadius: 16,
              padding: "14px 16px",
              boxShadow: "0 18px 60px rgba(15,23,42,0.22)"
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ fontSize: 22 }}>
                {workspaceIndexToast.type === "success" ? "\u2705" : workspaceIndexToast.type === "warning" ? "\u26A0\uFE0F" : "\u274C"}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 950, marginBottom: 4 }}>
                  {workspaceIndexToast.title}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.45, wordBreak: "break-word" }}>
                  {workspaceIndexToast.message}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setWorkspaceIndexToast(null)}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.75)",
                  color: "inherit",
                  borderRadius: 999,
                  width: 24,
                  height: 24,
                  cursor: "pointer",
                  fontWeight: 900
                }}
              >
                {"\u00D7"}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={async () => {
            await saveWorkspace();
            await refreshWorkspaceIndex(workspacePath);
          }}
          disabled={workspaceSaving}
          style={{
            border: "none",
            background: workspaceSaving ? "#9ca3af" : "#111827",
            color: "#ffffff",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: workspaceSaving ? "not-allowed" : "pointer"
          }}
        >
          {workspaceSaving ? "저장 중" : "저장"}
        </button>

        <button
          type="button"
          onClick={() => refreshWorkspaceIndex()}
          disabled={workspaceIndexing}
          style={{
            border: "1px solid #d1d5db",
            background: workspaceIndexing ? "#e5e7eb" : "#f9fafb",
            color: workspaceIndexing ? "#6b7280" : "#111827",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: workspaceIndexing ? "not-allowed" : "pointer"
          }}
        >
          {workspaceIndexing ? "인덱싱 중" : "인덱스 갱신"}
        </button>

        <select
          value={`${executionProfile}:${responseStyle}`}
          onChange={(event) => {
            const [nextProfile, nextStyle] = event.target.value.split(":");

            setExecutionProfile(nextProfile || "quick");
            setResponseStyle(nextStyle || "short");

            if (nextProfile === "quick") {
              setSkills("");
              setToolsets("");
            }

            if (nextProfile === "agent" || nextProfile === "review") {
              setToolsets("");
            }
          }}
          style={{
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            minWidth: 156,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer"
          }}
          title="응답 방식"
        >
          <option value="quick:short">응답: Quick · 짧게</option>
          <option value="quick:normal">응답: Quick · 보통</option>
          <option value="quick:detailed">응답: Quick · 자세히</option>
          <option value="agent:normal">응답: Agent · 분석</option>
          <option value="coding:normal">응답: Coding · 코드작업</option>
          <option value="review:detailed">응답: Review · 검토</option>
          <option value="automation:normal">응답: Automation · 자동화</option>
        </select>

        <button
          type="button"
          onClick={loadModels}
          style={{
            border: "1px solid #d1d5db",
            background: "#f9fafb",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          모델 갱신
        </button>

        <details style={{ position: "relative" }}>
          <summary
            style={{
              listStyle: "none",
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer"
            }}
          >
            고급 옵션
          </summary>

          <div
            style={{
              position: "absolute",
              right: 0,
              top: 42,
              zIndex: 80,
              width: 380,
              maxWidth: "calc(100vw - 120px)",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
              background: "#ffffff",
              boxShadow: "0 16px 40px rgba(15,23,42,0.18)"
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 900 }}>
                제공자
                <select value={provider} onChange={(event) => handleProviderChange(event.target.value)}>
                  {providerOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 900 }}>
                권한 모드
                <select value={mode} onChange={(event) => setMode(event.target.value)}>
                  {modeOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 900 }}>
                스킬
                <input value={skills} onChange={(event) => setSkills(event.target.value)} />
              </label>

              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 900 }}>
                도구 모음
                <input value={toolsets} onChange={(event) => setToolsets(event.target.value)} />
              </label>
            </div>
          </div>
        </details>
      </div>
<div
        ref={timelineRef}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          background: "#f9fafb",
          minHeight: 0,
          overflowY: "auto",
          padding: 14,
          display: "grid",
          alignContent: "start",
          gap: 12
        }}
      >
        {messages.length === 0 && !running && !error ? (
          <div style={{ color: "#9ca3af", fontSize: 13 }}>
            아직 대화가 없습니다. 아래 입력창에 작업을 입력하고 Enter로 전송하세요.
          </div>
        ) : null}

        {messages.map((msg, index) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start"
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  border: "1px solid " + (isUser ? "#bfdbfe" : "#e5e7eb"),
                  background: isUser ? "#eff6ff" : "#ffffff",
                  color: "#111827",
                  borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "10px 12px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 4
                  }}
                >
                  <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 900 }}>
                    {isUser ? "나" : "에이전트"} {msg.status ? "· " + msg.status : ""} {msg.runId ? "· " + msg.runId : ""}
                  </div>

                  {!isUser ? (
                    <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
                      <button
                        type="button"
                        onClick={() => copyAssistantMessage(msg.content)}
                        title="답변 복사"
                        style={{
                          border: "1px solid #e5e7eb",
                          background: "#f9fafb",
                          color: "#374151",
                          borderRadius: 999,
                          width: 28,
                          height: 24,
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: "pointer"
                        }}
                      >
                        ⧉
                      </button>

                      <button
                        type="button"
                        onClick={() => speakAssistantMessage(msg.content)}
                        title="이 답변 읽어주기"
                        style={{
                          border: speaking ? "1px solid #dc2626" : "1px solid #e5e7eb",
                          background: speaking ? "#fee2e2" : "#f9fafb",
                          color: speaking ? "#991b1b" : "#374151",
                          borderRadius: 999,
                          width: 28,
                          height: 24,
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: "pointer"
                        }}
                      >
                        🔊
                      </button>
                    </div>
                  ) : null}
                </div>

                {msg.content}

                    {!isUser && msg.status === "blocked" && msg.retryPrompt ? (
                      <button
                        type="button"
                        onClick={() => {
                          const ok = window.confirm(
                            "토큰 사용량이 높아 실제 실행 중 비용이 많이 들거나 실패할 수 있습니다. 그래도 강제 실행할까요?"
                          );

                          if (!ok) return;

                          runAgent(false, {
                            promptOverride: msg.retryPrompt,
                            allowHighTokenRisk: true,
                            skipUserMessage: true
                          });
                        }}
                        disabled={running}
                        style={{
                          display: "block",
                          marginTop: 12,
                          border: "1px solid #dc2626",
                          background: running ? "#fee2e2" : "#dc2626",
                          color: running ? "#991b1b" : "#ffffff",
                          borderRadius: 10,
                          padding: "8px 10px",
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: running ? "not-allowed" : "pointer"
                        }}
                      >
                        위험 감수하고 실행
                      </button>
                    ) : null}
                {msg.createdAt ? (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                    {formatTime(msg.createdAt)}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {running ? (
          <div style={{ color: "#1d4ed8", fontSize: 13, fontWeight: 900 }}>
            {runningLabel}...
          </div>
        ) : null}
      </div>

      <div
        style={{
          paddingTop: 20,
          position: "relative",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 176px",
          gridTemplateRows: "auto auto",
          columnGap: 10,
          rowGap: 8,
          alignItems: "stretch"
        }}
      >
        {prompt.trim() ? (
          <div
            data-name="MiniTokenBar"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              zIndex: 5,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              maxWidth: "72%",
              padding: "4px 9px",
              borderRadius: 7,
              border: "1px solid " + getTokenTone(tokenPreview?.severity).border,
              background: getTokenTone(tokenPreview?.severity).bg,
              color: getTokenTone(tokenPreview?.severity).color,
              fontSize: 10,
              lineHeight: 1.25,
              fontWeight: 850,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              boxShadow: "0 1px 4px rgba(15,23,42,0.08)"
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: tokenPreviewLoading ? "#94a3b8" : getTokenTone(tokenPreview?.severity).dot,
                display: "inline-block",
                flex: "0 0 7px"
              }}
            />

            <span>{executionProfile === "quick" ? "Quick" : executionProfile === "coding" ? "Coding" : "Agent"}</span>
            <span style={{ opacity: 0.45 }}>?</span>

            {tokenPreview ? (
              <>
                <span>
                  {formatMiniTokenCount(tokenPreview.estimatedInputTokens)} / {formatMiniTokenCount(tokenPreview.practicalLimit)}
                </span>
                <span style={{ opacity: 0.45 }}>?</span>
                <span>{Math.round((tokenPreview.ratio || 0) * 100)}%</span>
                <span style={{ opacity: 0.45 }}>?</span>
                <span>{tokenPreview.severity || "ok"}</span>
              </>
            ) : (
              <span>{tokenPreviewLoading ? "?? ?" : "?? ??"}</span>
            )}
          </div>
        ) : null}

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handlePromptKeyDown}
          placeholder="작업할 내용을 입력하세요. Enter 전송 / Shift+Enter 줄바꿈"
          style={{
            gridRow: "1 / 3",
            width: "100%",
            minHeight: 104,
            resize: "vertical",
            border: "1px solid #d1d5db",
            borderRadius: 14,
            padding: 14,
            fontSize: 14,
            lineHeight: 1.6,
            boxSizing: "border-box"
          }}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-start", alignItems: "center" }}>
          {ttsToast ? (
            <div
              style={{
                position: "fixed",
                right: 24,
                bottom: 92,
                zIndex: 300,
                maxWidth: 420,
                border: ttsToast.tone === "danger" ? "1px solid #fecaca" : ttsToast.tone === "warning" ? "1px solid #fde68a" : "1px solid #bfdbfe",
                background: ttsToast.tone === "danger" ? "#fef2f2" : ttsToast.tone === "warning" ? "#fffbeb" : "#eff6ff",
                color: ttsToast.tone === "danger" ? "#991b1b" : ttsToast.tone === "warning" ? "#92400e" : "#1e3a8a",
                borderRadius: 14,
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: 900,
                boxShadow: "0 12px 32px rgba(15,23,42,0.16)"
              }}
            >
              {ttsToast.message}
            </div>
          ) : null}

          <button
            type="button"
            onClick={toggleTtsEnabled}
            title={ttsEnabled ? "음성 사용 끄기" : "음성 사용 켜기"}
            style={{
              border: ttsEnabled ? "1px solid #86efac" : "1px solid #d1d5db",
              background: ttsEnabled ? "#dcfce7" : "#f9fafb",
              color: ttsEnabled ? "#166534" : "#6b7280",
              borderRadius: 999,
              padding: "0 12px",
              height: 38,
              minWidth: 74,
              flex: "0 0 auto",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer"
            }}
          >
            {ttsEnabled ? "음성 ON" : "음성 OFF"}
          </button>

          <button
            type="button"
            onClick={toggleSpeaker}
            style={{
              border: speaking ? "2px solid #dc2626" : "1px solid #d1d5db",
              background: speaking ? "#fee2e2" : "#ffffff",
              color: speaking ? "#991b1b" : "#111827",
              borderRadius: 999,
              width: 48,
              height: 48,
              fontSize: 22,
              cursor: "pointer",
              animation: speaking ? "speakerPulse 0.8s infinite" : "none"
            }}
            title="텍스트 음성 읽기"
          >
            🔊
          </button>

          <button
            type="button"
            onClick={toggleMic}
            style={{
              border: listening ? "2px solid #2563eb" : "1px solid #d1d5db",
              background: listening ? "#dbeafe" : "#ffffff",
              color: listening ? "#1d4ed8" : "#111827",
              borderRadius: 999,
              width: 48,
              height: 48,
              fontSize: 22,
              cursor: "pointer"
            }}
            title="음성 입력"
          >
            🎙
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={running ? stopRun : () => runAgent(false)}
            style={{
              border: "none",
              background: running ? "#dc2626" : "#16a34a",
              color: "#ffffff",
              borderRadius: 12,
              height: 48,
              padding: "0 12px",
              fontSize: 14,
              fontWeight: 950,
              cursor: "pointer"
            }}
          >
            {running ? "중지" : "전송"}
          </button>

          <button
            type="button"
            onClick={() => runAgent(true)}
            disabled={running}
            style={{
              border: "1px solid #bfdbfe",
              background: running ? "#e5e7eb" : "#eff6ff",
              color: running ? "#6b7280" : "#1d4ed8",
              borderRadius: 12,
              height: 48,
              padding: "0 10px",
              fontSize: 13,
              fontWeight: 900,
              cursor: running ? "not-allowed" : "pointer"
            }}
          >
            계획
          </button>
        </div>
      </div>
      <FolderPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectFolder}
      />
    </section>
  );
}
