"use client";

import { useEffect, useState } from "react";
import HermesNativeMirrorPanel from "./HermesNativeMirrorPanel.jsx";

function Badge({ ok, text }) {
  return (
    <span
      style={{
        padding: "4px 9px",
        borderRadius: 999,
        background: ok ? "#dcfce7" : "#fee2e2",
        color: ok ? "#166534" : "#991b1b",
        fontSize: 12,
        fontWeight: 900
      }}
    >
      {text || (ok ? "OK" : "NEED")}
    </span>
  );
}

export default function HermesDashboardPanel() {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [installLog, setInstallLog] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadStatus() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/hermes/status", { cache: "no-store" });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Hermes status failed");
      }

      setStatus(data.status);
      setConfig(data.config);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadInstallLog() {
    try {
      const res = await fetch("/api/hermes/install/log", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setInstallLog(data.log || "");
    } catch {
      // ignore
    }
  }

  async function installHermesWsl() {
    setInstalling(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/hermes/install/wsl", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Portable Hermes install failed");
      }

      setMessage(
        `${data.message} 설치 위치: ${data.hermesInstallDirWsl} / 설치 로그를 확인하세요.`
      );

      setTimeout(loadInstallLog, 1500);
      setTimeout(loadStatus, 5000);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setInstalling(false);
    }
  }

  async function startDashboard() {
    setStarting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/hermes/dashboard/start", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Hermes dashboard start failed");
      }

      setMessage(`${data.message} 잠시 후 상태 확인을 눌러주세요.`);
      setTimeout(loadStatus, 2500);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setStarting(false);
    }
  }

  function openDashboard() {
    const url =
      status && status.dashboardUrl
        ? status.dashboardUrl
        : config
          ? "http://" + config.dashboard.host + ":" + config.dashboard.port
          : "http://127.0.0.1:9119";

    window.open(url, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    loadStatus();
    loadInstallLog();

    const timer = setInterval(function () {
      loadInstallLog();
    }, 5000);

    return function () {
      clearInterval(timer);
    };
  }, []);

  const hermesFound = Boolean(status && status.portableHermes && status.portableHermes.ok);
  const dashboardRunning = Boolean(status && status.dashboard && status.dashboard.ok);
  const paths =
    status && status.portableHermes && status.portableHermes.paths
      ? status.portableHermes.paths
      : null;

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
          marginBottom: 18
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Hermes Dashboard Bridge</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            Hermes는 Mamabot 폴더의 runtime/hermes 아래에 설치됩니다. 실행 시마다 현재
            Mamabot 위치를 WSL 경로로 자동 변환합니다.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={loadStatus}
            disabled={loading || starting || installing}
            style={{
              border: "1px solid #d1d5db",
              background: "#111827",
              color: "#ffffff",
              borderRadius: 10,
              padding: "10px 13px",
              fontWeight: 900,
              cursor: loading || starting || installing ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "확인 중..." : "상태 확인"}
          </button>

          <button
            onClick={installHermesWsl}
            disabled={installing}
            style={{
              border: "none",
              background: "#7c3aed",
              color: "#ffffff",
              borderRadius: 10,
              padding: "10px 13px",
              fontWeight: 900,
              cursor: installing ? "not-allowed" : "pointer"
            }}
          >
            {installing ? "설치 요청 중..." : "Portable Hermes 설치"}
          </button>

          <button
            onClick={startDashboard}
            disabled={starting || !hermesFound}
            style={{
              border: "none",
              background: hermesFound ? "#2563eb" : "#d1d5db",
              color: hermesFound ? "#ffffff" : "#6b7280",
              borderRadius: 10,
              padding: "10px 13px",
              fontWeight: 900,
              cursor: starting || !hermesFound ? "not-allowed" : "pointer"
            }}
          >
            {starting ? "실행 요청 중..." : "Dashboard 실행"}
          </button>

          <button
            onClick={openDashboard}
            style={{
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              borderRadius: 10,
              padding: "10px 13px",
              fontWeight: 900,
              cursor: "pointer"
            }}
          >
            Dashboard 열기
          </button>
        </div>
      </div>

      {message ? (
        <div style={{ padding: 12, borderRadius: 12, background: "#dcfce7", color: "#166534", marginBottom: 12, fontSize: 13, wordBreak: "break-all" }}>
          {message}
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: 12, borderRadius: 12, background: "#fee2e2", color: "#991b1b", marginBottom: 12, fontSize: 13, wordBreak: "break-all" }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 15, background: "#f9fafb" }}>
          <h3 style={{ marginTop: 0 }}>Dashboard Status</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge ok={dashboardRunning} text={dashboardRunning ? "RUNNING" : "STOPPED"} />
            <span style={{ color: "#4b5563", wordBreak: "break-all" }}>
              {status ? status.dashboardUrl : "http://127.0.0.1:9119"}
            </span>
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 15, background: "#f9fafb" }}>
          <h3 style={{ marginTop: 0 }}>Portable Hermes</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge ok={hermesFound} text={hermesFound ? "FOUND" : "NOT FOUND"} />
            <span style={{ color: "#4b5563", wordBreak: "break-all" }}>
              {status && status.portableHermes ? status.portableHermes.result : "-"}
            </span>
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 15, background: "#f9fafb" }}>
          <h3 style={{ marginTop: 0 }}>Run Mode</h3>
          <div style={{ color: "#4b5563" }}>{config ? config.mode : "-"}</div>
        </div>
      </div>

      {paths ? (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: "#f9fafb", color: "#374151", fontSize: 13, lineHeight: 1.7, wordBreak: "break-all" }}>
          <strong>Portable Path Mapping</strong>
          <div>Windows: {paths.portableRootWin}</div>
          <div>WSL: {paths.portableRootWsl}</div>
          <div>Hermes Home: {paths.hermesHomeWsl}</div>
          <div>Hermes Install Dir: {paths.hermesInstallDirWsl}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: "#eff6ff", color: "#1e3a8a", fontSize: 13, lineHeight: 1.7 }}>
        이 방식은 /mnt/f/test/mamabot 같은 경로를 하드코딩하지 않습니다. Mamabot이 어느
        드라이브로 이동해도 실행 시점에 WSL 경로를 다시 계산합니다.
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 style={{ margin: "0 0 10px" }}>Install Log</h3>
        <pre
          style={{
            margin: 0,
            background: "#0f172a",
            color: "#d1fae5",
            borderRadius: 14,
            padding: 16,
            minHeight: 260,
            maxHeight: 420,
            overflow: "auto",
            fontSize: 13,
            lineHeight: 1.6
          }}
        >
          {installLog || "아직 설치 로그가 없습니다."}
        </pre>
      </div>

      <HermesNativeMirrorPanel />
    </section>
  );
}