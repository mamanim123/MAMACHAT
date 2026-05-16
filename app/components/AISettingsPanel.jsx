"use client";

import { useEffect, useMemo, useState } from "react";
import LegacyModelsPanel from "./ModelsPanel.jsx";

const T = {
  title: "\uBAA8\uB378 / \uC778\uC99D",
  subtitle: "\uC5C5\uCCB4\uB97C \uC120\uD0DD\uD558\uACE0 API Key \uB4F1\uB85D, \uC5F0\uACB0 \uD14C\uC2A4\uD2B8, \uBB34\uB8CC \uBAA8\uB378 \uBD88\uB7EC\uC624\uAE30, \uC990\uACA8\uCC3E\uAE30\uB97C \uD55C \uD654\uBA74\uC5D0\uC11C \uAD00\uB9AC\uD569\uB2C8\uB2E4.",
  aiSettings: "AI \uC124\uC815",
  connected: "\uC5F0\uACB0",
  favorites: "\uC990\uACA8\uCC3E\uAE30",
  checkAll: "\uC804\uCCB4 \uC0C1\uD0DC \uD655\uC778",
  openLegacy: "\uAE30\uC874 \uD654\uBA74 \uC5F4\uAE30",
  backNew: "\uC0C8 AI \uC124\uC815\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30",
  provider: "Provider",
  providerHelp: "\uC67C\uCABD \uC5C5\uCCB4\uB97C \uB204\uB974\uBA74 \uC624\uB978\uCABD\uC5D0\uC11C \uB4F1\uB85D\uACFC \uBAA8\uB378 \uAD00\uB9AC\uB97C \uC9C4\uD589\uD569\uB2C8\uB2E4.",
  apiRegister: "API Key \uB4F1\uB85D",
  hiddenNotice: "\uC800\uC7A5\uB41C \uAC12\uC740 \uD654\uBA74\uC5D0 \uB2E4\uC2DC \uD45C\uC2DC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  save: "\uC800\uC7A5 / \uC5C5\uB370\uC774\uD2B8",
  remove: "\uC0AD\uC81C",
  flowTitle: "\uCD94\uCC9C \uD750\uB984",
  flowText: "API Key \uC800\uC7A5 \u2192 \uC5F0\uACB0 \uD14C\uC2A4\uD2B8 \u2192 \uBB34\uB8CC \uBAA8\uB378 \uBD88\uB7EC\uC624\uAE30 \u2192 Hermes OK \uBAA8\uB378 \uC990\uACA8\uCC3E\uAE30 \u2192 \uC791\uC5C5 \uCC44\uD305\uC5D0\uC11C \uC990\uACA8\uCC3E\uAE30\uB9CC \uC0AC\uC6A9.",
  searchPlaceholder: "\uBAA8\uB378\uBA85, free, coder, context \uAC80\uC0C9",
  testConnection: "\uC5F0\uACB0 \uD14C\uC2A4\uD2B8",
  checking: "\uD655\uC778 \uC911...",
  loadFreeModels: "\uBB34\uB8CC \uBAA8\uB378 \uBD88\uB7EC\uC624\uAE30",
  loading: "\uB85C\uB529...",
  freeOnly: "FREE\uB9CC",
  hermesOk: "Hermes OK",
  favoritesOnly: "\uC990\uACA8\uCC3E\uAE30\uB9CC",
  visible: "\uD45C\uC2DC",
  countUnit: "\uAC1C",
  customPlaceholder: "\uC9C1\uC811 \uBAA8\uB378 ID \uCD94\uAC00 \uC608: provider/model:free",
  customAdd: "\uC9C1\uC811 \uCD94\uAC00",
  noModels: "\uD45C\uC2DC\uD560 \uBAA8\uB378\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
  noModelsHint: "\uD544\uD130\uB97C \uC904\uC774\uAC70\uB098 \uBB34\uB8CC \uBAA8\uB378 \uBD88\uB7EC\uC624\uAE30\uB97C \uB20C\uB7EC\uC8FC\uC138\uC694.",
  nextStep: "\uBAA8\uB378 \uBAA9\uB85D \uC5F0\uACB0\uC740 \uB2E4\uC74C \uB2E8\uACC4",
  nextStepHint: "1\uCC28 \uC801\uC6A9\uC5D0\uC11C\uB294 OpenRouter \uBB34\uB8CC \uBAA8\uB378 \uAD00\uB9AC\uBD80\uD130 \uC548\uC815\uD654\uD569\uB2C8\uB2E4.",
  useModel: "\uC2E4\uD589 \uBAA8\uB378\uB85C \uC0AC\uC6A9",
  favAdd: "\uC990\uACA8\uCC3E\uAE30",
  favRemove: "\uD574\uC81C",
  source: "Source",
  context: "Context",
  cost: "Cost",
  free: "\uBB34\uB8CC",
  warning: "\uC8FC\uC758",
  oldScreenTitle: "\uAE30\uC874 \uBAA8\uB378 / \uC778\uC99D \uD654\uBA74",
  oldScreenHelp: "\uC0C8 AI \uC124\uC815 \uD654\uBA74\uC5D0\uC11C \uBE60\uC9C4 \uAE30\uB2A5\uC774 \uC788\uC73C\uBA74 \uC5EC\uAE30\uC11C \uADF8\uB300\uB85C \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  oauth: "OAuth \uC778\uC99D",
  oauthTitle: "OAuth \uC778\uC99D \uC5F0\uB3D9",
  oauthHelp: "Claude Code, Codex CLI, OpenCode \uC778\uC99D\uC744 \uD55C \uD654\uBA74\uC5D0\uC11C \uAD00\uB9AC\uD558\uB294 \uC601\uC5ED\uC785\uB2C8\uB2E4. \uC138\uBD80 \uB85C\uADF8\uC778 \uC2E4\uD589\uC740 \uAE30\uC874 \uD654\uBA74 \uAE30\uB2A5\uC744 \uADF8\uB300\uB85C \uC720\uC9C0\uD569\uB2C8\uB2E4.",
  tokenRefresh: "\uD1A0\uD070 \uAC31\uC2E0",
  loginChatgpt: "ChatGPT\uB85C \uB85C\uADF8\uC778",
  syncOpencode: "OpenCode\uC5D0\uC11C \uB3D9\uAE30\uD654",
  connectedLabel: "CONNECTED",
  empty: "EMPTY",
  disconnected: "\uBBF8\uC5F0\uACB0",
  detected: "\uAC10\uC9C0\uB428"
};

