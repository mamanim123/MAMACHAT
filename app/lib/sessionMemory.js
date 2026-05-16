import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_RECENT_TURNS = 6;
const MAX_TEXT_CHARS = 500;

function getMemoryRoot() {
  const dir = path.join(process.cwd(), "runtime", "session-memory");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeSessionId(sessionId = "") {
  const raw = String(sessionId || "").trim() || "default";
  return crypto.createHash("sha1").update(raw).digest("hex").slice(0, 24);
}

function getMemoryFile(sessionId) {
  return path.join(getMemoryRoot(), safeSessionId(sessionId) + ".json");
}

function stripSourceNoise(value) {
  return String(value || "")
    .replace(/\(\s*출처\s*:[^)]+\)/g, "")
    .replace(/\(\s*source\s*:[^)]+\)/gi, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/출처\s*:\s*[^\n]+/g, "")
    .trim();
}

function compact(value, max = MAX_TEXT_CHARS) {
  const text = stripSourceNoise(value).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + "...";
}

function blankMemory(sessionId) {
  return {
    version: 1,
    scope: "session",
    sessionId: String(sessionId || "default"),
    userDisplayName: "",
    preferences: [],
    recentTurns: [],
    updatedAt: null
  };
}

export function readSessionMemory(sessionId) {
  const file = getMemoryFile(sessionId);

  if (!fs.existsSync(file)) {
    return blankMemory(sessionId);
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      ...blankMemory(sessionId),
      ...data,
      sessionId: String(sessionId || data.sessionId || "default")
    };
  } catch {
    return blankMemory(sessionId);
  }
}

export function writeSessionMemory(sessionId, memory) {
  const next = {
    ...blankMemory(sessionId),
    ...memory,
    sessionId: String(sessionId || memory?.sessionId || "default"),
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(getMemoryFile(sessionId), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function cleanDisplayName(value) {
  return compact(value, 30)
    .replace(/[.?!,??"'????]/g, "")
    .trim();
}

function detectDisplayName(userText) {
  const text = String(userText || "").trim();

  const patterns = [
    /(?:\uC55E\uC73C\uB85C\s*)?\uB098\uB97C\s+(.{1,20}?)\s*(?:\uB77C\uACE0|\uC774\uB77C\uACE0)\s*\uBD88\uB7EC/u,
    /(?:\uC55E\uC73C\uB85C\s*)?\uB0B4\s*\uD638\uCE6D\uC740\s+(.{1,20})/u,
    /\uC55E\uC73C\uB85C\s+(.{1,20}?)\s*(?:\uB77C\uACE0|\uC774\uB77C\uACE0)\s*\uBD88\uB7EC/u,
    /call me\s+(.{1,30})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanDisplayName(match[1]);
    }
  }

  return "";
}

function inferDisplayNameFromMemory(memory) {
  if (memory?.userDisplayName) return memory.userDisplayName;

  const candidates = [];

  for (const pref of memory?.preferences || []) {
    candidates.push(pref);
  }

  for (const turn of memory?.recentTurns || []) {
    candidates.push(turn.user || "");
  }

  for (const item of candidates) {
    const detected = detectDisplayName(item);
    if (detected) return detected;
  }

  return "";
}

function hasRememberIntent(userText) {
  const text = String(userText || "");
  return (
    text.includes("\uAE30\uC5B5\uD574") ||
    text.includes("\uC55E\uC73C\uB85C") ||
    text.toLowerCase().includes("remember")
  );
}

export function buildSessionMemoryPack(sessionId) {
  const memory = readSessionMemory(sessionId);
  const userDisplayName = inferDisplayNameFromMemory(memory);

  return {
    scope: "session-only",
    sessionId: String(sessionId || "default"),
    userDisplayName,
    preferences: Array.isArray(memory.preferences) ? memory.preferences.slice(0, 5) : [],
    recentTurns: Array.isArray(memory.recentTurns)
      ? memory.recentTurns.slice(-4).map((turn) => ({
          user: compact(turn.user, 180),
          assistant: compact(turn.assistant, 180)
        }))
      : []
  };
}

export function updateSessionMemoryFromTurn({ sessionId, userText, assistantText }) {
  const memory = readSessionMemory(sessionId);
  const displayName = detectDisplayName(userText) || inferDisplayNameFromMemory(memory);

  if (displayName) {
    memory.userDisplayName = displayName;
    const pref = "Address the user as " + displayName + " in this session.";
    memory.preferences = Array.from(new Set([...(memory.preferences || []), pref])).slice(-8);
  } else if (hasRememberIntent(userText)) {
    const pref = compact(userText, 160);
    memory.preferences = Array.from(new Set([...(memory.preferences || []), pref])).slice(-8);
  }

  memory.recentTurns = [
    ...(Array.isArray(memory.recentTurns) ? memory.recentTurns : []),
    {
      at: new Date().toISOString(),
      user: compact(userText, 300),
      assistant: compact(assistantText, 300)
    }
  ].slice(-MAX_RECENT_TURNS);

  return writeSessionMemory(sessionId, memory);
}

export function createQuickSessionId() {
  return "quick-" + Date.now() + "-" + Math.random().toString(16).slice(2, 10);
}
