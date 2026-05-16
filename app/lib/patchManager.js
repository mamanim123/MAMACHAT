import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPortableRoot } from "./portablePaths.js";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function getPatchesDir() {
  const dir = path.join(getPortableRoot(), "runtime", "hermes", "patches");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeId(value = "") {
  return String(value || "").replace(/[^a-zA-Z0-9_.-]/g, "");
}

function makePatchId() {
  return "patch-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex");
}

function hashText(value = "") {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex").slice(0, 16);
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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function getPatchPath(patchId) {
  const safe = safeId(patchId);
  return path.join(getPatchesDir(), safe + ".json");
}

function normalizeRelPath(value = "") {
  const rel = String(value || "").replace(/\\/g, "/").trim();
  if (!rel) throw new Error("change.path is required");
  if (path.isAbsolute(rel)) throw new Error("absolute paths are not allowed: " + rel);
  if (rel.split("/").includes("..")) throw new Error("path traversal is not allowed: " + rel);
  return rel;
}

function resolveTarget(workspaceRoot, relPath) {
  const root = path.resolve(String(workspaceRoot || ""));
  if (!root || !fs.existsSync(root)) {
    throw new Error("workspaceRoot does not exist: " + root);
  }

  const rel = normalizeRelPath(relPath);
  const target = path.resolve(root, rel);
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("target escapes workspace: " + rel);
  }

  return { root, rel, target };
}

function readTextFile(target) {
  if (!fs.existsSync(target)) {
    return { exists: false, text: "" };
  }

  const stat = fs.statSync(target);
  if (!stat.isFile()) {
    throw new Error("target is not a file: " + target);
  }

  if (stat.size > MAX_FILE_SIZE) {
    throw new Error("file too large for patch preview: " + target);
  }

  return {
    exists: true,
    text: fs.readFileSync(target, "utf8")
  };
}

function compact(value = "", max = 4000) {
  const text = String(value || "");
  if (text.length <= max) return text;
  return text.slice(0, Math.floor(max * 0.55)) + "\n\n... [preview truncated] ...\n\n" + text.slice(-Math.floor(max * 0.35));
}

function makePreview(rel, before, after, beforeExists) {
  const beforeLines = before ? before.split(/\r?\n/).length : 0;
  const afterLines = after ? after.split(/\r?\n/).length : 0;

  return [
    "--- " + rel + (beforeExists ? " (before)" : " (new file)"),
    "+++ " + rel + " (after)",
    "@@ preview @@",
    "beforeLines=" + beforeLines,
    "afterLines=" + afterLines,
    "",
    "[before]",
    compact(before || ""),
    "",
    "[after]",
    compact(after || "")
  ].join("\n");
}

function makeIndexEntry(patch) {
  return {
    patchId: patch.patchId,
    createdAt: patch.createdAt,
    updatedAt: patch.updatedAt,
    status: patch.status,
    title: patch.title,
    workspaceRoot: patch.workspaceRoot,
    changeCount: Array.isArray(patch.changes) ? patch.changes.length : 0,
    appliedAt: patch.appliedAt || "",
    rolledBackAt: patch.rolledBackAt || ""
  };
}

function getIndexPath() {
  const dir = path.join(getPatchesDir(), "index");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "patches-index.json");
}

function readIndex() {
  const items = readJson(getIndexPath(), []);
  return Array.isArray(items) ? items : [];
}

function writeIndex(items) {
  writeJson(getIndexPath(), items);
}

function upsertIndex(patch) {
  const entry = makeIndexEntry(patch);
  const next = readIndex().filter((item) => item.patchId !== patch.patchId);
  next.unshift(entry);
  next.sort((a, b) => (Date.parse(b.updatedAt || b.createdAt || "") || 0) - (Date.parse(a.updatedAt || a.createdAt || "") || 0));
  writeIndex(next.slice(0, 500));
}

