"use client";

import { useEffect, useState } from "react";

function Pill({ label, value, tone }) {
  const colors = {
    good: { bg: "#dcfce7", color: "#166534" },
    warn: { bg: "#fef3c7", color: "#92400e" },
    bad: { bg: "#fee2e2", color: "#991b1b" },
    dark: { bg: "#111827", color: "#ffffff" }
  };

  const c = colors[tone] || colors.dark;

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "8px 11px",
        borderRadius: 999,
        background: c.bg,
        color: c.color,
        fontSize: 12,
        fontWeight: 800,
        maxWidth: 360
      }}
    >
      <span style={{ opacity: 0.72 }}>{label}</span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function TopStatusBar() {
  const [workspace, setWorkspace] = useState("");
  const [runtimeOk, setRuntimeOk] = useState(false);
  const [cliReady, setCliReady] = useState(false);

  async function refresh() {
    try {
      const workspaceRes = await fetch("/api/workspace", { cache: "no-store" });
      const workspaceData = await workspaceRes.json();
      const current =
        workspaceData &&
        workspaceData.config &&
        workspaceData.config.currentWorkspace
          ? workspaceData.config.currentWorkspace
          : "";

      setWorkspace(current);
    } catch {
      setWorkspace("");
    }

    try {
      const runtimeRes = await fetch("/api/runtime", { cache: "no-store" });
      const runtimeData = await runtimeRes.json();
      const s = runtimeData.status;

      setRuntimeOk(Boolean(s && s.node && s.node.ok && s.npm && s.npm.ok && s.git && s.git.ok));
      setCliReady(Boolean(s && s.cliPackageJson));
    } catch {
      setRuntimeOk(false);
      setCliReady(false);
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      style={{
        height: 64,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        zIndex: 80
      }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.4 }}>
          MAMA-Style Portable Web UI
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Pill
          label="Workspace"
          value={workspace || "Not selected"}
          tone={workspace ? "good" : "warn"}
        />
        <Pill
          label="Runtime"
          value={runtimeOk ? "OK" : "Check"}
          tone={runtimeOk ? "good" : "bad"}
        />
        <Pill
          label="CLI"
          value={cliReady ? "Prepared" : "Need setup"}
          tone={cliReady ? "good" : "warn"}
        />
        <Pill label="Port" value="3200" tone="dark" />
      </div>
    </header>
  );
}
