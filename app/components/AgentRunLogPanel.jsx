"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STAGES = [
  { key: "request", label: "요청 수신", patterns: [/REQUEST dryRun=/] },
  { key: "start", label: "Hermes 실행 시작", patterns: [/START Hermes/, /provider=/] },
  { key: "wsl", label: "WSL 진입 / 경로 확인", patterns: [/\[mamabot\] portable root/, /\[mamabot\] workspace:/] },
  { key: "bin", label: "Hermes 바이너리 확인", patterns: [/\[mamabot\] hermes bin/] },
  { key: "cwd", label: "작업 폴더 이동", patterns: [/\[mamabot\] cwd:/] },
  { key: "prepare", label: "프롬프트 준비", patterns: [/preparing prompt/] },
  { key: "running", label: "Hermes oneshot 실행 중", patterns: [/running hermes oneshot/] },
  { key: "end", label: "응답 수신 / 종료", patterns: [/END exitCode=/, /DRY RUN complete/] }
];

function detectStages(logText, runId) {
  if (!logText) return { reached: [], current: null, exitCode: null, hasError: false };

  const lines = runId
    ? logText.split(/\r?\n/).filter((line) => line.includes("[" + runId + "]"))
    : logText.split(/\r?\n/);

  const text = lines.join("\n");
  const reached = [];
  let exitCode = null;
  let hasError = false;

  for (const stage of STAGES) {
    const hit = stage.patterns.some((p) => p.test(text));
    if (hit) reached.push(stage.key);
  }

  const exitMatch = text.match(/END exitCode=(-?\d+)/);
  if (exitMatch) exitCode = Number(exitMatch[1]);

  if (/ERROR |SPAWN ERROR|TIMEOUT |BLOCKED /.test(text)) hasError = true;
  if (/API call failed|tokens? limit exceeded|HTTP 4\d\d|HTTP 5\d\d|insufficient credits/i.test(text)) hasError = true;

  let current = null;
  if (!reached.includes("end")) {
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (reached.includes(STAGES[i].key)) {
        const next = STAGES[i + 1];
        if (next) current = next.key;
        break;
      }
    }
    if (!current && reached.length === 0) current = "request";
  }

  return { reached, current, exitCode, hasError };
}

function escapeRegex(str) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function extractStartTime(logText, runId) {
  if (!logText || !runId) return null;
  const pattern = new RegExp("\\[([^\\]]+)\\] \\[" + escapeRegex(runId) + "\\] START");
  const m = logText.match(pattern);
  if (!m) return null;
  const t = Date.parse(m[1]);
  return Number.isFinite(t) ? t : null;
}

function extractEndTime(logText, runId) {
  if (!logText || !runId) return null;
  const pattern = new RegExp("\\[([^\\]]+)\\] \\[" + escapeRegex(runId) + "\\] END");
  const m = logText.match(pattern);
  if (!m) return null;
  const t = Date.parse(m[1]);
  return Number.isFinite(t) ? t : null;
}

function formatDuration(ms) {
  if (ms == null || ms < 0) return "-";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return m + "분 " + r + "초";
  return s + "초";
}

