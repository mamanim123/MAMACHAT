"use client";

import { useEffect, useMemo, useState } from "react";

function Badge({ tone = "good", children }) {
  const colors = {
    good: { bg: "#dcfce7", color: "#166534" },
    warn: { bg: "#fef3c7", color: "#92400e" },
    bad: { bg: "#fee2e2", color: "#991b1b" },
    dark: { bg: "#111827", color: "#ffffff" }
  };

  const c = colors[tone] || colors.good;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 9px",
        borderRadius: 999,
        background: c.bg,
        color: c.color,
        fontSize: 12,
        fontWeight: 900
      }}
    >
      {children}
    </span>
  );
}

export default function SkillsPanel() {
  const [skills, setSkills] = useState(null);
  const [status, setStatus] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [enabledFilter, setEnabledFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    if (!res.ok) {
      throw new Error(text || `${res.status} ${res.statusText}`);
    }

    return JSON.parse(text);
  }

  async function loadSkills() {
    setLoading(true);
    setError("");

    try {
      const [statusData, skillsData] = await Promise.all([
        fetchJson("/api/hermes/native/status"),
        fetchJson("/api/hermes/native/skills")
      ]);

      setStatus(statusData);
      setSkills(skillsData);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSkills();
  }, []);

  const skillItems = useMemo(() => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (Array.isArray(skills.value)) return skills.value;
    return [];
  }, [skills]);

  const categories = useMemo(() => {
    const set = new Set();

    for (const skill of skillItems) {
      set.add(skill.category || "uncategorized");
    }

    return ["ALL", ...Array.from(set).sort()];
  }, [skillItems]);

  const filteredSkills = useMemo(() => {
    const q = query.trim().toLowerCase();

    return skillItems.filter((skill) => {
      const name = String(skill.name || "").toLowerCase();
      const desc = String(skill.description || "").toLowerCase();
      const cat = skill.category || "uncategorized";

      if (q && !name.includes(q) && !desc.includes(q) && !String(cat).toLowerCase().includes(q)) {
        return false;
      }

      if (category !== "ALL" && cat !== category) {
        return false;
      }

      if (enabledFilter === "ON" && !skill.enabled) {
        return false;
      }

      if (enabledFilter === "OFF" && skill.enabled) {
        return false;
      }

      return true;
    });
  }, [skillItems, query, category, enabledFilter]);

  const enabledCount = skillItems.filter((skill) => skill.enabled).length;
  const disabledCount = skillItems.length - enabledCount;

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
          <h2 style={{ margin: 0, fontSize: 24 }}>Hermes Skills</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            Mamabot 3200에서 Hermes 공식 Skills API를 불러와 스킬 목록을 확인합니다.
          </p>
        </div>

        <button
          onClick={loadSkills}
          disabled={loading}
          style={{
            border: "none",
            background: loading ? "#9ca3af" : "#111827",
            color: "#ffffff",
            borderRadius: 10,
            padding: "10px 13px",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
          marginBottom: 16
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#f9fafb"
          }}
        >
          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Search
          </label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills..."
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#f9fafb"
          }}
        >
          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Category
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              background: "#ffffff"
            }}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#f9fafb"
          }}
        >
          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Enabled
          </label>
          <select
            value={enabledFilter}
            onChange={(event) => setEnabledFilter(event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              background: "#ffffff"
            }}
          >
            <option value="ALL">ALL</option>
            <option value="ON">ON</option>
            <option value="OFF">OFF</option>
          </select>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#f9fafb",
            display: "grid",
            gap: 7,
            alignContent: "center"
          }}
        >
          <div>
            <Badge tone={status ? "good" : "warn"}>{status ? "CONNECTED" : "WAITING"}</Badge>
          </div>
          <div style={{ color: "#374151", fontSize: 13 }}>
            Total: {skillItems.length} / ON: {enabledCount} / OFF: {disabledCount}
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "#fee2e2",
            color: "#991b1b",
            marginBottom: 14,
            fontSize: 13,
            wordBreak: "break-all"
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          overflow: "hidden",
          background: "#ffffff"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(180px, 240px) minmax(120px, 180px) 90px minmax(0, 1fr)",
            gap: 12,
            padding: "12px 14px",
            background: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
            fontSize: 13,
            fontWeight: 900,
            color: "#374151"
          }}
        >
          <div>Name</div>
          <div>Category</div>
          <div>Status</div>
          <div>Description</div>
        </div>

        <div style={{ maxHeight: "calc(100vh - 360px)", overflow: "auto" }}>
          {filteredSkills.length === 0 ? (
            <div style={{ padding: 18, color: "#6b7280" }}>No skills found.</div>
          ) : (
            filteredSkills.map((skill) => (
              <div
                key={skill.name}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(180px, 240px) minmax(120px, 180px) 90px minmax(0, 1fr)",
                  gap: 12,
                  padding: "13px 14px",
                  borderBottom: "1px solid #e5e7eb",
                  alignItems: "start"
                }}
              >
                <div style={{ fontWeight: 900, color: "#111827", wordBreak: "break-word" }}>
                  {skill.name}
                </div>
                <div style={{ color: "#4b5563", fontSize: 13, wordBreak: "break-word" }}>
                  {skill.category || "uncategorized"}
                </div>
                <div>
                  <Badge tone={skill.enabled ? "good" : "bad"}>
                    {skill.enabled ? "ON" : "OFF"}
                  </Badge>
                </div>
                <div style={{ color: "#4b5563", fontSize: 13, lineHeight: 1.5 }}>
                  {skill.description || "-"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}