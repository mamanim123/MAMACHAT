"use client";

import { useEffect, useState } from "react";

function StatusLine({ label, ok, detail }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "130px 80px 1fr",
        gap: 12,
        padding: "11px 0",
        borderBottom: "1px solid #e5e7eb",
        alignItems: "center"
      }}
    >
      <strong>{label}</strong>
      <span
        style={{
          display: "inline-flex",
          justifyContent: "center",
          padding: "4px 9px",
          borderRadius: 999,
          background: ok ? "#dcfce7" : "#fee2e2",
          color: ok ? "#166534" : "#991b1b",
          fontSize: 12,
          fontWeight: 900
        }}
      >
        {ok ? "OK" : "NEED"}
      </span>
      <span style={{ color: "#4b5563", fontSize: 13, wordBreak: "break-all" }}>
        {detail || "-"}
      </span>
    </div>
  );
}

export default function HermesSetupPanel() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    setError("");

    try {
      const configRes = await fetch("/api/hermes/config", { cache: "no-store" });
      const configData = await configRes.json();

      if (!configData.ok) {
        throw new Error(configData.error || "Hermes config load failed");
      }

      setConfig(configData.config);

      const statusRes = await fetch("/api/hermes/status", { cache: "no-store" });
      const statusData = await statusRes.json();

      if (statusData.ok) {
        setStatus(statusData.status);
      }
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function saveConfig() {
    if (!config) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/hermes/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config)
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Hermes config save failed");
      }

      setConfig(data.config);
      setMessage("Hermes 설정 저장 완료");
      await loadAll();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function updateConfig(path, value) {
    setConfig(function (prev) {
      const next = JSON.parse(JSON.stringify(prev));

      if (path === "mode") {
        next.mode = value;
      }

      if (path === "dashboard.host") {
        next.dashboard.host = value;
      }

      if (path === "dashboard.port") {
        next.dashboard.port = Number(value);
      }

      if (path === "dashboard.command") {
        next.dashboard.command = value;
      }

      if (path === "apiServer.baseUrl") {
        next.apiServer.baseUrl = value;
      }

      return next;
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  if (!config) {
    return (
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 24
        }}
      >
        Hermes 설정을 불러오는 중입니다.
      </section>
    );
  }

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 24,
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 20
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Hermes Setup</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            Hermes Agent를 Mamabot의 메인 런타임으로 연결합니다. WSL, Docker, Remote/VPS 중 하나를 선택합니다.
          </p>
        </div>

        <button
          onClick={loadAll}
          style={{
            border: "1px solid #d1d5db",
            background: "#111827",
            color: "#ffffff",
            borderRadius: 10,
            padding: "10px 13px",
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          상태 확인
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 18,
          alignItems: "start"
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 18,
            background: "#f9fafb"
          }}
        >
          <h3 style={{ marginTop: 0 }}>Connection Mode</h3>

          <label style={{ display: "block", fontWeight: 800, fontSize: 13, marginBottom: 7 }}>
            Hermes 실행 방식
          </label>

          <select
            value={config.mode}
            onChange={(event) => updateConfig("mode", event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 11px",
              background: "#ffffff",
              marginBottom: 14
            }}
          >
            <option value="wsl">WSL2</option>
            <option value="docker">Docker</option>
            <option value="remote">Remote / VPS</option>
          </select>

          <label style={{ display: "block", fontWeight: 800, fontSize: 13, marginBottom: 7 }}>
            Dashboard Host
          </label>
          <input
            value={config.dashboard.host}
            onChange={(event) => updateConfig("dashboard.host", event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 11px",
              boxSizing: "border-box",
              marginBottom: 12
            }}
          />

          <label style={{ display: "block", fontWeight: 800, fontSize: 13, marginBottom: 7 }}>
            Dashboard Port
          </label>
          <input
            type="number"
            value={config.dashboard.port}
            onChange={(event) => updateConfig("dashboard.port", event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 11px",
              boxSizing: "border-box",
              marginBottom: 12
            }}
          />

          <label style={{ display: "block", fontWeight: 800, fontSize: 13, marginBottom: 7 }}>
            Dashboard Command
          </label>
          <input
            value={config.dashboard.command}
            onChange={(event) => updateConfig("dashboard.command", event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 11px",
              boxSizing: "border-box",
              marginBottom: 12
            }}
          />

          <button
            onClick={saveConfig}
            disabled={loading}
            style={{
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 11,
              padding: "11px 14px",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "저장 중..." : "설정 저장"}
          </button>

          {message ? (
            <div
              style={{
                marginTop: 12,
                padding: 11,
                borderRadius: 10,
                background: "#dcfce7",
                color: "#166534",
                fontSize: 13
              }}
            >
              {message}
            </div>
          ) : null}

          {error ? (
            <div
              style={{
                marginTop: 12,
                padding: 11,
                borderRadius: 10,
                background: "#fee2e2",
                color: "#991b1b",
                fontSize: 13
              }}
            >
              {error}
            </div>
          ) : null}
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 18,
            background: "#ffffff"
          }}
        >
          <h3 style={{ marginTop: 0 }}>Hermes Runtime Status</h3>

          {status ? (
            <div>
              <StatusLine
                label="Config"
                ok={status.configLoaded}
                detail={"mode: " + status.mode}
              />
              <StatusLine
                label="WSL"
                ok={status.wsl && status.wsl.ok}
                detail={status.wsl && status.wsl.result}
              />
              <StatusLine
                label="Docker"
                ok={status.docker && status.docker.ok}
                detail={status.docker && status.docker.result}
              />
              <StatusLine
                label="Dashboard"
                ok={status.dashboard && status.dashboard.ok}
                detail={status.dashboard ? status.dashboard.url : ""}
              />

              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 12,
                  background: "#f9fafb",
                  color: "#4b5563",
                  fontSize: 13,
                  lineHeight: 1.6
                }}
              >
                Dashboard가 NEED이면 Hermes Dashboard가 아직 실행되지 않은 상태입니다.
                다음 단계에서 실행 버튼을 붙입니다.
              </div>
            </div>
          ) : (
            <p style={{ color: "#6b7280" }}>상태를 불러오는 중입니다.</p>
          )}
        </div>
      </div>
    </section>
  );
}