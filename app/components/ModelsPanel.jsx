"use client";

import { useEffect, useMemo, useState } from "react";

function Badge({ tone = "good", children }) {
  const colors = {
    good: { bg: "#dcfce7", color: "#166534" },
    warn: { bg: "#fef3c7", color: "#92400e" },
    bad: { bg: "#fee2e2", color: "#991b1b" },
    dark: { bg: "#111827", color: "#ffffff" }
  };

  const c = colors[tone] || colors.good;

  

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 9px",
        borderRadius: 999,
        background: c.bg,
        color: c.color,
        fontSize: 12,
        fontWeight: 900
      }}
    >
      {children}
    </span>
  );
}

function safeString(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}


function JsonDetailsCard({ title, data, fallback, defaultOpen = false }) {
  const hasData = data && !data.error;

  return (
    <details
      open={defaultOpen}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: "#f9fafb",
        overflow: "hidden"
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontWeight: 900
        }}
      >
        <span>{title}</span>
        <span
          style={{
            fontSize: 12,
            color: "#2563eb",
            fontWeight: 900
          }}
        >
          {"\uC811\uAE30 / \uD3BC\uCE58\uAE30"}
        </span>
      </summary>

      <div style={{ padding: 16, borderTop: "1px solid #e5e7eb" }}>
        {hasData ? (
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 12,
              lineHeight: 1.6,
              color: "#111827",
              maxHeight: 260,
              overflow: "auto"
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <div style={{ color: "#991b1b", fontSize: 13 }}>
            {data?.error || fallback}
          </div>
        )}
      </div>
    </details>
  );
}

