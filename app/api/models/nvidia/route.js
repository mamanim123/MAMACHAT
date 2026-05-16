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
    !value.includes("embed") &&
    !value.includes("rerank") &&
    !value.includes("audio") &&
    !value.includes("image") &&
    !value.includes("safety") &&
    !value.includes("guard") &&
    !value.includes("-vl") &&
    !value.includes("vision")
  );
}

function scoreNvidia(id) {
  const value = String(id || "").toLowerCase();
  let score = 0;
  if (value.includes("nemotron")) score += 300;
  if (value.includes("llama")) score += 180;
  if (value.includes("qwen")) score += 160;
  if (value.includes("405b")) score += 150;
  if (value.includes("120b")) score += 140;
  if (value.includes("70b")) score += 120;
  if (value.includes("reasoning")) score += 90;
  if (value.includes("instruct")) score += 70;
  return score;
}

function normalize(model, index) {
  const rawId = safeId(model.id || model.name);
  const id = rawId.includes("/") ? rawId : "nvidia/" + rawId;

  return {
    id,
    nativeId: rawId,
    label: model.id || model.name || id,
    name: model.id || model.name || id,
    provider: "nvidia",
    source: "nvidia-live",
    tier: "free-dev-api",
    contextLength: Number(model.context_length || model.contextLength || 0),
    minContext: Number(model.context_length || model.contextLength || 0),
    hermesCompatible: true,
    rank: index + 1,
    groupLabel: index < 5 ? "Popular " + (index + 1) : "Latest " + (index - 4),
    groupType: index < 5 ? "popular" : "latest",
    badges: [index < 5 ? "Popular" : "Latest", "NIM", "Dev API"],
    note: "NVIDIA NIM live model"
  };
}

export async function GET() {
  try {
    const env = readEnv();
    const apiKey = env.NVIDIA_API_KEY || env.NGC_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "NVIDIA_API_KEY or NGC_API_KEY is required", models: [] },
        { status: 400 }
      );
    }

    const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + apiKey
      },
      cache: "no-store"
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: json?.error?.message || "NVIDIA models fetch failed: " + res.status, details: json, models: [] },
        { status: res.status }
      );
    }

    const rawModels = Array.isArray(json.data) ? json.data : Array.isArray(json.models) ? json.models : [];
    const models = rawModels
      .filter((item) => isChatModel(item.id || item.name))
      .sort((a, b) => scoreNvidia(b.id || b.name) - scoreNvidia(a.id || a.name))
      .slice(0, 8)
      .map(normalize);

    return NextResponse.json({
      ok: true,
      provider: "nvidia",
      source: "nvidia-live",
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
