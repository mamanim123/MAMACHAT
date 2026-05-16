"use client";

import { useEffect, useMemo, useState } from "react";

const TXT = {
  title: "\uB300\uD654\uAE30\uB85D",
  save: "\uC800\uC7A5",
  runs: "\uC2E4\uD589 \uC774\uB825",
  newWork: "\uC0C8 \uC791\uC5C5",
  sessions: "\uB300\uD654\uCC3D",
  searchRuns: "\uC2E4\uD589 \uC774\uB825 \uAC80\uC0C9",
  searchSessions: "\uB300\uD654\uCC3D \uAC80\uC0C9",
  refresh: "\uC0C8\uB85C\uACE0\uCE68",
  loading: "\uBD88\uB7EC\uC624\uB294 \uC911...",
  noRuns: "\uC2E4\uD589 \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  noSessions: "\uC800\uC7A5\uB41C \uB300\uD654\uCC3D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  favoriteOn: "\u2605 \uC990\uACA8\uCC3E\uAE30",
  favoriteOff: "\u2606 \uC990\uACA8\uCC3E\uAE30",
  delete: "\uC0AD\uC81C",
  vertical: "\uB300\uD654\uAE30\uB85D",
  candidate: "\uD6C4\uBCF4"
};

function fmt(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function shortText(value, max = 90) {
  const text = String(value || "")
    .replace(/\[System instruction - do not repeat\][\s\S]*?\uC0AC\uC6A9\uC790 \uC694\uCCAD:\s*/g, "")
    .replace(/\[Answer style\][\s\S]*?(?=\n\n|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "(\uB0B4\uC6A9 \uC5C6\uC74C)";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildRunSearchText(item) {
  const runId = String(item?.runId || "");
  const shortRunId = runId.replace("run-", "");
  const candidateText = item?.candidateCount != null ? String(item.candidateCount) : "";

  return [
    runId,
    shortRunId,
    item?.status,
    item?.provider,
    item?.model,
    item?.mode,
    item?.engine,
    item?.executionProfile,
    item?.responseMode,
    item?.promptPreview,
    item?.workspaceRoot,
    item?.sessionId,
    candidateText ? "candidate " + candidateText : "",
    candidateText ? TXT.candidate + " " + candidateText : "",
    item?.memorySynced ? "memory memorySynced" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function buildSessionSearchText(item) {
  const sessionId = String(item?.sessionId || "");
  const shortSessionId = sessionId.replace("session-", "");

  return [
    sessionId,
    shortSessionId,
    item?.title,
    item?.currentGoal,
    item?.workspaceRoot,
    item?.runCount != null ? "run " + item.runCount : "",
    item?.messageCount != null ? "message " + item.messageCount : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function loadFavoriteIds(key) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavoriteIds(key, ids) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids))));
}

export default function ConversationSidebar({
  selectedSessionId = "",
  refreshKey = 0,
  onSelectSession,
  onSelectRun,
  onNewWork,
  onSessionChanged
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [runs, setRuns] = useState([]);
  const [favoriteRuns, setFavoriteRuns] = useState([]);
  const [favoriteSessions, setFavoriteSessions] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFavoriteRuns(loadFavoriteIds("mamabot.favoriteRuns"));
    setFavoriteSessions(loadFavoriteIds("mamabot.favoriteSessions"));
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const sessionParams = new URLSearchParams();
      sessionParams.set("limit", "80");
      if (query.trim()) sessionParams.set("query", query.trim());

      const runParams = new URLSearchParams();
      runParams.set("limit", "80");

      const [sessionRes, runRes] = await Promise.all([
        fetch("/api/agent/sessions?" + sessionParams.toString(), { cache: "no-store" }),
        fetch("/api/agent/runs?" + runParams.toString(), { cache: "no-store" })
      ]);

      const sessionJson = await sessionRes.json();
      const runJson = await runRes.json();

      if (!sessionRes.ok || sessionJson.ok === false) {
        throw new Error(sessionJson.error || "\uB300\uD654\uAE30\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      }

      if (!runRes.ok || runJson.ok === false) {
        throw new Error(runJson.error || "\uC2E4\uD589 \uC774\uB825\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      }

      setSessions(Array.isArray(sessionJson.items) ? sessionJson.items : []);
      setRuns(Array.isArray(runJson.items) ? runJson.items : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [refreshKey]);

  function toggleFavoriteRun(event, runId) {
    event.stopPropagation();

    setFavoriteRuns((prev) => {
      const next = prev.includes(runId)
        ? prev.filter((id) => id !== runId)
        : [runId, ...prev];

      saveFavoriteIds("mamabot.favoriteRuns", next);
      return next;
    });
  }

  function toggleFavoriteSession(event, sessionId) {
    event.stopPropagation();

    setFavoriteSessions((prev) => {
      const next = prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [sessionId, ...prev];

      saveFavoriteIds("mamabot.favoriteSessions", next);
      return next;
    });
  }

  async function createNewSession() {
    const title = window.prompt("\uB300\uD654 \uC81C\uBAA9");
    if (title === null) return;

    try {
      const res = await fetch("/api/agent/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: title.trim() || "\uC0C8 \uB300\uD654\uCC3D"
        })
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "\uB300\uD654\uAE30\uB85D\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      }

      const id = data.session?.sessionId || "";
      if (id && onSelectSession) onSelectSession(id);
      if (onSessionChanged) onSessionChanged(id);
      await loadAll();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function deleteSession(event, sessionId) {
    event.stopPropagation();

    const ok = window.confirm("\uC774 \uB300\uD654\uCC3D\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?");
    if (!ok) return;

    try {
      const res = await fetch("/api/agent/sessions/" + encodeURIComponent(sessionId), {
        method: "DELETE"
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "\uB300\uD654\uCC3D \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      }

      setFavoriteSessions((prev) => {
        const next = prev.filter((id) => id !== sessionId);
        saveFavoriteIds("mamabot.favoriteSessions", next);
        return next;
      });

      if (selectedSessionId === sessionId && onSelectSession) {
        onSelectSession("");
      }

      if (onSessionChanged) onSessionChanged("");
      await loadAll();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function deleteRun(event, runId) {
    event.stopPropagation();

    const ok = window.confirm("\uC774 \uC2E4\uD589 \uAE30\uB85D\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?");
    if (!ok) return;

    try {
      const res = await fetch("/api/agent/runs/" + encodeURIComponent(runId), {
        method: "DELETE"
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "\uC2E4\uD589 \uAE30\uB85D \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      }

      setFavoriteRuns((prev) => {
        const next = prev.filter((id) => id !== runId);
        saveFavoriteIds("mamabot.favoriteRuns", next);
        return next;
      });

      await loadAll();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  const filteredRuns = useMemo(() => {
    const q = normalizeSearchText(query);

    const sorted = [...runs].sort((a, b) => {
      const aFav = favoriteRuns.includes(a.runId) ? 1 : 0;
      const bFav = favoriteRuns.includes(b.runId) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      return (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0);
    });

    if (!q) return sorted;
    return sorted.filter((item) => normalizeSearchText(buildRunSearchText(item)).includes(q));
  }, [runs, query, favoriteRuns]);

  const sortedSessions = useMemo(() => {
    const q = normalizeSearchText(query);

    const sorted = [...sessions].sort((a, b) => {
      const aFav = favoriteSessions.includes(a.sessionId) ? 1 : 0;
      const bFav = favoriteSessions.includes(b.sessionId) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      const aSelected = a.sessionId === selectedSessionId ? 1 : 0;
      const bSelected = b.sessionId === selectedSessionId ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;

      return (Date.parse(b.updatedAt || b.createdAt || "") || 0) - (Date.parse(a.updatedAt || a.createdAt || "") || 0);
    });

    if (!q) return sorted;
    return sorted.filter((item) => normalizeSearchText(buildSessionSearchText(item)).includes(q));
  }, [sessions, query, favoriteSessions, selectedSessionId]);

  const sidebarWidth = open ? 370 : 8;

  return (
    <aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: sidebarWidth,
        background: open ? "#111827" : "transparent",
        color: "#ffffff",
        zIndex: 120,
        display: "flex",
        boxShadow: open ? "-12px 0 28px rgba(15,23,42,0.18)" : "none",
        transition: "width 160ms ease, background 160ms ease",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          width: open ? 38 : 8,
          flex: open ? "0 0 38px" : "0 0 8px",
          borderLeft: open ? "1px solid rgba(255,255,255,0.08)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: open ? "#d1d5db" : "transparent",
          opacity: open ? 1 : 0,
          fontWeight: 900,
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          fontSize: 12,
          letterSpacing: 2
        }}
      >
        {TXT.vertical}
      </div>

      {open ? (
        <div
          style={{
            width: 332,
            flex: "0 0 332px",
            padding: 16,
            boxSizing: "border-box",
            overflowY: "auto"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>{TXT.title}</h2>
            <button
              type="button"
              onClick={loadAll}
              style={{
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              {TXT.save}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setTab("runs")}
              style={{
                border: "1px solid #374151",
                background: tab === "runs" ? "#2563eb" : "#0b1220",
                color: "#ffffff",
                borderRadius: 8,
                padding: "8px 6px",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              {TXT.runs}
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNewWork) onNewWork();
              }}
              style={{
                border: "1px solid #374151",
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: 8,
                padding: "8px 6px",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              {TXT.newWork}
            </button>

            <button
              type="button"
              onClick={() => setTab("sessions")}
              style={{
                border: "1px solid #374151",
                background: tab === "sessions" ? "#2563eb" : "#0b1220",
                color: "#ffffff",
                borderRadius: 8,
                padding: "8px 6px",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              {TXT.sessions}
            </button>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadAll();
            }}
            placeholder={tab === "runs" ? TXT.searchRuns : TXT.searchSessions}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #374151",
              background: "#0b1220",
              color: "#ffffff",
              borderRadius: 8,
              padding: "8px 9px",
              marginBottom: 10
            }}
          />

          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            style={{
              width: "100%",
              border: "1px solid #374151",
              background: "#1f2937",
              color: "#f9fafb",
              borderRadius: 8,
              padding: "7px 9px",
              marginBottom: 12,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? TXT.loading : TXT.refresh}
          </button>

          {error ? (
            <div style={{ background: "#7f1d1d", color: "#fee2e2", padding: 9, borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
              {error}
            </div>
          ) : null}

          {tab === "runs" ? (
            <div style={{ display: "grid", gap: 8 }}>
              {filteredRuns.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13, padding: 10 }}>
                  {TXT.noRuns}
                </div>
              ) : null}

              {filteredRuns.map((item) => {
                const failed = item.status === "failed";
                const success = item.status === "success";
                const dryrun = item.status === "dryrun";
                const favorite = favoriteRuns.includes(item.runId);

                return (
                  <button
                    key={item.runId}
                    type="button"
                    onClick={() => onSelectRun && onSelectRun(item.runId)}
                    style={{
                      textAlign: "left",
                      border: favorite ? "1px solid #facc15" : "1px solid #374151",
                      background: favorite ? "#1f1b0b" : "#0b1220",
                      color: "#ffffff",
                      borderRadius: 10,
                      padding: 10,
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: failed ? "#ef4444" : success ? "#22c55e" : dryrun ? "#60a5fa" : "#f59e0b",
                          display: "inline-block"
                        }}
                      />
                      <strong style={{ fontSize: 12 }}>{item.status || "-"}</strong>
                      <span style={{ marginLeft: "auto", color: "#9ca3af", fontSize: 11 }}>
                        {item.durationMs ? Math.round(item.durationMs / 1000) + "\uCD08" : "-"}
                      </span>
                    </div>

                    <div style={{ color: "#d1d5db", fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
                      {shortText(item.promptPreview, 100)}
                    </div>

                    <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 5 }}>
                      {fmt(item.createdAt)}
                    </div>

                    <div style={{ color: "#93c5fd", fontSize: 11, marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span>{String(item.runId || "").replace("run-", "#")}</span>
                      <span>{TXT.candidate} {item.candidateCount ?? 0}</span>
                      {item.memorySynced ? <span>memory</span> : null}
                    </div>

                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <span
                        onClick={(event) => toggleFavoriteRun(event, item.runId)}
                        style={{
                          border: "1px solid #facc15",
                          color: favorite ? "#111827" : "#facc15",
                          background: favorite ? "#facc15" : "transparent",
                          borderRadius: 6,
                          padding: "2px 6px",
                          fontSize: 11,
                          fontWeight: 900
                        }}
                      >
                        {favorite ? TXT.favoriteOn : TXT.favoriteOff}
                      </span>

                      <span
                        onClick={(event) => deleteRun(event, item.runId)}
                        style={{
                          border: "1px solid #7f1d1d",
                          color: "#fecaca",
                          borderRadius: 6,
                          padding: "2px 6px",
                          fontSize: 11,
                          fontWeight: 900
                        }}
                      >
                        {TXT.delete}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {sortedSessions.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13, padding: 10 }}>
                  {TXT.noSessions}
                </div>
              ) : null}

              {sortedSessions.map((item) => {
                const selected = item.sessionId === selectedSessionId;
                const favorite = favoriteSessions.includes(item.sessionId);

                return (
                  <button
                    key={item.sessionId}
                    type="button"
                    onClick={() => onSelectSession && onSelectSession(item.sessionId)}
                    style={{
                      textAlign: "left",
                      border: favorite ? "1px solid #facc15" : selected ? "1px solid #60a5fa" : "1px solid #374151",
                      background: favorite ? "#1f1b0b" : selected ? "#1e3a8a" : "#0b1220",
                      color: "#ffffff",
                      borderRadius: 10,
                      padding: 10,
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ color: "#d1d5db", fontSize: 12, lineHeight: 1.4, fontWeight: 900 }}>
                      {shortText(item.title || item.currentGoal, 100)}
                    </div>

                    <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 5 }}>
                      {"\uC2E4\uD589"} {item.runCount ?? 0}{"\uAC1C"} ? {"\uB300\uD654"} {item.messageCount ?? 0}{"\uAC1C"}
                    </div>

                    <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 5 }}>
                      {fmt(item.updatedAt || item.createdAt)}
                    </div>

                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <span
                        onClick={(event) => toggleFavoriteSession(event, item.sessionId)}
                        style={{
                          border: "1px solid #facc15",
                          color: favorite ? "#111827" : "#facc15",
                          background: favorite ? "#facc15" : "transparent",
                          borderRadius: 6,
                          padding: "2px 6px",
                          fontSize: 11,
                          fontWeight: 900
                        }}
                      >
                        {favorite ? TXT.favoriteOn : TXT.favoriteOff}
                      </span>

                      <span
                        onClick={(event) => deleteSession(event, item.sessionId)}
                        style={{
                          border: "1px solid #7f1d1d",
                          color: "#fecaca",
                          borderRadius: 6,
                          padding: "2px 6px",
                          fontSize: 11,
                          fontWeight: 900
                        }}
                      >
                        {TXT.delete}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </aside>
  );
}
