import { execFileSync } from "child_process";

export function normalizeWindowsPath(inputPath) {
  return String(inputPath || "").replace(/\//g, "\\").replace(/\\+$/, "");
}

export function fallbackWindowsToWslPath(inputPath) {
  const windowsPath = normalizeWindowsPath(inputPath);

  const driveMatch = windowsPath.match(/^([a-zA-Z]):\\(.*)$/);

  if (!driveMatch) {
    return "";
  }

  const drive = driveMatch[1].toLowerCase();
  const rest = driveMatch[2]
    .split("\\")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part).replace(/%20/g, " "))
    .join("/");

  return "/mnt/" + drive + (rest ? "/" + rest : "");
}

export function toWslPath(windowsPath) {
  const normalized = normalizeWindowsPath(windowsPath);

  if (process.platform !== "win32") {
    return normalized.replace(/\\/g, "/");
  }

  try {
    const result = execFileSync("wsl.exe", ["wslpath", "-a", normalized], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    }).trim();

    if (result) {
      return result;
    }
  } catch {
    // fallback below
  }

  return fallbackWindowsToWslPath(normalized);
}

export function joinWslPath(...parts) {
  return parts
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
}