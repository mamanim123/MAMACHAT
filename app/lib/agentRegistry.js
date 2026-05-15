import fs from "fs";
import path from "path";

const AGENTS_PATH = path.join(process.cwd(), "config", "agents.json");

export function readAgentRegistry() {
  if (!fs.existsSync(AGENTS_PATH)) {
    return {
      version: 1,
      defaultAgentId: "hermes",
      agents: [],
      groups: [],
      uiPolicy: {},
      safetyPolicy: {}
    };
  }

  const raw = fs.readFileSync(AGENTS_PATH, "utf8").replace(/^\uFEFF/, "");
  const data = JSON.parse(raw);

  return {
    version: data.version || 1,
    defaultAgentId: data.defaultAgentId || "hermes",
    agents: Array.isArray(data.agents) ? data.agents : [],
    groups: Array.isArray(data.groups) ? data.groups : [],
    uiPolicy: data.uiPolicy || {},
    safetyPolicy: data.safetyPolicy || {}
  };
}

export function listAgents() {
  return readAgentRegistry().agents;
}

export function getAgent(agentId = "") {
  const registry = readAgentRegistry();
  const id = agentId || registry.defaultAgentId;
  return registry.agents.find((agent) => agent.id === id) || null;
}

export function listAgentsByKind(kind = "") {
  return listAgents().filter((agent) => agent.kind === kind);
}

export function shouldShowApiModelPicker(agent) {
  if (!agent) return false;
  return Boolean(agent.allowApiModelPicker);
}

export function shouldShowFreeModels(agent) {
  if (!agent) return false;
  return Boolean(agent.allowFreeModels);
}

export function getAgentDisplayGroups() {
  const registry = readAgentRegistry();
  return registry.groups.map((group) => ({
    ...group,
    agents: registry.agents.filter((agent) => Array.isArray(group.kinds) && group.kinds.includes(agent.kind))
  }));
}
