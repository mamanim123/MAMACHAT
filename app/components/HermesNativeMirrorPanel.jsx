"use client";

import { useEffect, useMemo, useState } from "react";

function Card({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        background: "#ffffff"
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 17 }}>{title}</h3>
      {children}
    </div>
  );
}

function Badge({ ok, children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 9px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        background: ok ? "#dcfce7" : "#fee2e2",
        color: ok ? "#166534" : "#991b1b"
      }}
    >
      {children}
    </span>
  );
}

export default function HermesNativeMirrorPanel() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [skills, setSkills] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    const text = await res.text();

    if (!res.ok) {
      throw new Error(text || `${res.status} ${res.statusText}`);
    }

    return JSON.parse(text);
  }

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const [statusData, logsData, sessionsData, skillsData] = await Promise.all([
        fetchJson("/api/hermes/native/status"),
        fetchJson("/api/hermes/native/logs?lines=40"),
        fetchJson("/api/hermes/native/sessions?limit=20&offset=0"),
        fetchJson("/api/hermes/native/skills")
      ]);

      setStatus(statusData);
      setLogs(logsData);
      setSessions(sessionsData);
      setSkills(skillsData);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const skillItems = useMemo(() => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (Array.isArray(skills.value)) return skills.value;
    return [];
  }, [skills]);

  const enabledSkills = skillItems.filter((skill) => skill.enabled).length;

  return (
    <section
      style={{
        marginTop: 18,
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 22,
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
          <h2 style={{ margin: 0, fontSize: 23 }}>Hermes Native Mirror</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            Mamabot 3200에서 Hermes 9119 공식 API를 직접 불러와 표시합니다.
          </p>
        </div>

        <button
          onClick={refresh}
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
          {loading ? "Refreshing..." : "Refresh"}
        </button>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14
        }}
      >
        <Card title="Status">
          {status ? (
            <div style={{ display: "grid", gap: 8, color: "#374151", fontSize: 14 }}>
              <div><Badge ok={true}>CONNECTED</Badge></div>
              <div><strong>Version:</strong> {status.version}</div>
              <div><strong>Release:</strong> {status.release_date}</div>
              <div><strong>Gateway:</strong> {status.gateway_running ? "running" : "off"}</div>
              <div><strong>Active Sessions:</strong> {status.active_sessions}</div>
            </div>
          ) : (
            <p style={{ color: "#6b7280" }}>No status loaded.</p>
          )}
        </Card>

        <Card title="Sessions">
          {sessions ? (
            <div style={{ color: "#374151", fontSize: 14 }}>
              <div><strong>Total:</strong> {sessions.total ?? 0}</div>
              <div><strong>Loaded:</strong> {(sessions.sessions || []).length}</div>
              {(sessions.sessions || []).length === 0 ? (
                <p style={{ color: "#6b7280" }}>No sessions yet.</p>
              ) : (
                <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
                  {(sessions.sessions || []).slice(0, 5).map((s, index) => (
                    <li key={s.id || index}>{s.title || s.name || s.id || "Untitled session"}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p style={{ color: "#6b7280" }}>No sessions loaded.</p>
          )}
        </Card>

        <Card title="Skills">
          <div style={{ color: "#374151", fontSize: 14 }}>
            <div><strong>Total:</strong> {skillItems.length}</div>
            <div><strong>Enabled:</strong> {enabledSkills}</div>
            <div
              style={{
                marginTop: 10,
                maxHeight: 170,
                overflow: "auto",
                display: "grid",
                gap: 6
              }}
            >
              {skillItems.slice(0, 25).map((skill) => (
                <div
                  key={skill.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid #e5e7eb",
                    paddingBottom: 5
                  }}
                >
                  <span>{skill.name}</span>
                  <span style={{ color: skill.enabled ? "#166534" : "#991b1b", fontWeight: 800 }}>
                    {skill.enabled ? "ON" : "OFF"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title="Logs">
          <pre
            style={{
              margin: 0,
              background: "#0f172a",
              color: "#d1fae5",
              borderRadius: 12,
              padding: 14,
              minHeight: 220,
              maxHeight: 360,
              overflow: "auto",
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap"
            }}
          >
            {logs && Array.isArray(logs.lines)
              ? logs.lines.join("")
              : "No logs loaded."}
          </pre>
        </Card>
      </div>
    </section>
  );
}
