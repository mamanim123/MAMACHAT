"use client";

import { useEffect, useState } from "react";

function StatusBadge({ ok }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: ok ? "#dcfce7" : "#fee2e2",
        color: ok ? "#166534" : "#991b1b"
      }}
    >
      {ok ? "OK" : "NEED"}
    </span>
  );
}

function Row({ label, ok, detail }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 70px 1fr",
        gap: 12,
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid #e5e7eb"
      }}
    >
      <strong>{label}</strong>
      <StatusBadge ok={ok} />
      <span style={{ color: "#4b5563", fontSize: 13, wordBreak: "break-all" }}>
        {detail || "-"}
      </span>
    </div>
  );
}

export default function RuntimeStatusPanel() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  async function loadStatus() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/runtime", { cache: "no-store" });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Runtime status failed");
      }

      setStatus(data.status);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 10px 25px rgba(15,23,42,0.06)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 16
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Runtime Status</h2>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>
            Node, npm, Git, portable CLI 설치 상태를 확인합니다.
          </p>
        </div>

        <button
          onClick={loadStatus}
          disabled={loading}
          style={{
            border: "1px solid #d1d5db",
            background: "#111827",
            color: "#ffffff",
            borderRadius: 10,
            padding: "9px 12px",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "확인 중..." : "새로고침"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#fee2e2",
            color: "#991b1b",
            marginBottom: 12
          }}
        >
          {error}
        </div>
      ) : null}

      {status ? (
        <div>
          <Row
            label="Node"
            ok={status.node && status.node.ok}
            detail={status.node && status.node.result}
          />
          <Row
            label="npm"
            ok={status.npm && status.npm.ok}
            detail={status.npm && status.npm.result}
          />
          <Row
            label="Git"
            ok={status.git && status.git.ok}
            detail={status.git && status.git.result}
          />
          <Row
            label="CLI Package"
            ok={status.cliPackageJson}
            detail={status.cliRoot}
          />
          <Row
            label="OpenClaude"
            ok={status.openclaude}
            detail={status.openclaude ? "Installed" : "Not installed"}
          />
          <Row
            label="Codex"
            ok={status.codex}
            detail={status.codex ? "Installed" : "Not installed"}
          />
          <Row
            label="Claude Code"
            ok={status.claudeCode}
            detail={status.claudeCode ? "Installed" : "Not installed"}
          />
        </div>
      ) : (
        <p style={{ color: "#6b7280" }}>런타임 상태를 불러오는 중입니다.</p>
      )}
    </section>
  );
}