const PROVIDERS = [
  { id: "openrouter", name: "OpenRouter", envKey: "OPENROUTER_API_KEY", badge: "FREE", icon: "OR", color: "#7c3aed", description: "\uBB34\uB8CC \uBAA8\uB378\uACFC \uB300\uC6A9\uB7C9 context \uBAA8\uB378\uC744 \uAC00\uC7A5 \uD3B8\uD558\uAC8C \uAD00\uB9AC\uD569\uB2C8\uB2E4." },
  { id: "gemini", name: "Gemini", envKey: "GEMINI_API_KEY", badge: "FREE", icon: "GE", color: "#2563eb", description: "Google Gemini API Key \uAE30\uBC18 \uBAA8\uB378\uC785\uB2C8\uB2E4." },
  { id: "groq", name: "Groq", envKey: "GROQ_API_KEY", badge: "FREE TIER", icon: "GQ", color: "#f97316", description: "Groq OpenAI-compatible fast inference API." },
  { id: "nvidia", name: "NVIDIA NIM", envKey: "NVIDIA_API_KEY", badge: "DEV API", icon: "NV", color: "#16a34a", description: "NVIDIA NIM OpenAI-compatible API." },
  { id: "deepseek", name: "DeepSeek", envKey: "DEEPSEEK_API_KEY", badge: "FREE", icon: "DS", color: "#0891b2", description: "DeepSeek API Key \uAE30\uBC18 \uBAA8\uB378\uC785\uB2C8\uB2E4." },
  { id: "github", name: "GitHub Models", envKey: "GITHUB_TOKEN", badge: "FREE", icon: "GH", color: "#475569", description: "GitHub Models \uB610\uB294 GitHub token \uAE30\uBC18 \uBAA8\uB378\uC785\uB2C8\uB2E4." },
  { id: "zai", name: "Z.ai / GLM", envKey: "ZAI_API_KEY", badge: "FREE", icon: "ZA", color: "#059669", description: "Z.ai GLM \uACC4\uC5F4 \uBAA8\uB378\uC785\uB2C8\uB2E4." },
  { id: "mistral", name: "Mistral AI", envKey: "MISTRAL_API_KEY", badge: "FREE", icon: "MI", color: "#0284c7", description: "Mistral API Key \uAE30\uBC18 \uBAA8\uB378\uC785\uB2C8\uB2E4." },
  { id: "cloudflare", name: "Cloudflare Workers AI", envKey: "CLOUDFLARE_API_TOKEN", extraEnvKeys: ["CLOUDFLARE_ACCOUNT_ID"], badge: "FREE QUOTA", icon: "CF", color: "#f97316", description: "Cloudflare Workers AI API. CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required." },
  { id: "cohere", name: "Cohere", envKey: "COHERE_API_KEY", badge: "FREE", icon: "CO", color: "#16a34a", description: "Cohere API Key \uAE30\uBC18 \uBAA8\uB378\uC785\uB2C8\uB2E4." },
  { id: "ollama", name: "Ollama \uB85C\uCEEC", envKey: "OLLAMA_BASE_URL", badge: "LOCAL", icon: "OL", color: "#64748b", description: "\uB85C\uCEEC Ollama \uC11C\uBC84\uB97C \uC5F0\uACB0\uD569\uB2C8\uB2E4." },
  { id: "custom", name: "\uCEE4\uC2A4\uD140 API", envKey: "CUSTOM_API_KEY", badge: "ADD", icon: "+", color: "#c026d3", description: "\uC9C1\uC811 API Key\uC640 base URL\uC744 \uB4F1\uB85D\uD569\uB2C8\uB2E4." }
];


