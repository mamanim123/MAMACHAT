"use client";

import { useCallback, useEffect, useState } from "react";

const TXT = {
  title: "실행 이력",
  subtitle: "최근 Hermes 실행 결과를 저장하고 다시 확인합니다.",
  allStatus: "전체 상태",
  allMode: "전체 모드",
  success: "성공",
  failed: "실패",
  dryrun: "계획 확인",
  blocked: "차단",
  realRun: "실제 실행",
  refresh: "새로고침",
  rebuild: "인덱스 재빌드",
  loading: "불러오는 중...",
  noRuns: "저장된 실행 이력이 없습니다.",
  emptyPrompt: "빈 프롬프트",
  selectHint: "왼쪽 목록에서 실행 항목을 선택하도록",
  detailLoading: "상세 로딩 중...",
  deleteConfirm: "이 실행 기록을 삭제할까요?",
  copyOutput: "응답 복사",
  copyDone: "복사됨!",
  delete: "삭제",
  prompt: "프롬프트",
  output: "응답",
  none: "없음",
  noOutput: "응답 없음",
  listLoadFail: "실행 이력을 불러오지 못했습니다.",
  detailLoadFail: "상세 기록을 불러오지 못했습니다.",
  sendToWorkbench: "작업대로 보내기",
  candidates: "후보 파일",
  errorLog: "오류 로그",
  tokenRisk: "토큰",
  duration: "실행시간",
  searchPlaceholder: "runId \ 모델 \ 프롬프트 검색...",
};

const STATUS = {
  success: { label: TXT.success,  bg: "#dcfce7", fg: "#166534" },
  failed:  { label: TXT.failed,   bg: "#fee2e2", fg: "#991b1b" },
  dryrun:  { label: TXT.dryrun,   bg: "#dbeafe", fg: "#1e40af" },
  blocked: { label: TXT.blocked,  bg: "#fef3c7", fg: "#92400e" },
};

