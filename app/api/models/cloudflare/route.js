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


const FALLBACK_MODELS = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/openai/gpt-oss-120b",
  "@cf/openai/gpt-oss-20b",
  "@cf/google/gemma-3-12b-it"
];

function scoreCloudflare(id) {
  const value = String(id || "").toLowerCase();
  let score = 0;
  if (value.includes("llama-4")) score += 260;
  if (value.includes("llama-3.3")) score += 230;
  if (value.includes("gpt-oss-120b")) score += 220;
  if (value.includes("gemma")) score += 180;
  if (value.includes("70b")) score += 160;
  if (value.includes("120b")) score += 180;
  if (value.includes("instruct")) score += 80;
  if (value.includes("fast")) score += 60;
  return score;
}

function normalize(id, index, source) {
  return {
    id: "cloudflare/" + id,
    nativeId: id,
    label: id.replace("@cf/", "").replaceAll("/", " / "),
    name: id,
    provider: "cloudflare",
    source,
    tier: "free-quota",
    contextLength: 0,
    minContext: 0,
    hermesCompatible: true,
    rank: index + 1,
    groupLabel: index < 5 ? "Popular " + (index + 1) : "Latest " + (index - 4),
    groupType: index < 5 ? "popular" : "latest",
    badges: [index < 5 ? "Popular" : "Latest", "Workers AI", "Free quota"],
    note: "Cloudflare Workers AI model"
  };
}

export async function GET() {
  try {
    const env = readEnv();
    const token = env.CLOUDFLARE_API_TOKEN || "";
    const accountId = env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID || "";

    if (!token || !accountId) {
      return NextResponse.json(
        {
          ok: false,
          error: "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required",
          models: FALLBACK_MODELS.map((id, index) => normalize(id, index, "cloudflare-fallback"))
        },
        { status: 400 }
      );
    }

    let ids = [];
    try {
      const res = await fetch("https://developers.cloudflare.com/workers-ai/models/", {
        headers: { Accept: "text/html" },
        cache: "no-store"
      });
      const html = await res.text();
      ids = Array.from(new Set((html.match(/@cf\/[a-zA-Z0-9._/-]+/g) || [])))
        .filter((id) => {
          const value = id.toLowerCase();
          return (
            !value.includes("embed") &&
            !value.includes("whisper") &&
            !value.includes("stable-diffusion") &&
            !value.includes("flux") &&
            !value.includes("reranker") &&
            !value.includes("moderation") &&
            !value.includes("lora") &&
            !value.includes("vision") &&
            !value.includes("vl")
          );
        });
    } catch {
      ids = [];
    }

    if (ids.length === 0) ids = FALLBACK_MODELS;

    const models = ids
      .sort((a, b) => scoreCloudflare(b) - scoreCloudflare(a))
      .slice(0, 8)
      .map((id, index) => normalize(id, index, ids === FALLBACK_MODELS ? "cloudflare-fallback" : "cloudflare-docs-live"));

    return NextResponse.json({
      ok: true,
      provider: "cloudflare",
      source: "cloudflare-workers-ai",
      totalCount: ids.length,
      count: models.length,
      policy: "docs-catalog-popular-8",
      models
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error), models: [] },
      { status: 500 }
    );
  }
}
