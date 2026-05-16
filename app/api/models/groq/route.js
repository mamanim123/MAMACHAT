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

function shortContext(value) {
  const n = Number(value || 0);
  if (!n) return "-";
  if (n >= 1000000) return Math.round(n / 1000000) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return String(n);
}

function safeId(value) {
  return String(value || "").trim();
}


function isChatModel(id) {
  const value = String(id || "").toLowerCase();
  return (
    value &&
    !value.includes("whisper") &&
    !value.includes("tts") &&
    !value.includes("audio") &&
    !value.includes("speech") &&
    !value.includes("orpheus") &&
    !value.includes("guard") &&
    !value.includes("embed")
  );
}

function scoreGroq(id) {
  const value = String(id || "").toLowerCase();
  let score = 0;
  if (value.includes("llama")) score += 180;
  if (value.includes("qwen")) score += 160;
  if (value.includes("deepseek")) score += 150;
  if (value.includes("70b")) score += 120;
  if (value.includes("120b")) score += 140;
  if (value.includes("8b")) score += 80;
  if (value.includes("instant")) score += 70;
  if (value.includes("versatile")) score += 90;
  if (value.includes("preview")) score += 40;
  return score;
}

function normalize(model, index) {
  const id = safeId(model.id);
  return {
    id: "groq/" + id,
    nativeId: id,
    label: model.id || id,
    name: model.id || id,
    provider: "groq",
    source: "groq-live",
    tier: "free-tier",
    contextLength: Number(model.context_window || model.contextLength || model.context_length || 0),
    minContext: Number(model.context_window || model.contextLength || model.context_length || 0),
    hermesCompatible: true,
    rank: index + 1,
    groupLabel: index < 5 ? "Popular " + (index + 1) : "Latest " + (index - 4),
    groupType: index < 5 ? "popular" : "latest",
    badges: [index < 5 ? "Popular" : "Latest", "FREE TIER", "Rate limit"],
    note: "Groq live model"
  };
}

export async function GET() {
  try {
    const env = readEnv();
    const apiKey = env.GROQ_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "GROQ_API_KEY is required", models: [] },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + apiKey
      },
      cache: "no-store"
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: json?.error?.message || "Groq models fetch failed: " + res.status, details: json, models: [] },
        { status: res.status }
      );
    }

    const rawModels = Array.isArray(json.data) ? json.data : [];
    const models = rawModels
      .filter((item) => isChatModel(item.id))
      .sort((a, b) => scoreGroq(b.id) - scoreGroq(a.id))
      .slice(0, 8)
      .map(normalize);

    return NextResponse.json({
      ok: true,
      provider: "groq",
      source: "groq-live",
      totalCount: rawModels.length,
      count: models.length,
      policy: "dynamic-popular-8",
      models
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error), models: [] },
      { status: 500 }
    );
  }
}
