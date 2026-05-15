"use client";

import { useCallback, useEffect, useState } from "react";

const TXT = {
  title: "\uc2e4\ud589 \uc774\ub825",
  subtitle: "\ucd5c\uadfc Hermes \uc2e4\ud589 \uacb0\uacfc\ub97c \uc800\uc7a5\ud558\uace0 \ub2e4\uc2dc \ud655\uc778\ud569\ub2c8\ub2e4.",
  allStatus: "\uc804\uccb4 \uc0c1\ud0dc",
  allMode: "\uc804\uccb4 \ubaa8\ub4dc",
  success: "\uc131\uacf5",
  failed: "\uc2e4\ud328",
  blocked: "\ucc28\ub2e8",
  realRun: "\uc2e4\uc81c \uc2e4\ud589",
  refresh: "\uc0c8\ub85c\uace0\uce68",
  loading: "\ubd88\ub7ec\uc624\ub294 \uc911...",
  noRuns: "\uc544\uc9c1 \uc800\uc7a5\ub41c \uc2e4\ud589 \uc774\ub825\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
  emptyPrompt: "\ube48 \ud504\ub86c\ud504\ud2b8",
  selectHint: "\uc67c\ucabd \ubaa9\ub85d\uc5d0\uc11c \uc2e4\ud589 \ud56d\ubaa9\uc744 \uc120\ud0dd\ud558\uba74 \uc0c1\uc138 \uacb0\uacfc\uac00 \ubcf4\uc785\ub2c8\ub2e4.",
  detailLoading: "\uc0c1\uc138 \uae30\ub85d\uc744 \ubd88\ub7ec\uc624\ub294 \uc911...",
  deleteConfirm: "\uc774 \uc2e4\ud589 \uae30\ub85d\uc744 \uc0ad\uc81c\ud560\uae4c\uc694?",
  copyOutput: "\uc751\ub2f5 \ubcf5\uc0ac",
  delete: "\uc0ad\uc81c",
  prompt: "\ud504\ub86c\ud504\ud2b8",
  output: "\uc751\ub2f5",
  none: "\uc5c6\uc74c",
  noOutput: "\uc751\ub2f5 \uc5c6\uc74c",
  listLoadFail: "\uc2e4\ud589 \uc774\ub825\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
  detailLoadFail: "\uc0c1\uc138 \uc2e4\ud589 \uae30\ub85d\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4."
};

const statusMap = {
  success: { label: TXT.success, bg: "#dcfce7", fg: "#166534" },
  failed: { label: TXT.failed, bg: "#fee2e2", fg: "#991b1b" },
  dryrun: { label: "계획 확인", bg: "#dbeafe", fg: "#1e40af" },
  blocked: { label: TXT.blocked, bg: "#fef3c7", fg: "#92400e" },
};

function formatTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDuration(ms) {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function AgentRunHistoryPanel({ refreshKey = 0, initialRunId = "" }) {
  const [items, setItems] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dryRun, setDryRun] = useState("");
  const [outputView, setOutputView] = useState("raw");

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (status) params.set("status", status);
      if (dryRun) params.set("dryRun", dryRun);

      const res = await fetch(`/api/agent/runs?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || TXT.listLoadFail);
      }

      setItems(data.items || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoadingList(false);
    }
  }, [status, dryRun]);

  useEffect(() => {
    loadList();
  }, [loadList, refreshKey]);

  useEffect(() => {
    if (!initialRunId) return;
    openDetail(initialRunId);
  }, [initialRunId]);

  async function openDetail(runId) {
    setSelectedRunId(runId);
    setDetail(null);
    setOutputView("raw");
    setLoadingDetail(true);

    try {
      const res = await fetch(`/api/agent/runs/${runId}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || TXT.detailLoadFail);
      }

      setDetail(data.run);
    } catch (err) {
      setDetail({ error: err.message || String(err) });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function deleteSelected(runId) {
    const ok = window.confirm(`${TXT.deleteConfirm}\n${runId}`);
    if (!ok) return;

    await fetch(`/api/agent/runs/${runId}`, { method: "DELETE" });

    if (selectedRunId === runId) {
      setSelectedRunId("");
      setDetail(null);
    }

    loadList();
  }

  async function copyText(text) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  }

  return (
    <section style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#111827" }}>{TXT.title}</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{TXT.subtitle}</p>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 8px", fontSize: 12 }}>
            <option value="">{TXT.allStatus}</option>
            <option value="success">{TXT.success}</option>
            <option value="failed">{TXT.failed}</option>
            <option value="dryrun">계획 확인</option>
            <option value="blocked">{TXT.blocked}</option>
          </select>

          <select value={dryRun} onChange={(e) => setDryRun(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 8px", fontSize: 12 }}>
            <option value="">{TXT.allMode}</option>
            <option value="false">{TXT.realRun}</option>
            <option value="true">계획 확인</option>
          </select>

          <button type="button" onClick={loadList} disabled={loadingList} style={{ border: "1px solid #d1d5db", background: "#f9fafb", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: loadingList ? "not-allowed" : "pointer" }}>
            {loadingList ? TXT.loading : TXT.refresh}
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(320px, 1.2fr)", gap: 12 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", maxHeight: 460, overflowY: "auto" }}>
          {!loadingList && items.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: "#6b7280" }}>{TXT.noRuns}</div>
          ) : null}

          {items.map((item) => {
            const s = statusMap[item.status] || { label: item.status || "-", bg: "#f3f4f6", fg: "#374151" };
            const active = selectedRunId === item.runId;

            return (
              <button key={item.runId} type="button" onClick={() => openDetail(item.runId)} style={{ display: "block", width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid #f3f4f6", background: active ? "#eff6ff" : "#ffffff", padding: "10px 12px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 900, padding: "2px 7px", borderRadius: 999 }}>{s.label}</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{formatTime(item.createdAt)}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>{formatDuration(item.durationMs)}</span>
                </div>

                <div style={{ fontSize: 12, color: "#111827", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.promptPreview || `(${TXT.emptyPrompt})`}
                </div>

                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  {item.provider || "-"} · {item.model || "-"} · {item.mode || "-"}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fafafa", maxHeight: 460, overflowY: "auto" }}>
          {!selectedRunId ? <div style={{ fontSize: 13, color: "#6b7280" }}>{TXT.selectHint}</div> : null}

          {selectedRunId && loadingDetail ? <div style={{ fontSize: 13, color: "#6b7280" }}>{TXT.detailLoading}</div> : null}

          {detail?.error ? <div style={{ color: "#991b1b", fontSize: 13 }}>{detail.error}</div> : null}

          {detail && !detail.error ? (
            <div style={{ fontSize: 12, color: "#111827" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <strong>{detail.runId}</strong>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => copyText(outputView === "compressed" ? (detail.compressedOutput || detail.output || "") : (detail.output || ""))} style={{ border: "1px solid #d1d5db", background: "#ffffff", borderRadius: 6, padding: "4px 8px", fontSize: 11 }}>
                    {TXT.copyOutput}
                  </button>
                  <button type="button" onClick={() => deleteSelected(detail.runId)} style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: 6, padding: "4px 8px", fontSize: 11 }}>
                    {TXT.delete}
                  </button>
                </div>
              </div>

              <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 10 }}>
                {formatTime(detail.createdAt)} · {detail.provider || "-"} · {detail.model || "-"} · 종료코드={detail.exitCode ?? "-"} · {formatDuration(detail.durationMs)}
              </div>

              <div style={{ fontWeight: 800, marginBottom: 6 }}>{TXT.prompt}</div>
              <pre style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 130, overflowY: "auto" }}>
                {detail.prompt || `(${TXT.none})`}
              </pre>

              {Array.isArray(detail.workspaceCandidates) && detail.workspaceCandidates.length > 0 ? (
                <>
                  <div style={{ fontWeight: 800, margin: "10px 0 6px" }}>
                    {"\uD6C4\uBCF4 \uD30C\uC77C"} {"\u00B7"} {detail.workspaceCandidates.length}
                  </div>
                  <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, maxHeight: 180, overflowY: "auto" }}>
                    {detail.workspaceCandidates.slice(0, 8).map((item, index) => (
                      <div key={(item.path || index) + "-" + index} style={{ borderBottom: index === Math.min(detail.workspaceCandidates.length, 8) - 1 ? "none" : "1px solid #f3f4f6", padding: "6px 0" }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#111827", wordBreak: "break-all" }}>
                          {index + 1}. {item.path || "-"}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                          kind={item.kind || "-"} ? score={item.score ?? 0} ? size={item.size ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "10px 0 6px" }}>
                <div style={{ fontWeight: 800 }}>{TXT.output}</div>

                {detail.compressedOutput ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setOutputView("raw")}
                      style={{
                        border: "1px solid #d1d5db",
                        background: outputView === "raw" ? "#111827" : "#ffffff",
                        color: outputView === "raw" ? "#ffffff" : "#374151",
                        borderRadius: 6,
                        padding: "3px 7px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      Raw
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutputView("compressed")}
                      style={{
                        border: "1px solid #d1d5db",
                        background: outputView === "compressed" ? "#111827" : "#ffffff",
                        color: outputView === "compressed" ? "#ffffff" : "#374151",
                        borderRadius: 6,
                        padding: "3px 7px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      Compressed
                    </button>
                  </div>
                ) : null}
              </div>

              {detail.outputCompression ? (
                <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3", borderRadius: 8, padding: 8, fontSize: 11, marginBottom: 6 }}>
                  compression: {detail.outputCompression.kind || "-"} ? savedChars={detail.outputCompression.savedChars ?? 0} ? ratio={detail.outputCompression.ratio ?? "-"}
                </div>
              ) : null}

              <pre style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 220, overflowY: "auto" }}>
                {(outputView === "compressed" ? (detail.compressedOutput || detail.output) : detail.output) || `(${TXT.noOutput})`}
              </pre>

              {detail.stderr ? (
                <>
                  <div style={{ fontWeight: 800, margin: "10px 0 6px", color: "#991b1b" }}>오류 로그</div>
                  <pre style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#7f1d1d", borderRadius: 8, padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 140, overflowY: "auto" }}>
                    {detail.stderr}
                  </pre>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}