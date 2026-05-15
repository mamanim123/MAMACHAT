import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPortableRoot } from "./portablePaths.js";

function getRunsDir() {
  const root = getPortableRoot();
  const runsDir = path.join(root, "runtime", "hermes", "runs");
  fs.mkdirSync(runsDir, { recursive: true });
  return runsDir;
}

function getIndexPath() {
  const runsDir = getRunsDir();
  const indexDir = path.join(runsDir, "index");
  fs.mkdirSync(indexDir, { recursive: true });
  return path.join(indexDir, "runs-index.json");
}

function getRunFilePath(runId) {
  const safeRunId = String(runId || "").replace(/[^a-zA-Z0-9_.-]/g, "");
  return path.join(getRunsDir(), safeRunId + ".json");
}

function readJsonFile(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readIndex() {
  const parsed = readJsonFile(getIndexPath(), []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeIndex(items) {
  const indexPath = getIndexPath();
  fs.writeFileSync(indexPath, JSON.stringify(items, null, 2), "utf8");
}

function hashPrompt(prompt) {
  return crypto
    .createHash("sha256")
    .update(String(prompt || ""))
    .digest("hex")
    .slice(0, 16);
}

function summarizePrompt(prompt, max = 120) {
  const text = String(prompt || "").trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

function normalizeStatus(record) {
  if (record?.status) return String(record.status);
  if (record?.dryRun === true) return "dryrun";
  return record?.ok === false ? "failed" : "success";
}

function makeFullRecord(record) {
  const runId = record.runId || "run-" + Date.now();
  const createdAt = record.createdAt || new Date().toISOString();

  return {
    runId,
    createdAt,
    status: normalizeStatus(record),
    ok: record.ok !== false,
    dryRun: record.dryRun === true,
    sessionId: record.sessionId || "",

    provider: record.provider || "",
    model: record.model || "",
    mode: record.mode || "",
    skills: record.skills || "",
    toolsets: record.toolsets || "",
    responseMode: record.responseMode || "normal",
    engine: record.engine || "",
    executionProfile: record.executionProfile || "agent",
    contextPolicy: record.contextPolicy || "balanced",
    sessionContextUsed: record.sessionContextUsed !== false,
    memorySyncUsed: record.memorySyncUsed === true,

    workspaceRoot: record.workspaceRoot || "",
    workspaceWsl: record.workspaceWsl || "",

    prompt: record.prompt || "",
    promptHash: hashPrompt(record.prompt || ""),
    promptPreview: summarizePrompt(record.prompt || ""),

    output: record.output || "",
    stderr: record.stderr || "",
    compressedOutput: record.compressedOutput || "",
    outputCompression: record.outputCompression || null,
    error: record.error || "",
    exitCode: record.exitCode ?? null,
    durationMs: record.durationMs ?? null,
    usage: record.usage || null,
    tokenBudget: record.tokenBudget || null,

    memorySync: record.memorySync || null,
    workspaceCandidates: Array.isArray(record.workspaceCandidates) ? record.workspaceCandidates : [],
    logPath: record.logPath || "",
  };
}

function makeIndexEntry(full) {
  return {
    runId: full.runId,
    createdAt: full.createdAt,
    status: full.status,
    ok: full.ok,
    dryRun: full.dryRun,
    sessionId: full.sessionId,

    provider: full.provider,
    model: full.model,
    mode: full.mode,
    skills: full.skills,
    responseMode: full.responseMode,
    engine: full.engine,
    executionProfile: full.executionProfile,
    contextPolicy: full.contextPolicy,
    sessionContextUsed: full.sessionContextUsed,
    memorySyncUsed: full.memorySyncUsed,

    workspaceRoot: full.workspaceRoot,
    promptHash: full.promptHash,
    promptPreview: full.promptPreview,

    exitCode: full.exitCode,
    durationMs: full.durationMs,
    usage: full.usage,
    tokenRisk: full.tokenBudget?.severity || "",
    estimatedInputTokens: full.tokenBudget?.estimatedInputTokens || null,

    hasOutput: Boolean(full.output),
    hasStderr: Boolean(full.stderr),
    hasCompressedOutput: Boolean(full.compressedOutput),
    hasError: Boolean(full.error),
    memorySynced: Boolean(full.memorySync?.used),
    candidateCount: Array.isArray(full.workspaceCandidates) ? full.workspaceCandidates.length : 0,
  };
}

function sortNewestFirst(items) {
  return [...items].sort((a, b) => {
    const at = Date.parse(a.createdAt || "") || 0;
    const bt = Date.parse(b.createdAt || "") || 0;
    return bt - at;
  });
}

export function rebuildRunsIndex() {
  const runsDir = getRunsDir();
  const files = fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^run-.*\.json$/.test(entry.name))
    .map((entry) => path.join(runsDir, entry.name));

  const entries = [];

  for (const file of files) {
    const record = readJsonFile(file, null);
    if (!record?.runId) continue;
    entries.push(makeIndexEntry(makeFullRecord(record)));
  }

  const sorted = sortNewestFirst(entries).slice(0, 500);
  writeIndex(sorted);

  return {
    ok: true,
    count: sorted.length,
    indexPath: getIndexPath(),
  };
}

export function saveRun(record) {
  const full = makeFullRecord(record);

  const filePath = getRunFilePath(full.runId);
  fs.writeFileSync(filePath, JSON.stringify(full, null, 2), "utf8");

  const indexEntry = makeIndexEntry(full);
  const index = readIndex().filter((item) => item.runId !== full.runId);
  index.unshift(indexEntry);

  const capped = sortNewestFirst(index).slice(0, 500);
  writeIndex(capped);

  return full;
}

export function listRuns(options = {}) {
  const limitRaw = Number(options.limit || 50);
  const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 50, 200));

  const status = options.status || "";
  const dryRun = options.dryRun || "";
  const provider = options.provider || "";
  const query = String(options.query || "").trim().toLowerCase();

  let items = readIndex();

  if (items.length === 0) {
    rebuildRunsIndex();
    items = readIndex();
  }

  items = sortNewestFirst(items);

  if (status) {
    items = items.filter((item) => item.status === status);
  }

  if (dryRun === "true") {
    items = items.filter((item) => item.dryRun === true);
  } else if (dryRun === "false") {
    items = items.filter((item) => item.dryRun !== true);
  }

  if (provider) {
    items = items.filter((item) => item.provider === provider);
  }

  if (query) {
    items = items.filter((item) => {
      return [
        item.runId,
        item.sessionId,
        item.status,
        item.provider,
        item.model,
        item.mode,
        item.skills,
        item.workspaceRoot,
        item.promptPreview,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }

  return items.slice(0, limit);
}

export function getRun(runId) {
  if (!/^run-[a-zA-Z0-9_.-]+$/.test(String(runId || ""))) return null;

  const filePath = getRunFilePath(runId);
  const record = readJsonFile(filePath, null);

  if (!record) return null;
  return makeFullRecord(record);
}

export function deleteRun(runId) {
  if (!/^run-[a-zA-Z0-9_.-]+$/.test(String(runId || ""))) return false;

  const filePath = getRunFilePath(runId);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  const index = readIndex().filter((item) => item.runId !== runId);
  writeIndex(index);

  return true;
}

export function getRepeatedPrompts(minCount = 3) {
  const index = readIndex();
  const counts = new Map();

  for (const item of index) {
    if (!item.promptHash) continue;

    const cur = counts.get(item.promptHash) || {
      hash: item.promptHash,
      count: 0,
      sample: item.promptPreview,
      lastRunId: item.runId,
    };

    cur.count += 1;
    counts.set(item.promptHash, cur);
  }

  return Array.from(counts.values()).filter((x) => x.count >= minCount);
}