export default function AgentRunLogPanel() {
  const [logText, setLogText] = useState("");
  const [logPath, setLogPath] = useState("");
  const [runId, setRunId] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [latestOnly, setLatestOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const preRef = useRef(null);

  async function loadLog() {
    setLoading(true);
    setError("");

    try {
      const url = latestOnly
        ? "/api/agent/log?lines=180&latest=true"
        : "/api/agent/log?lines=220";

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Log load failed");
      }

      setLogText(data.text || "");
      setLogPath(data.logPath || "");
      setRunId(data.runId || "");
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function clearScreen() {
    const ok = window.confirm("실행 로그 화면만 비울까요? 실제 로그 파일은 남아 있습니다.");
    if (!ok) return;
    setLogText("");
  }

  useEffect(() => {
    loadLog();
  }, [latestOnly]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(loadLog, 1500);
    return () => clearInterval(timer);
  }, [autoRefresh, latestOnly]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [logText]);

  const stageInfo = useMemo(() => detectStages(logText, runId), [logText, runId]);
  const startTime = useMemo(() => extractStartTime(logText, runId), [logText, runId]);
  const endTime = useMemo(() => extractEndTime(logText, runId), [logText, runId]);

  const isRunning = startTime && !endTime && !stageInfo.hasError;
  const elapsed = startTime ? (endTime || now) - startTime : null;

  const overallStatus = stageInfo.hasError
    ? { label: "실패", bg: "#fee2e2", fg: "#991b1b" }
    : endTime
      ? { label: "완료", bg: "#dcfce7", fg: "#166534" }
      : isRunning
        ? { label: "실행 중", bg: "#dbeafe", fg: "#1e40af" }
        : { label: "대기", bg: "#f3f4f6", fg: "#6b7280" };

  return (
    <div style={{ marginTop: 18, border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "#ffffff" }}>
      <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 900 }}>실행 로그</span>
            <span style={{ background: overallStatus.bg, color: overallStatus.fg, padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 900 }}>
              {overallStatus.label}
            </span>
            {elapsed != null && (
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>⏱ {formatDuration(elapsed)}</span>
            )}
            {stageInfo.exitCode != null && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>exit={stageInfo.exitCode}</span>
            )}
          </div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4, wordBreak: "break-all" }}>
            {latestOnly ? "최근 실행: " + (runId || "대기 중") : "전체 로그 보기"}
          </div>
          <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 3, wordBreak: "break-all" }}>
            {logPath || "로그 파일 준비 중"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={loadLog} disabled={loading} style={{ border: "none", background: loading ? "#9ca3af" : "#111827", color: "#ffffff", borderRadius: 10, padding: "8px 11px", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "불러오는 중..." : "새로고침"}
          </button>
          <button onClick={() => setLatestOnly((prev) => !prev)} style={{ border: "1px solid #d1d5db", background: latestOnly ? "#eff6ff" : "#ffffff", color: latestOnly ? "#1d4ed8" : "#111827", borderRadius: 10, padding: "8px 11px", fontWeight: 900, cursor: "pointer" }}>
            최근 실행만 {latestOnly ? "ON" : "OFF"}
          </button>
          <button onClick={() => setAutoRefresh((prev) => !prev)} style={{ border: "1px solid #d1d5db", background: autoRefresh ? "#dcfce7" : "#ffffff", color: autoRefresh ? "#166534" : "#111827", borderRadius: 10, padding: "8px 11px", fontWeight: 900, cursor: "pointer" }}>
            자동갱신 {autoRefresh ? "ON" : "OFF"}
          </button>
          <button onClick={clearScreen} style={{ border: "1px solid #d1d5db", background: "#ffffff", color: "#111827", borderRadius: 10, padding: "8px 11px", fontWeight: 900, cursor: "pointer" }}>
            화면 비우기
          </button>
        </div>
      </div>

      <div style={{ padding: "12px 14px", background: "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STAGES.map((stage) => {
            const isReached = stageInfo.reached.includes(stage.key);
            const isCurrent = stageInfo.current === stage.key && isRunning;
            const isEndStage = stage.key === "end" && endTime;

            let bg = "#ffffff";
            let fg = "#9ca3af";
            let border = "1px solid #e5e7eb";
            let icon = "⬜";

            if (isEndStage && stageInfo.hasError) {
              bg = "#fee2e2"; fg = "#991b1b"; border = "1px solid #fca5a5"; icon = "❌";
            } else if (isEndStage) {
              bg = "#dcfce7"; fg = "#166534"; border = "1px solid #86efac"; icon = "✅";
            } else if (isReached) {
              bg = "#dcfce7"; fg = "#166534"; border = "1px solid #86efac"; icon = "✅";
            } else if (isCurrent) {
              bg = "#dbeafe"; fg = "#1e40af"; border = "1px solid #93c5fd"; icon = "⏳";
            }

            return (
              <div key={stage.key} style={{ padding: "5px 9px", borderRadius: 999, background: bg, color: fg, border, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}>
                <span>{icon}</span>
                <span>{stage.label}</span>
              </div>
            );
          })}
        </div>

        {isRunning && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>
            💡 Hermes oneshot 모드는 모델이 코드베이스를 읽고 사고하는 동안 stdout이 거의 흐르지 않습니다. 보통 1-5분이 걸립니다. 실시간 사고 과정은 Hermes Dashboard(9119)에서 확인하세요.
          </div>
        )}
      </div>

      {error ? (
        <div style={{ padding: 12, background: "#fee2e2", color: "#991b1b", fontSize: 13, wordBreak: "break-all" }}>
          {error}
        </div>
      ) : null}

      <pre ref={preRef} style={{ margin: 0, padding: 15, minHeight: 220, maxHeight: 420, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.6, background: "#0f172a", color: "#d1fae5" }}>
        {logText || "아직 실행 로그가 없습니다. Hermes 실행을 누르면 이곳에 진행 상태가 표시됩니다."}
      </pre>
    </div>
  );
}