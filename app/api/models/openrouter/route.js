export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getConfigRoot } from "../../../lib/portablePaths.js";

const CACHE_TTL_MS = 1000 * 60 * 30;

function getCachePath() {
  const dir = path.join(getConfigRoot(), "cache");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "openrouter-models.json");
}

function readCache() {
  const filePath = getCachePath();
  if (!fs.existsSync(filePath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!data?.cachedAt || !Array.isArray(data.models)) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(models) {
  const payload = {
    cachedAt: new Date().toISOString(),
    models
  };

  fs.writeFileSync(getCachePath(), JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function priceTier(model) {
  const pricing = model.pricing || {};
  const prompt = Number(pricing.prompt || 0);
  const completion = Number(pricing.completion || 0);
  const total = prompt + completion;

  if (model.id?.endsWith(":free") || total === 0) return "free";
  if (total <= 0.000002) return "cheap";
  if (total >= 0.00005) return "expensive";
  return "paid";
}

function normalizeModel(model) {
  const contextLength =
    model.context_length ||
    model.top_provider?.context_length ||
    0;

  return {
    id: model.id,
    label: model.name || model.id,
    name: model.name || model.id,
    provider: "openrouter",
    source: "openrouter-live",
    note:
      (model.id?.endsWith(":free") ? "??" : "OpenRouter") +
      " ? context " +
      Number(contextLength || 0).toLocaleString(),
    minContext: contextLength,
    contextLength,
    tier: priceTier(model),
    pricing: model.pricing || null,
    architecture: model.architecture || null,
    supportedParameters: model.supported_parameters || [],
    useCase: ["general"],
    hermesCompatible: contextLength >= 64000,
    warning:
      contextLength && contextLength < 64000
        ? "Hermes ?? 64K context ?? ??"
        : "",
    created: model.created || null
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    const cached = readCache();
    const cacheAge = cached?.cachedAt
      ? Date.now() - Date.parse(cached.cachedAt)
      : Infinity;

    if (!refresh && cached && cacheAge < CACHE_TTL_MS) {
      return NextResponse.json({
        ok: true,
        source: "cache",
        cachedAt: cached.cachedAt,
        count: cached.models.length,
        models: cached.models
      });
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!res.ok) {
      if (cached) {
        return NextResponse.json({
          ok: true,
          source: "cache-fallback",
          warning: "OpenRouter fetch failed: " + res.status,
          cachedAt: cached.cachedAt,
          count: cached.models.length,
          models: cached.models
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error: "OpenRouter fetch failed: " + res.status + " " + res.statusText
        },
        { status: 502 }
      );
    }

    const json = await res.json();
    const rawModels = Array.isArray(json.data) ? json.data : [];
    const models = rawModels
      .filter((item) => item?.id)
      .map(normalizeModel)
      .sort((a, b) => {
        const af = a.tier === "free" ? 0 : 1;
        const bf = b.tier === "free" ? 0 : 1;
        if (af !== bf) return af - bf;
        return String(a.id).localeCompare(String(b.id));
      });

    const payload = writeCache(models);

    return NextResponse.json({
      ok: true,
      source: "openrouter",
      cachedAt: payload.cachedAt,
      count: models.length,
      models
    });
  } catch (error) {
    const cached = readCache();

    if (cached) {
      return NextResponse.json({
        ok: true,
        source: "cache-fallback",
        warning: error.message || String(error),
        cachedAt: cached.cachedAt,
        count: cached.models.length,
        models: cached.models
      });
    }

    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
