const COMMON_SECRET_KEYS = [
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDE_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS"
];

const SCRUB_BY_POLICY = {
  "claude-code-oauth": [
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "CLAUDE_API_KEY",
    "OPENROUTER_API_KEY"
  ],
  "codex-chatgpt-oauth": [
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY"
  ],
  "gemini-google-login": [
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY"
  ],
  "opencode-native": [
    "OPENROUTER_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY"
  ],
  "hermes": [],
  "api-openrouter": [],
  "api-openai": [],
  "api-anthropic": [],
  "api-gemini": [],
  "local-ollama": []
};

export function getScrubbedKeysForAgent(agent = {}) {
  if (!agent || !agent.envPolicy) return [];
  return SCRUB_BY_POLICY[agent.envPolicy] || [];
}

export function buildAgentEnv(baseEnv = process.env, agent = {}, extraEnv = {}) {
  const env = { ...baseEnv, ...extraEnv };
  const scrubbedKeys = getScrubbedKeysForAgent(agent);

  for (const key of scrubbedKeys) {
    delete env[key];
  }

  return env;
}

export function summarizeEnvPolicy(agent = {}) {
  const scrubbedKeys = getScrubbedKeysForAgent(agent);

  return {
    agentId: agent.id || "",
    kind: agent.kind || "",
    authMode: agent.authMode || "",
    envPolicy: agent.envPolicy || "",
    scrubbedKeys,
    apiKeysAreBlocked: scrubbedKeys.some((key) => COMMON_SECRET_KEYS.includes(key))
  };
}
