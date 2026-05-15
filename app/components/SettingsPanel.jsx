"use client";

import { useEffect, useState } from "react";

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

export default function SettingsPanel() {
  const [status, setStatus] = useState(null);
  const [configRaw, setConfigRaw] = useState("");
  const [configJson, setConfigJson] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  async function loadConfig() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [statusData, rawData, configData, schemaData] = await Promise.allSettled([
        fetchJson("/api/hermes/native/status"),
        fetchJson("/api/hermes/native/config/raw"),
        fetchJson("/api/hermes/native/config"),
        fetchJson("/api/hermes/native/config/schema")
      ]);

      if (statusData.status === "fulfilled") {
        setStatus(statusData.value);
      }

      if (rawData.status === "fulfilled") {
        setConfigRaw(rawData.value.yaml || "");
      } else {
        setConfigRaw("");
      }

      if (configData.status === "fulfilled") {
        setConfigJson(configData.value);
      } else {
        setConfigJson({ error: configData.reason?.message });
      }

      if (schemaData.status === "fulfilled") {
        setSchema(schemaData.value);
      } else {
        setSchema({ error: schemaData.reason?.message });
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveRawConfig() {
    const ok = window.confirm(
      "Hermes config.yaml을 저장할까요?\n잘못된 YAML이면 Hermes 실행에 문제가 생길 수 있습니다."
    );

    if (!ok) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await fetchJson("/api/hermes/native/config/raw", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          yaml_text: configRaw
        })
      });

      setMessage("config.yaml 저장 완료");
      await loadConfig();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

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
          <h2 style={{ margin: 0, fontSize: 24 }}>설정 / Config</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            Hermes의 config.yaml, 현재 설정값, 설정 스키마를 확인하고 편집합니다.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={loadConfig}
            disabled={loading || saving}
            style={{
              border: "none",
              background: loading ? "#9ca3af" : "#111827",
              color: "#ffffff",
              borderRadius: 10,
              padding: "10px 13px",
              fontWeight: 900,
              cursor: loading || saving ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Loading..." : "새로고침"}
          </button>

          <button
            onClick={saveRawConfig}
            disabled={saving}
            style={{
              border: "none",
              background: saving ? "#9ca3af" : "#2563eb",
              color: "#ffffff",
              borderRadius: 10,
              padding: "10px 13px",
              fontWeight: 900,
              cursor: saving ? "not-allowed" : "pointer"
            }}
          >
            {saving ? "저장 중..." : "config.yaml 저장"}
          </button>
        </div>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          marginBottom: 16
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
          <div style={{ marginBottom: 8 }}>
            <Badge tone={status ? "good" : "warn"}>
              {status ? "CONNECTED" : "WAITING"}
            </Badge>
          </div>
          <div style={{ color: "#374151", fontSize: 13, lineHeight: 1.6 }}>
            Hermes {status ? status.version : "-"}
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
          <strong>Config Path</strong>
          <div style={{ color: "#4b5563", fontSize: 13, marginTop: 6, wordBreak: "break-all" }}>
            {status ? status.config_path : "-"}
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
          <strong>Config Version</strong>
          <div style={{ color: "#4b5563", fontSize: 13, marginTop: 6 }}>
            {status ? `${status.config_version} / latest ${status.latest_config_version}` : "-"}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(360px, 1fr) minmax(320px, 0.8fr)",
          gap: 16,
          alignItems: "start"
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            overflow: "hidden",
            background: "#ffffff"
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid #e5e7eb",
              fontWeight: 900
            }}
          >
            Raw config.yaml
          </div>

          <textarea
            value={configRaw}
            onChange={(event) => setConfigRaw(event.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: "calc(100vh - 360px)",
              border: "none",
              outline: "none",
              resize: "vertical",
              padding: 16,
              boxSizing: "border-box",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              lineHeight: 1.6,
              color: "#111827",
              background: "#f9fafb"
            }}
          />
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              overflow: "hidden",
              background: "#ffffff"
            }}
          >
            <div
              style={{
                padding: 14,
                borderBottom: "1px solid #e5e7eb",
                fontWeight: 900
              }}
            >
              Current Config JSON
            </div>

            <pre
              style={{
                margin: 0,
                padding: 14,
                minHeight: 260,
                maxHeight: 360,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                lineHeight: 1.6,
                background: "#0f172a",
                color: "#d1fae5"
              }}
            >
              {configJson ? JSON.stringify(configJson, null, 2) : "No config loaded."}
            </pre>
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              overflow: "hidden",
              background: "#ffffff"
            }}
          >
            <div
              style={{
                padding: 14,
                borderBottom: "1px solid #e5e7eb",
                fontWeight: 900
              }}
            >
              Config Schema
            </div>

            <pre
              style={{
                margin: 0,
                padding: 14,
                minHeight: 260,
                maxHeight: 360,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                lineHeight: 1.6,
                background: "#0f172a",
                color: "#d1fae5"
              }}
            >
              {schema ? JSON.stringify(schema, null, 2) : "No schema loaded."}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}