export const HERMES_MIN_CONTEXT = 64000;

export const MODEL_PRESETS = [
  {
    group: "Recommended Free Models",
    models: [
      {
        rank: 1,
        id: "nvidia/nemotron-3-super-120b-a12b:free",
        label: "NVIDIA Nemotron 3 Super Free",
        provider: "openrouter",
        note: "Free, 262K context, verified with Hermes real run. Best current default for agent work.",
        minContext: 262000,
        tier: "free",
        useCase: ["general", "research", "agent"],
        hermesCompatible: true,
        verified: true,
        recommended: true
      },
      {
        rank: 2,
        id: "openrouter/owl-alpha",
        label: "Owl Alpha",
        provider: "openrouter",
        note: "Free, very large context. Good for research and agentic workloads if available.",
        minContext: 1050000,
        tier: "free",
        useCase: ["agent", "research"],
        hermesCompatible: true
      },
      {
        rank: 3,
        id: "poolside/laguna-m.1:free",
        label: "Poolside Laguna M.1 Free",
        provider: "openrouter",
        note: "Free, 131K context. Good candidate for coding-agent tasks.",
        minContext: 131000,
        tier: "free",
        useCase: ["code", "agent"],
        hermesCompatible: true
      },
      {
        rank: 4,
        id: "inclusionai/ring-2.6-1t:free",
        label: "inclusionAI Ring-2.6-1T Free",
        provider: "openrouter",
        note: "Free, 262K context. Candidate for coding and tool-use work.",
        minContext: 262000,
        tier: "free",
        useCase: ["code", "agent"],
        hermesCompatible: true
      },
      {
        rank: 5,
        id: "openai/gpt-oss-120b:free",
        label: "OpenAI GPT-OSS 120B Free",
        provider: "openrouter",
        note: "Free, 131K context. General fallback option.",
        minContext: 131000,
        tier: "free",
        useCase: ["general"],
        hermesCompatible: true
      },
      {
        rank: 6,
        id: "z-ai/glm-4.5-air:free",
        label: "Z.ai GLM 4.5 Air Free",
        provider: "openrouter",
        note: "Free, 131K context. Lightweight agent/general option.",
        minContext: 131000,
        tier: "free",
        useCase: ["agent", "general"],
        hermesCompatible: true
      },
      {
        rank: 7,
        id: "qwen/qwen3-coder:free",
        label: "Qwen3 Coder Free",
        provider: "openrouter",
        note: "Free, coding-focused model. Use when code generation is the main task.",
        minContext: 131000,
        tier: "free",
        useCase: ["code"],
        hermesCompatible: true
      },
      {
        rank: 8,
        id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        label: "NVIDIA Nemotron 3 Nano Omni Free",
        provider: "openrouter",
        note: "Free, 256K context. Reasoning/research candidate.",
        minContext: 256000,
        tier: "free",
        useCase: ["research", "general"],
        hermesCompatible: true
      }
    ]
  },
  {
    group: "OpenAI Models",
    models: [
      {
        rank: 1,
        id: "openai/gpt-oss-120b:free",
        label: "GPT-OSS 120B Free",
        provider: "openrouter",
        note: "Free, 131K context. Recommended free OpenAI-family option.",
        minContext: 131000,
        tier: "free",
        useCase: ["general"],
        hermesCompatible: true
      },
      {
        rank: 2,
        id: "openai/gpt-4.1",
        label: "GPT-4.1",
        provider: "openrouter",
        note: "Paid, strong general/coding/research model.",
        minContext: 200000,
        tier: "paid",
        useCase: ["general", "code", "research"],
        hermesCompatible: true
      },
      {
        rank: 3,
        id: "openai/gpt-4o",
        label: "GPT-4o",
        provider: "openrouter",
        note: "Paid, general multimodal-capable model.",
        minContext: 128000,
        tier: "paid",
        useCase: ["general", "research"],
        hermesCompatible: true
      },
      {
        rank: 99,
        id: "openai/gpt-4o-mini",
        label: "GPT-4o Mini",
        provider: "openrouter",
        note: "Not recommended for Hermes real run because Hermes may detect this as below 64K context.",
        minContext: 4096,
        tier: "cheap",
        useCase: ["general"],
        hermesCompatible: false,
        warning: "Below Hermes minimum 64K context requirement."
      }
    ]
  },
  {
    group: "Anthropic Models",
    models: [
      {
        rank: 1,
        id: "anthropic/claude-sonnet-4.6",
        label: "Claude Sonnet 4.6",
        provider: "openrouter",
        note: "Paid, strong coding/planning/analysis option.",
        minContext: 200000,
        tier: "paid",
        useCase: ["code", "general", "research"],
        hermesCompatible: true
      },
      {
        rank: 2,
        id: "anthropic/claude-opus-4.6",
        label: "Claude Opus 4.6",
        provider: "openrouter",
        note: "Expensive, high-quality model for complex research/coding.",
        minContext: 200000,
        tier: "expensive",
        useCase: ["code", "research"],
        hermesCompatible: true
      }
    ]
  },
  {
    group: "Google / Gemini Models",
    models: [
      {
        rank: 1,
        id: "google/gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        provider: "openrouter",
        note: "Paid, very large context. Good for long-document reasoning.",
        minContext: 1000000,
        tier: "paid",
        useCase: ["research", "general"],
        hermesCompatible: true
      },
      {
        rank: 2,
        id: "google/gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        provider: "openrouter",
        note: "Lower-cost fast model with large context.",
        minContext: 1000000,
        tier: "cheap",
        useCase: ["general"],
        hermesCompatible: true
      }
    ]
  },
  {
    group: "Qwen / Coding Models",
    models: [
      {
        rank: 1,
        id: "qwen/qwen3-coder:free",
        label: "Qwen3 Coder Free",
        provider: "openrouter",
        note: "Free coding model.",
        minContext: 131000,
        tier: "free",
        useCase: ["code"],
        hermesCompatible: true
      },
      {
        rank: 2,
        id: "qwen/qwen3-next-80b-a3b-instruct:free",
        label: "Qwen3 Next 80B Free",
        provider: "openrouter",
        note: "Free general model.",
        minContext: 131000,
        tier: "free",
        useCase: ["general"],
        hermesCompatible: true
      }
    ]
  },
  {
    group: "Meta Llama Models",
    models: [
      {
        rank: 1,
        id: "meta-llama/llama-3.3-70b-instruct:free",
        label: "Llama 3.3 70B Instruct Free",
        provider: "openrouter",
        note: "Free general fallback model.",
        minContext: 131000,
        tier: "free",
        useCase: ["general"],
        hermesCompatible: true
      }
    ]
  },
  {
    group: "Compatibility Warnings",
    models: [
      {
        rank: 1,
        id: "openrouter/free",
        label: "OpenRouter Free Router",
        provider: "openrouter",
        note: "Avoid for Hermes real run because actual routed model context may be detected incorrectly.",
        minContext: 4096,
        tier: "free",
        useCase: ["general"],
        hermesCompatible: false,
        warning: "Hermes may detect the routed model as below 64K context."
      }
    ]
  }
];