function fmt(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmtMs(ms) {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms/1000).toFixed(1)}s`;
}

function StatBadge({ count, label, color }) {
  return (
    <div style={{ textAlign: "center", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", minWidth: 60 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color }}>{count}</div>
      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>{label}</div>
    </div>
  );
}

export default function AgentRunHistoryPanel({ refreshKey = 0, initialRunId = "", onSendToWorkbench }) {
  const [items, setItems]               = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [detail, setDetail]             = useState(null);
  const [loadingList, setLoadingList]   = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError]               = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dryRunFilter, setDryRunFilter] = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [outputView, setOutputView]     = useState("raw");
  const [copyLabel, setCopyLabel]       = useState(TXT.copyOutput);
  const [stats, setStats]               = useState({ total:0, success:0, failed:0, dryrun:0 });

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (statusFilter) params.set("status", statusFilter);
      if (dryRunFilter) params.set("dryRun", dryRunFilter);
      const res = await fetch(`/api/agent/runs?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || TXT.listLoadFail);
      const all = data.items || [];
      setItems(all);
      setStats({
        total:   all.length,
        success: all.filter(r => r.status === "success").length,
        failed:  all.filter(r => r.status === "failed").length,
        dryrun:  all.filter(r => r.status === "dryrun").length,
      });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, dryRunFilter]);

  // ????? ??? ?? ??
  useEffect(() => {
    if (!searchQuery.trim()) { setFiltered(items); return; }
    const q = searchQuery.trim().toLowerCase();
    setFiltered(items.filter(r =>
      [r.runId, r.status, r.provider, r.model, r.mode, r.promptPreview, r.engine]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    ));
  }, [items, searchQuery]);

  useEffect(() => { loadList(); }, [loadList, refreshKey]);

  useEffect(() => {
    if (initialRunId) openDetail(initialRunId);
  }, [initialRunId]);

  async function openDetail(runId) {
    setSelectedRunId(runId);
    setDetail(null);
    setOutputView("raw");
    setLoadingDetail(true);
    try {
      const res  = await fetch(`/api/agent/runs/${runId}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || TXT.detailLoadFail);
      setDetail(data.run);
    } catch (err) {
      setDetail({ error: err.message || String(err) });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function rebuildIndex() {
    try {
      const res  = await fetch("/api/agent/runs", { method: "POST", cache: "no-store" });
      const data = await res.json();
      if (data.ok) loadList();
    } catch { /* silent */ }
  }

  async function deleteRun(runId) {
    if (!window.confirm(`${TXT.deleteConfirm}\n${runId}`)) return;
    await fetch(`/api/agent/runs/${runId}`, { method: "DELETE" });
    if (selectedRunId === runId) { setSelectedRunId(""); setDetail(null); }
    loadList();
  }

  async function copyText(text) {
    if (!text) return;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopyLabel(TXT.copyDone);
    setTimeout(() => setCopyLabel(TXT.copyOutput), 1500);
  }

  function sendToWorkbench() {
    if (!detail?.prompt) return;
    try {
      localStorage.setItem("mamabot.pendingWorkbenchPrompt", detail.prompt);
      window.dispatchEvent(new CustomEvent("mamabot:send-to-workbench"));
    } catch { /* silent */ }
    if (typeof onSendToWorkbench === "function") onSendToWorkbench(detail.prompt);
  }

  const display = searchQuery.trim() ? filtered : items;
  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  return (
    <section style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:16, marginTop:16 }}>

      {/* ?? */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap", marginBottom:12 }}>
        <div>
          <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:"#111827" }}>{TXT.title}</h3>
          <p style={{ margin:"4px 0 0", fontSize:12, color:"#6b7280" }}>{TXT.subtitle}</p>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          <button type="button" onClick={rebuildIndex} title="이력 재스캔" style={{ border:"1px solid #c7d2fe", background:"#eef2ff", color:"#3730a3", borderRadius:8, padding:"6px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            {TXT.rebuild}
          </button>
          <button type="button" onClick={loadList} disabled={loadingList} style={{ border:"1px solid #d1d5db", background:"#f9fafb", borderRadius:8, padding:"6px 10px", fontSize:12, fontWeight:700, cursor: loadingList ? "not-allowed":"pointer" }}>
            {loadingList ? TXT.loading : TXT.refresh}
          </button>
        </div>
      </div>

      {/* ?? ? */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        <StatBadge count={stats.total}   label="전체" color="#111827" />
        <StatBadge count={stats.success} label={TXT.success}  color="#166534" />
        <StatBadge count={stats.failed}  label={TXT.failed}   color="#991b1b" />
        <StatBadge count={stats.dryrun}  label={TXT.dryrun}   color="#1e40af" />
        <div style={{ textAlign:"center", background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:8, padding:"6px 12px", minWidth:60 }}>
          <div style={{ fontSize:18, fontWeight:900, color: successRate >= 70 ? "#166534" : successRate >= 40 ? "#92400e" : "#991b1b" }}>
            {successRate}%
          </div>
          <div style={{ fontSize:10, color:"#6b7280", marginTop:1 }}>성공률</div>
        </div>
      </div>

      {/* ?? + ?? */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={TXT.searchPlaceholder}
          style={{ flex:1, minWidth:160, border:"1px solid #d1d5db", borderRadius:8, padding:"6px 10px", fontSize:12 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ border:"1px solid #d1d5db", borderRadius:8, padding:"6px 8px", fontSize:12 }}>
          <option value="">{TXT.allStatus}</option>
          <option value="success">{TXT.success}</option>
          <option value="failed">{TXT.failed}</option>
          <option value="dryrun">{TXT.dryrun}</option>
          <option value="blocked">{TXT.blocked}</option>
        </select>
        <select value={dryRunFilter} onChange={e => setDryRunFilter(e.target.value)} style={{ border:"1px solid #d1d5db", borderRadius:8, padding:"6px 8px", fontSize:12 }}>
          <option value="">{TXT.allMode}</option>
          <option value="false">{TXT.realRun}</option>
          <option value="true">{TXT.dryrun}</option>
        </select>
      </div>

      {error ? (
        <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#991b1b", borderRadius:8, padding:10, fontSize:13, marginBottom:10 }}>
          {error}
        </div>
      ) : null}

      {/* ?? ??? */}
      <div style={{ display:"grid", gridTemplateColumns:"minmax(240px,1fr) minmax(300px,1.3fr)", gap:12 }}>

        {/* ?? */}
        <div style={{ border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden", maxHeight:520, overflowY:"auto" }}>
          {!loadingList && display.length === 0 ? (
            <div style={{ padding:16, fontSize:13, color:"#6b7280" }}>
              {searchQuery ? `"${searchQuery}" 에 해당하는 기록 없음` : TXT.noRuns}
            </div>
          ) : null}

          {display.map(item => {
            const s = STATUS[item.status] || { label: item.status || "-", bg:"#f3f4f6", fg:"#374151" };
            const active = selectedRunId === item.runId;
            return (
              <button
                key={item.runId}
                type="button"
                onClick={() => openDetail(item.runId)}
                style={{ display:"block", width:"100%", textAlign:"left", border:0, borderBottom:"1px solid #f3f4f6", background: active ? "#eff6ff" : "#ffffff", padding:"10px 12px", cursor:"pointer" }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
                  <span style={{ background:s.bg, color:s.fg, fontSize:10, fontWeight:900, padding:"2px 6px", borderRadius:999 }}>{s.label}</span>
                  {item.engine === "direct" && <span style={{ background:"#fef3c7", color:"#92400e", fontSize:10, fontWeight:700, padding:"2px 5px", borderRadius:999 }}>DIRECT</span>}
                  {item.memorySynced && <span style={{ background:"#f0fdf4", color:"#166534", fontSize:10, padding:"2px 5px", borderRadius:999 }}>MEM</span>}
                  {item.candidateCount > 0 && <span style={{ background:"#ede9fe", color:"#5b21b6", fontSize:10, padding:"2px 5px", borderRadius:999 }}>{item.candidateCount}파일</span>}
                  <span style={{ marginLeft:"auto", fontSize:10, color:"#9ca3af" }}>{fmtMs(item.durationMs)}</span>
                </div>
                <div style={{ fontSize:12, color:"#111827", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {item.promptPreview || `(${TXT.emptyPrompt})`}
                </div>
                <div style={{ fontSize:10, color:"#9ca3af", marginTop:3, display:"flex", justifyContent:"space-between" }}>
                  <span>{item.provider || "-"} ? {(item.model || "-").split("/").pop()}</span>
                  <span>{fmt(item.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ?? */}
        <div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:12, background:"#fafafa", maxHeight:520, overflowY:"auto" }}>
          {!selectedRunId && <div style={{ fontSize:13, color:"#6b7280" }}>{TXT.selectHint}</div>}
          {selectedRunId && loadingDetail && <div style={{ fontSize:13, color:"#6b7280" }}>{TXT.detailLoading}</div>}
          {detail?.error && <div style={{ color:"#991b1b", fontSize:13 }}>{detail.error}</div>}

          {detail && !detail.error ? (
            <div style={{ fontSize:12, color:"#111827" }}>

              {/* ?? ?? */}
              <div style={{ display:"flex", justifyContent:"space-between", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                <code style={{ fontSize:10, color:"#6b7280", wordBreak:"break-all" }}>{detail.runId}</code>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  <button type="button" onClick={sendToWorkbench} style={{ border:"1px solid #bbf7d0", background:"#f0fdf4", color:"#166534", borderRadius:6, padding:"4px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    {TXT.sendToWorkbench}
                  </button>
                  <button type="button" onClick={() => copyText(outputView === "compressed" ? (detail.compressedOutput || detail.output || "") : (detail.output || ""))} style={{ border:"1px solid #d1d5db", background:"#fff", borderRadius:6, padding:"4px 8px", fontSize:11, cursor:"pointer" }}>
                    {copyLabel}
                  </button>
                  <button type="button" onClick={() => deleteRun(detail.runId)} style={{ border:"1px solid #fecaca", background:"#fef2f2", color:"#991b1b", borderRadius:6, padding:"4px 8px", fontSize:11, cursor:"pointer" }}>
                    {TXT.delete}
                  </button>
                </div>
              </div>

              {/* ?? ?? */}
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
                {(() => { const s = STATUS[detail.status] || { label:detail.status, bg:"#f3f4f6", fg:"#374151" }; return <span style={{ background:s.bg, color:s.fg, fontSize:11, fontWeight:900, padding:"2px 7px", borderRadius:999 }}>{s.label}</span>; })()}
                {detail.engine && <span style={{ background:"#fef3c7", color:"#92400e", fontSize:11, padding:"2px 6px", borderRadius:999 }}>{detail.engine}</span>}
                {detail.executionProfile && <span style={{ background:"#ede9fe", color:"#5b21b6", fontSize:11, padding:"2px 6px", borderRadius:999 }}>{detail.executionProfile}</span>}
                {detail.mode && <span style={{ background:"#f0f9ff", color:"#0369a1", fontSize:11, padding:"2px 6px", borderRadius:999 }}>{detail.mode}</span>}
              </div>

              {/* ?? ? */}
              <div style={{ color:"#6b7280", fontSize:11, marginBottom:8 }}>
                {fmt(detail.createdAt)} ? {detail.provider || "-"} ? {detail.model || "-"}<br/>
                exitCode={detail.exitCode ?? "-"} ? {fmtMs(detail.durationMs)}
                {detail.usage?.prompt_tokens != null ? ` ? ${detail.usage.prompt_tokens}+${detail.usage.completion_tokens}tok` : ""}
              </div>

              {/* ?? ??? */}
              {detail.error ? (
                <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#991b1b", borderRadius:8, padding:8, fontSize:12, marginBottom:8 }}>
                  ⚠️ {detail.error}
                </div>
              ) : null}

              {/* ???? */}
              <div style={{ fontWeight:800, marginBottom:4 }}>{TXT.prompt}</div>
              <pre style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, padding:8, whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight:120, overflowY:"auto", fontSize:11 }}>
                {detail.prompt || `(${TXT.none})`}
              </pre>

              {/* ?? ?? */}
              {Array.isArray(detail.workspaceCandidates) && detail.workspaceCandidates.length > 0 ? (
                <>
                  <div style={{ fontWeight:800, margin:"10px 0 4px" }}>{TXT.candidates} ? {detail.workspaceCandidates.length}</div>
                  <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, padding:8, maxHeight:140, overflowY:"auto" }}>
                    {detail.workspaceCandidates.slice(0,8).map((c, idx) => (
                      <div key={idx} style={{ borderBottom: idx < 7 ? "1px solid #f3f4f6":"none", padding:"4px 0", fontSize:11 }}>
                        <span style={{ fontWeight:700 }}>{idx+1}. {c.path || "-"}</span>
                        <span style={{ color:"#9ca3af", marginLeft:6 }}>score={c.score ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {/* ?? ?? */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, margin:"10px 0 4px" }}>
                <div style={{ fontWeight:800 }}>{TXT.output}</div>
                {detail.compressedOutput ? (
                  <div style={{ display:"flex", gap:3 }}>
                    {["raw","compressed"].map(v => (
                      <button key={v} type="button" onClick={() => setOutputView(v)}
                        style={{ border:"1px solid #d1d5db", background: outputView===v ? "#111827":"#fff", color: outputView===v ? "#fff":"#374151", borderRadius:6, padding:"3px 7px", fontSize:10, fontWeight:800, cursor:"pointer" }}>
                        {v === "raw" ? "Raw" : "Compressed"}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {detail.outputCompression && detail.outputCompression.savedChars > 0 ? (
                <div style={{ background:"#eef2ff", border:"1px solid #c7d2fe", color:"#3730a3", borderRadius:8, padding:6, fontSize:10, marginBottom:6 }}>
                  {detail.outputCompression.kind} ? {detail.outputCompression.savedChars}자 절약
                </div>
              ) : null}

              <pre style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, padding:8, whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight:200, overflowY:"auto", fontSize:11 }}>
                {(outputView === "compressed" ? (detail.compressedOutput || detail.output) : detail.output) || `(${TXT.noOutput})`}
              </pre>

              {/* stderr */}
              {detail.stderr ? (
                <>
                  <div style={{ fontWeight:800, margin:"10px 0 4px", color:"#991b1b" }}>{TXT.errorLog}</div>
                  <pre style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#7f1d1d", borderRadius:8, padding:8, whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight:120, overflowY:"auto", fontSize:11 }}>
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
