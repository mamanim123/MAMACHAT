export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getEnvFilePath() {
  return path.join(process.cwd(), "runtime", "hermes", "home", ".env");
}

function parseEnv(text) {
  const out = {};
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
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
    out[key] = value;
  }
  return out;
}

function readEnv() {
  const filePath = getEnvFilePath();
  const fileEnv = fs.existsSync(filePath) ? parseEnv(fs.readFileSync(filePath, "utf8")) : {};
  return { ...fileEnv, ...process.env };
}

function contextForDeepSeek(id) {
  const value = String(id || "").toLowerCase();
  if (value.includes("v4")) return 128000;
  return 64000;
}

function normalizeDeepSeek(model, index) {
  const id = String(model.id || "");
  const contextLength = contextForDeepSeek(id);
  const isFlash = id.includes("flash");

  return {
    id: "deepseek/" + id,
    nativeId: id,
    label: id.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
    name: id,
    provider: "deepseek",
    source: "deepseek-live",
    tier: "api",
    contextLength,
    minContext: contextLength,
    hermesCompatible: contextLength >= 64000,
    rank: index + 1,
    ownedBy: model.owned_by || "deepseek",
    badges: [
      "\\uCD94\\uCC9C\\uC21C " + (index + 1),
      isFlash ? "\\uBE60\\uB978\\uBAA8\\uB378" : "\\uACE0\\uC131\\uB2A5",
      "API KEY",
      contextLength >= 128000 ? "128K+" : "64K+"
    ],
    note: "DeepSeek API live model"
  };
}

export async function GET() {
  try {
    const env = readEnv();
    const apiKey = env.DEEPSEEK_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "DEEPSEEK_API_KEY is required", models: [] },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.deepseek.com/models", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + apiKey
      },
      cache: "no-store"
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: json?.error?.message || "DeepSeek models fetch failed: " + res.status,
          details: json
        },
        { status: res.status }
      );
    }

    const rawModels = Array.isArray(json.data) ? json.data : [];
    const models = rawModels
      .filter((item) => item?.id)
      .sort((a, b) => {
        const af = String(a.id).includes("flash") ? 0 : 1;
        const bf = String(b.id).includes("flash") ? 0 : 1;
        if (af !== bf) return af - bf;
        return String(a.id).localeCompare(String(b.id));
      })
      .map(normalizeDeepSeek);

    return NextResponse.json({
      ok: true,
      provider: "deepseek",
      source: "deepseek-live",
      count: models.length,
      models
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error), models: [] },
      { status: 500 }
    );
  }
}
