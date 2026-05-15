"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MODEL_PRESETS,
  flattenModelPresets,
  getTierLabel,
  getTierColor,
  isHermesCompatible,
  getModelWarning,
  getRecommendedModel,
  getUseCaseLabel
} from "../lib/modelPresets.js";
import AgentRunLogPanel from "./AgentRunLogPanel.jsx";
import AgentRunHistoryPanel from "./AgentRunHistoryPanel.jsx";

const providerOptions = [
  { id: "hermes", label: "Hermes 기본 설정 사용" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "gemini", label: "Gemini" },
  { id: "codex", label: "Codex (아직 미연결)" },
  { id: "claude_code", label: "Claude Code (아직 미연결)" },
  { id: "openclaude", label: "OpenClaude (아직 미연결)" }
];

const modeOptions = [
  { id: "suggest", label: "Suggest · 파일 수정 금지" },
  { id: "edit", label: "Edit · 일반 실행" },
  { id: "auto", label: "Auto · 권장 안 함 / 아직 제한" }
];

function normalizeSkillItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.value)) return data.value;
  if (Array.isArray(data.skills)) return data.skills;
  return [];
}

function getSkillName(skill) {
  return skill.name || skill.id || "";
}

function getModelBadges(item) {
  const badges = [];
  if (item.recommended) badges.push("⭐");
  if (item.verified) badges.push("✓");
  if (item.hermesCompatible === false) badges.push("⚠");
  return badges.join("");
}

const presetButtonStyle = {
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  borderRadius: 999,
  padding: "7px 10px",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12
};

