"use client";

import { useEffect, useState } from "react";
import HermesSetupPanel from "./HermesSetupPanel.jsx";
import HermesDashboardPanel from "./HermesDashboardPanel.jsx";

function Badge({ children, tone = "gray" }) {
  const map = {
    green: { bg: "#dcfce7", fg: "#166534", border: "#bbf7d0" },
    orange: { bg: "#fff7ed", fg: "#9a3412", border: "#fed7aa" },
    red: { bg: "#fee2e2", fg: "#991b1b", border: "#fecaca" },
    blue: { bg: "#dbeafe", fg: "#1d4ed8", border: "#bfdbfe" },
    gray: { bg: "#f3f4f6", fg: "#374151", border: "#e5e7eb" }
  }[tone] || { bg: "#f3f4f6", fg: "#374151", border: "#e5e7eb" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid " + map.border,
        background: map.bg,
        color: map.fg,
        borderRadius: 999,
        padding: "3px 8px",
        fontSize: 12,
        fontWeight: 900
      }}
    >
      {children}
    </span>
  );
}

export default function HermesManagementPanel() {
  const [tab, setTab] = useState("status");
  const [status, setStatus] = useState(null);
  const [model, setModel] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    setLoading(true);
    setError("");

    try {
      const [statusRes, modelRes] = await Promise.all([
        fetch("/api/hermes/native/status", { cache: "no-store" }),
        fetch("/api/hermes/native/model/info", { cache: "no-store" })
      ]);

      const statusJson = await statusRes.json();
      const modelJson = await modelRes.json();

      if (!statusRes.ok) throw new Error(statusJson.error || "Hermes status failed");
      if (!modelRes.ok) throw new Error(modelJson.error || "Hermes model info failed");

      setStatus(statusJson);
      setModel(modelJson);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const tabs = [
    { id: "status", label: "\uC0C1\uD0DC" },
    { id: "config", label: "Config / Env" },
    { id: "dashboard", label: "\uC6D0\uBCF8 \uB300\uC2DC\uBCF4\uB4DC" }
  ];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
          {"Hermes \uAD00\uB9AC"}
        </h2>
        <p style={{ margin: "6px 0 0", color: "#6b7280", lineHeight: 1.55 }}>
          {"Hermes \uB7F0\uD0C0\uC784\uACFC \uC6D0\uBCF8 Dashboard, Config, Env\uB97C \uD558\uB098\uC758 \uAD00\uB9AC \uD654\uBA74\uC73C\uB85C \uBB36\uC5B4\uC11C \uD655\uC778\uD569\uB2C8\uB2E4."}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              border: "1px solid " + (tab === item.id ? "#2563eb" : "#d1d5db"),
              background: tab === item.id ? "#2563eb" : "#ffffff",
              color: tab === item.id ? "#ffffff" : "#374151",
              borderRadius: 999,
              padding: "8px 13px",
              fontWeight: 900,
              cursor: "pointer"
            }}
          >
            {item.label}
          </button>
        ))}

        <button
          onClick={loadStatus}
          disabled={loading}
          style={{
            marginLeft: "auto",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            borderRadius: 999,
            padding: "8px 13px",
            fontWeight: 900,
            cursor: loading ? "wait" : "pointer"
          }}
        >
          {loading ? "\uD655\uC778 \uC911..." : "\uC0C1\uD0DC \uC0C8\uB85C\uACE0\uCE68"}
        </button>
      </div>

      {tab === "status" ? (
        <section
          style={{
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            borderRadius: 18,
            padding: 18,
            boxShadow: "0 10px 25px rgba(15,23,42,0.06)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{"Hermes \uC0C1\uD0DC"}</h3>
            {error ? <Badge tone="red">ERROR</Badge> : status ? <Badge tone="green">OK</Badge> : <Badge tone="orange">CHECKING</Badge>}
          </div>

          {error ? (
            <div style={{ color: "#991b1b", fontWeight: 800, marginBottom: 12 }}>{error}</div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0, 1fr)", gap: 8, fontSize: 14 }}>
            <strong>Version</strong>
            <span>{status?.version || "-"}</span>

            <strong>Hermes Home</strong>
            <span style={{ wordBreak: "break-all" }}>{status?.hermes_home || "-"}</span>

            <strong>Config</strong>
            <span style={{ wordBreak: "break-all" }}>{status?.config_path || "-"}</span>

            <strong>Env</strong>
            <span style={{ wordBreak: "break-all" }}>{status?.env_path || "-"}</span>

            <strong>Gateway</strong>
            <span>{status?.gateway_running ? "running" : "stopped"}</span>

            <strong>Provider</strong>
            <span>{model?.provider || "-"}</span>

            <strong>Model</strong>
            <span style={{ wordBreak: "break-all" }}>{model?.model || "-"}</span>

            <strong>Context</strong>
            <span>
              auto {model?.auto_context_length || "-"} / effective {model?.effective_context_length || "-"}
            </span>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 14,
              background: "#eff6ff",
              color: "#1e3a8a",
              fontSize: 13,
              lineHeight: 1.55
            }}
          >
            {"\uC774 \uD654\uBA74\uC740 Mamabot\uC774 Hermes Web UI\uB97C \uB300\uCCB4\uD558\uB294 \uAD00\uB9AC \uC601\uC5ED\uC785\uB2C8\uB2E4. \uC6D0\uBCF8 Dashboard\uB294 \uBE44\uC0C1 \uD655\uC778\uC6A9\uC73C\uB85C\uB9CC \uB0A8\uAE41\uB2C8\uB2E4."}
          </div>
        </section>
      ) : null}

      {tab === "config" ? <HermesSetupPanel /> : null}
      {tab === "dashboard" ? <HermesDashboardPanel /> : null}
    </div>
  );
}
