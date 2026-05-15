"use client";

import { useEffect, useState } from "react";
import WorkbenchChatPanel from "./WorkbenchChatPanel.jsx";

function StatusBadge({ label, value, tone = "green" }) {
  const color = {
    green: {
      bg: "#dcfce7",
      border: "#bbf7d0",
      fg: "#047857"
    },
    dark: {
      bg: "#111827",
      border: "#111827",
      fg: "#ffffff"
    },
    gray: {
      bg: "#f9fafb",
      border: "#e5e7eb",
      fg: "#374151"
    },
    orange: {
      bg: "#fff7ed",
      border: "#fed7aa",
      fg: "#c2410c"
    }
  }[tone] || {
    bg: "#f9fafb",
    border: "#e5e7eb",
    fg: "#374151"
  };

  return (
    <span
      title={String(value || "")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        maxWidth: 260,
        border: "1px solid " + color.border,
        background: color.bg,
        color: color.fg,
        borderRadius: 999,
        padding: "4px 9px",
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }}
    >
      <span>{label}</span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}
      >
        {value}
      </span>
    </span>
  );
}

export default function WorkbenchPanel({
  activeSessionId = "",
  activeRunId = "",
  resetKey = 0,
  onSessionChanged = null,
  onRunOpened = null
} = {}) {
  const [workspaceRoot, setWorkspaceRoot] = useState("");

  async function loadWorkspaceRoot() {
    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      const data = await res.json();

      const current =
        data?.config && data.config.currentWorkspace
          ? data.config.currentWorkspace
          : "";

      setWorkspaceRoot(current);
    } catch {
      setWorkspaceRoot("");
    }
  }

  useEffect(() => {
    loadWorkspaceRoot();
  }, [activeSessionId, activeRunId, resetKey]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gap: 6,
        width: "100%",
        height: "100%",
        minHeight: 0,
        maxWidth: "none"
      }}
    >
      <section
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 28,
          padding: "0 2px",
          overflow: "hidden"
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 15,
            letterSpacing: -0.3,
            lineHeight: 1.1,
            fontWeight: 900,
            whiteSpace: "nowrap"
          }}
        >
          작업대
        </h1>

        <StatusBadge
          label="세션"
          value={activeSessionId ? "연결됨" : "미선택"}
          tone={activeSessionId ? "green" : "orange"}
        />

        <StatusBadge
          label="Workspace"
          value={workspaceRoot || "확인 중"}
          tone="green"
        />

        <StatusBadge
          label="Runtime"
          value="OK"
          tone="green"
        />

        <StatusBadge
          label="CLI"
          value="준비"
          tone="green"
        />
      </section>

      <WorkbenchChatPanel
        activeSessionId={activeSessionId}
        activeRunId={activeRunId}
        resetKey={resetKey}
        workspaceRoot={workspaceRoot}
        onWorkspaceChanged={(nextPath) => setWorkspaceRoot(nextPath || "")}
        onSessionChanged={onSessionChanged}
        onRunOpened={onRunOpened}
      />
    </div>
  );
}