export function flattenModelPresets() {
  return MODEL_PRESETS.flatMap((group) =>
    group.models.map((model) => ({
      ...model,
      group: group.group
    }))
  );
}

export function getModelById(id) {
  if (!id) return null;
  return flattenModelPresets().find((model) => model.id === id) || null;
}

export function getRecommendedModel() {
  const models = flattenModelPresets()
    .filter((model) => model.hermesCompatible && model.minContext >= HERMES_MIN_CONTEXT)
    .sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      return (a.rank || 999) - (b.rank || 999);
    });

  return models[0] || null;
}

export function getModelWarning(modelOrId) {
  if (!modelOrId || modelOrId === "__custom__") return "";

  const model =
    typeof modelOrId === "string" ? getModelById(modelOrId) : modelOrId;

  if (!model) return "";
  if (model.warning) return model.warning;
  if (model.hermesCompatible === false) {
    return "This model is not recommended for Hermes real run.";
  }
  if (Number(model.minContext || 0) < HERMES_MIN_CONTEXT) {
    return `Below Hermes minimum ${HERMES_MIN_CONTEXT.toLocaleString()} context requirement.`;
  }

  return "";
}

export function isHermesCompatibleModel(modelOrId) {
  const model =
    typeof modelOrId === "string" ? getModelById(modelOrId) : modelOrId;

  if (!model) return false;
  return model.hermesCompatible !== false && Number(model.minContext || 0) >= HERMES_MIN_CONTEXT;
}

export function getModelsByUseCase(useCase) {
  if (!useCase) return flattenModelPresets();
  return flattenModelPresets().filter((model) =>
    Array.isArray(model.useCase) && model.useCase.includes(useCase)
  );
}

export function isHermesCompatible(modelOrId) {
  return isHermesCompatibleModel(modelOrId);
}

export function getTierLabel(tier) {
  const value = String(tier || "").toLowerCase();

  if (value === "free") return "Free";
  if (value === "cheap") return "Cheap";
  if (value === "paid") return "Paid";
  if (value === "expensive") return "Expensive";

  return value ? value : "Unknown";
}

export function getTierColor(tier) {
  const value = String(tier || "").toLowerCase();

  if (value === "free") return "#16a34a";
  if (value === "cheap") return "#2563eb";
  if (value === "paid") return "#9333ea";
  if (value === "expensive") return "#dc2626";

  return "#64748b";
}

export function getUseCaseLabel(useCase) {
  const value = String(useCase || "").toLowerCase();

  if (value === "agent") return "Agent";
  if (value === "code") return "Code";
  if (value === "coding") return "Code";
  if (value === "research") return "Research";
  if (value === "general") return "General";
  if (value === "writing") return "Writing";

  return value ? value : "General";
}
