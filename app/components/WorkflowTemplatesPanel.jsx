"use client";

import { useEffect, useState } from "react";

const TXT = {
  title: "\uC6CC\uD06C\uD50C\uB85C\uC6B0",
  subtitle: "\uBC18\uBCF5\uB418\uB294 \uC791\uC5C5\uC744 \uBD84\uC11D \u2192 \uACC4\uD68D \u2192 \uD328\uCE58 \u2192 \uB9AC\uBDF0 \u2192 \uC2B9\uC778 \uD750\uB984\uC73C\uB85C \uC815\uB9AC\uD569\uB2C8\uB2E4.",
  refresh: "\uC0C8\uB85C\uACE0\uCE68",
  loading: "\uBD88\uB7EC\uC624\uB294 \uC911...",
  copyPrompt: "\uD504\uB86C\uD504\uD2B8 \uBCF5\uC0AC",
  copied: "\uBCF5\uC0AC \uC644\uB8CC",
  sendToWorkbench: "\uC791\uC5C5\uB300\uB85C \uBCF4\uB0B4\uAE30",
  noTemplates: "\uB4F1\uB85D\uB41C \uC6CC\uD06C\uD50C\uB85C\uC6B0 \uD15C\uD50C\uB9BF\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  selectHint: "\uC67C\uCABD\uC5D0\uC11C \uD15C\uD50C\uB9BF\uC744 \uC120\uD0DD\uD558\uBA74 \uB2E8\uACC4\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4.",
  goalPlaceholder: "\uC774\uBC88 \uC791\uC5C5 \uBAA9\uD45C\uB97C \uC801\uC5B4\uC8FC\uC138\uC694. \uC608: \uC2E4\uD589 \uC774\uB825 \uAC80\uC0C9 UX\uB97C \uC815\uB9AC\uD574\uC918.",
  workspacePlaceholder: "\uC791\uC5C5 \uD3F4\uB354 \uACBD\uB85C",
  bestFor: "\uC801\uD569\uD55C \uC791\uC5C5",
  output: "\uC0B0\uCD9C\uBB3C",
  steps: "\uB2E8\uACC4"
};

function badgeStyle(role) {
  if (role === "Architect") return { bg: "#dbeafe", color: "#1d4ed8" };
  if (role === "Builder") return { bg: "#dcfce7", color: "#166534" };
  if (role === "Reviewer") return { bg: "#fef3c7", color: "#92400e" };
  if (role === "User") return { bg: "#fce7f3", color: "#be185d" };
  return { bg: "#f3f4f6", color: "#374151" };
}

export default function WorkflowTemplatesPanel() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [goal, setGoal] = useState("");
  const [workspaceRoot, setWorkspaceRoot] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function loadTemplates() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/workflows/templates", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "workflow templates load failed");
      }

      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);

      if (!selectedId && nextItems[0]) {
        openTemplate(nextItems[0].id);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkspace() {
    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      const data = await res.json();
      setWorkspaceRoot(data?.config?.currentWorkspace || "");
    } catch {
      setWorkspaceRoot("");
    }
  }

  async function openTemplate(templateId) {
    setSelectedId(templateId);
    setCopied(false);
    setError("");

    try {
      const res = await fetch("/api/workflows/templates/" + encodeURIComponent(templateId), {
        cache: "no-store"
      });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "workflow template detail load failed");
      }

      setDetail(data.template || null);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function copyPrompt() {
    if (!selectedId) return;

    try {
      const res = await fetch("/api/workflows/templates/" + encodeURIComponent(selectedId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, workspaceRoot })
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "workflow prompt build failed");
      }

      const promptText = String(data.prompt || "").replaceAll("\\n", "\n");
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function sendToWorkbench() {
    if (!selectedId) return;

    try {
      const res = await fetch("/api/workflows/templates/" + encodeURIComponent(selectedId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, workspaceRoot })
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "workflow prompt build failed");
      }

      const nextPrompt = String(data.prompt || "").replaceAll("\\n", "\n");

      if (typeof window !== "undefined") {
        window.localStorage.setItem("mamabot.pendingWorkbenchPrompt", nextPrompt);

        window.dispatchEvent(
          new CustomEvent("mamabot:send-to-workbench", {
            detail: { prompt: nextPrompt }
          })
        );

        window.setTimeout(() => {
          window.location.reload();
        }, 120);
      }
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  useEffect(() => {
    loadWorkspace();
    loadTemplates();
  }, []);

  return (
    <section style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#111827" }}>{TXT.title}</h2>
          <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 13 }}>{TXT.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={loadTemplates}
          disabled={loading}
          style={{ border: "1px solid #d1d5db", background: "#f9fafb", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? TXT.loading : TXT.refresh}
        </button>
      </div>

      {error ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.9fr) minmax(460px, 1.5fr)", gap: 12 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          {items.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: "#6b7280" }}>{TXT.noTemplates}</div>
          ) : null}

          {items.map((item) => {
            const active = selectedId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openTemplate(item.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  borderBottom: "1px solid #f3f4f6",
                  background: active ? "#eff6ff" : "#ffffff",
                  padding: "12px 13px",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 950, color: "#111827" }}>{item.title}</div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 5, lineHeight: 1.45 }}>{item.summary}</div>
                <div style={{ color: "#2563eb", fontSize: 11, marginTop: 7, fontWeight: 800 }}>
                  {TXT.steps} {item.stepCount}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa", padding: 12 }}>
          {!detail ? (
            <div style={{ fontSize: 13, color: "#6b7280" }}>{TXT.selectHint}</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 950, color: "#111827" }}>{detail.title}</div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>{detail.summary}</div>
                </div>

                <button
                  type="button"
                  onClick={copyPrompt}
                  style={{ border: "none", background: copied ? "#16a34a" : "#111827", color: "#ffffff", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 900, cursor: "pointer" }}
                >
                  {copied ? TXT.copied : TXT.copyPrompt}
                </button>

                <button
                  type="button"
                  onClick={sendToWorkbench}
                  style={{ border: "1px solid #2563eb", background: "#eff6ff", color: "#1d4ed8", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 900, cursor: "pointer" }}
                >
                  {TXT.sendToWorkbench}
                </button>
              </div>

              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                <textarea
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder={TXT.goalPlaceholder}
                  style={{ width: "100%", minHeight: 74, boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 8, padding: 9, resize: "vertical", fontSize: 13 }}
                />
                <input
                  value={workspaceRoot}
                  onChange={(event) => setWorkspaceRoot(event.target.value)}
                  placeholder={TXT.workspacePlaceholder}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 8, padding: 8, fontSize: 12 }}
                />
              </div>

              {Array.isArray(detail.bestFor) && detail.bestFor.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {detail.bestFor.map((tag) => (
                    <span key={tag} style={{ background: "#eef2ff", color: "#3730a3", borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 850 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 8 }}>
                {(detail.steps || []).map((step, index) => {
                  const c = badgeStyle(step.role);

                  return (
                    <div key={step.key || index} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ color: "#6b7280", fontSize: 12, fontWeight: 900 }}>{index + 1}</span>
                        <strong style={{ color: "#111827", fontSize: 13 }}>{step.title}</strong>
                        <span style={{ marginLeft: "auto", background: c.bg, color: c.color, borderRadius: 999, padding: "2px 7px", fontSize: 11, fontWeight: 900 }}>
                          {step.role}
                        </span>
                      </div>
                      <div style={{ color: "#374151", fontSize: 12, lineHeight: 1.45 }}>{step.goal}</div>
                      <div style={{ color: "#6b7280", fontSize: 11, marginTop: 5 }}>
                        {TXT.output}: {step.output}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
