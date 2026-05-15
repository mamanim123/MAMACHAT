export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

function isWindows() {
  return process.platform === "win32";
}

function getWindowsDrives() {
  const drives = [];

  for (let code = 65; code <= 90; code += 1) {
    const letter = String.fromCharCode(code);
    const drive = letter + ":\\";

    try {
      if (fs.existsSync(drive)) {
        drives.push({
          name: drive,
          path: drive,
          type: "drive"
        });
      }
    } catch {
      // ignore inaccessible drive
    }
  }

  return drives;
}

function getRoots() {
  if (isWindows()) {
    return getWindowsDrives();
  }

  return [
    {
      name: "/",
      path: "/",
      type: "drive"
    },
    {
      name: os.homedir(),
      path: os.homedir(),
      type: "drive"
    }
  ];
}

function safeReadDirectories(targetPath) {
  const entries = [];

  const dirents = fs.readdirSync(targetPath, {
    withFileTypes: true
  });

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) {
      continue;
    }

    const name = dirent.name;

    if (name === "node_modules" || name === ".git" || name === ".next") {
      continue;
    }

    const fullPath = path.join(targetPath, name);

    entries.push({
      name,
      path: fullPath,
      type: "directory"
    });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  return entries;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const requestedPath = url.searchParams.get("path") || "";

    if (!requestedPath) {
      return NextResponse.json({
        ok: true,
        mode: "roots",
        currentPath: "",
        parentPath: "",
        entries: getRoots()
      });
    }

    const normalizedPath = path.resolve(requestedPath);

    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Path does not exist: " + normalizedPath
        },
        { status: 400 }
      );
    }

    const stat = fs.statSync(normalizedPath);

    if (!stat.isDirectory()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Path is not a directory: " + normalizedPath
        },
        { status: 400 }
      );
    }

    let parentPath = path.dirname(normalizedPath);

    if (parentPath === normalizedPath) {
      parentPath = "";
    }

    const entries = safeReadDirectories(normalizedPath);

    return NextResponse.json({
      ok: true,
      mode: "directories",
      currentPath: normalizedPath,
      parentPath,
      entries
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || String(error)
      },
      { status: 500 }
    );
  }
}