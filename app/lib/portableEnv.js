import fs from "fs";
import path from "path";
import { getPortableRoot, getSecretsRoot, getConfigRoot } from "./portablePaths.js";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const result = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    const rawValue = match[2].trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    result[key] = value;
  }

  return result;
}

export function loadPortableEnv() {
  const root = getPortableRoot();
  const secretsRoot = getSecretsRoot();

  return {
    ...parseEnvFile(path.join(root, ".env")),
    ...parseEnvFile(path.join(root, ".env.local")),
    ...parseEnvFile(path.join(secretsRoot, ".env")),
    ...parseEnvFile(path.join(secretsRoot, ".env.local")),
    ...process.env
  };
}

export function readProviderConfig() {
  const filePath = path.join(getConfigRoot(), "providers.json");

  if (!fs.existsSync(filePath)) {
    return {
      apiProviders: []
    };
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {
      apiProviders: []
    };
  }
}

export function getProviderEnvKey(providerId) {
  const config = readProviderConfig();
  const provider = (config.apiProviders || []).find((item) => item.id === providerId);

  return provider?.envKey || "";
}

export function getSecretValue(name) {
  if (!name) return "";

  const env = loadPortableEnv();
  return env[name] || "";
}
