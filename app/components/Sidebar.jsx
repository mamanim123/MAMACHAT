"use client";

import { useState } from "react";

const items = [
  { id: "dashboard", label: "\uC791\uC5C5\uB300", icon: "\u{1F3E0}" },
  { id: "history", label: "\uC2E4\uD589 \uC774\uB825", icon: "\u{1F5C2}\uFE0F" },
  { id: "sessions", label: "\uC138\uC158", icon: "\u{1F9F5}" },
  { id: "patches", label: "\uD328\uCE58 \uC2B9\uC778", icon: "\u{1F9E9}" },
  { id: "models", label: "\uBAA8\uB378 / \uC778\uC99D", icon: "\u{1F916}" },
  { id: "skills", label: "\uC2A4\uD0AC / \uD50C\uB7EC\uADF8\uC778", icon: "\u{1F6E0}\uFE0F" },
  { id: "automations", label: "\uC790\uB3D9\uD654", icon: "\u{23F1}\uFE0F" },
  { id: "logs", label: "\uB85C\uADF8", icon: "\u{1F4DC}" },
  { id: "hermes", label: "Hermes \uAD00\uB9AC", icon: "\u{1F9EC}" },
  { id: "portable", label: "\uD3EC\uD130\uBE14 \uC13C\uD130", icon: "\u{1F9F3}" },
  { id: "settings", label: "\uC124\uC815", icon: "\u{1F527}" }
];

export default function Sidebar({ activeTab, onChange }) {
  const [expanded, setExpanded] = useState(false);

  const width = expanded ? 250 : 72;

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width,
        background: "#0f172a",
        color: "#e5e7eb",
        minHeight: "100vh",
        padding: expanded ? 18 : "18px 10px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        transition: "width 160ms ease, padding 160ms ease",
        overflow: "hidden",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 40
      }}
    >
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 10,
          minHeight: 42
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "#2563eb",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            flex: "0 0 36px"
          }}
        >
          M
        </div>

        <div
          style={{
            opacity: expanded ? 1 : 0,
            width: expanded ? "auto" : 0,
            overflow: "hidden",
            whiteSpace: "nowrap",
            transition: "opacity 120ms ease, width 160ms ease"
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: -0.8,
              color: "#ffffff"
            }}
          >
            Mamabot
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            {"\uD3EC\uD130\uBE14 \uC5D0\uC774\uC804\uD2B8 \uC791\uC5C5\uB300"}
</div>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item) => {
          const active = activeTab === item.id;

          return (
            <button
              key={item.id}
              title={!expanded ? item.label : ""}
              onClick={() => onChange(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: expanded ? "flex-start" : "center",
                gap: expanded ? 10 : 0,
                width: "100%",
                border: "none",
                borderRadius: 12,
                padding: expanded ? "11px 12px" : "11px 0",
                textAlign: "left",
                cursor: "pointer",
                background: active ? "#2563eb" : "transparent",
                color: active ? "#ffffff" : "#cbd5e1",
                fontWeight: active ? 800 : 600,
                transition: "background 120ms ease, color 120ms ease"
              }}
            >
              <span
                style={{
                  width: 24,
                  minWidth: 24,
                  textAlign: "center",
                  color: active ? "#ffffff" : "#94a3b8",
                  fontSize: 17
                }}
              >
                {item.icon}
              </span>

              <span
                style={{
                  opacity: expanded ? 1 : 0,
                  width: expanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 120ms ease, width 160ms ease"
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: expanded ? 12 : 8,
          borderRadius: 14,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          textAlign: expanded ? "left" : "center",
          transition: "padding 160ms ease"
        }}
      >
        {expanded ? (
          <>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {"\uC8FC \uC2E4\uD589 \uD658\uACBD"}
</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>Mama Agent</div>
          </>
        ) : (
          <div title="Mama Agent" style={{ fontSize: 18 }}>\u26A1</div>
        )}
      </div>
    </aside>
  );
}
