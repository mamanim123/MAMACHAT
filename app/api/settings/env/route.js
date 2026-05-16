export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const KNOWN_KEYS = [
  "GOOGLE_TTS_HARD_STOP",
  "GOOGLE_TTS_WARN_AT",
  "GOOGLE_TTS_MONTHLY_LIMIT",
  "GOOGLE_TTS_LANGUAGE",
  "GOOGLE_TTS_VOICE",
  "GOOGLE_TTS_API_KEY",
  "TAVILY_API_KEY",
  "CUSTOM_API_MODEL",
  "CUSTOM_API_BASE_URL",
  "CUSTOM_API_NAME",
  "CF_ACCOUNT_ID",
  "CLOUDFLARE_ACCOUNT_ID",
  "NGC_API_KEY",
  "NVIDIA_API_KEY",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "DEEPSEEK_API_KEY",
  "GITHUB_TOKEN",
  "ZAI_API_KEY",
  "MISTRAL_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "COHERE_API_KEY",
  "OLLAMA_BASE_URL",
  "CUSTOM_API_KEY"
];

function getEnvFilePath() {
  const dir = path.join(process.cwd(), "runtime", "hermes", "home");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, ".env");
}

function parseEnv(text) {
  const result = {};

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) result[key] = value;
  }

  return result;
}

function readEnvStore() {
  const filePath = getEnvFilePath();
  if (!fs.existsSync(filePath)) return {};
  return parseEnv(fs.readFileSync(filePath, "utf8"));
}

function writeEnvStore(store) {
  const keys = Object.keys(store).sort();
  const lines = keys.map((key) => {
    const value = String(store[key] ?? "");
    const safeValue = value.includes("\n") ? value.replace(/\r?\n/g, "") : value;
    return key + "=" + safeValue;
  });

  fs.writeFileSync(getEnvFilePath(), lines.join("\n") + "\n", "utf8");
}

function maskSecret(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= 10) return text + "????";
  return text.slice(0, 10) + "????";
}

function getAllKeys(store) {
  return Array.from(new Set([...KNOWN_KEYS, ...Object.keys(store), ...Object.keys(process.env)])).sort();
}

export async function GET() {
  try {
    const store = readEnvStore();
    const keys = getAllKeys(store);

    return NextResponse.json({
      ok: true,
      file: getEnvFilePath(),
      items: keys.map((key) => {
        const rawValue = store[key] || process.env[key] || "";
        return {
          key,
          configured: Boolean(rawValue),
          source: store[key] ? "runtime-env-file" : process.env[key] ? "process-env" : "empty",
          preview: maskSecret(rawValue)
        };
      })
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const key = String(body.key || "").trim();
    const value = String(body.value || "").trim();

    if (!key || !value) {
      return NextResponse.json(
        { ok: false, error: "key and value are required" },
        { status: 400 }
      );
    }

    const store = readEnvStore();
    store[key] = value;
    writeEnvStore(store);

    return NextResponse.json({
      ok: true,
      key,
      configured: true,
      preview: maskSecret(value),
      message: key + " saved"
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  return POST(request);
}

export async function DELETE(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const key = String(body.key || "").trim();

    if (!key) {
      return NextResponse.json(
        { ok: false, error: "key is required" },
        { status: 400 }
      );
    }

    const store = readEnvStore();
    delete store[key];
    writeEnvStore(store);

    return NextResponse.json({
      ok: true,
      key,
      configured: false,
      message: key + " deleted"
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
