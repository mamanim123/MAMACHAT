"use client";

import { useEffect, useState } from "react";
import FolderPickerModal from "./FolderPickerModal.jsx";

export default function WorkspaceSelector() {
  const [workspacePath, setWorkspacePath] = useState("");
  const [currentWorkspace, setCurrentWorkspace] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function loadWorkspace() {
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Workspace load failed");
      }

      const current =
        data.config && data.config.currentWorkspace
          ? data.config.currentWorkspace
          : "";

      setCurrentWorkspace(current);
      setWorkspacePath(current);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function saveWorkspace(pathOverride) {
    const target = pathOverride || workspacePath;
    const trimmed = target.trim();

    if (!trimmed) {
      setError("작업 폴더 경로를 입력하세요.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspacePath: trimmed
        })
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Workspace save failed");
      }

      setWorkspacePath(data.config.currentWorkspace);
      setCurrentWorkspace(data.config.currentWorkspace);
      setMessage(".hermes-workspace 생성/확인 완료: " + data.hermesWorkspacePath);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleSelectFolder(folderPath) {
    setPickerOpen(false);
    setWorkspacePath(folderPath);
    saveWorkspace(folderPath);
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

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
      <h2 style={{ margin: 0, fontSize: 24 }}>작업 폴더 선택</h2>
      <p style={{ margin: "8px 0 18px", color: "#6b7280", lineHeight: 1.6 }}>
        Hermes가 실제로 작업할 폴더를 지정합니다. Mamabot 런타임은 건드리지 않고,
        선택한 작업 폴더에는 .hermes-workspace만 생성합니다.
      </p>

      <div
        style={{
          padding: 14,
          borderRadius: 14,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          marginBottom: 16
        }}
      >
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 5 }}>
          현재 작업 폴더
        </div>
        <strong style={{ wordBreak: "break-all" }}>
          {currentWorkspace || "아직 선택되지 않음"}
        </strong>
      </div>

      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 900,
          marginBottom: 8
        }}
      >
        작업 폴더 경로
      </label>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={workspacePath}
          onChange={(event) => setWorkspacePath(event.target.value)}
          placeholder="예: F:\test\mama-v1.2"
          style={{
            flex: 1,
            border: "1px solid #d1d5db",
            borderRadius: 10,
            padding: "11px 12px",
            fontSize: 14
          }}
        />

        <button
          onClick={() => setPickerOpen(true)}
          style={{
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "0 14px",
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          찾아보기
        </button>

        <button
          onClick={() => saveWorkspace()}
          disabled={loading}
          style={{
            border: "none",
            background: loading ? "#9ca3af" : "#111827",
            color: "#ffffff",
            borderRadius: 10,
            padding: "0 16px",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "저장 중..." : "저장"}
        </button>
      </div>

      <div style={{ marginTop: 12, color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
        다른 PC로 이동해도 Mamabot 위치는 실행 시점에 다시 계산됩니다. 작업 폴더 경로만
        현재 PC 기준으로 다시 선택하면 됩니다.
      </div>

      {message ? (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            background: "#dcfce7",
            color: "#166534",
            fontSize: 13,
            wordBreak: "break-all"
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: 13,
            wordBreak: "break-all"
          }}
        >
          {error}
        </div>
      ) : null}

      <FolderPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectFolder}
      />
    </section>
  );
}