import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPortableRoot } from "./portablePaths.js";

const DEFAULT_IGNORE_RULES = [
  "node_modules/",
  ".next/",
  "dist/",
  "build/",
  "coverage/",
  ".git/",
  ".svn/",
  ".hg/",
  "runtime/",
  "backups/",
  "logs/",
  "runs/",
  "workspaces/",
  "secrets/",
  "memory/",
  "config/cache/",
  ".hermes-workspace/",
  ".claude/",
  ".auth/",
  "*.log",
  "*.tmp",
  "*.bak",
  "*.backup",
  "*.pid",
  "*.old"
];

const CODE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".md",
  ".mdx",
  ".yml",
  ".yaml",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".sql",
  ".sh",
  ".ps1",
  ".bat"
]);

function normalizeSlash(value = "") {
  return String(value || "").replace(/\\/g, "/");
}

function safeWorkspaceHash(workspaceRoot) {
  return crypto
    .createHash("sha256")
    .update(path.resolve(workspaceRoot || ""))
    .digest("hex")
    .slice(0, 16);
}

function readTextLines(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

function getWorkspaceIndexRoot(workspaceRoot) {
  const root = getPortableRoot();
  const hash = safeWorkspaceHash(workspaceRoot);
  return path.join(root, "runtime", "workspace-index", "workspace-" + hash);
}

function getIgnoreRules(workspaceRoot) {
  const root = getPortableRoot();

  const rules = [
    ...DEFAULT_IGNORE_RULES,
    ...readTextLines(path.join(root, ".mamabotignore")),
    ...readTextLines(path.join(workspaceRoot, ".mamabotignore")),
    ...readTextLines(path.join(workspaceRoot, ".gitignore"))
  ];

  return Array.from(new Set(rules.map(normalizeSlash).filter(Boolean)));
}

function basenameMatchesPattern(baseName, pattern) {
  if (!pattern.includes("*")) return baseName === pattern;

  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");

  return new RegExp("^" + escaped + "$").test(baseName);
}

function shouldIgnore(relativePath, isDir, rules) {
  const rel = normalizeSlash(relativePath).replace(/^\/+/, "");
  const baseName = path.posix.basename(rel);

  if (!rel) return false;

  for (const rawRule of rules) {
    let rule = normalizeSlash(rawRule).trim();
    if (!rule || rule.startsWith("#")) continue;

    rule = rule.replace(/^\/+/, "");

    if (rule.endsWith("/")) {
      const dirRule = rule.slice(0, -1);
      if (rel === dirRule || rel.startsWith(dirRule + "/")) return true;
      if (isDir && baseName === dirRule) return true;
      continue;
    }

    if (rule.includes("*")) {
      if (basenameMatchesPattern(baseName, rule)) return true;
      continue;
    }

    if (rel === rule || rel.startsWith(rule + "/") || baseName === rule) return true;
  }

  return false;
}

function classifyFile(relativePath) {
  const rel = normalizeSlash(relativePath);
  const ext = path.extname(rel).toLowerCase();

  if (rel === "package.json") return "package";
  if (rel.includes("/app/api/") || rel.includes("\\app\\api\\")) return "api-route";
  if (/\/route\.(js|ts)$/.test(rel)) return "api-route";
  if (/\/page\.(js|jsx|ts|tsx)$/.test(rel)) return "page";
  if (/\/layout\.(js|jsx|ts|tsx)$/.test(rel)) return "layout";
  if (/\.(jsx|tsx)$/.test(rel)) return "component";
  if (CODE_EXTENSIONS.has(ext)) return "code";
  return "asset";
}

function readPackageIndex(workspaceRoot) {
  const packagePath = path.join(workspaceRoot, "package.json");

  try {
    if (!fs.existsSync(packagePath)) return null;

    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    return {
      name: pkg.name || "",
      version: pkg.version || "",
      type: pkg.type || "",
      scripts: pkg.scripts || {},
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {})
    };
  } catch (error) {
    return {
      error: error?.message || String(error)
    };
  }
}

