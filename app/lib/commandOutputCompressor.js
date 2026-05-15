function normalizeText(value = "") {
  return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function splitLines(value = "") {
  return normalizeText(value)
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""));
}

function compactLines(lines, maxLines = 80) {
  const clean = lines.filter((line) => line.trim());

  if (clean.length <= maxLines) {
    return clean.join("\n");
  }

  const headCount = Math.max(10, Math.floor(maxLines * 0.55));
  const tailCount = Math.max(10, maxLines - headCount);

  return [
    ...clean.slice(0, headCount),
    `... [${clean.length - maxLines} lines omitted] ...`,
    ...clean.slice(-tailCount)
  ].join("\n");
}

function detectCommandKind(command = "", output = "") {
  const text = `${command}\n${output}`.toLowerCase();

  if (text.includes("git diff") || text.includes("diff --git")) return "git-diff";
  if (text.includes("npm run build") || text.includes("next build") || text.includes("creating an optimized production build")) return "build";
  if (text.includes("npm test") || text.includes("vitest") || text.includes("jest") || text.includes("pytest")) return "test";
  if (text.includes("eslint") || text.includes("lint")) return "lint";
  if (text.includes("tsc") || text.includes("typecheck") || text.includes("type error")) return "typecheck";
  if (/\bgrep\b/.test(text) || text.includes("select-string")) return "grep";
  if (/\bfind\b/.test(text) || text.includes("get-childitem")) return "find";
  if (/\bls\b/.test(text) || /\bdir\b/.test(text)) return "list";

  return "generic";
}

function pickErrorLines(lines) {
  const important = [];
  const patterns = [
    /error/i,
    /failed/i,
    /failure/i,
    /exception/i,
    /syntaxerror/i,
    /typeerror/i,
    /referenceerror/i,
    /cannot find/i,
    /module not found/i,
    /permission denied/i,
    /eacces/i,
    /enoent/i,
    /expected/i,
    /received/i,
    /failed to compile/i,
    /build failed/i,
    /test failed/i,
    /assert/i,
    /warning/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (patterns.some((pattern) => pattern.test(line))) {
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 5);

      for (let j = start; j < end; j++) {
        important.push(lines[j]);
      }
    }
  }

  return Array.from(new Set(important));
}

function summarizeGitDiff(lines) {
  const files = [];
  const hunks = [];
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      const match = line.match(/ b\/(.+)$/);
      if (match) files.push(match[1]);
    }

    if (line.startsWith("@@")) hunks.push(line);

    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }

  const body = [
    `[git diff summary]`,
    `changedFiles=${files.length}`,
    `additions=${additions}`,
    `deletions=${deletions}`,
    "",
    ...files.slice(0, 40).map((file) => `- ${file}`),
    files.length > 40 ? `... ${files.length - 40} more files` : "",
    "",
    "[hunks]",
    ...hunks.slice(0, 30)
  ].filter(Boolean);

  return body.join("\n");
}

function summarizeGroupedPaths(lines, label = "paths") {
  const groups = new Map();

  for (const line of lines) {
    const value = line.trim();
    if (!value) continue;

    const normalized = value.replace(/\\/g, "/");
    const parts = normalized.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";

    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(parts[parts.length - 1]);
  }

  const out = [`[${label} summary]`, `groups=${groups.size}`, ""];

  for (const [dir, names] of Array.from(groups.entries()).slice(0, 40)) {
    out.push(`${dir}/ (${names.length})`);
    out.push("  " + names.slice(0, 8).join(", "));
    if (names.length > 8) out.push(`  ... ${names.length - 8} more`);
  }

  return out.join("\n");
}

function summarizeBuildOrTest(command, stdout, stderr) {
  const all = splitLines(`${stdout || ""}\n${stderr || ""}`);
  const errors = pickErrorLines(all);
  const failed = errors.length > 0 || /failed|error|exception/i.test(`${stdout}\n${stderr}`);
  const successLines = all.filter((line) =>
    /success|passed|compiled|ready|done|✓|√|build completed|tests? passed/i.test(line)
  );

  if (!failed) {
    return [
      "[command summary]",
      `command=${command || "-"}`,
      "status=success-or-no-critical-error",
      "",
      ...successLines.slice(-20)
    ].filter(Boolean).join("\n");
  }

  return [
    "[command summary]",
    `command=${command || "-"}`,
    "status=failed-or-warning",
    "",
    "[important lines]",
    compactLines(errors.length ? errors : all, 100)
  ].join("\n");
}

export function compressCommandOutput(input = {}, legacyOutput = "", legacyStderr = "") {
  const payload =
    typeof input === "string"
      ? { command: input, stdout: legacyOutput, stderr: legacyStderr }
      : input || {};

  const command = String(payload.command || "");
  const stdout = normalizeText(payload.stdout || payload.output || "");
  const stderr = normalizeText(payload.stderr || "");
  const combined = `${stdout}\n${stderr}`.trim();
  const lines = splitLines(combined);
  const originalChars = combined.length;
  const originalLines = lines.length;
  const kind = detectCommandKind(command, combined);

  let compressed = "";

  if (!combined) {
    compressed = "";
  } else if (kind === "git-diff") {
    compressed = summarizeGitDiff(lines);
  } else if (["build", "test", "lint", "typecheck"].includes(kind)) {
    compressed = summarizeBuildOrTest(command, stdout, stderr);
  } else if (kind === "grep") {
    compressed = summarizeGroupedPaths(lines, "grep results");
  } else if (kind === "find" || kind === "list") {
    compressed = summarizeGroupedPaths(lines, "file list");
  } else {
    const errors = pickErrorLines(lines);
    compressed = errors.length ? compactLines(errors, 100) : compactLines(lines, 80);
  }

  const compressedChars = compressed.length;
  const compressedLines = compressed ? splitLines(compressed).length : 0;

  return {
    kind,
    compressed,
    meta: {
      command,
      originalChars,
      originalLines,
      compressedChars,
      compressedLines,
      savedChars: Math.max(0, originalChars - compressedChars),
      ratio:
        originalChars > 0
          ? Number((compressedChars / originalChars).toFixed(4))
          : 0
    }
  };
}