export function createPatch(input = {}) {
  const workspaceRoot = path.resolve(String(input.workspaceRoot || ""));
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
    throw new Error("workspaceRoot does not exist: " + workspaceRoot);
  }

  const changesInput = Array.isArray(input.changes) ? input.changes : [];
  if (changesInput.length === 0) {
    throw new Error("changes must not be empty");
  }

  const patchId = input.patchId ? safeId(input.patchId) : makePatchId();
  const createdAt = new Date().toISOString();

  const changes = changesInput.map((change) => {
    const { rel, target } = resolveTarget(workspaceRoot, change.path);
    const before = readTextFile(target);
    const after = String(change.content ?? change.after ?? "");

    return {
      path: rel,
      mode: change.mode || (before.exists ? "replace" : "create"),
      beforeExists: before.exists,
      beforeHash: hashText(before.text),
      afterHash: hashText(after),
      beforeSize: Buffer.byteLength(before.text, "utf8"),
      afterSize: Buffer.byteLength(after, "utf8"),
      content: after,
      preview: makePreview(rel, before.text, after, before.exists)
    };
  });

  const patch = {
    patchId,
    version: 1,
    status: "pending",
    title: String(input.title || "Untitled patch"),
    description: String(input.description || ""),
    workspaceRoot,
    createdAt,
    updatedAt: createdAt,
    changes,
    backups: [],
    applyLog: [],
    rollbackLog: []
  };

  writeJson(getPatchPath(patchId), patch);
  upsertIndex(patch);

  return patch;
}

export function readPatch(patchId) {
  const patch = readJson(getPatchPath(patchId), null);
  if (!patch) throw new Error("patch not found: " + patchId);
  return patch;
}

export function listPatches(options = {}) {
  let items = readIndex();
  if (items.length === 0) {
    const files = fs.readdirSync(getPatchesDir(), { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^patch-.*\.json$/.test(entry.name))
      .map((entry) => readJson(path.join(getPatchesDir(), entry.name), null))
      .filter(Boolean);

    items = files.map(makeIndexEntry);
    writeIndex(items);
  }

  if (options.status) {
    items = items.filter((item) => item.status === options.status);
  }

  const limitRaw = Number(options.limit || 50);
  const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 50, 200));

  return {
    ok: true,
    count: items.length,
    items: items.slice(0, limit)
  };
}

export function applyPatch(patchId, options = {}) {
  const patch = readPatch(patchId);

  if (patch.status === "applied" && options.force !== true) {
    throw new Error("patch already applied: " + patchId);
  }

  if (patch.status === "rolledback" && options.force !== true) {
    throw new Error("patch already rolled back: " + patchId);
  }

  const appliedAt = new Date().toISOString();
  const backupRoot = path.join(getPatchesDir(), patch.patchId + "-backups", appliedAt.replace(/[:.]/g, "-"));
  fs.mkdirSync(backupRoot, { recursive: true });

  const backups = [];
  const applyLog = [];

  for (const change of patch.changes || []) {
    const { target, rel } = resolveTarget(patch.workspaceRoot, change.path);
    const before = readTextFile(target);

    if (before.exists && before.text.length > MAX_FILE_SIZE) {
      throw new Error("file too large to apply safely: " + rel);
    }

    if (before.exists && hashText(before.text) !== change.beforeHash && options.force !== true) {
      throw new Error("target changed after patch creation: " + rel);
    }

    const backupPath = path.join(backupRoot, rel.replace(/[\\\/:]/g, "__") + ".bak");

    if (before.exists) {
      fs.copyFileSync(target, backupPath);
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, String(change.content || ""), "utf8");

    backups.push({
      path: rel,
      beforeExists: before.exists,
      backupPath: before.exists ? backupPath : "",
      targetPath: target
    });

    applyLog.push({
      path: rel,
      applied: true,
      at: appliedAt
    });
  }

  const updated = {
    ...patch,
    status: "applied",
    updatedAt: appliedAt,
    appliedAt,
    backups,
    applyLog
  };

  writeJson(getPatchPath(patch.patchId), updated);
  upsertIndex(updated);

  return updated;
}

export function rollbackPatch(patchId) {
  const patch = readPatch(patchId);

  if (patch.status !== "applied") {
    throw new Error("only applied patches can be rolled back: " + patchId);
  }

  const rolledBackAt = new Date().toISOString();
  const rollbackLog = [];

  for (const backup of patch.backups || []) {
    const { target, rel } = resolveTarget(patch.workspaceRoot, backup.path);

    if (backup.beforeExists) {
      if (!backup.backupPath || !fs.existsSync(backup.backupPath)) {
        throw new Error("backup missing for rollback: " + backup.path);
      }

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(backup.backupPath, target);
    } else {
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    }

    rollbackLog.push({
      path: rel,
      rolledBack: true,
      at: rolledBackAt
    });
  }

  const updated = {
    ...patch,
    status: "rolledback",
    updatedAt: rolledBackAt,
    rolledBackAt,
    rollbackLog
  };

  writeJson(getPatchPath(patch.patchId), updated);
  upsertIndex(updated);

  return updated;
}
