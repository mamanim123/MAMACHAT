import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPortableRoot } from "./portablePaths.js";

function getSessionsDir() {
  const root = getPortableRoot();
  const dir = path.join(root, "runtime", "hermes", "sessions");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getIndexPath() {
  const dir = path.join(getSessionsDir(), "index");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "sessions-index.json");
}

function safeSessionId(sessionId) {
  return String(sessionId || "").replace(/[^a-zA-Z0-9_.-]/g, "");
}

function isValidSessionId(sessionId) {
  const safe = safeSessionId(sessionId);
  return /^[a-zA-Z0-9_.-]+$/.test(safe) && safe.length >= 3 && safe.length <= 120;
}

function getSessionFilePath(sessionId) {
  return path.join(getSessionsDir(), safeSessionId(sessionId) + ".json");
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function readIndex() {
  const parsed = readJson(getIndexPath(), []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeIndex(items) {
  writeJson(getIndexPath(), items);
}

function sortNewestFirst(items) {
  return [...items].sort((a, b) => {
    const at = Date.parse(a.updatedAt || a.createdAt || "") || 0;
    const bt = Date.parse(b.updatedAt || b.createdAt || "") || 0;
    return bt - at;
  });
}

function summarize(text, max = 120) {
  const value = String(text || "").trim().replace(/\s+/g, " ");
  if (!value) return "";
  if (value.length <= max) return value;
  return value.slice(0, max) + "...";
}

function makeSessionTitle(prompt, title) {
  const explicit = String(title || "").trim();
  if (explicit) return summarize(explicit, 80);

  const fromPrompt = summarize(prompt, 60);
  return fromPrompt || "Untitled work session";
}

function makeSessionRecord(input = {}) {
  const now = new Date().toISOString();
  const sessionId =
    input.sessionId ||
    "session-" +
      now.replace(/[-:.TZ]/g, "").slice(0, 14) +
      "-" +
      crypto.randomBytes(3).toString("hex");

  return {
    sessionId,
    title: makeSessionTitle(input.prompt, input.title),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    workspaceRoot: input.workspaceRoot || "",
    status: input.status || "active",

    memory: {
      summary:
        input.memory?.summary ||
        "This session stores conversation, runs, changes, and next steps for one work thread.",
      currentGoal: input.memory?.currentGoal || summarize(input.prompt, 160),
      decisions: Array.isArray(input.memory?.decisions) ? input.memory.decisions : [],
      nextActions: Array.isArray(input.memory?.nextActions)
        ? input.memory.nextActions
        : ["Continue from the latest saved run in this session."],
      knownRisks: Array.isArray(input.memory?.knownRisks)
        ? input.memory.knownRisks
        : [
            "Inspect exact files before patching.",
            "Create a targeted backup before edits.",
            "Do not expose sensitive files or API keys.",
            "Do not install CLI tools into the selected workspace."
          ]
    },

    messages: Array.isArray(input.messages) ? input.messages : [],
    runs: Array.isArray(input.runs) ? input.runs : [],
    changes: Array.isArray(input.changes) ? input.changes : []
  };
}

function makeIndexEntry(session) {
  return {
    sessionId: session.sessionId,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    workspaceRoot: session.workspaceRoot,
    status: session.status,
    runCount: Array.isArray(session.runs) ? session.runs.length : 0,
    messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
    currentGoal: session.memory?.currentGoal || ""
  };
}

function saveSessionRecord(session) {
  const full = makeSessionRecord(session);
  const filePath = getSessionFilePath(full.sessionId);
  writeJson(filePath, full);

  const index = readIndex().filter((item) => item.sessionId !== full.sessionId);
  index.unshift(makeIndexEntry(full));
  writeIndex(sortNewestFirst(index).slice(0, 500));

  return full;
}

export function listSessions(options = {}) {
  const limitRaw = Number(options.limit || 50);
  const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 50, 200));
  const query = String(options.query || "").trim().toLowerCase();

  let items = sortNewestFirst(readIndex());

  if (query) {
    items = items.filter((item) => {
      return [
        item.sessionId,
        item.title,
        item.workspaceRoot,
        item.status,
        item.currentGoal
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }

  return items.slice(0, limit);
}

export function createSession(input = {}) {
  return saveSessionRecord(makeSessionRecord(input));
}

export function getSession(sessionId) {
  const safe = safeSessionId(sessionId);
  if (!isValidSessionId(safe)) return null;

  const record = readJson(getSessionFilePath(safe), null);
  if (!record) return null;

  return makeSessionRecord(record);
}

export function updateSession(sessionId, patch = {}) {
  const current = getSession(sessionId);
  if (!current) return null;

  const next = makeSessionRecord({
    ...current,
    ...patch,
    sessionId: current.sessionId,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
    memory: {
      ...current.memory,
      ...(patch.memory || {})
    },
    messages: patch.messages || current.messages,
    runs: patch.runs || current.runs,
    changes: patch.changes || current.changes
  });

  return saveSessionRecord(next);
}

export function deleteSession(sessionId) {
  const safe = safeSessionId(sessionId);
  if (!isValidSessionId(safe)) return false;

  const filePath = getSessionFilePath(safe);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  const index = readIndex().filter((item) => item.sessionId !== safe);
  writeIndex(index);

  return true;
}

export function ensureSession(input = {}) {
  const existing = input.sessionId ? getSession(input.sessionId) : null;

  if (existing) {
    if (input.workspaceRoot && !existing.workspaceRoot) {
      return updateSession(existing.sessionId, { workspaceRoot: input.workspaceRoot });
    }
    return existing;
  }

  return createSession(input);
}

export function appendRunToSession(sessionId, run = {}) {
  const session = getSession(sessionId);
  if (!session) return null;

  const now = new Date().toISOString();

  const messages = Array.isArray(session.messages) ? [...session.messages] : [];
  const runs = Array.isArray(session.runs) ? [...session.runs] : [];
  const changes = Array.isArray(session.changes) ? [...session.changes] : [];

  if (run.runId && !runs.includes(run.runId)) {
    runs.push(run.runId);
  }

  if (run.prompt) {
    messages.push({
      role: "user",
      content: run.prompt,
      runId: run.runId || "",
      createdAt: now
    });
  }

  const assistantContent =
    run.output ||
    run.error ||
    run.stderr ||
    (run.status === "dryrun" ? "Dry-run plan saved." : "");

  const assistantMemoryContent =
    run.compressedOutput ||
    run.outputCompression?.compressed ||
    assistantContent;

  if (assistantContent) {
    messages.push({
      role: "assistant",
      content: assistantContent,
      compressedContent: assistantMemoryContent,
      outputCompression: run.outputCompression || null,
      runId: run.runId || "",
      createdAt: now
    });
  }

  if (run.changedFiles && Array.isArray(run.changedFiles) && run.changedFiles.length > 0) {
    changes.push({
      runId: run.runId || "",
      createdAt: now,
      files: run.changedFiles,
      summary: run.changeSummary || ""
    });
  }

  const nextMemory = {
    ...session.memory,
    currentGoal: summarize(run.prompt || session.memory?.currentGoal || "", 180),
    nextActions: [
      "Open this session from the hover sidebar and continue from the latest run.",
      ...(Array.isArray(session.memory?.nextActions) ? session.memory.nextActions.slice(0, 4) : [])
    ]
  };

  return updateSession(session.sessionId, {
    updatedAt: now,
    memory: nextMemory,
    messages: messages.slice(-60),
    runs: runs.slice(-100),
    changes: changes.slice(-100)
  });
}

export function buildSessionPrompt(prompt, session) {
  if (!session?.sessionId) return prompt;

  const memory = session.memory || {};
  const recentMessages = Array.isArray(session.messages) ? session.messages.slice(-8) : [];

  const memoryBlock = [
    "[SESSION MEMORY]",
    "Session title: " + (session.title || ""),
    "Current goal: " + (memory.currentGoal || ""),
    "Summary: " + (memory.summary || ""),
    "",
    "Decisions:",
    ...(Array.isArray(memory.decisions) && memory.decisions.length
      ? memory.decisions.map((item) => "- " + item)
      : ["- None yet."]),
    "",
    "Next actions:",
    ...(Array.isArray(memory.nextActions) && memory.nextActions.length
      ? memory.nextActions.map((item) => "- " + item)
      : ["- Continue from the latest saved run."]),
    "",
    "Known risks:",
    ...(Array.isArray(memory.knownRisks) && memory.knownRisks.length
      ? memory.knownRisks.map((item) => "- " + item)
      : ["- Inspect exact files before patching."]),
    "",
    "[RECENT CONVERSATION]",
    ...(recentMessages.length
      ? recentMessages.map((msg) => {
          const role = msg.role === "assistant" ? "Assistant" : "User";
          return role + ": " + summarize(msg.compressedContent || msg.content, 500);
        })
      : ["No previous messages in this session."]),
    "",
    "[CURRENT USER REQUEST]",
    prompt
  ];

  return memoryBlock.join("\n");
}
