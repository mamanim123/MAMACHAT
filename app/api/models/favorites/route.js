export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getConfigRoot } from "../../../lib/portablePaths.js";

function getFavoritesPath() {
  fs.mkdirSync(getConfigRoot(), { recursive: true });
  return path.join(getConfigRoot(), "model-favorites.json");
}

function readFavorites() {
  const filePath = getFavoritesPath();
  if (!fs.existsSync(filePath)) return [];

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(items) {
  const unique = Array.from(new Set(items.filter(Boolean).map(String))).sort();
  fs.writeFileSync(getFavoritesPath(), JSON.stringify(unique, null, 2), "utf8");
  return unique;
}

export async function GET() {
  try {
    const favorites = readFavorites();

    return NextResponse.json({
      ok: true,
      count: favorites.length,
      favorites
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const modelId = String(body.modelId || body.id || "").trim();
    const favorite = body.favorite !== false;

    if (!modelId) {
      return NextResponse.json(
        { ok: false, error: "modelId is required" },
        { status: 400 }
      );
    }

    const current = readFavorites();
    const next = favorite
      ? [...current, modelId]
      : current.filter((item) => item !== modelId);

    const favorites = writeFavorites(next);

    return NextResponse.json({
      ok: true,
      modelId,
      favorite,
      count: favorites.length,
      favorites
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
