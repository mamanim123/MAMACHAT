/**
 * backupManager.js
 * 파일 수정 전 자동 백업
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPortableRoot } from "./portablePaths.js";

function getBackupRoot() {
  return path.join(getPortableRoot(), "backups", "workspaces");
}

function getWorkspaceHash(workspaceRoot) {
  return crypto
    .createHash("sha256")
    .update(String(workspaceRoot || ""))
    .digest("hex")
    .slice(0, 12);
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/**
 * 단일 파일 백업
 * workspaceRoot: 작업폴더 경로
 * filePath: 백업할 파일 절대경로
 */
export function backupFile(workspaceRoot, filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { ok: false, reason: "file not found: " + filePath };
    }

    const hash = getWorkspaceHash(workspaceRoot);
    const stamp = getTimestamp();
    const fileName = path.basename(filePath);
    const backupDir = path.join(
      getBackupRoot(),
      hash,
      "snapshots",
      stamp
    );

    fs.mkdirSync(backupDir, { recursive: true });

    const dest = path.join(backupDir, fileName);
    fs.copyFileSync(filePath, dest);

    const metaPath = path.join(backupDir, "metadata.json");
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        workspaceRoot,
        originalPath: filePath,
        backupPath: dest,
        fileName,
      }, null, 2),
      "utf8"
    );

    return { ok: true, backupPath: dest, backupDir };
  } catch (error) {
    return { ok: false, reason: error?.message || String(error) };
  }
}

/**
 * 여러 파일 백업
 */
export function backupFiles(workspaceRoot, filePaths = []) {
  const results = [];
  for (const filePath of filePaths) {
    results.push({ filePath, ...backupFile(workspaceRoot, filePath) });
  }
  const failed = results.filter((r) => !r.ok);
  return {
    ok: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results,
  };
}

/**
 * workspace 스냅샷 목록 조회
 */
export function listSnapshots(workspaceRoot) {
  try {
    const hash = getWorkspaceHash(workspaceRoot);
    const snapshotDir = path.join(getBackupRoot(), hash, "snapshots");

    if (!fs.existsSync(snapshotDir)) {
      return { ok: true, snapshots: [] };
    }

    const snapshots = fs
      .readdirSync(snapshotDir)
      .filter((d) => {
        return fs.statSync(path.join(snapshotDir, d)).isDirectory();
      })
      .map((d) => {
        const metaPath = path.join(snapshotDir, d, "metadata.json");
        try {
          return JSON.parse(fs.readFileSync(metaPath, "utf8"));
        } catch {
          return { createdAt: d, backupDir: path.join(snapshotDir, d) };
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { ok: true, snapshots };
  } catch (error) {
    return { ok: false, reason: error?.message || String(error), snapshots: [] };
  }
}

/**
 * 특정 스냅샷에서 파일 복원
 */
export function restoreFile(backupPath, targetPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      return { ok: false, reason: "backup not found: " + backupPath };
    }

    const targetDir = path.dirname(targetPath);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(backupPath, targetPath);

    return { ok: true, restored: targetPath };
  } catch (error) {
    return { ok: false, reason: error?.message || String(error) };
  }
}