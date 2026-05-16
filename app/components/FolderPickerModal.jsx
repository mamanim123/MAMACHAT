"use client";

import { useEffect, useState } from "react";

export default function FolderPickerModal({ open, onClose, onSelect }) {
  const [currentPath, setCurrentPath] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadPath(pathValue) {
    setLoading(true);
    setError("");

    try {
      const query = pathValue ? "?path=" + encodeURIComponent(pathValue) : "";
      const res = await fetch("/api/filesystem" + query, {
        cache: "no-store"
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Folder load failed");
      }

      setCurrentPath(data.currentPath || "");
      setParentPath(data.parentPath || "");
      setEntries(data.entries || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadPath("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <div
        style={{
          width: "min(860px, 96vw)",
          maxHeight: "84vh",
          background: "#ffffff",
          borderRadius: 18,
          boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            padding: 18,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center"
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>작업폴더 찾기</h2>
            <div
              style={{
                marginTop: 5,
                color: "#6b7280",
                fontSize: 13,
                wordBreak: "break-all"
              }}
            >
              {currentPath || "드라이브를 선택하세요."}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: "1px solid #d1d5db",
              background: "#ffffff",
              borderRadius: 10,
              padding: "8px 11px",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            닫기
          </button>
        </div>

        <div
          style={{
            padding: 14,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <button
            onClick={() => loadPath("")}
            style={{
              border: "none",
              background: "#111827",
              color: "#ffffff",
              borderRadius: 10,
              padding: "9px 12px",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            드라이브
          </button>

          {parentPath ? (
            <button
              onClick={() => loadPath(parentPath)}
              style={{
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                borderRadius: 10,
                padding: "9px 12px",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              상위 폴더
            </button>
          ) : null}

          {currentPath ? (
            <button
              onClick={() => onSelect(currentPath)}
              style={{
                marginLeft: "auto",
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: 10,
                padding: "9px 13px",
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              이 폴더 선택
            </button>
          ) : null}
        </div>

        {error ? (
          <div
            style={{
              margin: 14,
              padding: 12,
              borderRadius: 12,
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: 13
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            padding: 14,
            overflow: "auto",
            minHeight: 320
          }}
        >
          {loading ? (
            <div style={{ color: "#6b7280" }}>불러오는 중...</div>
          ) : null}

          {!loading && entries.length === 0 ? (
            <div style={{ color: "#6b7280" }}>표시할 하위 폴더가 없습니다.</div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 10
            }}
          >
            {entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => loadPath(entry.path)}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  borderRadius: 12,
                  padding: 13,
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 5 }}>
                  {entry.type === "drive" ? "▣ " : "📁 "}
                  {entry.name}
                </div>
                <div
                  style={{
                    color: "#6b7280",
                    fontSize: 12,
                    wordBreak: "break-all"
                  }}
                >
                  {entry.path}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}