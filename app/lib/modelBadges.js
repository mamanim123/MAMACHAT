import fs from "fs";
import path from "path";

const BADGES_PATH = path.join(process.cwd(), "config", "model-badges.json");

export function readModelBadges() {
  if (!fs.existsSync(BADGES_PATH)) {
    return {
      version: 1,
      openrouterFreePopularitySeeds: [],
      cliAgents: []
    };
  }

  const raw = fs.readFileSync(BADGES_PATH, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

export function getFreeModelSeedMap() {
  const data = readModelBadges();
  const map = new Map();

  for (const item of data.openrouterFreePopularitySeeds || []) {
    if (item.id) map.set(item.id, item);
  }

  return map;
}

export function enrichOpenRouterModel(model = {}, favorites = []) {
  const seed = getFreeModelSeedMap().get(model.id) || null;
  const contextLength = Number(model.contextLength || model.context_length || model.minContext || 0);
  const created = Number(model.created || 0);
  const isFavorite = favorites.includes(model.id);
  const isFree =
    String(model.id || "").includes(":free") ||
    Number(model?.pricing?.prompt || model?.pricingPrompt || 0) === 0;

  const badges = [];

  if (isFavorite) badges.push("즐겨찾기");
  if (isFree) badges.push("FREE");
  if (seed?.rank) badges.push(seed.rank === 1 ? "인기 TOP" : "인기 #" + seed.rank);
  if (created > 0) badges.push("최신순");
  if (contextLength >= 64000) badges.push("64K+");
  if (contextLength >= 200000) badges.push("대용량");

  for (const badge of seed?.badges || []) {
    if (!badges.includes(badge)) badges.push(badge);
  }

  return {
    ...model,
    manualPopularityRank: seed?.rank || 9999,
    contextLength,
    created,
    badges
  };
}

export function getCliAgentModels(agentId = "") {
  const data = readModelBadges();
  const found = (data.cliAgents || []).find((item) => item.agentId === agentId);

  if (!found) return [];

  return [...(found.models || [])].sort((a, b) => {
    const ar = Number(a.releaseRank || 9999);
    const br = Number(b.releaseRank || 9999);
    if (ar !== br) return ar - br;
    return String(a.label || a.id).localeCompare(String(b.label || b.id));
  });
}

export function getCliAgentModelSummary(agentId = "") {
  const models = getCliAgentModels(agentId);
  return {
    agentId,
    count: models.length,
    latest: models[0] || null,
    models
  };
}
