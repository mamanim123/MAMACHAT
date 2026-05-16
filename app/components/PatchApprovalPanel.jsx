"use client";

import { useEffect, useState } from "react";

const TXT = {
  title: "\uD328\uCE58 \uC2B9\uC778",
  subtitle: "\uC218\uC815\uC548\uC744 \uBBF8\uB9AC\uBCF4\uAE30\uD558\uACE0 \uC2B9\uC778 \uD6C4 \uC801\uC6A9\uD558\uBA70, \uD544\uC694\uD558\uBA74 \uB864\uBC31\uD569\uB2C8\uB2E4.",
  refresh: "\uC0C8\uB85C\uACE0\uCE68",
  loading: "\uBD88\uB7EC\uC624\uB294 \uC911...",
  noPatches: "\uC544\uC9C1 \uC800\uC7A5\uB41C \uD328\uCE58\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
  selectHint: "\uC67C\uCABD \uBAA9\uB85D\uC5D0\uC11C \uD328\uCE58\uB97C \uC120\uD0DD\uD558\uBA74 \uBBF8\uB9AC\uBCF4\uAE30\uAC00 \uBCF4\uC785\uB2C8\uB2E4.",
  apply: "\uC801\uC6A9",
  rollback: "\uB864\uBC31",
  pending: "\uC2B9\uC778 \uB300\uAE30",
  applied: "\uC801\uC6A9\uB428",
  rolledback: "\uB864\uBC31\uB428"
};

const statusStyle = {
  pending: { label: TXT.pending, bg: "#fef3c7", fg: "#92400e" },
  applied: { label: TXT.applied, bg: "#dcfce7", fg: "#166534" },
  rolledback: { label: TXT.rolledback, bg: "#e0e7ff", fg: "#3730a3" }
};

function formatTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function shortText(value, max = 90) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "-";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export default function PatchApprovalPanel() {
  const [items, setItems] = useState([]);
  const [selectedPatchId, setSelectedPatchId] = useState("");
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function loadList() {
    setLoadingList(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("limit", "80");
      if (status) params.set("status", status);

      const res = await fetch("/api/agent/patches?" + params.toString(), {
        cache: "no-store"
      });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "patch list load failed");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoadingList(false);
    }
  }

  async function openDetail(patchId) {
    if (!patchId) return;

    setSelectedPatchId(patchId);
    setDetail(null);
    setLoadingDetail(true);
    setError("");

    try {
      const res = await fetch("/api/agent/patches/" + encodeURIComponent(patchId), {
        cache: "no-store"
      });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "patch detail load failed");
      }

      setDetail(data.patch || null);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoadingDetail(false);
    }
  }

  async function act(kind) {
    if (!selectedPatchId || busy) return;

    const message = kind === "apply"
      ? "\uC774 \uD328\uCE58\uB97C \uC801\uC6A9\uD560\uAE4C\uC694?"
      : "\uC774 \uD328\uCE58\uB97C \uB864\uBC31\uD560\uAE4C\uC694?";

    if (!window.confirm(message)) return;

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/agent/patches/" + encodeURIComponent(selectedPatchId) + "/" + kind, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "patch action failed");
      }

      setDetail(data.patch || null);
      await loadList();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadList();
  }, [status]);

  const changes = Array.isArray(detail?.changes) ? detail.changes : [];
  const selectedStatus = detail?.status || "";

  return (
    <section style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#111827" }}>{TXT.title}</h2>
          <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 13 }}>{TXT.subtitle}</p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 9px", fontSize: 12 }}
          >
            <option value="">All</option>
            <option value="pending">{TXT.pending}</option>
            <option value="applied">{TXT.applied}</option>
            <option value="rolledback">{TXT.rolledback}</option>
          </select>

          <button
            type="button"
            onClick={loadList}
            disabled={loadingList}
            style={{ border: "1px solid #d1d5db", background: "#f9fafb", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 800, cursor: loadingList ? "not-allowed" : "pointer" }}
          >
            {loadingList ? TXT.loading : TXT.refresh}
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.95fr) minmax(420px, 1.45fr)", gap: 12 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", maxHeight: "calc(100vh - 210px)", overflowY: "auto" }}>
          {!loadingList && items.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: "#6b7280" }}>{TXT.noPatches}</div>
          ) : null}

          {items.map((item) => {
            const active = selectedPatchId === item.patchId;
            const s = statusStyle[item.status] || { label: item.status || "-", bg: "#f3f4f6", fg: "#374151" };

            return (
              <button
                key={item.patchId}
                type="button"
                onClick={() => openDetail(item.patchId)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  borderBottom: "1px solid #f3f4f6",
                  background: active ? "#eff6ff" : "#ffffff",
                  padding: "11px 12px",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 950, padding: "2px 7px", borderRadius: 999 }}>
                    {s.label}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>{formatTime(item.updatedAt || item.createdAt)}</span>
                </div>

                <div style={{ color: "#111827", fontSize: 13, fontWeight: 850, lineHeight: 1.35 }}>
                  {shortText(item.title, 90)}
                </div>

                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 5 }}>
                  {item.patchId} · changes {item.changeCount ?? 0}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa", padding: 12, maxHeight: "calc(100vh - 210px)", overflowY: "auto" }}>
          {!selectedPatchId ? (
            <div style={{ fontSize: 13, color: "#6b7280" }}>{TXT.selectHint}</div>
          ) : null}

          {selectedPatchId && loadingDetail ? (
            <div style={{ fontSize: 13, color: "#6b7280" }}>{TXT.loading}</div>
          ) : null}

          {detail ? (
            <div style={{ color: "#111827", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 950 }}>{detail.title || detail.patchId}</div>
                  <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>{detail.patchId} · {detail.status}</div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {selectedStatus === "pending" ? (
                    <button
                      type="button"
                      onClick={() => act("apply")}
                      disabled={busy}
                      style={{ border: "none", background: "#16a34a", color: "#ffffff", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 900, cursor: busy ? "not-allowed" : "pointer" }}
                    >
                      {busy ? "..." : TXT.apply}
                    </button>
                  ) : null}

                  {selectedStatus === "applied" ? (
                    <button
                      type="button"
                      onClick={() => act("rollback")}
                      disabled={busy}
                      style={{ border: "none", background: "#dc2626", color: "#ffffff", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 900, cursor: busy ? "not-allowed" : "pointer" }}
                    >
                      {busy ? "..." : TXT.rollback}
                    </button>
                  ) : null}
                </div>
              </div>

              <div style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.45, marginBottom: 10 }}>
                {detail.description || "-"}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>Workspace</div>
                  <div style={{ fontSize: 11, wordBreak: "break-all", fontWeight: 800 }}>{detail.workspaceRoot || "-"}</div>
                </div>
                <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>Changes</div>
                  <div style={{ fontSize: 11, fontWeight: 900 }}>{changes.length}</div>
                </div>
              </div>

              {changes.map((change, index) => (
                <div key={(change.path || index) + "-" + index} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 950, marginBottom: 6, wordBreak: "break-all" }}>
                    {index + 1}. {change.path || "-"}
                  </div>
                  <pre style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 360, overflowY: "auto", fontSize: 11, lineHeight: 1.45 }}>
                    {change.preview || "(no preview)"}
                  </pre>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
