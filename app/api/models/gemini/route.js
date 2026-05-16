export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const POPULAR_LIMIT = 5;
const LATEST_LIMIT = 3;

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
  const fileEnv = fs.existsSync(filePath)
    ? parseEnv(fs.readFileSync(filePath, "utf8"))
    : {};

  return { ...fileEnv, ...process.env };
}

function nativeIdOf(model) {
  return String(model.name || "").replace(/^models\//, "");
}

function shortContext(value) {
  const n = Number(value || 0);
  if (!n) return "-";
  if (n >= 1000000) return Math.round(n / 1000000) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return String(n);
}

function isGenerateContentGemini(model) {
  const id = nativeIdOf(model).toLowerCase();
  const methods = Array.isArray(model.supportedGenerationMethods)
    ? model.supportedGenerationMethods
    : [];

  return id.includes("gemini") && methods.includes("generateContent");
}

function isSpecialPurpose(id) {
  const value = String(id || "").toLowerCase();

  return (
    value.includes("tts") ||
    value.includes("image") ||
    value.includes("robotics") ||
    value.includes("computer-use") ||
    value.includes("embedding") ||
    value.includes("aqa") ||
    value.includes("customtools")
  );
}

function isLatestLike(id, version) {
  const value = String(id || "").toLowerCase();
  const ver = String(version || "").toLowerCase();

  return (
    value.includes("latest") ||
    value.includes("preview") ||
    value.includes("experimental") ||
    value.includes("exp") ||
    value.includes("3.") ||
    value.includes("3-") ||
    ver.includes("2026") ||
    ver.includes("2025") ||
    ver.includes("preview")
  );
}

function numberScore(text) {
  const source = String(text || "");
  const matches = source.match(/\d+(?:\.\d+)?/g) || [];
  let score = 0;

  for (const item of matches) {
    const n = Number(item);
    if (Number.isFinite(n)) score = Math.max(score, n * 100);
  }

  if (source.includes("2026")) score += 500;
  if (source.includes("2025")) score += 300;

  return score;
}

function popularityScore(model) {
  const id = nativeIdOf(model).toLowerCase();
  const version = String(model.version || "").toLowerCase();
  const context = Number(model.inputTokenLimit || 0);

  let score = 0;

  score += Math.min(context / 10000, 120);
  score += numberScore(id + " " + version);

  if (id.includes("flash")) score += 400;
  if (id.includes("pro")) score += 180;
  if (id.includes("lite")) score += 70;

  if (id.includes("latest")) score -= 120;
  if (id.includes("preview")) score -= 160;
  if (id.includes("experimental") || id.includes("exp")) score -= 180;

  if (id.includes("-001")) score += 10;
  if (id.includes("1.5")) score -= 300;

  return score;
}

function latestScore(model) {
  const id = nativeIdOf(model).toLowerCase();
  const version = String(model.version || "").toLowerCase();
  const context = Number(model.inputTokenLimit || 0);

  let score = 0;

  score += numberScore(id + " " + version);
  score += Math.min(context / 10000, 100);

  if (id.includes("3.1")) score += 700;
  if (id.includes("3-")) score += 600;
  if (id.includes("latest")) score += 500;
  if (id.includes("preview")) score += 400;
  if (id.includes("flash")) score += 180;
  if (id.includes("lite")) score += 90;
  if (id.includes("pro")) score += 60;

  return score;
}

function normalizeGemini(model, rank, groupLabel, groupType) {
  const nativeId = nativeIdOf(model);
  const inputLimit = Number(model.inputTokenLimit || 0);
  const outputLimit = Number(model.outputTokenLimit || 0);
  const displayName = model.displayName || nativeId;
  const isPro = nativeId.toLowerCase().includes("pro");

  const badges = [
    groupLabel,
    groupType === "latest" ? "Latest" : "Popular",
    isPro ? "High performance" : "FREE TIER",
    shortContext(inputLimit)
  ].filter(Boolean);

  return {
    id: "google/" + nativeId,
    nativeId,
    label: displayName,
    name: displayName,
    provider: "gemini",
    source: "gemini-live-dynamic",
    tier: isPro ? "paid-possible" : "free",
    contextLength: inputLimit,
    minContext: inputLimit,
    outputLimit,
    version: model.version || "",
    supportedMethods: model.supportedGenerationMethods || [],
    hermesCompatible: inputLimit >= 64000,
    rank,
    groupLabel,
    groupType,
    badges,
    popularityScore: Math.round(popularityScore(model)),
    latestScore: Math.round(latestScore(model)),
    note: "Gemini API dynamic model ? context " + shortContext(inputLimit)
  };
}

function curateModels(rawModels) {
  const usable = rawModels
    .filter(isGenerateContentGemini)
    .filter((model) => !isSpecialPurpose(nativeIdOf(model)));

  const popular = usable
    .filter((model) => !isLatestLike(nativeIdOf(model), model.version))
    .sort((a, b) => {
      const diff = popularityScore(b) - popularityScore(a);
      if (diff !== 0) return diff;
      return Number(b.inputTokenLimit || 0) - Number(a.inputTokenLimit || 0);
    })
    .slice(0, POPULAR_LIMIT);

  const selected = new Set(popular.map((model) => nativeIdOf(model)));

  const latest = usable
    .filter((model) => !selected.has(nativeIdOf(model)))
    .filter((model) => isLatestLike(nativeIdOf(model), model.version))
    .sort((a, b) => {
      const diff = latestScore(b) - latestScore(a);
      if (diff !== 0) return diff;
      return Number(b.inputTokenLimit || 0) - Number(a.inputTokenLimit || 0);
    })
    .slice(0, LATEST_LIMIT);

  return [
    ...popular.map((model, index) =>
      normalizeGemini(model, index + 1, "Popular " + (index + 1), "popular")
    ),
    ...latest.map((model, index) =>
      normalizeGemini(model, popular.length + index + 1, "Latest " + (index + 1), "latest")
    )
  ];
}

export async function GET() {
  try {
    const env = readEnv();
    const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "GEMINI_API_KEY is required", models: [] },
        { status: 400 }
      );
    }

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(apiKey),
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: json?.error?.message || "Gemini models fetch failed: " + res.status,
          details: json
        },
        { status: res.status }
      );
    }

    const rawModels = Array.isArray(json.models) ? json.models : [];

    const usable = rawModels
      .filter(isGenerateContentGemini)
      .filter((model) => !isSpecialPurpose(nativeIdOf(model)));

    const models = curateModels(rawModels);

    return NextResponse.json({
      ok: true,
      provider: "gemini",
      source: "gemini-live-dynamic",
      totalCount: rawModels.length,
      usableCount: usable.length,
      count: models.length,
      policy: "dynamic-popular-5-plus-latest-3",
      models
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error), models: [] },
      { status: 500 }
    );
  }
}