export default function ModelsPanel() {
  const [modelInfo, setModelInfo] = useState(null);
  const [modelOptions, setModelOptions] = useState(null);
  const [auxiliaryModels, setAuxiliaryModels] = useState(null);
  const [envVars, setEnvVars] = useState(null);
  const [oauthProviders, setOauthProviders] = useState(null);
  const [claudeStatus, setClaudeStatus] = useState(null);
  const [cliModelBadges, setCliModelBadges] = useState({});
  const [startingCliAgent, setStartingCliAgent] = useState("");
  const [modelHealthChecking, setModelHealthChecking] = useState(false);
  const [modelHealth, setModelHealth] = useState(null);
  const [expandedCliAgents, setExpandedCliAgents] = useState({});
  const [startingClaudeCode, setStartingClaudeCode] = useState(false);
  const [query, setQuery] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingEnv, setSavingEnv] = useState(false);
  const [authStarting, setAuthStarting] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function fetchJson(url, options) {
    const res = await fetch(url, {
      cache: "no-store",
      ...(options || {})
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(text || `${res.status} ${res.statusText}`);
    }

    return text ? JSON.parse(text) : {};
  }

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        fetchJson("/api/hermes/native/model/info"),
        fetchJson("/api/hermes/native/model/options"),
        fetchJson("/api/hermes/native/model/auxiliary"),
        fetchJson("/api/hermes/native/env"),
        fetchJson("/api/hermes/native/providers/oauth"),
        fetchJson("/api/cli/claude/status")
      ]);

      const [info, options, auxiliary, env, oauth, claude] = results;

      setModelInfo(info.status === "fulfilled" ? info.value : { error: info.reason?.message });
      setModelOptions(options.status === "fulfilled" ? options.value : { error: options.reason?.message });
      setAuxiliaryModels(auxiliary.status === "fulfilled" ? auxiliary.value : { error: auxiliary.reason?.message });
      setEnvVars(env.status === "fulfilled" ? env.value : { error: env.reason?.message });
      setOauthProviders(oauth.status === "fulfilled" ? oauth.value : { error: oauth.reason?.message });
      setClaudeStatus(claude.status === "fulfilled" ? claude.value : { error: claude.reason?.message });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveEnvVar() {
    if (!envKey.trim()) {
      setError("환경변수 이름을 입력해야 합니다.");
      return;
    }

    if (!envValue.trim()) {
      setError("환경변수 값을 입력해야 합니다.");
      return;
    }

    setSavingEnv(true);
    setError("");
    setMessage("");

    try {
      await fetchJson("/api/hermes/native/env", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          key: envKey.trim(),
          value: envValue
        })
      });

      const savedKey = envKey.trim();

      setMessage(`[완료] ${savedKey} 저장 완료. 환경변수 목록을 새로고침했습니다.`);
      setEnvKey(savedKey);
      setEnvValue("");
      window.dispatchEvent(new CustomEvent("mamabot:models-refresh", { detail: { envKey: savedKey } }));
      await loadAll();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSavingEnv(false);
    }
  }

  async function startClaudeCodeLogin() {
    setStartingClaudeCode(true);
    setError("");
    setMessage("");

    try {
      const data = await fetchJson("/api/cli/claude/start", {
        method: "POST"
      });

      setMessage(data.message || "Claude Code login terminal opened.");

      setTimeout(() => {
        loadAll();
      }, 2500);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setStartingClaudeCode(false);
    }
  }

  async function checkModelHealth() {
    setModelHealthChecking(true);
    setError("");
    setMessage("");

    try {
      const [modelsResult, favoritesResult, claudeResult, codexResult, geminiResult] = await Promise.allSettled([
        fetchJson("/api/models/openrouter?refresh=true"),
        fetchJson("/api/models/favorites"),
        fetchJson("/api/model-badges?agentId=claude-code"),
        fetchJson("/api/model-badges?agentId=codex-cli"),
        fetchJson("/api/model-badges?agentId=gemini-cli")
      ]);

      const openrouterModels =
        modelsResult.status === "fulfilled" && Array.isArray(modelsResult.value.models)
          ? modelsResult.value.models
          : [];

      const favorites =
        favoritesResult.status === "fulfilled" && Array.isArray(favoritesResult.value.favorites)
          ? favoritesResult.value.favorites
          : [];

      const liveMap = new Map();

      for (const item of openrouterModels) {
        if (item?.id) liveMap.set(item.id, item);
      }

      const favoriteStatus = favorites.map((id) => {
        const found = liveMap.get(id);
        const contextLength = Number(found?.contextLength || found?.context_length || found?.minContext || 0);

        return {
          id,
          label: found?.label || found?.name || id,
          alive: Boolean(found),
          contextLength,
          badges: [
            found ? "ALIVE" : "MISSING",
            String(id).includes(":free") ? "FREE" : "",
            contextLength >= 64000 ? "64K+" : "",
            contextLength >= 200000 ? "대용량" : ""
          ].filter(Boolean)
        };
      });

      const cliStatus = [
        ["claude-code", "Claude Code", claudeResult],
        ["codex-cli", "Codex CLI", codexResult],
        ["gemini-cli", "Gemini CLI", geminiResult]
      ].map(([agentId, label, result]) => {
        const ok = result.status === "fulfilled" && result.value?.ok !== false;
        const count = ok ? Number(result.value?.count || 0) : 0;
        const latest = ok ? result.value?.latest || null : null;

        return {
          agentId,
          label,
          ok,
          count,
          latestLabel: latest?.label || latest?.id || "",
          badges: [
            ok ? "CATALOG OK" : "CATALOG ERROR",
            count > 0 ? count + " models" : "",
            latest ? "최신: " + (latest.label || latest.id) : ""
          ].filter(Boolean)
        };
      });

      setModelHealth({
        checkedAt: new Date().toLocaleString(),
        openrouterCount: openrouterModels.length,
        favoriteStatus,
        cliStatus
      });

      setMessage("모델 생존 확인 완료");
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setModelHealthChecking(false);
    }
  }

  async function loadCliModelBadges() {
    const agentIds = ["claude-code", "codex-cli", "gemini-cli"];

    try {
      const results = await Promise.all(
        agentIds.map(async (agentId) => {
          const data = await fetchJson("/api/model-badges?agentId=" + encodeURIComponent(agentId));
          return [agentId, data];
        })
      );

      setCliModelBadges(Object.fromEntries(results));
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function startCliAgentLogin(agentId) {
    const id = String(agentId || "").trim();

    if (!id) return;

    setStartingCliAgent(id);
    setError("");
    setMessage("");

    try {
      const data = await fetchJson("/api/cli/auth/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ agentId: id })
      });

      setMessage((data.label || id) + " 로그인 터미널을 열었습니다.");
      setTimeout(() => {
        loadAll();
      }, 2500);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setStartingCliAgent("");
    }
  }

  async function startOAuthAuth(providerId) {
    const id = String(providerId || "").trim();

    if (!id) {
      setError("Provider ID\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
      return;
    }

    setAuthStarting(id);
    setError("");
    setMessage("");

    try {
      const data = await fetchJson("/api/hermes/auth/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ provider: id })
      });

      const url = data.authUrl || data.dashboardUrl;

      if (url && data.mode !== "terminal") {
        window.open(url, "_blank", "noopener,noreferrer");
      }

      if (data.mode === "terminal") {
        setMessage(id + " \uC778\uC99D \uD130\uBBF8\uB110\uC744 \uC5F4\uC5C8\uC2B5\uB2C8\uB2E4. \uD130\uBBF8\uB110 \uC548\uB0B4\uC5D0 \uB530\uB77C \uB85C\uADF8\uC778\uD558\uC138\uC694.");
      } else if (data.tokenUrlFound) {
        setMessage(id + " \uC778\uC99D \uD398\uC774\uC9C0\uB97C \uC5F4\uC5C8\uC2B5\uB2C8\uB2E4. \uC778\uC99D \uC644\uB8CC \uD6C4 \uC0C1\uD0DC \uC0C8\uB85C\uACE0\uCE68\uC744 \uB204\uB974\uC138\uC694.");
      } else {
        setMessage(id + " \uC778\uC99D \uBA85\uB839\uC744 \uC2DC\uC791\uD588\uC2B5\uB2C8\uB2E4. \uD130\uBBF8\uB110 \uC548\uB0B4\uB97C \uD655\uC778\uD558\uC138\uC694.");
      }

      setTimeout(() => {
        loadAll();
      }, 2500);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setAuthStarting("");
    }
  }


  async function deleteEnvVar(key) {
    const ok = window.confirm(`환경변수를 삭제할까요?
${key}`);

    if (!ok) return;

    setSavingEnv(true);
    setError("");
    setMessage("");

    try {
      await fetchJson("/api/hermes/native/env", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ key })
      });

      setMessage(`${key} 삭제 완료`);
      await loadAll();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSavingEnv(false);
    }
  }

  useEffect(() => {
    loadAll();
    loadCliModelBadges();
  }, []);

  const envItems = useMemo(() => {
    if (!envVars || envVars.error) return [];

    if (Array.isArray(envVars)) return envVars;

    return Object.entries(envVars).map(([key, value]) => ({
      key,
      ...(typeof value === "object" && value !== null ? value : { value })
    }));
  }, [envVars]);

  const filteredEnvItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return envItems;

    return envItems.filter((item) => {
      return JSON.stringify(item).toLowerCase().includes(q);
    });
  }, [envItems, query]);

  const oauthItems = useMemo(() => {
    if (!oauthProviders || oauthProviders.error) return [];

    if (Array.isArray(oauthProviders)) return oauthProviders;
    if (Array.isArray(oauthProviders.providers)) return oauthProviders.providers;
    if (Array.isArray(oauthProviders.value)) return oauthProviders.value;

    return Object.entries(oauthProviders).map(([key, value]) => ({
      id: key,
      ...(typeof value === "object" && value !== null ? value : { value })
    }));
    return items.filter((item) => {
      const id = item.id || item.provider || item.name || "";
      return AUTH_PROVIDER_ALLOWLIST.has(normalizeProviderId(id));
    });
  }, [oauthProviders]);

  const filteredOauthItems = useMemo(() => {
    return oauthItems.filter((item) => {
      const id = String(item.id || item.provider || item.name || "").trim().toLowerCase().replace(/_/g, "-");
      return id === "openai-codex";
    });
  }, [oauthItems]);

  const cliAgentCards = [
    {
      id: "claude-code",
      title: "Claude Code CLI Agent",
      description: claudeStatus?.connected ? `Connected · ${claudeStatus.version || "-"}` : claudeStatus?.installed ? `Installed · ${claudeStatus.version || "-"}` : "Not installed in Mamabot runtime/cli",
      configPath: claudeStatus?.claudeConfigWin || "F:\\mamabot\\runtime\\claude-home\\.claude",
      connected: Boolean(claudeStatus?.connected),
      installed: Boolean(claudeStatus?.installed),
      statusLabel: claudeStatus?.connected ? "CONNECTED" : claudeStatus?.installed ? "INSTALLED" : "MISSING"
    },
    {
      id: "codex-cli",
      title: "Codex CLI Agent",
      description: "ChatGPT OAuth / Codex CLI 인증형 에이전트",
      configPath: "F:\\mamabot\\runtime\\codex-home",
      connected: false,
      installed: true,
      statusLabel: "AUTH CHECK"
    },
    {
      id: "gemini-cli",
      title: "Gemini CLI Agent",
      description: "Google Login / Gemini CLI 인증형 에이전트",
      configPath: "F:\\mamabot\\runtime\\gemini-home",
      connected: false,
      installed: true,
      statusLabel: "AUTH CHECK"
    }
  ];

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 24,
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        display: "flex",
        flexDirection: "column"
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
          <h2 style={{ margin: 0, fontSize: 24 }}>모델 / 인증</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            Hermes 모델 설정, 보조 모델, 환경변수/API Key, OAuth 연결 상태를 확인합니다.
          </p>
        </div>

        <button
          onClick={loadAll}
          disabled={loading}
          style={{
            border: "none",
            background: loading ? "#9ca3af" : "#111827",
            color: "#ffffff",
            borderRadius: 10,
            padding: "10px 13px",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Loading..." : "새로고침"}
        </button>
      </div>

      {message ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "#dcfce7",
            color: "#166534",
            marginBottom: 14,
            fontSize: 13,
            wordBreak: "break-all"
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "#fee2e2",
            color: "#991b1b",
            marginBottom: 14,
            fontSize: 13,
            wordBreak: "break-all"
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
          marginTop: 16,
          order: 4
        }}
      >
        <JsonDetailsCard
          title={"\uD604\uC7AC \uBAA8\uB378 \uC815\uBCF4"}
          data={modelInfo}
          fallback="No model info loaded."
        />

        <JsonDetailsCard
          title={"\uBAA8\uB378 \uC635\uC158"}
          data={modelOptions}
          fallback="No model options loaded."
        />

        <JsonDetailsCard
          title={"\uBCF4\uC870 \uBAA8\uB378"}
          data={auxiliaryModels}
          fallback="No auxiliary models loaded."
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
          order: 1
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 16,
            background: "#f9fafb"
          }}
        >
          <h3 style={{ margin: "0 0 12px" }}>환경변수 / API Key 저장</h3>

          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Key
          </label>
          <input
            value={envKey}
            onChange={(event) => setEnvKey(event.target.value)}
            placeholder="OPENAI_API_KEY"
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              boxSizing: "border-box",
              marginBottom: 12
            }}
          />

          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Value
          </label>
          <input
            value={envValue}
            onChange={(event) => setEnvValue(event.target.value)}
            placeholder="sk-..."
            type="password"
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              boxSizing: "border-box",
              marginBottom: 12
            }}
          />

          <button
            onClick={saveEnvVar}
            disabled={savingEnv}
            style={{
              width: "100%",
              border: "none",
              background: savingEnv ? "#9ca3af" : "#2563eb",
              color: "#ffffff",
              borderRadius: 10,
              padding: "11px 13px",
              fontWeight: 900,
              cursor: savingEnv ? "not-allowed" : "pointer"
            }}
          >
            {savingEnv ? "저장 중..." : "저장 / 업데이트"}
          </button>

          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              background: "#eff6ff",
              color: "#1e3a8a",
              fontSize: 13,
              lineHeight: 1.6
            }}
          >
            값은 화면에 표시하지 않습니다. 저장된 키는 Hermes의 환경변수 API를 통해 관리됩니다.
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            background: "#ffffff",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>환경변수 목록</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                Total: {envItems.length}
              </div>
            </div>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search env..."
              style={{
                width: 220,
                border: "1px solid #d1d5db",
                borderRadius: 10,
                padding: "8px 10px"
              }}
            />
          </div>

          <div style={{ maxHeight: 360, overflow: "auto" }}>
            {envVars?.error ? (
              <div style={{ padding: 16, color: "#991b1b", fontSize: 13 }}>
                {envVars.error}
              </div>
            ) : filteredEnvItems.length === 0 ? (
              <div style={{ padding: 16, color: "#6b7280" }}>
                No env vars found.
              </div>
            ) : (
              filteredEnvItems.map((item) => {
                const key = item.key || item.name;
                const configured =
                  item.configured ??
                  item.exists ??
                  item.set ??
                  item.present ??
                  Boolean(item.value);

                return (
                  <div
                    key={key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(180px, 1fr) 100px 80px",
                      gap: 10,
                      alignItems: "center",
                      padding: "12px 14px",
                      borderBottom: "1px solid #e5e7eb"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, color: "#111827" }}>{key}</div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        {safeString(item.description || item.provider || item.source)}
                      </div>
                    </div>

                    <Badge tone={configured ? "good" : "warn"}>
                      {configured ? "SET" : "EMPTY"}
                    </Badge>

                    <button
                      onClick={() => deleteEnvVar(key)}
                      style={{
                        border: "1px solid #fecaca",
                        background: "#fff1f2",
                        color: "#991b1b",
                        borderRadius: 10,
                        padding: "7px 9px",
                        fontWeight: 900,
                        cursor: "pointer"
                      }}
                    >
                      삭제
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          order: 2,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          background: "#ffffff",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid #e5e7eb",
            fontWeight: 900
          }}
        >CLI 인증 에이전트</div>

        <div style={{ padding: 14, display: "grid", gap: 12 }}>
          {cliAgentCards.map((agent) => {
            const modelData = cliModelBadges[agent.id] || {};
            const models = Array.isArray(modelData.models) ? modelData.models : [];
            const latest = modelData.latest || models[0] || null;
            const statusTone = agent.connected ? "good" : agent.installed ? "warn" : "bad";

            return (
              <div
                key={agent.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 13,
                  display: "grid",
                  gap: 12
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 900 }}>{agent.title}</div>
                      {latest ? (
                        <Badge tone="good">
                          최신: {latest.label || latest.id}
                        </Badge>
                      ) : null}
                    </div>

                    <div style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.6, marginTop: 4 }}>
                      {agent.description}
                    </div>

                    <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4, wordBreak: "break-all" }}>
                      Config: {agent.configPath}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => startCliAgentLogin(agent.id)}
                      disabled={startingCliAgent === agent.id}
                      style={{
                        border: "1px solid #2563eb",
                        background: startingCliAgent === agent.id ? "#bfdbfe" : "#2563eb",
                        color: "#ffffff",
                        borderRadius: 10,
                        padding: "7px 10px",
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: startingCliAgent === agent.id ? "wait" : "pointer"
                      }}
                    >
                      {startingCliAgent === agent.id ? "Opening..." : "Login"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        loadAll();
                        loadCliModelBadges();
                      }}
                      style={{
                        border: "1px solid #d1d5db",
                        background: "#ffffff",
                        color: "#111827",
                        borderRadius: 10,
                        padding: "7px 10px",
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: "pointer"
                      }}
                    >
                      Refresh
                    </button>

                    <Badge tone={statusTone}>
                      {agent.statusLabel}
                    </Badge>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px solid #f3f4f6",
                    paddingTop: 10
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 13 }}>
                      사용 가능 모델 · 최신순 · {models.length}개
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCliAgents((prev) => ({
                          ...prev,
                          [agent.id]: !prev[agent.id]
                        }))
                      }
                      style={{
                        border: "1px solid #d1d5db",
                        background: "#ffffff",
                        color: "#111827",
                        borderRadius: 999,
                        padding: "4px 9px",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: "pointer"
                      }}
                    >
                      {expandedCliAgents[agent.id] ? "접기" : "펼치기"}
                    </button>
                  </div>

                  {models.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        maxHeight: expandedCliAgents[agent.id] ? "none" : 68,
                        overflow: "hidden"
                      }}
                    >
                      {models.map((model) => (
                        <div
                          key={model.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 10,
                            background: "#f9fafb",
                            border: "1px solid #eef2f7",
                            flexWrap: "wrap"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 850 }}>{model.label || model.id}</div>
                            <div style={{ color: "#6b7280", fontSize: 12 }}>
                              {model.id}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {(model.badges || []).map((badge) => (
                              <span
                                key={badge}
                                style={{
                                  background:
                                    badge === "최신" || badge === "추천"
                                      ? "#dcfce7"
                                      : badge === "구독" || badge === "CLI"
                                        ? "#ede9fe"
                                        : "#eff6ff",
                                  color:
                                    badge === "최신" || badge === "추천"
                                      ? "#166534"
                                      : badge === "구독" || badge === "CLI"
                                        ? "#5b21b6"
                                        : "#1e3a8a",
                                  borderRadius: 999,
                                  padding: "2px 7px",
                                  fontSize: 11,
                                  fontWeight: 900
                                }}
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#6b7280", fontSize: 13 }}>
                      모델 메타데이터가 아직 없습니다. Refresh를 눌러 다시 확인하세요.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}