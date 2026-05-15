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

      setMessage(`${envKey.trim()} 저장 완료`);
      setEnvKey("");
      setEnvValue("");
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
        >
          OAuth Providers
        </div>

        <div style={{ padding: 14 }}>
          {oauthProviders?.error ? (
            <div style={{ color: "#991b1b", fontSize: 13 }}>{oauthProviders.error}</div>
          ) : filteredOauthItems.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No OAuth providers found.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredOauthItems.map((provider, index) => {
                const id = provider.id || provider.provider || provider.name || String(index);
                const connected =
                  provider.status?.logged_in ??
                  provider.status?.connected ??
                  provider.connected ??
                  provider.enabled ??
                  provider.authenticated ??
                  false;

                return (
                  <div
                    key={id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      padding: 13,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>{id}</div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        {safeString(provider.description || provider.label || provider.type)}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startOAuthAuth(id);
                        }}
                        disabled={authStarting === id}
                        style={{
                          border: "1px solid #2563eb",
                          background: authStarting === id ? "#bfdbfe" : "#2563eb",
                          color: "#ffffff",
                          borderRadius: 10,
                          padding: "7px 10px",
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: authStarting === id ? "wait" : "pointer"
                        }}
                      >
                        {authStarting === id ? "\uC778\uC99D \uC911..." : "\uC778\uC99D \uC2DC\uC791"}
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          loadAll();
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
                        {"\uC0C8\uB85C\uACE0\uCE68"}
                      </button>

                      <Badge tone={connected ? "good" : "warn"}>
                        {connected ? "CONNECTED" : "NOT CONNECTED"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          order: 3,
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
        >
          CLI Agents
        </div>

        <div style={{ padding: 14 }}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 13,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>Claude Code CLI Agent</div>
              <div style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.6 }}>
                {claudeStatus?.installed ? `Installed ? ${claudeStatus.version || "-"}` : "Not installed in Mamabot runtime/cli"}
              </div>
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4, wordBreak: "break-all" }}>
                Config: {claudeStatus?.claudeConfigWin || "F:\\mamabot\\runtime\\claude-home\\.claude"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={startClaudeCodeLogin}
                disabled={startingClaudeCode || !claudeStatus?.installed}
                style={{
                  border: "1px solid #2563eb",
                  background: startingClaudeCode ? "#bfdbfe" : "#2563eb",
                  color: "#ffffff",
                  borderRadius: 10,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: startingClaudeCode ? "wait" : "pointer"
                }}
              >
                {startingClaudeCode ? "Opening..." : "Login"}
              </button>

              <button
                type="button"
                onClick={loadAll}
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

              <Badge tone={claudeStatus?.connected ? "good" : claudeStatus?.installed ? "warn" : "bad"}>
                {claudeStatus?.connected ? "CONNECTED" : claudeStatus?.installed ? "INSTALLED" : "MISSING"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}