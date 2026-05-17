"use client";

import { useEffect, useState } from "react";

function Row({ label, value, ok = null }) {
  const tone =
    ok === true ? { bg: "#dcfce7", fg: "#166534", border: "#bbf7d0" } :
    ok === false ? { bg: "#fee2e2", fg: "#991b1b", border: "#fecaca" } :
    { bg: "#f9fafb", fg: "#374151", border: "#e5e7eb" };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "190px minmax(0, 1fr)",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid #f3f4f6"
      }}
    >
      <strong>{label}</strong>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          width: "fit-content",
          maxWidth: "100%",
          border: "1px solid " + tone.border,
          background: tone.bg,
          color: tone.fg,
          borderRadius: 10,
          padding: "4px 8px",
          fontSize: 13,
          fontWeight: 800,
          wordBreak: "break-all"
        }}
      >
        {value || "-"}
      </span>
    </div>
  );
}

export default function PortableCenterPanel() {
  const [status, setStatus] = useState(null);
  const [model, setModel] = useState(null);
  const [claude, setClaude] = useState(null);
  const [openrouter, setOpenrouter] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [statusRes, modelRes, claudeRes, openrouterRes] = await Promise.allSettled([
        fetch("/api/hermes/native/status", { cache: "no-store" }),
        fetch("/api/hermes/native/model/info", { cache: "no-store" }),
        fetch("/api/cli/claude/status", { cache: "no-store" }),
        fetch("/api/models/openrouter", { cache: "no-store" })
      ]);

      if (statusRes.status === "fulfilled") setStatus(await statusRes.value.json());
      if (modelRes.status === "fulfilled") setModel(await modelRes.value.json());
      if (claudeRes.status === "fulfilled") setClaude(await claudeRes.value.json());
      if (openrouterRes.status === "fulfilled") setOpenrouter(await openrouterRes.value.json());
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const doctorCommand = "powershell -ExecutionPolicy Bypass -File .\\scripts\\portable\\doctor-mamabot.ps1 -Repair";
  const startCommand = ".\\start-mamabot.bat";
  const cliInstallCommand = "cd F:\\mamabot\\runtime\\cli; npm install";

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
          {"\uD3EC\uD130\uBE14 \uC13C\uD130"}
        </h2>
        <p style={{ margin: "6px 0 0", color: "#6b7280", lineHeight: 1.55 }}>
          {"\uC0C8 PC\uB098 \uB2E4\uB978 \uB4DC\uB77C\uC774\uBE0C\uC5D0\uC11C Mamabot\uC744 \uC2E4\uD589\uD560 \uB54C \uAE68\uC9C0\uB294 \uC694\uC18C\uB97C \uBE60\uB974\uAC8C \uC810\uAC80\uD558\uB294 \uD654\uBA74\uC785\uB2C8\uB2E4."}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          onClick={load}
          disabled={loading}
          style={{
            border: "1px solid #2563eb",
            background: "#2563eb",
            color: "#ffffff",
            borderRadius: 999,
            padding: "8px 13px",
            fontWeight: 900,
            cursor: loading ? "wait" : "pointer"
          }}
        >
          {loading ? "\uC810\uAC80 \uC911..." : "\uC804\uCCB4 \uC0C1\uD0DC \uC0C8\uB85C\uACE0\uCE68"}
        </button>
      </div>

      {error ? (
        <div style={{ marginBottom: 12, color: "#991b1b", fontWeight: 900 }}>{error}</div>
      ) : null}

      <section
        style={{
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          borderRadius: 18,
          padding: 18,
          boxShadow: "0 10px 25px rgba(15,23,42,0.06)",
          marginBottom: 16
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>{"\uD3EC\uD130\uBE14 \uD575\uC2EC \uC0C1\uD0DC"}</h3>

        <Row label="Hermes Dashboard" value={status?.version ? "OK / v" + status.version : "?? ??"} ok={Boolean(status?.version)} />
        <Row label="Hermes Home" value={status?.hermes_home || "-"} ok={Boolean(status?.hermes_home)} />
        <Row label="Hermes Model" value={model?.model || "-"} ok={Boolean(model?.model)} />
        <Row label="Hermes Context" value={model?.effective_context_length ? String(model.effective_context_length) : "-"} ok={Number(model?.effective_context_length || 0) >= 64000} />
        <Row label="OpenRouter Models" value={openrouter?.count ? String(openrouter.count) + " models" : "?? ??"} ok={Boolean(openrouter?.count)} />
        <Row label="Claude CLI Installed" value={claude?.installed ? "installed" : "not installed"} ok={claude?.installed === true} />
        <Row label="Claude CLI Connected" value={claude?.connected ? "connected" : "not connected"} ok={claude?.connected === true} />
        <Row label="Claude Bin" value={claude?.claudeBinWin || "-"} ok={claude?.installed === true} />
      </section>

      <section
        style={{
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          borderRadius: 18,
          padding: 18,
          boxShadow: "0 10px 25px rgba(15,23,42,0.06)"
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>{"\uC218\uB3D9 \uBCF5\uAD6C \uBA85\uB839"}</h3>
        <p style={{ color: "#6b7280", lineHeight: 1.55, marginTop: 0 }}>
          {"1\uCC28\uC5D0\uC11C\uB294 \uC2E4\uD589 \uBC84\uD2BC\uBCF4\uB2E4 \uC548\uC804\uD558\uAC8C \uBA85\uB839\uC744 \uD45C\uC2DC\uB9CC \uD569\uB2C8\uB2E4. \uC790\uB3D9 \uBCF5\uAD6C API\uB294 \uB2E4\uC74C \uB2E8\uACC4\uC5D0\uC11C \uCD94\uAC00\uD569\uB2C8\uB2E4."}
        </p>

        {[["Doctor Repair", doctorCommand], ["Start Mamabot", startCommand], ["Install CLI Runtime", cliInstallCommand]].map(([label, cmd]) => (
          <div key={label} style={{ marginBottom: 10 }}>
            <strong>{label}</strong>
            <pre
              style={{
                margin: "6px 0 0",
                padding: 10,
                borderRadius: 10,
                background: "#111827",
                color: "#e5e7eb",
                overflowX: "auto"
              }}
            >
              {cmd}
            </pre>
          </div>
        ))}
      </section>
    </div>
  );
}
