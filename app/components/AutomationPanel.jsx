"use client";

import { useState } from "react";
import CronPanel from "./CronPanel.jsx";
import WorkflowTemplatesPanel from "./WorkflowTemplatesPanel.jsx";

export default function AutomationPanel() {
  const [tab, setTab] = useState("cron");

  const tabs = [
    { id: "cron", label: "Cron Jobs" },
    { id: "workflow", label: "Workflow Templates" }
  ];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
          {"\uC790\uB3D9\uD654"}
        </h2>
        <p style={{ margin: "6px 0 0", color: "#6b7280", lineHeight: 1.55 }}>
          {"Cron\uACFC Workflow\uB97C \uD558\uB098\uC758 \uC790\uB3D9\uD654 \uC601\uC5ED\uC73C\uB85C \uBB36\uC5B4 \uAD00\uB9AC\uD569\uB2C8\uB2E4."}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
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
      </div>

      {tab === "cron" ? <CronPanel /> : null}
      {tab === "workflow" ? <WorkflowTemplatesPanel /> : null}
    </div>
  );
}