export default function AgentPanel({ activeSessionId = "", onSessionChanged = null } = {}) {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("hermes");
  const [mode, setMode] = useState("suggest");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [liveModels, setLiveModels] = useState([]);
  const [modelFavorites, setModelFavorites] = useState([]);
  const [modelSearch, setModelSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelLoadError, setModelLoadError] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [toolsets, setToolsets] = useState("");
  const [responseMode, setResponseMode] = useState("normal");
  const [workspace, setWorkspace] = useState("");
  const [skillsData, setSkillsData] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runningMode, setRunningMode] = useState("");
  const [result, setResult] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [activeSessionInfo, setActiveSessionInfo] = useState(null);
  const [error, setError] = useState("");

  async function loadLiveModels(refresh = false) {
    setModelLoading(true);
    setModelLoadError("");

    try {
      const [modelsRes, favRes] = await Promise.all([
        fetch("/api/models/openrouter" + (refresh ? "?refresh=true" : ""), {
          cache: "no-store"
        }),
        fetch("/api/models/favorites", {
          cache: "no-store"
        })
      ]);

      const modelsJson = await modelsRes.json();
      const favJson = await favRes.json();

      if (!modelsRes.ok || modelsJson.ok === false) {
        throw new Error(modelsJson.error || "Failed to load OpenRouter models");
      }

      setLiveModels(Array.isArray(modelsJson.models) ? modelsJson.models : []);
      setModelFavorites(Array.isArray(favJson.favorites) ? favJson.favorites : []);
    } catch (err) {
      setModelLoadError(err.message || String(err));
    } finally {
      setModelLoading(false);
    }
  }

  async function toggleModelFavorite(modelId) {
    const nextFavorite = !modelFavorites.includes(modelId);

    setModelFavorites((prev) => {
      if (nextFavorite) return Array.from(new Set([...prev, modelId]));
      return prev.filter((item) => item !== modelId);
    });

    try {
      await fetch("/api/models/favorites", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          modelId,
          favorite: nextFavorite
        })
      });
    } catch (err) {
      setModelLoadError(err.message || String(err));
      loadLiveModels(false);
    }
  }

  useEffect(() => {
    loadLiveModels(false);
  }, []);

  const flatPresets = useMemo(() => flattenModelPresets(), []);

  const selectedPreset = useMemo(() => {
    return flatPresets.find((item) => item.id === model) || null;
  }, [flatPresets, model]);

  const combinedModelOptions = useMemo(() => {
    const byId = new Map();

    for (const item of flatPresets) {
      byId.set(item.id, {
        ...item,
        source: item.source || "preset"
      });
    }

    for (const item of liveModels) {
      const existing = byId.get(item.id) || {};

      byId.set(item.id, {
        ...item,
        ...existing,
        label: existing.label || item.label || item.name || item.id,
        provider: existing.provider || item.provider || "openrouter",
        source: existing.source ? existing.source + "+live" : "openrouter-live"
      });
    }

    const q = modelSearch.trim().toLowerCase();

    return Array.from(byId.values())
      .filter((item) => {
        if (favoritesOnly && !modelFavorites.includes(item.id)) return false;
        if (!q) return true;

        return [
          item.id,
          item.label,
          item.name,
          item.note,
          item.tier,
          item.provider,
          item.source
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const af = modelFavorites.includes(a.id) ? 0 : 1;
        const bf = modelFavorites.includes(b.id) ? 0 : 1;
        if (af !== bf) return af - bf;

        const ar = Number(a.rank || 9999);
        const br = Number(b.rank || 9999);
        if (ar !== br) return ar - br;

        const ac = Number(a.minContext || a.contextLength || 0);
        const bc = Number(b.minContext || b.contextLength || 0);
        if (bc !== ac) return bc - ac;

        return String(a.label || a.id).localeCompare(String(b.label || b.id));
      });
  }, [flatPresets, liveModels, modelSearch, favoritesOnly, modelFavorites]);

  const selectedModelInfo = useMemo(() => {
    return combinedModelOptions.find((item) => item.id === model) || selectedPreset;
  }, [combinedModelOptions, selectedPreset, model]);

  const modelWarning = useMemo(() => {
    if (!model || model === "__custom__") return "";
    return getModelWarning(model);
  }, [model]);

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    if (!res.ok) {
      throw new Error(text || `${res.status} ${res.statusText}`);
    }

    return text ? JSON.parse(text) : {};
  }

  async function loadWorkspace() {
    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      const data = await res.json();

      if (data.ok && data.config && data.config.currentWorkspace) {
        setWorkspace(data.config.currentWorkspace);
      } else {
        setWorkspace("");
      }
    } catch {
      setWorkspace("");
    }
  }

  async function loadMeta() {
    setLoadingMeta(true);

    try {
      const data = await fetchJson("/api/hermes/native/skills");
      setSkillsData(data);
    } catch {
      setSkillsData(null);
    } finally {
      setLoadingMeta(false);
    }
  }

  function handleModelChange(value) {
    setModel(value);

    const preset = combinedModelOptions.find((item) => item.id === value) || flatPresets.find((item) => item.id === value);

    if (preset && preset.provider) {
      setProvider(preset.provider);
    }
  }

  function applyRecommendedModel() {
    const rec = getRecommendedModel();
    if (rec) {
      handleModelChange(rec.id);
    }
  }

  function addSkill(name) {
    const skillName = String(name || selectedSkill || "").trim();

    if (!skillName) return;

    setSelectedSkills((prev) => {
      if (prev.includes(skillName)) return prev;
      return [...prev, skillName];
    });

    setSelectedSkill("");
  }

  function removeSkill(name) {
    setSelectedSkills((prev) => prev.filter((item) => item !== name));
  }

  function applyPreset(type) {
    if (type === "project") {
      setSelectedSkills(["hermes-agent", "writing-plans"]);
    }

    if (type === "debug") {
      setSelectedSkills(["systematic-debugging", "debugging-hermes-tui-commands"]);
    }

    if (type === "code") {
      setSelectedSkills(["hermes-agent", "software-development"]);
    }
  }

  async function loadActiveSessionDetail(sessionId) {
    if (!sessionId) {
      setActiveSessionInfo(null);
      return;
    }

    try {
      const res = await fetch(`/api/agent/sessions/${sessionId}`, {
        cache: "no-store"
      });
      const data = await res.json();

      if (res.ok && data.ok !== false) {
        setActiveSessionInfo(data.session || null);
      }
    } catch {
      setActiveSessionInfo(null);
    }
  }

  async function runAgent(dryRunValue) {
    const trimmed = prompt.trim();

    if (!trimmed) {
      setError("프롬프트를 입력하세요.");
      return;
    }

    const finalModel = model === "__custom__" ? customModel.trim() : model;

    if (!dryRunValue && finalModel && !isHermesCompatible(finalModel)) {
      const warn = getModelWarning(finalModel) || "이 모델은 Hermes 호환성에 문제가 있을 수 있습니다.";
      const ok = window.confirm(`⚠ 경고

${warn}

그래도 실행하시겠습니까?`);
      if (!ok) return;
    }

    setLoading(true);
    setRunningMode(dryRunValue ? "dry" : "real");
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: trimmed,
          provider,
          mode,
          model: finalModel,
          skills: selectedSkills.join(","),
          toolsets,
          responseMode,
          dryRun: dryRunValue,
          sessionId: activeSessionId || ""
        })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Agent run failed");
      }

      setResult(data);
      setHistoryRefreshKey((prev) => prev + 1);

      if (data.workspaceRoot) {
        setWorkspace(data.workspaceRoot);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
      setRunningMode("");
    }
  }

  useEffect(() => {
    loadWorkspace();
    loadMeta();
  }, []);

  const skillItems = useMemo(() => normalizeSkillItems(skillsData), [skillsData]);

  const filteredSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();

    return skillItems
      .filter((skill) => skill.enabled !== false)
      .filter((skill) => {
        if (!q) return true;
        const raw = JSON.stringify(skill).toLowerCase();
        return raw.includes(q);
      })
      .sort((a, b) => getSkillName(a).localeCompare(getSkillName(b)));
  }, [skillItems, skillQuery]);

  const outputText =
    result && result.output
      ? result.output
      : result
        ? JSON.stringify(result, null, 2)
        : "";

  const tierColor = selectedModelInfo ? getTierColor(selectedModelInfo.tier) : null;

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 24,
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 18
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 24, letterSpacing: -0.5 }}>
            Hermes 채팅
          </h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            모델은 인기순위/회사별 프리셋에서 고르고, 스킬은 목록에서 선택해 실행합니다.
          </p>
        </div>

        <div
          style={{
            padding: "8px 11px",
            borderRadius: 999,
            background: workspace ? "#dcfce7" : "#fef3c7",
            color: workspace ? "#166534" : "#92400e",
            fontSize: 12,
            fontWeight: 800,
            maxWidth: 420,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          Workspace: {workspace || "선택 안 됨"}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 220px minmax(300px, 1fr)",
          gap: 12,
          marginBottom: 14
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Provider
          </label>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 11px",
              background: "#ffffff"
            }}
          >
            {providerOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Permission Mode
          </label>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 11px",
              background: "#ffffff"
            }}
          >
            {modeOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>


        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 7,
              gap: 10
            }}
          >
            <label style={{ fontSize: 13, fontWeight: 900 }}>
              {"\uBAA8\uB378 \u00B7 \uC790\uB3D9 \uBAA9\uB85D / \uC990\uACA8\uCC3E\uAE30"}
            </label>

            <button
              onClick={applyRecommendedModel}
              style={{
                border: "1px solid #16a34a",
                background: "#dcfce7",
                color: "#166534",
                borderRadius: 999,
                padding: "3px 9px",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer"
              }}
              title="verified recommended model"
            >
              {"\u2B50 \uCD94\uCC9C \uBAA8\uB378 \uC801\uC6A9"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: 8,
              marginBottom: 8
            }}
          >
            <input
              value={modelSearch}
              onChange={(event) => setModelSearch(event.target.value)}
              placeholder="Search: gpt, claude, free, coder..."
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 10,
                padding: "9px 10px",
                boxSizing: "border-box"
              }}
            />

            <button
              type="button"
              onClick={() => loadLiveModels(true)}
              disabled={modelLoading}
              style={{
                border: "1px solid #d1d5db",
                background: "#ffffff",
                borderRadius: 10,
                padding: "9px 10px",
                fontWeight: 900,
                cursor: modelLoading ? "wait" : "pointer"
              }}
            >
              {modelLoading ? "Loading..." : "\uCD5C\uC2E0 \uBAA8\uB378"}
            </button>
          </div>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer"
            }}
          >
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(event) => setFavoritesOnly(event.target.checked)}
            />
            {"\uC990\uACA8\uCC3E\uAE30\uB9CC \uBCF4\uAE30"}
          </label>

          {modelLoadError ? (
            <div style={{ marginBottom: 8, color: "#991b1b", fontSize: 12 }}>
              {modelLoadError}
            </div>
          ) : null}

          <select
            value={model}
            onChange={(event) => handleModelChange(event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 11px",
              background: "#ffffff"
            }}
          >
            <option value="">{"Hermes \uAE30\uBCF8 \uBAA8\uB378 \uC0AC\uC6A9"}</option>

            {combinedModelOptions.map((item) => {
              const fav = modelFavorites.includes(item.id);
              const context = Number(item.minContext || item.contextLength || 0);

              return (
                <option key={item.id} value={item.id}>
                  {fav ? "\u2B50 " : ""}{item.label || item.name || item.id} {" - "} {getTierLabel(item.tier)} {" - context "} {context.toLocaleString()} {" - "} {item.id}
                </option>
              );
            })}

            <option value="__custom__">{"\uC9C1\uC811 \uC785\uB825"}</option>
          </select>

          {model && model !== "__custom__" ? (
            <button
              type="button"
              onClick={() => toggleModelFavorite(model)}
              style={{
                marginTop: 8,
                border: "1px solid #fbbf24",
                background: modelFavorites.includes(model) ? "#fef3c7" : "#ffffff",
                color: "#92400e",
                borderRadius: 10,
                padding: "8px 10px",
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              {modelFavorites.includes(model) ? "\u2B50 \uC990\uACA8\uCC3E\uAE30 \uD574\uC81C" : "\u2B50 \uC990\uACA8\uCC3E\uAE30 \uCD94\uAC00"}
            </button>
          ) : null}
        </div>
      </div>

      {selectedModelInfo ? (
        <div
          style={{
            marginBottom: 14,
            padding: 13,
            borderRadius: 12,
            background: tierColor ? tierColor.bg : "#eff6ff",
            color: tierColor ? tierColor.fg : "#1e3a8a",
            fontSize: 13,
            lineHeight: 1.6,
            border: selectedModelInfo.hermesCompatible === false ? "1px solid #fca5a5" : "1px solid transparent"
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong>{selectedModelInfo.group} / {selectedModelInfo.rank}위</strong>
            {selectedModelInfo.recommended ? (
              <span style={{ background: "#16a34a", color: "#fff", padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                ⭐ 추천
              </span>
            ) : null}
            {selectedModelInfo.verified ? (
              <span style={{ background: "#2563eb", color: "#fff", padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                ✓ 검증완료
              </span>
            ) : null}
            {selectedModelInfo.hermesCompatible === false ? (
              <span style={{ background: "#dc2626", color: "#fff", padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                ⚠ Hermes 호환 주의
              </span>
            ) : null}
          </div>
          <div style={{ marginTop: 6 }}>
            {selectedModelInfo.label} · {getTierLabel(selectedModelInfo.tier)} · context {(selectedModelInfo.minContext || 0).toLocaleString()}
          </div>
          <div style={{ marginTop: 4 }}>{selectedModelInfo.note}</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>Model ID: {selectedModelInfo.id}</div>

          {Array.isArray(selectedModelInfo.useCase) && selectedModelInfo.useCase.length > 0 ? (
            <div style={{ marginTop: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>
              {selectedModelInfo.useCase.map((u) => (
                <span
                  key={u}
                  style={{
                    background: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    padding: "2px 7px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  {getUseCaseLabel(u)}
                </span>
              ))}
            </div>
          ) : null}

          {modelWarning ? (
            <div
              style={{
                marginTop: 8,
                padding: "6px 8px",
                background: "#fef2f2",
                color: "#991b1b",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700
              }}
            >
              ⚠ {modelWarning}
            </div>
          ) : null}
        </div>
      ) : null}

      {model === "__custom__" ? (
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Custom Model
          </label>
          <input
            value={customModel}
            onChange={(event) => setCustomModel(event.target.value)}
            placeholder="예: anthropic/claude-sonnet-4.6"
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 11px",
              boxSizing: "border-box"
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr)",
          gap: 12,
          marginBottom: 14
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#f9fafb"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
              Skills
            </label>
            <button
              onClick={loadMeta}
              disabled={loadingMeta}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                fontWeight: 900,
                cursor: loadingMeta ? "not-allowed" : "pointer"
              }}
            >
              {loadingMeta ? "불러오는 중..." : "목록 새로고침"}
            </button>
          </div>

          <input
            value={skillQuery}
            onChange={(event) => setSkillQuery(event.target.value)}
            placeholder="스킬 검색..."
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              boxSizing: "border-box",
              marginBottom: 8
            }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={selectedSkill}
              onChange={(event) => setSelectedSkill(event.target.value)}
              style={{
                flex: 1,
                border: "1px solid #d1d5db",
                borderRadius: 10,
                padding: "10px 11px",
                background: "#ffffff"
              }}
            >
              <option value="">스킬 선택</option>
              {filteredSkills.map((skill) => {
                const name = getSkillName(skill);
                return (
                  <option key={name} value={name}>
                    {name} · {skill.category || "uncategorized"}
                  </option>
                );
              })}
            </select>

            <button
              onClick={() => addSkill()}
              style={{
                border: "none",
                background: "#111827",
                color: "#ffffff",
                borderRadius: 10,
                padding: "0 13px",
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              추가
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {selectedSkills.length === 0 ? (
              <span style={{ color: "#6b7280", fontSize: 13 }}>선택한 스킬 없음</span>
            ) : (
              selectedSkills.map((name) => (
                <button
                  key={name}
                  onClick={() => removeSkill(name)}
                  title="클릭하면 제거"
                  style={{
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    borderRadius: 999,
                    padding: "6px 9px",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  {name} ×
                </button>
              ))
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button onClick={() => applyPreset("project")} style={presetButtonStyle}>
              프로젝트 분석 프리셋
            </button>
            <button onClick={() => applyPreset("debug")} style={presetButtonStyle}>
              디버깅 프리셋
            </button>
            <button onClick={() => applyPreset("code")} style={presetButtonStyle}>
              코딩 에이전트 프리셋
            </button>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#f9fafb"
          }}
        >
          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Toolsets (선택)
          </label>
          <input
            value={toolsets}
            onChange={(event) => setToolsets(event.target.value)}
            placeholder="비워두기 권장"
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 11px",
              boxSizing: "border-box",
              marginBottom: 10
            }}
          />

          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "#eff6ff",
              color: "#1e3a8a",
              fontSize: 13,
              lineHeight: 1.6
            }}
          >
            처음에는 Toolsets를 비워두는 것이 안전합니다. 스킬은 왼쪽에서 여러 개 선택할 수 있습니다.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#f9fafb"
        }}
      >
        <label style={{ fontWeight: 900, fontSize: 13, color: "#111827" }}>
          응답 압축 모드
        </label>
        <select
          value={responseMode}
          onChange={(event) => setResponseMode(event.target.value)}
          style={{
            width: "100%",
            border: "1px solid #d1d5db",
            borderRadius: 10,
            padding: "9px 10px",
            fontSize: 13,
            background: "#ffffff"
          }}
        >
          <option value="normal">기본 - 평소처럼 답변</option>
          <option value="short">짧게 - 핵심만 요약</option>
          <option value="compact">초압축 - 결론/명령 중심 3줄 이내</option>
        </select>
      </div>

      {activeSessionInfo ? (
        <div
          style={{
            marginTop: 12,
            marginBottom: 12,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            borderRadius: 14,
            padding: 12,
            color: "#1e3a8a",
            fontSize: 13,
            lineHeight: 1.55
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 4 }}>Active Session Memory</div>
          <div><strong>{activeSessionInfo.title}</strong></div>
          <div>{activeSessionInfo.memory?.currentGoal || "No current goal yet."}</div>
          <div style={{ color: "#475569", marginTop: 4 }}>
            runs={(activeSessionInfo.runs || []).length} · messages={(activeSessionInfo.messages || []).length}
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: 12,
            marginBottom: 12,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            borderRadius: 14,
            padding: 12,
            color: "#6b7280",
            fontSize: 13
          }}
        >
          Hover the right History sidebar and choose a conversation to continue, or run once to auto-save a new session.
        </div>
      )}

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="예: 이 프로젝트 구조를 분석하고 다음 구현 순서를 3개만 제안해줘. 파일은 수정하지 마."
        style={{
          width: "100%",
          minHeight: 170,
          resize: "vertical",
          border: "1px solid #d1d5db",
          borderRadius: 14,
          padding: 14,
          fontSize: 14,
          lineHeight: 1.6,
          boxSizing: "border-box"
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginTop: 14
        }}
      >
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          Suggest 모드는 프롬프트 앞에 파일 수정 금지 문구를 자동으로 붙입니다.
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => runAgent(true)}
            disabled={loading}
            style={{
              border: "none",
              background: loading && runningMode === "dry" ? "#9ca3af" : "#2563eb",
              color: "#ffffff",
              borderRadius: 12,
              padding: "11px 16px",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading && runningMode === "dry" ? "계획 확인 중..." : "Dry-run 실행"}
          </button>

          <button
            onClick={() => runAgent(false)}
            disabled={loading}
            style={{
              border: "none",
              background: loading && runningMode === "real" ? "#9ca3af" : "#16a34a",
              color: "#ffffff",
              borderRadius: 12,
              padding: "11px 16px",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading && runningMode === "real" ? "Hermes 실행 중..." : "Hermes 실제 실행"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 16,
            padding: 13,
            borderRadius: 12,
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: 13,
            wordBreak: "break-all"
          }}
        >
          {error}
        </div>
      ) : null}

      <AgentRunLogPanel />
      <AgentRunHistoryPanel refreshKey={historyRefreshKey} />

      {result ? (
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
            gap: 14
          }}
        >
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 15,
              background: "#f9fafb"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Execution Info</h3>
            <div style={{ lineHeight: 1.8, fontSize: 14, color: "#374151" }}>
              <div><strong>Main Runtime:</strong> Hermes Agent</div>
              <div><strong>Provider:</strong> {result.provider}</div>
              <div><strong>Mode:</strong> {result.mode}</div>
              <div><strong>Model:</strong> {result.model || "-"}</div>
              <div><strong>Skills:</strong> {result.skills || "-"}</div>
              <div><strong>Workspace:</strong> {result.workspaceRoot}</div>
              <div><strong>WSL Workspace:</strong> {result.workspaceWsl}</div>
              <div><strong>Hermes Workspace:</strong> {result.hermesWorkspaceRoot}</div>
              <div><strong>Dry-run:</strong> {result.dryRun ? "true" : "false"}</div>
            </div>
          </div>

          <pre
            style={{
              margin: 0,
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 15,
              background: "#0f172a",
              color: "#d1fae5",
              overflow: "auto",
              minHeight: 260,
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap"
            }}
          >
            {outputText}
          </pre>
        </div>
      ) : null}
    </section>
  );
}