const PROVIDER_MODEL_ENDPOINTS = {
  openrouter: "/api/models/openrouter",
  gemini: "/api/models/gemini",
  deepseek: "/api/models/deepseek",
  groq: "/api/models/groq",
  nvidia: "/api/models/nvidia",
  cloudflare: "/api/models/cloudflare"
};

const PROVIDER_MODEL_CATALOG = {
  gemini: [
    {
      id: "google/gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      name: "Gemini 2.5 Flash",
      provider: "gemini",
      source: "gemini-catalog",
      tier: "free",
      contextLength: 1000000,
      minContext: 1000000,
      hermesCompatible: true,
      rank: 1,
      badges: ["\\uCD94\\uCC9C\\uC21C 1", "\\uCD5C\\uC2E0\\uC21C", "FREE", "1M"]
    },
    {
      id: "google/gemini-2.5-flash-lite",
      label: "Gemini 2.5 Flash Lite",
      name: "Gemini 2.5 Flash Lite",
      provider: "gemini",
      source: "gemini-catalog",
      tier: "free",
      contextLength: 1000000,
      minContext: 1000000,
      hermesCompatible: true,
      rank: 2,
      badges: ["\\uCD94\\uCC9C\\uC21C 2", "\\uCD5C\\uC2E0\\uC21C", "FREE", "1M"]
    },
    {
      id: "google/gemini-2.0-flash",
      label: "Gemini 2.0 Flash",
      name: "Gemini 2.0 Flash",
      provider: "gemini",
      source: "gemini-catalog",
      tier: "free",
      contextLength: 1000000,
      minContext: 1000000,
      hermesCompatible: true,
      rank: 3,
      badges: ["\\uCD94\\uCC9C\\uC21C 3", "FREE", "1M"]
    },
    {
      id: "google/gemini-2.0-flash-lite",
      label: "Gemini 2.0 Flash Lite",
      name: "Gemini 2.0 Flash Lite",
      provider: "gemini",
      source: "gemini-catalog",
      tier: "free",
      contextLength: 1000000,
      minContext: 1000000,
      hermesCompatible: true,
      rank: 4,
      badges: ["\\uCD94\\uCC9C\\uC21C 4", "FREE", "1M"]
    }
  ],
  deepseek: [
    {
      id: "deepseek/deepseek-chat",
      label: "DeepSeek Chat",
      name: "DeepSeek Chat",
      provider: "deepseek",
      source: "deepseek-catalog",
      tier: "free",
      contextLength: 64000,
      minContext: 64000,
      hermesCompatible: true,
      rank: 1,
      badges: ["\\uCD94\\uCC9C\\uC21C 1", "FREE", "64K+"]
    }
  ],
  github: [],
  zai: [],
  mistral: [],
  cloudflare: [],
  cohere: [],
  ollama: [],
  groq: [],
  nvidia: [],
  custom: []
};

