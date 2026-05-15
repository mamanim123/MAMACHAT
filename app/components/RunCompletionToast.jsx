"use client";

import { useEffect, useRef, useState } from "react";

const DONE_STATUSES = new Set(["success", "failed", "stopped", "blocked", "dryrun"]);

function getTone(status) {
  if (status === "success") return { bg: "#ecfdf5", border: "#22c55e", fg: "#166534", title: "작업 완료" };
  if (status === "stopped") return { bg: "#fff7ed", border: "#f97316", fg: "#9a3412", title: "작업 중지" };
  if (status === "dryrun") return { bg: "#eff6ff", border: "#3b82f6", fg: "#1d4ed8", title: "계획 확인 완료" };
  return { bg: "#fef2f2", border: "#ef4444", fg: "#991b1b", title: "작업 실패" };
}

function shortText(value, max = 120) {
  const text = String(value || "")
    .replace(/\[System instruction - do not repeat\][\s\S]*?사용자 요청:\s*/g, "")
    .replace(/\[Answer style\][\s\S]*?(?=\n\n|$)/g, "")
    .replace(/\[mamabot\].*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export default function RunCompletionToast({ runId = "" }) {
  const [toast, setToast] = useState(null);
  const watchedRef = useRef("");

  useEffect(() => {
    if (!runId || watchedRef.current === runId) return;

    let cancelled = false;
    let timer = null;
    let sawRunning = false;

    watchedRef.current = runId;

    async function check() {
      try {
        const res = await fetch("/api/agent/runs/" + encodeURIComponent(runId), {
          cache: "no-store"
        });

        const data = await res.json();
        const run = data?.run;

        if (!run || cancelled) return;

        if (run.status === "running") {
          sawRunning = true;
          timer = window.setTimeout(check, 3000);
          return;
        }

        if (sawRunning && DONE_STATUSES.has(run.status)) {
          setToast(run);
          window.setTimeout(() => {
            setToast((current) => current?.runId === run.runId ? null : current);
          }, 7000);
          return;
        }

        if (!DONE_STATUSES.has(run.status)) {
          timer = window.setTimeout(check, 3000);
        }
      } catch {
        if (!cancelled) {
          timer = window.setTimeout(check, 3000);
        }
      }
    }

    check();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [runId]);

  if (!toast) return null;

  const tone = getTone(toast.status);

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        top: 18,
        transform: "translateX(-50%)",
        zIndex: 1000,
        minWidth: 340,
        maxWidth: 520,
        border: "2px solid " + tone.border,
        background: tone.bg,
        color: tone.fg,
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 24px 80px rgba(15,23,42,0.25)"
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ fontSize: 26 }}>
          {toast.status === "success" ? "✅" : toast.status === "failed" ? "❌" : "ℹ️"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 5 }}>
            {tone.title}
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.9, marginBottom: 8 }}>
            {toast.runId} · {toast.durationMs ? Math.round(toast.durationMs / 1000) + "초" : "시간 확인 중"}
          </div>

          <div style={{ fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
            {shortText(toast.error || toast.promptPreview || toast.output || "작업이 종료되었습니다.")}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setToast(null)}
          style={{
            border: "none",
            background: "rgba(255,255,255,0.65)",
            color: tone.fg,
            borderRadius: 999,
            width: 28,
            height: 28,
            cursor: "pointer",
            fontWeight: 900
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