function buildRouteIndex(files) {
  return files
    .filter((file) => file.kind === "api-route" || file.kind === "page" || file.kind === "layout")
    .map((file) => ({
      path: file.path,
      kind: file.kind,
      ext: file.ext,
      size: file.size
    }));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

export function getWorkspaceIndexSummary(workspaceRoot) {
  const indexRoot = getWorkspaceIndexRoot(workspaceRoot);
  const manifestPath = path.join(indexRoot, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    return {
      exists: false,
      indexRoot,
      workspaceRoot
    };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    return {
      exists: true,
      indexRoot,
      ...manifest
    };
  } catch {
    return {
      exists: false,
      indexRoot,
      workspaceRoot
    };
  }
}

export function buildWorkspaceIndex(workspaceRoot, options = {}) {
  const resolvedRoot = path.resolve(String(workspaceRoot || ""));

  if (!resolvedRoot || !fs.existsSync(resolvedRoot)) {
    throw new Error("workspace path does not exist: " + resolvedRoot);
  }

  const startedAt = Date.now();
  const indexRoot = getWorkspaceIndexRoot(resolvedRoot);
  const rules = getIgnoreRules(resolvedRoot);

  const maxFiles = Number(options.maxFiles || 8000);
  const maxDepth = Number(options.maxDepth || 16);
  const maxFileSize = Number(options.maxFileSize || 2 * 1024 * 1024);

  const files = [];
  const ignored = [];
  const errors = [];

  function walk(currentDir, depth = 0) {
    if (files.length >= maxFiles) return;
    if (depth > maxDepth) return;

    let entries = [];

    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (error) {
      errors.push({
        path: normalizeSlash(path.relative(resolvedRoot, currentDir)),
        error: error?.message || String(error)
      });
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break;

      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = normalizeSlash(path.relative(resolvedRoot, absolutePath));
      const isDir = entry.isDirectory();

      if (shouldIgnore(relativePath, isDir, rules)) {
        ignored.push(relativePath + (isDir ? "/" : ""));
        continue;
      }

      if (isDir) {
        walk(absolutePath, depth + 1);
        continue;
      }

      let stat = null;

      try {
        stat = fs.statSync(absolutePath);
      } catch (error) {
        errors.push({
          path: relativePath,
          error: error?.message || String(error)
        });
        continue;
      }

      const ext = path.extname(relativePath).toLowerCase();

      files.push({
        path: relativePath,
        name: entry.name,
        ext,
        kind: classifyFile(relativePath),
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        modifiedAt: stat.mtime.toISOString(),
        depth,
        readableForAgent: CODE_EXTENSIONS.has(ext) && stat.size <= maxFileSize
      });
    }
  }

  walk(resolvedRoot, 0);

  const packageIndex = readPackageIndex(resolvedRoot);
  const routesIndex = buildRouteIndex(files);

  const manifest = {
    workspaceRoot: resolvedRoot,
    workspaceName: path.basename(resolvedRoot),
    workspaceHash: safeWorkspaceHash(resolvedRoot),
    indexRoot,
    createdAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    fileCount: files.length,
    routeCount: routesIndex.length,
    ignoredCount: ignored.length,
    errorCount: errors.length,
    maxFiles,
    maxDepth,
    maxFileSize
  };

  writeJson(path.join(indexRoot, "manifest.json"), manifest);
  writeJson(path.join(indexRoot, "files-index.json"), files);
  writeJson(path.join(indexRoot, "routes-index.json"), routesIndex);
  writeJson(path.join(indexRoot, "package-index.json"), packageIndex || {});
  writeJson(path.join(indexRoot, "ignore-rules.json"), {
    rules,
    ignoredSample: ignored.slice(0, 500),
    ignoredTotal: ignored.length
  });
  writeJson(path.join(indexRoot, "last-scan.json"), {
    ...manifest,
    errors: errors.slice(0, 100)
  });

  return {
    ok: true,
    manifest,
    files: files.length,
    routes: routesIndex.length,
    ignored: ignored.length,
    errors: errors.slice(0, 20)
  };
}


function readIndexJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function tokenizeSearchQuery(value = "") {
  return String(value || "")
    .replace(/\[System instruction - do not repeat\][\s\S]*?사용자 요청:\s*/g, " ")
    .replace(/[^a-zA-Z0-9가-힣_./-]+/g, " ")
    .split(/\s+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length >= 2)
    .slice(0, 20);
}

function expandSearchTokens(tokens) {
  const map = {
    로그인: ["login", "auth", "signin", "session"],
    인증: ["auth", "login", "token", "jwt"],
    회원: ["user", "member", "account"],
    대화: ["chat", "conversation", "session", "message"],
    세션: ["session", "conversation"],
    실행: ["run", "agent", "execution"],
    이력: ["history", "run", "log"],
    작업: ["workspace", "workbench", "task"],
    폴더: ["workspace", "path", "folder"],
    모델: ["model", "provider", "openrouter"],
    토큰: ["token", "usage", "prompt"],
    인덱스: ["index", "workspace-index"],
    라우트: ["route", "api"],
    화면: ["component", "panel", "jsx"],
    버튼: ["button", "select", "ui"]
  };

  const out = new Set(tokens);

  for (const token of tokens) {
    for (const extra of map[token] || []) {
      out.add(extra);
    }
  }

  return Array.from(out);
}

function normalizeWorkspacePathCandidate(value = "") {
  return normalizeSlash(String(value || ""))
    .trim()
    .replace(/^["'`([{<]+/, "")
    .replace(/["'`)\]}>.,;:]+$/, "")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .toLowerCase();
}

function extractExplicitWorkspacePaths(query = "") {
  const text = String(query || "");
  const matches = text.match(/(?:[A-Za-z0-9_.\-\[\]@()]+[\\/])+[A-Za-z0-9_.\-\[\]@()]+\.[A-Za-z0-9]+/g) || [];

  return Array.from(
    new Set(
      matches
        .map((item) => normalizeWorkspacePathCandidate(item))
        .filter((item) => item.includes("/") && item.length >= 5)
    )
  ).slice(0, 20);
}

function scoreWorkspaceFile(file, tokens, explicitPaths = []) {
  const pathText = String(file.path || "").toLowerCase();
  const nameText = String(file.name || "").toLowerCase();
  const kindText = String(file.kind || "").toLowerCase();
  const extText = String(file.ext || "").toLowerCase();

  const haystack = [pathText, nameText, kindText, extText].join(" ");
  let score = 0;
  const normalizedPath = normalizeWorkspacePathCandidate(file.path || "");

  if (
    Array.isArray(explicitPaths) &&
    explicitPaths.some((explicitPath) => normalizedPath === explicitPath || normalizedPath.endsWith("/" + explicitPath))
  ) {
    score += 1000;
  }

  for (const token of tokens) {
    if (!token) continue;

    if (nameText.includes(token)) score += 12;
    if (pathText.includes(token)) score += 8;
    if (kindText.includes(token)) score += 5;
    if (extText === "." + token) score += 3;
    if (haystack.includes(token)) score += 2;
  }

  if (file.kind === "api-route") score += 3;
  if (file.kind === "component") score += 2;
  if (file.kind === "package") score += 2;

  if (file.readableForAgent === false) score -= 8;
  if (Number(file.size || 0) > 300000) score -= 3;

  return score;
}

export function searchWorkspaceIndex(workspaceRoot, options = {}) {
  const resolvedRoot = path.resolve(String(workspaceRoot || ""));
  const limitRaw = Number(options.limit || 8);
  const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 8, 20));
  const query = String(options.query || "").trim();

  let summary = getWorkspaceIndexSummary(resolvedRoot);

  if (!summary.exists || options.rebuild === true) {
    buildWorkspaceIndex(resolvedRoot, {
      maxFiles: options.maxFiles || 8000,
      maxDepth: options.maxDepth || 16,
      maxFileSize: options.maxFileSize || 2 * 1024 * 1024
    });

    summary = getWorkspaceIndexSummary(resolvedRoot);
  }

  const indexRoot = summary.indexRoot || getWorkspaceIndexRoot(resolvedRoot);
  const files = readIndexJson(path.join(indexRoot, "files-index.json"), []);
  const routes = readIndexJson(path.join(indexRoot, "routes-index.json"), []);

  const baseTokens = tokenizeSearchQuery(query);
  const tokens = expandSearchTokens(baseTokens);
  const explicitPaths = extractExplicitWorkspacePaths(query);

  const scored = Array.isArray(files)
    ? files
        .map((file) => ({
          ...file,
          score: scoreWorkspaceFile(file, tokens, explicitPaths)
        }))
        .filter((file) => file.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return String(a.path || "").localeCompare(String(b.path || ""));
        })
    : [];

  const routeBoost = Array.isArray(routes)
    ? routes
        .map((file) => ({
          ...file,
          score: scoreWorkspaceFile(file, tokens, explicitPaths) + 4
        }))
        .filter((file) => file.score > 0)
    : [];

  const merged = new Map();

  for (const item of [...routeBoost, ...scored]) {
    const key = item.path;
    if (!key) continue;

    const existing = merged.get(key);
    if (!existing || item.score > existing.score) {
      merged.set(key, item);
    }
  }

  const items = Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      path: item.path,
      name: item.name || path.basename(item.path || ""),
      kind: item.kind || "",
      ext: item.ext || "",
      size: item.size || 0,
      modifiedAt: item.modifiedAt || "",
      readableForAgent: item.readableForAgent !== false,
      score: item.score
    }));

  return {
    ok: true,
    query,
    tokens,
    explicitPaths,
    summary,
    totalFiles: Array.isArray(files) ? files.length : 0,
    items
  };
}
