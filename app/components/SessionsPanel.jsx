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

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function SessionsPanel() {
  const [sessions, setSessions] = useState(null);
  const [messages, setMessages] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchJson(url, options) {
    const res = await fetch(url, {
      cache: "no-store",
      ...(options || {})
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(text || `${res.status} ${res.statusText}`);
    }

    return JSON.parse(text);
  }

  async function loadSessions(nextOffset = offset) {
    setLoading(true);
    setError("");

    try {
      let data;

      if (query.trim()) {
        data = await fetchJson(
          `/api/hermes/native/sessions/search?q=${encodeURIComponent(query.trim())}`
        );

        const list = Array.isArray(data.sessions)
          ? data.sessions
          : Array.isArray(data.results)
            ? data.results
            : [];

        setSessions({
          sessions: list,
          total: data.total ?? list.length,
          limit,
          offset: 0,
          search: true
        });
      } else {
        data = await fetchJson(
          `/api/hermes/native/sessions?limit=${limit}&offset=${nextOffset}`
        );

        setSessions(data);
        setOffset(nextOffset);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(session) {
    const id = session.id || session.session_id || session.name;

    if (!id) {
      setError("Session id를 찾지 못했습니다.");
      return;
    }

    setSelectedSession(session);
    setDetailLoading(true);
    setError("");

    try {
      const data = await fetchJson(
        `/api/hermes/native/sessions/${encodeURIComponent(id)}/messages`
      );

      setMessages(data);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setDetailLoading(false);
    }
  }

  async function deleteSession(session) {
    const id = session.id || session.session_id || session.name;

    if (!id) {
      setError("Session id를 찾지 못했습니다.");
      return;
    }

    const ok = window.confirm(`Delete session?\n${id}`);

    if (!ok) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await fetchJson(`/api/hermes/native/sessions/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      setSelectedSession(null);
      setMessages(null);
      await loadSessions(0);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions(0);
  }, []);

  const sessionItems = useMemo(() => {
    if (!sessions) return [];
    if (Array.isArray(sessions.sessions)) return sessions.sessions;
    if (Array.isArray(sessions.value)) return sessions.value;
    return [];
  }, [sessions]);

  const messageItems = useMemo(() => {
    if (!messages) return [];
    if (Array.isArray(messages.messages)) return messages.messages;
    if (Array.isArray(messages.value)) return messages.value;
    if (Array.isArray(messages)) return messages;
    return [];
  }, [messages]);

  const total = sessions ? sessions.total ?? sessionItems.length : 0;

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
          <h2 style={{ margin: 0, fontSize: 24 }}>Hermes Sessions</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            Mamabot 3200에서 Hermes 공식 Sessions API를 불러와 대화 기록을 확인합니다.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={() => loadSessions(0)}
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
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1fr) 140px 120px",
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
            Search
          </label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                loadSessions(0);
              }
            }}
            placeholder="Search sessions..."
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              boxSizing: "border-box"
            }}
          />
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
            Limit
          </label>
          <select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              background: "#ffffff"
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
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
          <Badge tone="good">CONNECTED</Badge>
          <div style={{ color: "#374151", fontSize: 13 }}>Total: {total}</div>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start"
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            background: "#f9fafb",
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
            Session List
          </div>

          <div style={{ maxHeight: "calc(100vh - 360px)", overflow: "auto" }}>
            {sessionItems.length === 0 ? (
              <div style={{ padding: 18, color: "#6b7280", lineHeight: 1.6 }}>
                No sessions yet. Hermes에서 대화를 시작하면 이곳에 표시됩니다.
              </div>
            ) : (
              sessionItems.map((session, index) => {
                const id = session.id || session.session_id || session.name || String(index);
                const active =
                  selectedSession &&
                  (selectedSession.id || selectedSession.session_id || selectedSession.name) === id;

                return (
                  <button
                    key={id}
                    onClick={() => loadMessages(session)}
                    style={{
                      display: "block",
                      width: "100%",
                      border: "none",
                      borderBottom: "1px solid #e5e7eb",
                      background: active ? "#eff6ff" : "#ffffff",
                      padding: 14,
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: 900, color: "#111827", marginBottom: 5 }}>
                      {session.title || session.name || session.summary || "Untitled session"}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 12, wordBreak: "break-all" }}>
                      {id}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                      {formatDate(session.created_at || session.updated_at || session.timestamp)}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {!query.trim() ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                padding: 12,
                borderTop: "1px solid #e5e7eb",
                background: "#ffffff"
              }}
            >
              <button
                onClick={() => loadSessions(Math.max(0, offset - limit))}
                disabled={loading || offset <= 0}
                style={{
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  borderRadius: 10,
                  padding: "8px 11px",
                  fontWeight: 800,
                  cursor: loading || offset <= 0 ? "not-allowed" : "pointer"
                }}
              >
                Prev
              </button>
              <button
                onClick={() => loadSessions(offset + limit)}
                disabled={loading || offset + limit >= total}
                style={{
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  borderRadius: 10,
                  padding: "8px 11px",
                  fontWeight: 800,
                  cursor: loading || offset + limit >= total ? "not-allowed" : "pointer"
                }}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            background: "#ffffff",
            minHeight: 520,
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
              <div style={{ fontWeight: 900 }}>Session Detail</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                {selectedSession
                  ? selectedSession.id || selectedSession.session_id || selectedSession.name
                  : "Select a session"}
              </div>
            </div>

            {selectedSession ? (
              <button
                onClick={() => deleteSession(selectedSession)}
                style={{
                  border: "1px solid #fecaca",
                  background: "#fff1f2",
                  color: "#991b1b",
                  borderRadius: 10,
                  padding: "8px 11px",
                  fontWeight: 900,
                  cursor: "pointer"
                }}
              >
                Delete
              </button>
            ) : null}
          </div>

          <div style={{ padding: 16, maxHeight: "calc(100vh - 340px)", overflow: "auto" }}>
            {detailLoading ? (
              <div style={{ color: "#6b7280" }}>Loading messages...</div>
            ) : !selectedSession ? (
              <div style={{ color: "#6b7280", lineHeight: 1.7 }}>
                왼쪽에서 세션을 선택하면 메시지 내용이 표시됩니다.
              </div>
            ) : messageItems.length === 0 ? (
              <div style={{ color: "#6b7280", lineHeight: 1.7 }}>
                No messages found for this session.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {messageItems.map((message, index) => {
                  const role = message.role || message.type || message.sender || "message";
                  const content =
                    message.content ||
                    message.text ||
                    message.message ||
                    JSON.stringify(message, null, 2);

                  return (
                    <div
                      key={message.id || index}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 13,
                        background: role === "user" ? "#eff6ff" : "#f9fafb"
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#374151",
                          marginBottom: 8,
                          textTransform: "uppercase"
                        }}
                      >
                        {role}
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontSize: 12,
                          lineHeight: 1.6,
                          color: "#111827"
                        }}
                      >
                        {typeof content === "string" ? content : JSON.stringify(content, null, 2)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}