import fs from "fs/promises";
import path from "path";

const BEGIN = "<!-- MAMABOT:BEGIN -->";
const END = "<!-- MAMABOT:END -->";

const SOURCE_FILES = [
  { file: "user.md", title: "USER CONTEXT" },
  { file: "preferences.md", title: "PREFERENCES" },
  { file: "do-not-do.md", title: "DO NOT DO" },
  { file: "memory.md", title: "PROJECT MEMORY" },
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeText(text) {
  return String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

async function readTextIfExists(filePath) {
  if (!(await exists(filePath))) return "";
  return normalizeText(await fs.readFile(filePath, "utf8"));
}

function replaceManagedBlock(original, block) {
  const start = original.indexOf(BEGIN);
  const end = original.indexOf(END);

  if (start !== -1 && end !== -1 && end > start) {
    const before = original.slice(0, start).trimEnd();
    const after = original.slice(end + END.length).trimStart();
    return [before, block, after].filter(Boolean).join("\n\n") + "\n";
  }

  return [original.trimEnd(), block].filter(Boolean).join("\n\n") + "\n";
}

export async function syncMemoryToWorkspace(workspaceRoot, options = {}) {
  const mamabotRoot = options.mamabotRoot || process.cwd();

  if (!workspaceRoot || typeof workspaceRoot !== "string") {
    return {
      used: false,
      reason: "workspaceRoot is empty",
      synced: 0,
      skipped: SOURCE_FILES.length,
      chars: 0,
    };
  }

  const sourceRoot = path.join(mamabotRoot, "memory");
  const hermesWorkspaceRoot = path.join(workspaceRoot, ".hermes-workspace");
  const workspaceMemoryPath = path.join(hermesWorkspaceRoot, "memory.md");
  const backupRoot = path.join(hermesWorkspaceRoot, "backups");

  await fs.mkdir(hermesWorkspaceRoot, { recursive: true });
  await fs.mkdir(backupRoot, { recursive: true });

  const sections = [];
  const usedFiles = [];
  let chars = 0;

  for (const item of SOURCE_FILES) {
    const sourcePath = path.join(sourceRoot, item.file);
    const text = await readTextIfExists(sourcePath);

    if (!text) continue;

    chars += text.length;
    usedFiles.push(item.file);
    sections.push("## " + item.title + "\n\n" + text);
  }

  if (sections.length === 0) {
    return {
      used: false,
      reason: "no memory source files",
      synced: 0,
      skipped: SOURCE_FILES.length,
      chars: 0,
      workspaceMemoryPath,
    };
  }

  const managedBlock = [
    BEGIN,
    "?? ?? ?????. ? ?? ?? Mamabot? ?????.",
    "",
    ...sections,
    END,
  ].join("\n\n");

  const original = await readTextIfExists(workspaceMemoryPath);
  const next = replaceManagedBlock(original, managedBlock);

  let backupPath = null;

  if (original && original !== next) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupPath = path.join(backupRoot, "memory.md." + stamp + ".bak");
    await fs.writeFile(backupPath, original + (original.endsWith("\n") ? "" : "\n"), "utf8");
  }

  await fs.writeFile(workspaceMemoryPath, next, "utf8");

  return {
    used: true,
    synced: usedFiles.length,
    skipped: SOURCE_FILES.length - usedFiles.length,
    chars,
    sourceFiles: usedFiles,
    workspaceMemoryPath,
    backupPath,
  };
}
