import { NextResponse } from "next/server";
import { readAgentRegistry, getAgentDisplayGroups } from "../../lib/agentRegistry.js";
import { summarizeEnvPolicy } from "../../lib/agentEnv.js";

export async function GET() {
  try {
    const registry = readAgentRegistry();
    const agents = registry.agents.map((agent) => ({
      ...agent,
      envSummary: summarizeEnvPolicy(agent)
    }));

    return NextResponse.json({
      ok: true,
      version: registry.version,
      defaultAgentId: registry.defaultAgentId,
      uiPolicy: registry.uiPolicy,
      safetyPolicy: registry.safetyPolicy,
      agents,
      groups: getAgentDisplayGroups()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error && error.message ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
