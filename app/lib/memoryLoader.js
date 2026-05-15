import fs from "fs";
import path from "path";
import { getPortableRoot } from "./portablePaths.js";

const GLOBAL_MEMORY_FILES = [
  { name: "user.md", section: "USER PROFILE" },
  { name: "preferences.md", section: "PREFERENCES" },
  { name: "do-not-do.md", section: "DO NOT DO" },
  { name: "memory.md", section: "PROJECT MEMORY" }
];

function safeRead(filePath) {
  try {
    if (!fs.existsSync(filePath)) return "";
    const stat = fs.statSync(filePath);
    if (stat.size > 100 * 1024) return "[file too large, skipped]";
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function loadGlobalMemory() {
  const root = getPortableRoot();
  const memDir = path.join(root, "memory");
  const items = [];

  if (!fs.existsSync(memDir)) return items;

  for (const entry of GLOBAL_MEMORY_FILES) {
    const filePath = path.join(memDir, entry.name);
    const content = safeRead(filePath).trim();
    if (content) {
      items.push({
        name: entry.name,
        section: entry.section,
        path: filePath,
        size: content.length,
        content
      });
    }
  }

  return items;
}

export function loadWorkspaceMemory(workspaceRoot) {
  const items = [];
  if (!workspaceRoot) return items;

  const memDir = path.join(workspaceRoot, ".hermes-workspace", "memory");
  if (!fs.existsSync(memDir)) return items;

  try {
    const files = fs.readdirSync(memDir).filter((f) => f.endsWith(".md"));
    for (const fname of files) {
      const filePath = path.join(memDir, fname);
      const content = safeRead(filePath).trim();
      if (content) {
        items.push({
          name: fname,
          section: "WORKSPACE: " + fname.replace(/\.md$/, "").toUpperCase(),
          path: filePath,
          size: content.length,
          content
        });
      }
    }
  } catch {
    // ignore
  }

  return items;
}

export function buildMemoryPrefix(items) {
  if (!items || items.length === 0) return "";

  const blocks = items.map((item) => {
    return "[" + item.section + "]\n" + item.content;
  });

  return (
    "===== MAMABOT MEMORY INJECTION =====\n" +
    "아래 내용은 자동 주입된 사용자 컨텍스트입니다. 답변 시 반드시 참고하세요.\n\n" +
    blocks.join("\n\n") +
    "\n\n===== END OF MEMORY =====\n\n"
  );
}

export function loadAllMemory(workspaceRoot) {
  const global = loadGlobalMemory();
  const workspace = loadWorkspaceMemory(workspaceRoot);
  const all = [...global, ...workspace];
  return {
    items: all,
    prefix: buildMemoryPrefix(all),
    totalChars: all.reduce((s, x) => s + x.size, 0),
    fileCount: all.length
  };
}