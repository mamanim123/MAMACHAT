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

function getJobId(job) {
  return job.id || job.job_id || job.name || job.key || "";
}

function getJobStatus(job) {
  return String(job.status || job.state || (job.paused ? "paused" : "active"));
}

export default function CronPanel() {
  const [jobs, setJobs] = useState(null);
  const [status, setStatus] = useState(null);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [schedule, setSchedule] = useState("RRULE:FREQ=DAILY;BYHOUR=9;BYMINUTE=0;BYSECOND=0");
  const [deliver, setDeliver] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function fetchJson(url, options) {
    const res = await fetch(url, {
      cache: "no-store",
      ...(options || {})
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(text || `${res.status} ${res.statusText}`);
    }

    return text ? JSON.parse(text) : {};
  }

  async function loadJobs() {
    setLoading(true);
    setError("");

    try {
      const [statusData, jobsData] = await Promise.all([
        fetchJson("/api/hermes/native/status"),
        fetchJson("/api/hermes/native/cron/jobs")
      ]);

      setStatus(statusData);
      setJobs(jobsData);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function createJob() {
    if (!prompt.trim()) {
      setError("Prompt를 입력해야 합니다.");
      return;
    }

    if (!schedule.trim()) {
      setError("Schedule을 입력해야 합니다.");
      return;
    }

    setCreating(true);
    setError("");
    setMessage("");

    try {
      const body = {
        prompt: prompt.trim(),
        schedule: schedule.trim()
      };

      if (name.trim()) {
        body.name = name.trim();
      }

      if (deliver.trim()) {
        body.deliver = deliver.trim();
      }

      await fetchJson("/api/hermes/native/cron/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      setMessage("Cron job이 생성되었습니다.");
      setName("");
      setPrompt("");
      await loadJobs();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setCreating(false);
    }
  }

  async function runJobAction(job, action) {
    const id = getJobId(job);

    if (!id) {
      setError("Job id를 찾지 못했습니다.");
      return;
    }

    const label = action === "trigger" ? "실행" : action;

    if (action === "delete") {
      const ok = window.confirm(`Delete cron job?\n${id}`);
      if (!ok) return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (action === "delete") {
        await fetchJson(`/api/hermes/native/cron/jobs/${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
      } else {
        await fetchJson(`/api/hermes/native/cron/jobs/${encodeURIComponent(id)}/${action}`, {
          method: "POST"
        });
      }

      setMessage(`Cron job ${label} 완료: ${id}`);
      await loadJobs();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  const jobItems = useMemo(() => {
    if (!jobs) return [];
    if (Array.isArray(jobs)) return jobs;
    if (Array.isArray(jobs.jobs)) return jobs.jobs;
    if (Array.isArray(jobs.value)) return jobs.value;
    return [];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return jobItems;

    return jobItems.filter((job) => {
      const raw = JSON.stringify(job).toLowerCase();
      return raw.includes(q);
    });
  }, [jobItems, query]);

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
          <h2 style={{ margin: 0, fontSize: 24 }}>Hermes Automations / Cron</h2>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            Mamabot 3200에서 Hermes Cron API를 불러와 자동화 작업을 관리합니다.
          </p>
        </div>

        <button
          onClick={loadJobs}
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
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
          <div style={{ marginBottom: 7 }}>
            <Badge tone={status ? "good" : "warn"}>{status ? "CONNECTED" : "WAITING"}</Badge>
          </div>
          <div style={{ color: "#374151", fontSize: 13 }}>
            Hermes {status ? status.version : "-"} / Jobs: {jobItems.length}
          </div>
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
            Search Jobs
          </label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cron jobs..."
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              boxSizing: "border-box"
            }}
          />
        </div>
      </div>

      {message ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "#dcfce7",
            color: "#166534",
            marginBottom: 14,
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
          display: "grid",
          gridTemplateColumns: "minmax(320px, 430px) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start"
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 16,
            background: "#f9fafb"
          }}
        >
          <h3 style={{ margin: "0 0 12px" }}>Create Cron Job</h3>

          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Name optional
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="daily-summary"
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              boxSizing: "border-box",
              marginBottom: 12
            }}
          />

          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Tell me to check today's project status."
            rows={5}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              boxSizing: "border-box",
              marginBottom: 12,
              resize: "vertical"
            }}
          />

          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Schedule
          </label>
          <textarea
            value={schedule}
            onChange={(event) => setSchedule(event.target.value)}
            rows={3}
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              boxSizing: "border-box",
              marginBottom: 12,
              resize: "vertical",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
            }}
          />

          <label style={{ display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 }}>
            Deliver optional
          </label>
          <input
            value={deliver}
            onChange={(event) => setDeliver(event.target.value)}
            placeholder="dashboard"
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "9px 10px",
              boxSizing: "border-box",
              marginBottom: 12
            }}
          />

          <button
            onClick={createJob}
            disabled={creating}
            style={{
              width: "100%",
              border: "none",
              background: creating ? "#9ca3af" : "#2563eb",
              color: "#ffffff",
              borderRadius: 10,
              padding: "11px 13px",
              fontWeight: 900,
              cursor: creating ? "not-allowed" : "pointer"
            }}
          >
            {creating ? "Creating..." : "Create Job"}
          </button>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            background: "#ffffff",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid #e5e7eb",
              fontWeight: 900
            }}
          >
            Cron Jobs
          </div>

          <div style={{ maxHeight: "calc(100vh - 330px)", overflow: "auto" }}>
            {filteredJobs.length === 0 ? (
              <div style={{ padding: 18, color: "#6b7280", lineHeight: 1.6 }}>
                No cron jobs yet.
              </div>
            ) : (
              filteredJobs.map((job, index) => {
                const id = getJobId(job) || String(index);
                const jobStatus = getJobStatus(job);
                const paused = jobStatus.toLowerCase().includes("pause") || job.paused;

                return (
                  <div
                    key={id}
                    style={{
                      padding: 14,
                      borderBottom: "1px solid #e5e7eb",
                      display: "grid",
                      gap: 10
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "flex-start"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, color: "#111827" }}>
                          {job.name || job.title || id}
                        </div>
                        <div style={{ color: "#6b7280", fontSize: 12, wordBreak: "break-all" }}>
                          {id}
                        </div>
                      </div>

                      <Badge tone={paused ? "warn" : "good"}>{jobStatus}</Badge>
                    </div>

                    <div style={{ color: "#374151", fontSize: 13, lineHeight: 1.6 }}>
                      <strong>Schedule:</strong> {job.schedule || job.rrule || "-"}
                    </div>

                    <div style={{ color: "#374151", fontSize: 13, lineHeight: 1.6 }}>
                      <strong>Prompt:</strong> {job.prompt || "-"}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => runJobAction(job, "trigger")}
                        style={{
                          border: "1px solid #bfdbfe",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          borderRadius: 10,
                          padding: "8px 10px",
                          fontWeight: 900,
                          cursor: "pointer"
                        }}
                      >
                        Trigger
                      </button>

                      {paused ? (
                        <button
                          onClick={() => runJobAction(job, "resume")}
                          style={{
                            border: "1px solid #bbf7d0",
                            background: "#f0fdf4",
                            color: "#166534",
                            borderRadius: 10,
                            padding: "8px 10px",
                            fontWeight: 900,
                            cursor: "pointer"
                          }}
                        >
                          Resume
                        </button>
                      ) : (
                        <button
                          onClick={() => runJobAction(job, "pause")}
                          style={{
                            border: "1px solid #fde68a",
                            background: "#fffbeb",
                            color: "#92400e",
                            borderRadius: 10,
                            padding: "8px 10px",
                            fontWeight: 900,
                            cursor: "pointer"
                          }}
                        >
                          Pause
                        </button>
                      )}

                      <button
                        onClick={() => runJobAction(job, "delete")}
                        style={{
                          border: "1px solid #fecaca",
                          background: "#fff1f2",
                          color: "#991b1b",
                          borderRadius: 10,
                          padding: "8px 10px",
                          fontWeight: 900,
                          cursor: "pointer"
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}