function decodeUnicodeLabel(value) {
  return String(value || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function getContext(model) {
  return Number(model?.contextLength || model?.minContext || model?.context_length || 0);
}

function shortContext(value) {
  const n = Number(value || 0);
  if (!n) return "-";
  if (n >= 1000000) return Math.round(n / 1000000) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return String(n);
}

function toneStyle(tone) {
  if (tone === "good") return { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  if (tone === "warn") return { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" };
  if (tone === "bad") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
  if (tone === "blue") return { background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" };
  if (tone === "violet") return { background: "#ede9fe", color: "#5b21b6", border: "1px solid #ddd6fe" };
  return { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" };
}

function Badge({ children, tone = "muted" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap", ...toneStyle(tone) }}>
      {children}
    </span>
  );
}

function ProviderRow({ provider, active, configured, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        border: "none",
        borderRadius: 14,
        padding: "10px 11px",
        display: "grid",
        gridTemplateColumns: "34px minmax(0, 1fr) auto",
        gap: 10,
        alignItems: "center",
        textAlign: "left",
        background: active ? "#334155" : "transparent",
        color: "#f8fafc",
        cursor: "pointer"
      }}
    >
      <span style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", background: provider.color, color: "#ffffff", fontSize: 11, fontWeight: 900 }}>
        {provider.icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 900 }}>
            {provider.name}
          </span>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: configured ? "#22c55e" : "#64748b" }} />
        </span>
        <span style={{ display: "block", marginTop: 2, fontSize: 11, color: provider.badge === "FREE" ? "#4ade80" : "#94a3b8", fontWeight: 900 }}>
          {provider.badge}
        </span>
      </span>
      {active ? <span style={{ color: "#93c5fd", fontWeight: 900 }}>?</span> : null}
    </button>
  );
}

function ModelCard({ model, favorite, onFavorite, onUse }) {
  const context = getContext(model);
  const compatible = model.hermesCompatible !== false && context >= 64000;
  const warn = model.hermesCompatible === false || (context > 0 && context < 64000);
  const tier = String(model.tier || (String(model.id || "").includes(":free") ? "free" : "paid")).toUpperCase();

  return (
    <div style={{ border: warn ? "1px solid #fecaca" : "1px solid #e5e7eb", background: "#ffffff", borderRadius: 18, padding: 14, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 950, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {model.label || model.name || model.id}
            </div>
            {favorite ? <span style={{ color: "#f59e0b" }}>?</span> : null}
          </div>
          <div style={{ marginTop: 3, color: "#64748b", fontSize: 12, wordBreak: "break-all" }}>{model.id}</div>
          {Array.isArray(model.badges) && model.badges.length > 0 ? (
            <div style={{ marginTop: 7, display: "flex", gap: 5, flexWrap: "wrap" }}>
              {model.badges.map((badge) => (
                <Badge key={badge} tone={String(badge).includes("1") || String(badge).includes("??") || String(badge).includes("\\uCD5C") ? "blue" : "muted"}>
                  {badge}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <Badge tone={tier === "FREE" ? "good" : "muted"}>{tier}</Badge>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <div style={{ background: "#f8fafc", borderRadius: 13, padding: 9, textAlign: "center" }}>
          <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 900 }}>{T.context}</div>
          <div style={{ marginTop: 2, color: "#0f172a", fontSize: 13, fontWeight: 950 }}>{shortContext(context)}</div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 13, padding: 9, textAlign: "center" }}>
          <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 900 }}>Hermes</div>
          <div style={{ marginTop: 2, color: compatible ? "#15803d" : "#b45309", fontSize: 13, fontWeight: 950 }}>{compatible ? "OK" : T.warning}</div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 13, padding: 9, textAlign: "center" }}>
          <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 900 }}>{T.source}</div>
          <div style={{ marginTop: 2, color: "#0f172a", fontSize: 13, fontWeight: 950 }}>{model.source || "live"}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <button type="button" onClick={() => onUse(model)} style={{ border: "none", background: "#2563eb", color: "#ffffff", borderRadius: 12, padding: "9px 10px", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>
          {T.useModel}
        </button>
        <button type="button" onClick={() => onFavorite(model.id, !favorite)} style={{ border: "1px solid #fbbf24", background: favorite ? "#fef3c7" : "#ffffff", color: "#92400e", borderRadius: 12, padding: "9px 10px", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>
          {favorite ? T.favRemove : T.favAdd}
        </button>
      </div>
    </div>
  );
}

export default function AISettingsPanel() {
  const [activeProviderId, setActiveProviderId] = useState("openrouter");
  const [models, setModels] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [query, setQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(true);
  const [hermesOnly, setHermesOnly] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [apiValue, setApiValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [customModelId, setCustomModelId] = useState("");
  const [envStatus, setEnvStatus] = useState({});
  const [envPreview, setEnvPreview] = useState({});
  const [showLegacy, setShowLegacy] = useState(false);
  const [customProviderName, setCustomProviderName] = useState("");
  const [extraEnvValues, setExtraEnvValues] = useState({});

  const activeProvider = useMemo(() => PROVIDERS.find((item) => item.id === activeProviderId) || PROVIDERS[0], [activeProviderId]);
  const activeProviderDisplayName = activeProvider.id === "custom" && customProviderName ? customProviderName : activeProvider.name;

  async function loadEnvStatus() {
    try {
      const res = await fetch("/api/settings/env", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : Array.isArray(data.env) ? data.env : Array.isArray(data.variables) ? data.variables : Array.isArray(data.data) ? data.data : [];
      const next = {};
      const nextPreview = {};
      for (const item of list) {
        const key = item.key || item.name;
        if (!key) continue;
        next[key] = Boolean(item.configured ?? item.exists ?? item.set ?? item.present ?? item.value);
        nextPreview[key] = item.preview || item.masked || item.maskedPreview || "";
      }
      setEnvStatus(next);
      setEnvPreview(nextPreview);
    } catch {
      setEnvStatus({});
      setEnvPreview({});
    }
  }

  async function loadModels(refresh = false) {
    setLoadingModels(true);
    setError("");

    try {
      const endpoint = PROVIDER_MODEL_ENDPOINTS[activeProviderId];

      if (!endpoint) {
        const fallbackModels = PROVIDER_MODEL_CATALOG[activeProviderId] || [];
        setModels(fallbackModels);
        setMessage(activeProviderDisplayName + " \uBAA8\uB378 \uCE74\uD0C8\uB85C\uADF8 \uD45C\uC2DC ? " + fallbackModels.length + "\uAC1C");
        return;
      }

      const [modelsRes, favRes] = await Promise.all([
        fetch(endpoint + (refresh ? "?refresh=true" : ""), { cache: "no-store" }),
        fetch("/api/models/favorites", { cache: "no-store" })
      ]);

      const modelsJson = await modelsRes.json().catch(() => ({}));
      const favJson = await favRes.json().catch(() => ({}));

      if (!modelsRes.ok || modelsJson.ok === false) {
        throw new Error(modelsJson.error || activeProviderDisplayName + " \uBAA8\uB378 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      }

      const nextModels = Array.isArray(modelsJson.models) ? modelsJson.models : [];

      setModels(nextModels);
      setFavorites(Array.isArray(favJson.favorites) ? favJson.favorites : []);
      setMessage(activeProviderDisplayName + " \uC2E4\uC81C \uBAA8\uB378 \uBAA9\uB85D \uB85C\uB4DC \uC644\uB8CC ? " + nextModels.length + "\uAC1C");
    } catch (err) {
      setError(err.message || String(err));
      setModels(PROVIDER_MODEL_CATALOG[activeProviderId] || []);
    } finally {
      setLoadingModels(false);
    }
  }

  async function saveApiKey() {
    const key = activeProvider.envKey;
    const value = apiValue.trim();

    if (!key || !value) {
      setError("\uC800\uC7A5\uD560 Key\uC640 Value\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/settings/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "\uD658\uACBD\uBCC0\uC218 \uC800\uC7A5 \uC2E4\uD328");
      }

      for (const extraKey of activeProvider.extraEnvKeys || []) {
        const extraValue = String(extraEnvValues[extraKey] || "").trim();
        if (!extraValue) continue;
        await fetch("/api/settings/env", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: extraKey, value: extraValue })
        });
      }

      setApiValue("");
      setExtraEnvValues({});
      setEnvStatus((prev) => ({ ...prev, [key]: true }));
      setEnvPreview((prev) => ({ ...prev, [key]: data.preview || "" }));
      setMessage(key + " \uC800\uC7A5 \uC644\uB8CC");
      await loadEnvStatus();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteApiKey() {
    const key = activeProvider.envKey;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/settings/env", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "\uD658\uACBD\uBCC0\uC218 \uC0AD\uC81C \uC2E4\uD328");
      }

      setEnvStatus((prev) => ({ ...prev, [key]: false }));
      setEnvPreview((prev) => ({ ...prev, [key]: "" }));
      setMessage(key + " \uC0AD\uC81C \uC644\uB8CC");
      await loadEnvStatus();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setChecking(true);
    setError("");
    setMessage("");

    try {
      await loadModels(true);
      setMessage(activeProviderDisplayName + " \uC5F0\uACB0 \uD655\uC778 \uC644\uB8CC");
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setChecking(false);
    }
  }

  async function toggleFavorite(modelId, favorite) {
    setFavorites((prev) => favorite ? Array.from(new Set([...prev, modelId])) : prev.filter((item) => item !== modelId));
    try {
      const res = await fetch("/api/models/favorites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId, favorite }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || "\uC990\uACA8\uCC3E\uAE30 \uC800\uC7A5 \uC2E4\uD328");
      setFavorites(Array.isArray(data.favorites) ? data.favorites : []);
      window.dispatchEvent(new Event("mamabot:models-refresh"));
    } catch (err) {
      setError(err.message || String(err));
      loadModels(false);
    }
  }

  async function addCustomModel() {
    const id = customModelId.trim();
    if (!id) {
      setError("\uCD94\uAC00\uD560 \uBAA8\uB378 ID\uB97C \uC785\uB825\uD558\uC138\uC694.");
      return;
    }
    await toggleFavorite(id, true);
    setCustomModelId("");
    setMessage("\uC9C1\uC811 \uC785\uB825 \uBAA8\uB378\uC744 \uC990\uACA8\uCC3E\uAE30\uC5D0 \uCD94\uAC00\uD588\uC2B5\uB2C8\uB2E4.");
  }

  async function useModel(model) {
    window.localStorage.setItem("mamabot.preferredModel", model.id);
    await toggleFavorite(model.id, true);
    setMessage("\uAE30\uBCF8 \uC2E4\uD589 \uD6C4\uBCF4\uB85C \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4: " + model.id);
  }

  useEffect(() => {
    loadEnvStatus();
    try {
      setCustomProviderName(window.localStorage.getItem("mamabot.customApiName") || "Custom AI");
    } catch {}
  }, []);

  useEffect(() => {
    setMessage("");
    setError("");
    loadModels(false);
  }, [activeProviderId]);

  const configured = Boolean(envStatus[activeProvider.envKey]);
  const activeKeyPreview = envPreview[activeProvider.envKey] || "";
  const connectedCount = PROVIDERS.filter((item) => envStatus[item.envKey]).length;

  const visibleModels = useMemo(() => {
    const baseModels = models.length > 0 ? models : (PROVIDER_MODEL_CATALOG[activeProviderId] || []);
    const q = query.trim().toLowerCase();
    return baseModels.filter((model) => {
      const id = String(model.id || "");
      const context = getContext(model);
      const tier = String(model.tier || "").toLowerCase();
      if (freeOnly && ["openrouter", "gemini"].includes(activeProviderId) && !(tier === "free" || id.includes(":free"))) return false;
      if (hermesOnly && ["openrouter", "gemini", "deepseek"].includes(activeProviderId) && !(context >= 64000 && model.hermesCompatible !== false)) return false;
      if (favoritesOnly && !favorites.includes(id)) return false;
      if (!q) return true;
      return [model.id, model.label, model.name, model.note, model.source, model.tier].filter(Boolean).join(" ").toLowerCase().includes(q);
    }).slice(0, 80);
  }, [activeProviderId, models, query, freeOnly, hermesOnly, favoritesOnly, favorites]);

  if (showLegacy) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", color: "#1e3a8a", borderRadius: 18, padding: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 950 }}>{T.oldScreenTitle}</div>
            <div style={{ marginTop: 3, fontSize: 13 }}>{T.oldScreenHelp}</div>
          </div>
          <button type="button" onClick={() => setShowLegacy(false)} style={{ border: "none", background: "#2563eb", color: "#ffffff", borderRadius: 12, padding: "9px 12px", fontWeight: 950, cursor: "pointer" }}>
            {T.backNew}
          </button>
        </div>
        <LegacyModelsPanel />
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 24, background: "#ffffff", overflow: "hidden", boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)" }}>
      <div style={{ padding: "18px 22px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
            <Badge tone="blue">{T.aiSettings}</Badge>
            <Badge tone="good">{T.connected} {connectedCount}{T.countUnit}</Badge>
            <Badge tone="violet">{T.favorites} {favorites.length}{T.countUnit}</Badge>
          </div>
          <h1 style={{ margin: 0, color: "#0f172a", fontSize: 26, fontWeight: 950 }}>{T.title}</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>{T.subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { loadEnvStatus(); loadModels(true); }} style={{ border: "1px solid #d1d5db", background: "#ffffff", color: "#0f172a", borderRadius: 12, padding: "10px 13px", fontWeight: 950, cursor: "pointer" }}>
            {T.checkAll}
          </button>
          <button type="button" onClick={() => setShowLegacy(true)} style={{ border: "none", background: "#0f172a", color: "#ffffff", borderRadius: 12, padding: "10px 13px", fontWeight: 950, cursor: "pointer" }}>
            {T.openLegacy}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", minHeight: 720 }}>
        <aside style={{ background: "#0f172a", padding: 14, borderRight: "1px solid #1e293b" }}>
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 15, background: "#111c31", color: "#cbd5e1", fontSize: 12, lineHeight: 1.5 }}>
            <strong style={{ color: "#ffffff" }}>{T.provider}</strong><br />{T.providerHelp}
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {PROVIDERS.map((provider) => (
              <ProviderRow key={provider.id} provider={provider} active={provider.id === activeProviderId} configured={Boolean(envStatus[provider.envKey])} onClick={() => setActiveProviderId(provider.id)} />
            ))}
            <div style={{ height: 1, background: "#334155", margin: "8px 0" }} />
            <ProviderRow provider={{ id: "oauth", name: T.oauth, envKey: "OAUTH", badge: "LOGIN", icon: "\uD83D\uDD10", color: "#7c3aed" }} active={activeProviderId === "oauth"} configured={true} onClick={() => setActiveProviderId("oauth")} />
          </div>
        </aside>

        <main style={{ background: "#f8fafc", padding: 22 }}>
          {activeProviderId === "oauth" ? (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ border: "1px solid #ddd6fe", background: "#f5f3ff", borderRadius: 20, padding: 16, color: "#4c1d95" }}>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{T.oauthTitle}</div>
                <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>{T.oauthHelp}</div>
              </div>
              {[
                ["Claude Code", "Anthropic / Claude", T.connectedLabel, T.tokenRefresh],
                ["Codex CLI", "OpenAI / ChatGPT", T.disconnected, T.loginChatgpt],
                ["OpenCode", "OpenCode credentials", T.detected, T.syncOpencode]
              ].map((item) => (
                <div key={item[0]} style={{ border: "1px solid #e5e7eb", background: "#ffffff", borderRadius: 18, padding: 15, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <strong style={{ color: "#0f172a" }}>{item[0]}</strong>
                      <Badge tone={item[2] === T.disconnected ? "muted" : "good"}>{item[2]}</Badge>
                    </div>
                    <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>{item[1]}</div>
                  </div>
                  <button type="button" onClick={() => setShowLegacy(true)} style={{ border: "none", background: "#7c3aed", color: "#ffffff", borderRadius: 12, padding: "9px 12px", fontWeight: 950, cursor: "pointer" }}>{item[3]}</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(420px, 1.1fr)", gap: 18 }}>
              <section style={{ display: "grid", gap: 16, alignContent: "start" }}>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 20, background: "#ffffff", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center", background: activeProvider.color, color: "#ffffff", fontWeight: 950 }}>{activeProvider.icon}</span>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 950, color: "#0f172a" }}>{activeProviderDisplayName}</div>
                        {activeProvider.id === "custom" ? (
                          <input
                            value={customProviderName}
                            onChange={(event) => {
                              const next = event.target.value;
                              setCustomProviderName(next);
                              try { window.localStorage.setItem("mamabot.customApiName", next); } catch {}
                            }}
                            placeholder="Custom AI name"
                            style={{ marginTop: 8, border: "1px solid #d1d5db", borderRadius: 10, padding: "8px 10px", fontWeight: 800, width: "100%" }}
                          />
                        ) : null}
                        <div style={{ marginTop: 2, color: "#64748b", fontSize: 13 }}>{activeProvider.description}</div>
                      </div>
                    </div>
                    <Badge tone={configured ? "good" : "warn"}>{configured ? T.connectedLabel : T.empty}</Badge>
                  </div>
                </div>

                <div style={{ border: "1px solid #e5e7eb", borderRadius: 20, background: "#ffffff", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 950, color: "#0f172a" }}>{T.apiRegister}</div>
                      <div style={{ marginTop: 3, color: "#64748b", fontSize: 13 }}>{T.hiddenNotice}</div>
                    </div>
                    <Badge tone="blue">{activeProvider.envKey}</Badge>
                  </div>
                  <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    <input value={activeProvider.envKey} readOnly style={{ border: "1px solid #d1d5db", borderRadius: 13, padding: "10px 12px", fontWeight: 800, color: "#475569", background: "#f8fafc" }} />
                    <div
                      style={{
                        border: "1px solid #dbeafe",
                        background: configured ? "#eff6ff" : "#f8fafc",
                        color: configured ? "#1e40af" : "#64748b",
                        borderRadius: 13,
                        padding: "10px 12px",
                        fontSize: 13,
                        fontWeight: 900,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center"
                      }}
                    >
                      <span>{"\uB4F1\uB85D\uB41C \uD0A4"}</span>
                      <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                        {configured ? (activeKeyPreview || "\uB4F1\uB85D\uB428") : "\uC5C6\uC74C"}
                      </span>
                    </div>
                    <input value={apiValue} onChange={(event) => setApiValue(event.target.value)} placeholder={configured && activeKeyPreview ? "\uC0C8 \uAC12 \uC785\uB825 \uC2DC \uB36E\uC5B4\uC4F0\uAE30" : "sk-..."} type="password" style={{ border: "1px solid #d1d5db", borderRadius: 13, padding: "10px 12px", fontWeight: 800, color: "#0f172a", background: "#ffffff" }} />
                    {Array.isArray(activeProvider.extraEnvKeys) ? activeProvider.extraEnvKeys.map((extraKey) => (
                      <input
                        key={extraKey}
                        value={extraEnvValues[extraKey] || ""}
                        onChange={(event) => setExtraEnvValues((prev) => ({ ...prev, [extraKey]: event.target.value }))}
                        placeholder={"Extra setting: " + extraKey}
                        style={{ border: "1px solid #d1d5db", borderRadius: 13, padding: "10px 12px", fontWeight: 800, color: "#0f172a", background: "#ffffff" }}
                      />
                    )) : null}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                      <button type="button" onClick={saveApiKey} disabled={saving} style={{ border: "none", background: saving ? "#94a3b8" : "#2563eb", color: "#ffffff", borderRadius: 13, padding: "10px 12px", fontWeight: 950, cursor: saving ? "wait" : "pointer" }}>{T.save}</button>
                      <button type="button" onClick={deleteApiKey} disabled={saving} style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#991b1b", borderRadius: 13, padding: "10px 12px", fontWeight: 950, cursor: saving ? "wait" : "pointer" }}>{T.remove}</button>
                    </div>
                  </div>
                </div>

                <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", color: "#1e3a8a", borderRadius: 20, padding: 16, lineHeight: 1.6, fontSize: 13 }}>
                  <strong>{T.flowTitle}</strong><br />{T.flowText}
                </div>
                {message ? <div style={{ border: "1px solid #bbf7d0", background: "#dcfce7", color: "#166534", borderRadius: 14, padding: 12, fontSize: 13, fontWeight: 800 }}>{message}</div> : null}
                {error ? <div style={{ border: "1px solid #fecaca", background: "#fee2e2", color: "#991b1b", borderRadius: 14, padding: 12, fontSize: 13, fontWeight: 800 }}>{error}</div> : null}
              </section>

              <section style={{ display: "grid", gap: 12, alignContent: "start" }}>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 20, background: "#ffffff", padding: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 8 }}>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T.searchPlaceholder} style={{ border: "1px solid #d1d5db", borderRadius: 13, padding: "10px 12px", fontWeight: 800 }} />
                    <button type="button" onClick={testConnection} disabled={checking} style={{ border: "1px solid #d1d5db", background: "#ffffff", color: "#0f172a", borderRadius: 13, padding: "10px 12px", fontWeight: 950, cursor: checking ? "wait" : "pointer" }}>{checking ? T.checking : T.testConnection}</button>
                    <button type="button" onClick={() => loadModels(true)} disabled={loadingModels} style={{ border: "none", background: loadingModels ? "#94a3b8" : "#0f172a", color: "#ffffff", borderRadius: 13, padding: "10px 12px", fontWeight: 950, cursor: loadingModels ? "wait" : "pointer" }}>{loadingModels ? T.loading : T.loadFreeModels}</button>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 900 }}><input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />{T.freeOnly}</label>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 900 }}><input type="checkbox" checked={hermesOnly} onChange={(event) => setHermesOnly(event.target.checked)} />{T.hermesOk}</label>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 900 }}><input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} />{T.favoritesOnly}</label>
                    <Badge tone="blue">{T.visible} {visibleModels.length}{T.countUnit}</Badge>
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8 }}>
                    <input value={customModelId} onChange={(event) => setCustomModelId(event.target.value)} placeholder={T.customPlaceholder} style={{ border: "1px solid #d1d5db", borderRadius: 13, padding: "10px 12px", fontWeight: 800 }} />
                    <button type="button" onClick={addCustomModel} style={{ border: "1px solid #c4b5fd", background: "#f5f3ff", color: "#5b21b6", borderRadius: 13, padding: "10px 12px", fontWeight: 950, cursor: "pointer" }}>{T.customAdd}</button>
                  </div>
                </div>

                {false ? (
                  <div style={{ border: "1px solid #e5e7eb", background: "#ffffff", borderRadius: 20, padding: 28, textAlign: "center", color: "#64748b" }}>
                    <div style={{ fontSize: 30, marginBottom: 8 }}>??</div>
                    <div style={{ fontWeight: 950, color: "#0f172a" }}>{activeProviderDisplayName} {T.nextStep}</div>
                    <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>{T.nextStepHint}</div>
                  </div>
                ) : visibleModels.length === 0 ? (
                  <div style={{ border: "1px solid #e5e7eb", background: "#ffffff", borderRadius: 20, padding: 28, textAlign: "center", color: "#64748b" }}>
                    <div style={{ fontSize: 30, marginBottom: 8 }}>??</div>
                    <div style={{ fontWeight: 950, color: "#0f172a" }}>{T.noModels}</div>
                    <div style={{ marginTop: 6, fontSize: 13 }}>{T.noModelsHint}</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                    {visibleModels.map((model) => (
                      <ModelCard key={model.id} model={model} favorite={favorites.includes(model.id)} onFavorite={toggleFavorite} onUse={useModel} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
