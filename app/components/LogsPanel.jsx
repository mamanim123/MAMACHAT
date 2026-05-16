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

export default function LogsPanel() {
  const [file, setFile] = useState("agent");
  const [lines, setLines] = useState(120);
  const [level, setLevel] = useState("ALL");
  const [logs, setLogs] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState("");

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    if (!res.ok) {
      throw new Error(text || `${res.status} ${res.statusText}`);
    }

    return JSON.parse(text);
  }

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const qs = new URLSearchParams();
      qs.set("file", file);
      qs.set("lines", String(lines));

      if (level && level !== "ALL") {
        qs.set("level", level);
      }

      const [statusData, logsData] = await Promise.all([
        fetchJson("/api/hermes/native/status"),
        fetchJson(`/api/hermes/native/logs?${qs.toString()}`)
      ]);

      setStatus(statusData);
      setLogs(logsData);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const timer = setInterval(loadLogs, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, file, lines, level]);

  const logText = useMemo(() => {
    if (!logs || !Array.isArray(logs.lines)) {
      return "No logs loaded.";
    }

    return logs.lines.join("");
  }, [logs]);

  const logCount = logs && Array.isArray(logs.lines) ? logs.lines.length : 0;

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
          <h2 style={{ margin: 0, fontSize: 24 }}>Hermes Logs</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            Mamabot 3200에서 Hermes 공식 로그 API를 불러와 확인합니다.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={loadLogs}
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
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            style={{
              border: "1px solid #d1d5db",
              background: autoRefresh ? "#dcfce7" : "#ffffff",
              color: autoRefresh ? "#166534" : "#111827",
              borderRadius: 10,
              padding: "10px 13px",
              fontWeight: 900,
              cursor: "pointer"
            }}
          >
            Auto Refresh {autoRefresh ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Log File
          </label>
          <select
            value={file}
            onChange={(event) => setFile(event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              background: "#ffffff"
            }}
          >
            <option value="agent">agent</option>
            <option value="errors">errors</option>
            <option value="gateway">gateway</option>
            <option value="curator">curator</option>
          </select>
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
            Lines
          </label>
          <select
            value={lines}
            onChange={(event) => setLines(Number(event.target.value))}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              background: "#ffffff"
            }}
          >
            <option value={50}>50</option>
            <option value={120}>120</option>
            <option value={300}>300</option>
            <option value={600}>600</option>
          </select>
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
            Level
          </label>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              background: "#ffffff"
            }}
          >
            <option value="ALL">ALL</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
          </select>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#f9fafb",
            display: "grid",
            gap: 7,
            alignContent: "center"
          }}
        >
          <div>
            <Badge tone={status ? "good" : "warn"}>{status ? "CONNECTED" : "WAITING"}</Badge>
          </div>
          <div style={{ color: "#374151", fontSize: 13 }}>
            Hermes {status ? status.version : "-"} / Loaded lines: {logCount}
          </div>
        </div>
      </div>

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

      <pre
        style={{
          margin: 0,
          background: "#0f172a",
          color: "#d1fae5",
          borderRadius: 14,
          padding: 16,
          minHeight: 520,
          maxHeight: "calc(100vh - 320px)",
          overflow: "auto",
          fontSize: 12,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap"
        }}
      >
        {logText}
      </pre>
    </section>
  );
}