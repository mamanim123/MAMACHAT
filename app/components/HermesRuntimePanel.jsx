"use client";

import { useEffect, useState } from "react";

function Badge({ ok, text }) {
  return (
    <span
      style={{
        padding: "4px 9px",
        borderRadius: 999,
        background: ok ? "#dcfce7" : "#fef3c7",
        color: ok ? "#166534" : "#92400e",
        fontSize: 12,
        fontWeight: 900
      }}
    >
      {text}
    </span>
  );
}

export default function HermesRuntimePanel() {
  const [config, setConfig] = useState(null);

  async function loadConfig() {
    const res = await fetch("/api/hermes/config", { cache: "no-store" });
    const data = await res.json();

    if (data.ok) {
      setConfig(data.config);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 22,
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Hermes Runtime</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            Mamabot의 중심 런타임은 Hermes Agent입니다. Codex / Claude Code / OpenClaude는 보조 도구로 사용합니다.
          </p>
        </div>

        <Badge ok={Boolean(config)} text={config ? "Configured" : "Need setup"} />
      </div>

      {config ? (
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gap: 10
          }}
        >
          <div><strong>Mode:</strong> {config.mode}</div>
          <div><strong>Dashboard:</strong> {config.dashboard.host}:{config.dashboard.port}</div>
          <div><strong>Dashboard Command:</strong> {config.dashboard.command}</div>
          <div><strong>Gateway:</strong> {config.gateway.enabled ? "enabled" : "disabled"}</div>
          <div><strong>API Server:</strong> {config.apiServer.enabled ? config.apiServer.baseUrl : "disabled"}</div>
        </div>
      ) : (
        <p style={{ color: "#6b7280", marginTop: 18 }}>Hermes 설정을 불러오는 중입니다.</p>
      )}
    </section>
  );
}