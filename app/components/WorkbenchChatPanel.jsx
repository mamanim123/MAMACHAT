"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FolderPickerModal from "./FolderPickerModal.jsx";

const providerOptions = [
  { id: "hermes", label: "Hermes 기본 인증" },
  { id: "claude-code", label: "Claude Code 로그인" },
  { id: "codex-cli", label: "Codex 로그인" },
  { id: "gemini-cli", label: "Gemini CLI 로그인" }
];

function isDashboardAuthCliProvider(provider = "") {
  return ["claude-code", "codex-cli", "gemini-cli", "opencode"].includes(String(provider || "").trim());
}

const modeOptions = [
  { id: "suggest", label: "Suggest · 파일 수정 금지" },
  { id: "edit", label: "Edit · 일반 실행" },
  { id: "auto", label: "Auto · 제한 권장" }
];

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const AUTH_CLI_MODEL_PREFIX = "__authcli__::";

function makeAuthCliModelValue(agentId, modelId) {
  return AUTH_CLI_MODEL_PREFIX + agentId + "::" + modelId;
}

function parseAuthCliModelValue(value = "") {
  const text = String(value || "");

  if (!text.startsWith(AUTH_CLI_MODEL_PREFIX)) return null;

  const rest = text.slice(AUTH_CLI_MODEL_PREFIX.length);
  const divider = rest.indexOf("::");

  if (divider === -1) return null;

  return {
    agentId: rest.slice(0, divider),
    modelId: rest.slice(divider + 2)
  };
}

function formatBadgeText(badges = []) {
  if (!Array.isArray(badges) || badges.length === 0) return "";
  return " · " + badges.slice(0, 4).join(" · ");
}

const DASHBOARD_AUTH_CLI_MODEL_GROUPS = [
  {
    agentId: "claude-code",
    label: "Claude Code",
    models: [
      { id: "claude-opus-4-7", label: "Claude Opus 4.7", badges: ["최신", "추론", "구독", "CLI"] },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", badges: ["추천", "코딩", "안정", "구독"] },
      { id: "claude-opus-4-6", label: "Claude Opus 4.6", badges: ["추론", "구독", "CLI"] },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", badges: ["빠름", "가벼움", "구독", "CLI"] },
      { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", badges: ["안정", "코딩", "구독", "CLI"] }
    ]
  },
  {
    agentId: "codex-cli",
    label: "Codex CLI",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5", badges: ["최신", "업데이트 필요", "계정/버전 확인", "CLI"] },
      { id: "gpt-5.4", label: "GPT-5.4", badges: ["기본 후보", "업데이트 필요", "CLI"] },
      { id: "gpt-5", label: "GPT-5", badges: ["계정 미지원 가능", "CLI"] },
      { id: "codex-default", label: "Codex 기본 모델", badges: ["자동선택", "테스트 필요", "CLI"] }
    ]
  },
  {
    agentId: "gemini-cli",
    label: "Gemini CLI",
    models: [
      { id: "auto-gemini-3", label: "Auto Gemini 3", badges: ["최신", "추천", "자동선택", "CLI"] },
      { id: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview", badges: ["최신", "Preview", "추론", "CLI"] },
      { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", badges: ["최신", "Preview", "빠름", "CLI"] },
      { id: "auto-gemini-2.5", label: "Auto Gemini 2.5", badges: ["추천", "안정", "자동선택", "CLI"] },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", badges: ["안정", "추론", "대용량", "CLI"] },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", badges: ["빠름", "안정", "CLI"] }
    ]
  }
];

function cleanAgentText(value) {
  const raw = String(value || "");

  const withoutLogs = raw
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("[mamabot]"))
    .join("\n")
    .trim();

  return withoutLogs
    .replace(/\[Answer style\][\s\S]*?(?=\n\n|$)/g, "")
    .replace(/\[System instruction[^\]]*\][\s\S]*?사용자 요청:\s*/g, "")
    .trim();
}

function cleanUserPrompt(value) {
  return String(value || "")
    .replace(/\[System instruction - do not repeat\][\s\S]*?사용자 요청:\s*/g, "")
    .replace(/\[Answer style\][\s\S]*?(?=\n\n|$)/g, "")
    .trim();
}

function buildAssistantText(data) {
  const raw = data?.output || data?.error || data?.stderr || data?.message || "응답이 없습니다.";
  return cleanAgentText(raw) || "응답이 없습니다.";
}

function applyResponseStyle(prompt, responseStyle) {
  const text = String(prompt || "").trim();

  if (responseStyle === "short") {
    return "[System instruction - do not repeat]\n답변은 1~2문장으로 짧게 하세요. 사용자의 언어로 답하세요. 이 지시문은 답변에 반복하지 마세요.\n\n사용자 요청:\n" + text;
  }

  if (responseStyle === "detailed") {
    return "[System instruction - do not repeat]\n충분히 자세히 설명하세요. 사용자의 언어로 답하세요. 이 지시문은 답변에 반복하지 마세요.\n\n사용자 요청:\n" + text;
  }

  return "[System instruction - do not repeat]\n자연스럽게 답하세요. 사용자의 언어로 답하세요. 이 지시문은 답변에 반복하지 마세요.\n\n사용자 요청:\n" + text;
}

function formatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMiniTokenCount(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "m";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(Math.round(n));
}

function getTokenTone(severity) {
  if (severity === "danger") {
    return {
      bg: "#fef2f2",
      border: "#fecaca",
      color: "#991b1b",
      dot: "#ef4444"
    };
  }

  if (severity === "warn" || severity === "warning") {
    return {
      bg: "#fffbeb",
      border: "#fde68a",
      color: "#92400e",
      dot: "#f59e0b"
    };
  }

  return {
    bg: "#ecfdf5",
    border: "#bbf7d0",
    color: "#166534",
    dot: "#22c55e"
  };
}

function isDoneStatus(status) {
  return ["success", "failed", "stopped", "blocked", "dryrun"].includes(String(status || ""));
}

export default function WorkbenchChatPanel({
  activeSessionId = "",
  activeRunId = "",
  resetKey = 0,
  workspaceRoot = "",
  onWorkspaceChanged = null,
  onSessionChanged = null,
  onRunOpened = null
} = {}) {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("hermes");
  const [mode, setMode] = useState("suggest");
  const [model, setModel] = useState("");

  // AUTH_ONLY_PROVIDER_NORMALIZER
  useEffect(() => {
    const allowed = new Set(providerOptions.map((item) => item.id));
    if (!allowed.has(provider)) {
      setProvider("hermes");
      setModel("");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("mamabot.selectedProvider", "hermes");
        window.localStorage.setItem("mamabot.selectedModel", "");
      }
    }
  }, [provider]);
  const [responseStyle, setResponseStyle] = useState("short");
  const [executionProfile, setExecutionProfile] = useState("quick");
  const [favorites, setFavorites] = useState([]);
  const [liveModels, setLiveModels] = useState([]);
  const [cliModelGroups, setCliModelGroups] = useState(DASHBOARD_AUTH_CLI_MODEL_GROUPS);
  const [skills, setSkills] = useState("");
  const [toolsets, setToolsets] = useState("");
  const [workspacePath, setWorkspacePath] = useState(workspaceRoot || "");
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceIndexing, setWorkspaceIndexing] = useState(false);
  const [workspaceIndexToast, setWorkspaceIndexToast] = useState(null);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [runningLabel, setRunningLabel] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [tokenPreview, setTokenPreview] = useState(null);
  const [tokenPreviewLoading, setTokenPreviewLoading] = useState(false);

  const abortRef = useRef(null);
  const recognitionRef = useRef(null);
  const timelineRef = useRef(null);
  const lastLoadedSessionRef = useRef("");
  const pollingRunRef = useRef("");

  useEffect(() => {
    function applyPendingWorkbenchPrompt() {
      try {
        const next = String(window.localStorage.getItem("mamabot.pendingWorkbenchPrompt") || "").trim();
        if (!next) return;

        setPrompt(next);
        console.log("[Mamabot] workflow prompt applied", next.length);

        window.setTimeout(() => {
          try {
            if (window.localStorage.getItem("mamabot.pendingWorkbenchPrompt") === next) {
              window.localStorage.removeItem("mamabot.pendingWorkbenchPrompt");
            }
          } catch {}
        }, 3500);
      } catch (err) {
        console.warn("[Mamabot] workflow prompt apply failed", err);
      }
    }

    const initialTimer = window.setTimeout(applyPendingWorkbenchPrompt, 1200);

    const handler = (event) => {
      const eventPrompt = String(event?.detail?.prompt || "").trim();

      if (eventPrompt) {
        try {
          window.localStorage.setItem("mamabot.pendingWorkbenchPrompt", eventPrompt);
        } catch {}
      }

      window.setTimeout(applyPendingWorkbenchPrompt, 500);
    };

    window.addEventListener("mamabot:send-to-workbench", handler);
    window.addEventListener("mamabot:workbench-prompt-ready", handler);
    window.addEventListener("focus", applyPendingWorkbenchPrompt);

    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener("mamabot:send-to-workbench", handler);
      window.removeEventListener("mamabot:workbench-prompt-ready", handler);
      window.removeEventListener("focus", applyPendingWorkbenchPrompt);
    };
  }, []);


  const favoriteModels = useMemo(() => {
    if (!Array.isArray(favorites) || favorites.length === 0) return [];

    const modelMap = new Map();
    for (const item of liveModels) {
      if (item?.id) modelMap.set(item.id, item);
    }

    return favorites.map((id) => {
      const found = modelMap.get(id);
      return {
        id,
        name: found?.name || id
      };
    });
  }, [favorites, liveModels]);

  const isAuthCliProviderSelected = isDashboardAuthCliProvider(provider);

  const selectedCliModelGroup = useMemo(() => {
    if (!isAuthCliProviderSelected) return null;
    return cliModelGroups.find((group) => group.agentId === provider) || null;
  }, [cliModelGroups, provider, isAuthCliProviderSelected]);

  const selectedProviderOption = useMemo(() => {
    return providerOptions.find((item) => item.id === provider) || providerOptions[0];
  }, [provider]);


  async function loadWorkspace() {
    setWorkspaceError("");
    setWorkspaceMessage("");

    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "작업폴더를 불러오지 못했습니다.");
      }

      const current =
        data.config && data.config.currentWorkspace
          ? data.config.currentWorkspace
          : "";

      setWorkspacePath(current);

      if (onWorkspaceChanged) {
        onWorkspaceChanged(current);
      }
    } catch (err) {
      setWorkspaceError("");
      setError(err.message || String(err));
    }
  }

  async function saveWorkspace(pathOverride) {
    const target = pathOverride || workspacePath;
    const trimmed = target.trim();

    if (!trimmed) {
      setWorkspaceError("작업폴더 경로를 입력하세요.");
      return;
    }

    setWorkspaceSaving(true);
    setWorkspaceError("");
    setWorkspaceMessage("");

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspacePath: trimmed
        })
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "작업폴더 저장에 실패했습니다.");
      }

      const nextPath = data.config.currentWorkspace || trimmed;

      setWorkspacePath(nextPath);
      setWorkspaceMessage("");
      if (onWorkspaceChanged) {
        onWorkspaceChanged(nextPath);
      }
    } catch (err) {
      setWorkspaceError(err.message || String(err));
    } finally {
      setWorkspaceSaving(false);
    }
  }

  function handleSelectFolder(folderPath) {
    setPickerOpen(false);
    setWorkspacePath(folderPath);
    saveWorkspace(folderPath);
  }

  async function loadCliModelGroups() {
    try {
      const agentIds = [
        ["claude-code", "Claude Code"],
        ["codex-cli", "Codex CLI"],
        ["gemini-cli", "Gemini CLI"]
      ];

      const results = await Promise.all(
        agentIds.map(async ([agentId, label]) => {
          const res = await fetch("/api/model-badges?agentId=" + encodeURIComponent(agentId), {
            cache: "no-store"
          });

          const data = await res.json();

          return {
            agentId,
            label,
            models: Array.isArray(data.models) ? data.models : []
          };
        })
      );

      const nextGroups = results.filter((item) => item.models.length > 0);
      setCliModelGroups(nextGroups.length > 0 ? nextGroups : DASHBOARD_AUTH_CLI_MODEL_GROUPS);
    } catch (err) {
      setCliModelGroups(DASHBOARD_AUTH_CLI_MODEL_GROUPS);
    }
  }

  async function loadModels() {
    try {
      const [favRes, modelsRes] = await Promise.all([
        fetch("/api/models/favorites", { cache: "no-store" }),
        fetch("/api/models/openrouter", { cache: "no-store" })
      ]);

      const favJson = await favRes.json();
      const modelsJson = await modelsRes.json();

      setFavorites(Array.isArray(favJson.favorites) ? favJson.favorites : []);
      setLiveModels(Array.isArray(modelsJson.models) ? modelsJson.models : []);
    } catch {
      setFavorites([]);
      setLiveModels([]);
    }
  }

  async function fetchRunRecord(runId) {
    if (!runId) return null;

    const res = await fetch("/api/agent/runs/" + encodeURIComponent(runId), {
      cache: "no-store"
    });

    const data = await res.json();

    if (!res.ok || data.ok === false || !data.run) {
      return null;
    }

    return data.run;
  }

  async function loadRun(runId) {
    if (!runId) return;

    try {
      const res = await fetch("/api/agent/runs/" + encodeURIComponent(runId), {
        cache: "no-store"
      });
      const data = await res.json();

      if (!res.ok || data.ok === false || !data.run) {
        throw new Error(data.error || "실행 이력을 불러오지 못했습니다.");
      }

      const run = data.run;
      const nextMessages = [];

      if (run.prompt) {
        nextMessages.push({
          role: "user",
          content: cleanUserPrompt(run.prompt),
          createdAt: run.createdAt,
          runId: run.runId
        });
      }

      nextMessages.push({
        role: "assistant",
        content: buildAssistantText(run),
        createdAt: run.createdAt,
        runId: run.runId,
        status: run.status
      });

      setMessages(nextMessages);
      setError("");

      if (run.sessionId && onSessionChanged) {
        onSessionChanged(run.sessionId);
      }
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function loadSessionMessages(sessionId) {
    if (!sessionId) return;

    try {
      const res = await fetch("/api/agent/sessions/" + encodeURIComponent(sessionId), {
        cache: "no-store"
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "대화창을 불러오지 못했습니다.");
      }

      const session = data.session || data.item || data;
      const rows = [];

      const sessionMessages = Array.isArray(session.messages) ? session.messages : [];
      const sessionRuns = Array.isArray(session.runs) ? session.runs : [];

      if (sessionMessages.length > 0) {
        for (const item of sessionMessages) {
          const role = item.role === "assistant" ? "assistant" : "user";
          const rawContent = item.content || item.text || item.prompt || item.output || item.error || "";

          rows.push({
            role,
            content: role === "user" ? cleanUserPrompt(rawContent) : buildAssistantText({ output: rawContent }),
            createdAt: item.createdAt || item.updatedAt || session.updatedAt || session.createdAt,
            runId: item.runId || "",
            status: item.status || ""
          });
        }
      } else {
        for (const item of sessionRuns) {
          if (item.prompt) {
            rows.push({
              role: "user",
              content: cleanUserPrompt(item.prompt),
              createdAt: item.createdAt || session.createdAt,
              runId: item.runId || ""
            });
          }

          rows.push({
            role: "assistant",
            content: buildAssistantText(item),
            createdAt: item.createdAt || session.createdAt,
            runId: item.runId || "",
            status: item.status || ""
          });
        }
      }

      setMessages(rows);
      setError("");
    } catch (err) {
      setError(err.message || String(err));
    }
  }




  useEffect(() => {
    if (!activeSessionId) return;
    if (activeRunId) return;

    loadSessionMessages(activeSessionId);
  }, [activeSessionId, activeRunId]);

  useEffect(() => {
    if (!activeRunId) return;

    const alreadyVisible = messages.some((msg) => {
      return msg.runId === activeRunId || msg.pendingRunId === activeRunId;
    });

    if (!alreadyVisible) {
      loadRun(activeRunId);
    }
  }, [activeRunId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem("mamabot.selectedModel", model || "");
    window.localStorage.setItem("mamabot.selectedProvider", provider || "");
    window.localStorage.setItem("mamabot.responseStyle", responseStyle || "short");
    window.localStorage.setItem("mamabot.executionProfile", executionProfile || "quick");
  }, [model, provider, responseStyle, executionProfile]);

  useEffect(() => {
    lastLoadedSessionRef.current = "";
    setPrompt("");
    setMessages([]);
    setError("");
    pollingRunRef.current = "";
    setRunning(false);
    setRunningLabel("");
  }, [resetKey]);

  useEffect(() => {
    setWorkspacePath(workspaceRoot || "");
  }, [workspaceRoot]);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [messages, running, error]);

  async function pollRunToCompletion(runId) {
    if (!runId) return null;
    pollingRunRef.current = runId;

    for (let i = 0; i < 240; i++) {
      if (pollingRunRef.current !== runId) return null;
      await sleep(3000);

      try {
        const res = await fetch("/api/agent/runs/" + encodeURIComponent(runId), {
          cache: "no-store"
        });

        const data = await res.json();
        const run = data?.run;

        if (!run) continue;

        if (run.status === "running") {
          setRunningLabel("백그라운드 실행 중");
          continue;
        }

        if (isDoneStatus(run.status)) {
          setMessages((prev) => {
            const withoutPending = prev.filter((msg) => msg.pendingRunId !== runId);

            return [
              ...withoutPending,
              {
                role: "assistant",
                content: buildAssistantText(run),
                createdAt: new Date().toISOString(),
                runId: run.runId,
                status: run.status
              }
            ];
          });

          pollingRunRef.current = "";
          setRunning(false);
          setRunningLabel("");
          return run;
        }
      } catch {
        // polling 오류는 다음 루프에서 다시 시도
      }
    }

    pollingRunRef.current = "";
    setRunning(false);
    setRunningLabel("");
    return null;
  }

  function showWorkspaceIndexToast(nextToast = {}) {
    const payload = {
      id: Date.now(),
      type: nextToast.type || "info",
      title: nextToast.title || "\uC54C\uB9BC",
      message: nextToast.message || "",
      createdAt: new Date().toISOString()
    };

    setWorkspaceIndexToast(payload);

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setWorkspaceIndexToast((current) => current?.id === payload.id ? null : current);
      }, 5000);
    }
  }

  async function refreshWorkspaceIndex(rootOverride = "") {
    const targetRoot = String(rootOverride || workspacePath || "").trim();

    if (!targetRoot) {
      const message = "\uC791\uC5C5\uD3F4\uB354\uB97C \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694.";
      setError(message);
      showWorkspaceIndexToast({
        type: "error",
        title: "\uC778\uB371\uC2A4 \uAC31\uC2E0 \uBD88\uAC00",
        message
      });
      return null;
    }

    setWorkspaceIndexing(true);
    setError("");

    try {
      const res = await fetch("/api/workspace/index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspaceRoot: targetRoot
        })
      });

      let data = null;

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "\uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4 \uC778\uB371\uC2A4 \uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      }

      const manifest = data.manifest || {};
      const files = data.files ?? manifest.fileCount ?? 0;
      const routes = data.routes ?? manifest.routeCount ?? 0;
      const ignored = data.ignored ?? manifest.ignoredCount ?? 0;
      const errors = Array.isArray(data.errors) ? data.errors.length : (manifest.errorCount ?? 0);

      const toastPayload = {
        type: errors > 0 ? "warning" : "success",
        title: errors > 0 ? "\uC778\uB371\uC2A4 \uAC31\uC2E0 \uC644\uB8CC \u00B7 \uC77C\uBD80 \uC624\uB958 \uC788\uC74C" : "\uC778\uB371\uC2A4 \uAC31\uC2E0 \uC644\uB8CC",
        message: "files " + files + " / routes " + routes + " / ignored " + ignored + " / errors " + errors
      };

      console.log("[Mamabot] workspace index toast", toastPayload);
      showWorkspaceIndexToast(toastPayload);

      return data;
    } catch (err) {
      const message = err.message || String(err);
      setError(message);
      showWorkspaceIndexToast({
        type: "error",
        title: "\uC778\uB371\uC2A4 \uAC31\uC2E0 \uC2E4\uD328",
        message
      });
      return null;
    } finally {
      setWorkspaceIndexing(false);
    }
  }

  useEffect(() => {
    const trimmed = String(prompt || "").trim();

    if (!trimmed) {
      setTokenPreview(null);
      setTokenPreviewLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setTokenPreviewLoading(true);

      try {
        const apiPrompt = applyResponseStyle(trimmed, responseStyle);

        const res = await fetch("/api/tools/token-budget", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: apiPrompt,
            userPrompt: trimmed,
            model,
            executionProfile,
            responseMode: responseStyle,
            skills,
            toolsets,
            workspaceCandidates: []
          })
        });

        const data = await res.json();

        if (!res.ok || data.ok === false) {
          throw new Error(data.error || "token preview failed");
        }

        setTokenPreview(data.tokenBudget || null);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("[Mamabot] mini token preview failed", err);
        }
      } finally {
        setTokenPreviewLoading(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [prompt, model, executionProfile, responseStyle, skills, toolsets]);

  async function runAgent(dryRun, options = {}) {
    const promptSource = options.promptOverride ?? prompt;
    const trimmed = String(promptSource || "").trim();

    if (!trimmed) {
      setError("프롬프트를 입력하세요.");
      return;
    }

    const apiPrompt = applyResponseStyle(trimmed, responseStyle);

    const userMessage = {
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString()
    };

    if (options.skipUserMessage !== true) {
      setMessages((prev) => [...prev, userMessage]);
    }

    if (!options.promptOverride) {
      setPrompt("");
    }

    setRunning(true);
    setRunningLabel(dryRun ? "계획 확인 중" : "실행 중");
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    const parsedAuthModelForRun = parseAuthCliModelValue(model);
    const requestProvider = parsedAuthModelForRun ? parsedAuthModelForRun.agentId : provider;
    const requestModelRaw = parsedAuthModelForRun ? parsedAuthModelForRun.modelId : model;
    const requestModel =
      ["codex-default", "claude-default", "gemini-default"].includes(requestModelRaw)
        ? ""
        : requestModelRaw;

    const runWorkspace = String(
      workspacePath ||
      (typeof workspaceRoot !== "undefined" && workspaceRoot) ||
      "F:\\mamabot"
    ).trim();

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          workspaceRoot: runWorkspace,
          workspace: runWorkspace,
          prompt: apiPrompt,
          displayPrompt: trimmed,
          provider: requestProvider,
          agentId: requestProvider,
          mode,
          model: requestModel,
          skills,
          toolsets,
          responseMode: responseStyle,
          executionProfile,
          dryRun,
          sessionId: activeSessionId || "",
          allowHighTokenRisk: options.allowHighTokenRisk === true
        })
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "에이전트 실행에 실패했습니다.");
      }

      if (data.runId && onRunOpened) {
        onRunOpened(data.runId);
      }

      if (data.sessionId && onSessionChanged) {
        onSessionChanged(data.sessionId);
      }

      if (data.runId && data.status === "blocked") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.output || data.message || "Token budget blocked.",
            createdAt: new Date().toISOString(),
            runId: data.runId,
            status: "blocked",
            retryPrompt: trimmed
          }
        ]);

        setRunning(false);
        setRunningLabel("");
        return;
      }

      if (data.runId && data.status === "running") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message || "실행을 시작했습니다. 완료되면 이 메시지가 최종 결과로 바뀝니다.",
            createdAt: new Date().toISOString(),
            runId: data.runId,
            status: "running",
            pendingRunId: data.runId
          }
        ]);

        await pollRunToCompletion(data.runId);
        return;
      }

      if (data.runId) {
        const finalRun = await fetchRunRecord(data.runId);

        if (finalRun) {
          setMessages((prev) => [
            ...prev.filter((msg) => msg.pendingRunId !== data.runId),
            {
              role: "assistant",
              content: buildAssistantText(finalRun),
              createdAt: finalRun.createdAt || new Date().toISOString(),
              runId: finalRun.runId || data.runId,
              status: finalRun.status || data.status || (dryRun ? "dryrun" : "success")
            }
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: buildAssistantText(data),
              createdAt: new Date().toISOString(),
              runId: data.runId,
              status: data.status || (dryRun ? "dryrun" : "success")
            }
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: buildAssistantText(data),
            createdAt: new Date().toISOString(),
            runId: data.runId,
            status: data.status || (dryRun ? "dryrun" : "success")
          }
        ]);
      }
    } catch (err) {
      const message =
        err.name === "AbortError"
          ? "요청을 중지했습니다. 서버 프로세스 강제 종료는 다음 단계에서 연결합니다."
          : err.message || String(err);

      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: message,
          createdAt: new Date().toISOString(),
          status: "failed"
        }
      ]);
    } finally {
      setRunning(false);
      setRunningLabel("");
      abortRef.current = null;
    }
  }

  function stopRun() {
    pollingRunRef.current = "";
    if (abortRef.current) abortRef.current.abort();
    setRunning(false);
    setRunningLabel("");
  }

  function handlePromptKeyDown(event) {
    if (event.key !== "Enter") return;

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!running) {
      runAgent(false);
    }
  }

  function toggleMic() {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setError("이 브라우저는 음성 입력을 지원하지 않습니다.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError("음성 입력 중 오류가 발생했습니다.");
    };
    recognition.onresult = (event) => {
      let text = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }

      if (text.trim()) {
        setPrompt((prev) => {
          const base = prev.trimEnd();
          return base ? base + " " + text.trim() : text.trim();
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function toggleSpeaker() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setError("이 브라우저는 음성 읽기를 지원하지 않습니다.");
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const latestAssistant = [...messages].reverse().find((item) => item.role === "assistant");
    const text = (latestAssistant?.content || prompt || "").trim();

    if (!text) {
      setError("읽을 텍스트가 없습니다.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        borderRadius: 14,
        padding: 10,
        boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
        width: "100%",
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gap: 8
      }}
    >
      <style>
        {"@keyframes speakerPulse { 0% { box-shadow: 0 0 0 0 rgba(220,38,38,.6); } 70% { box-shadow: 0 0 0 12px rgba(220,38,38,0); } 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); } }"}
      </style>

      <div style={{ display: "flex", alignItems: "center",
          flexWrap: "wrap", gap: 8, flexWrap: "wrap" }}>
        <select
          value={provider}
          title="인증방식"
          aria-label="인증방식"
          onChange={(event) => {
            const nextProvider = event.target.value;
            setProvider(nextProvider);
            setModel("");

            if (nextProvider === "openrouter") {
              loadModels();
            }

            if (isDashboardAuthCliProvider(nextProvider)) {
              loadCliModelGroups();
            }
          }}
          style={{
            width: 150,
            minWidth: 130,
            maxWidth: 170,
            flex: "0 0 150px",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          {providerOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={model}
          title="사용 모델"
          onChange={(event) => {
            const value = event.target.value;
            const parsedAuthModel = parseAuthCliModelValue(value);

            setModel(value);

            if (parsedAuthModel) {
              setProvider(parsedAuthModel.agentId);
            } else if (isAuthCliProviderSelected) {
              // 인증형 CLI 모델은 현재 선택된 인증방식을 유지한다.
            } else if (value && provider === "openrouter") {
              setProvider("openrouter");
            } else if (!value) {
              setProvider(provider || "hermes");
            }
          }}
          style={{
            width: 360,
            minWidth: 260,
            maxWidth: 420,
            flex: "0 1 360px",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          <option value="">
            {isAuthCliProviderSelected
              ? (selectedCliModelGroup?.label || selectedProviderOption?.label || "CLI") + " 기본 모델 사용"
              : provider === "openrouter"
                ? "OpenRouter 모델 선택"
                : provider === "gemini"
                  ? "Gemini API 기본 모델 사용"
                  : provider === "openai"
                    ? "OpenAI API 기본 모델 사용"
                    : provider === "anthropic"
                      ? "Anthropic API 기본 모델 사용"
                      : "Hermes 기본 모델 사용"}
          </option>

          {provider === "openrouter" && favoriteModels.length > 0 ? (
            <optgroup label="즐겨찾기 모델">
              {favoriteModels.map((item) => (
                <option key={item.id} value={item.id}>
                  🌟 {item.name}
                </option>
              ))}
            </optgroup>
          ) : null}

          {isAuthCliProviderSelected && selectedCliModelGroup ? (
            <optgroup label={selectedCliModelGroup.label + " 모델"}>
              {selectedCliModelGroup.models.map((item) => (
                <option key={selectedCliModelGroup.agentId + ":" + item.id} value={item.id}>
                  {"🌟 "}{item.label || item.id}{formatBadgeText(item.badges)}
                </option>
              ))}
            </optgroup>
          ) : null}

          {provider === "openrouter"
            ? liveModels.slice(0, 200).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || item.id}
                </option>
              ))
            : null}
        </select>

        <input
          value={workspacePath}
          onChange={(event) => setWorkspacePath(event.target.value)}
          placeholder="작업폴더 경로"
          title={workspacePath || "작업폴더 경로"}
          style={{
            width: 210,
            minWidth: 180,
            maxWidth: 240,
            flex: "0 0 210px",
            height: 36,
            boxSizing: "border-box",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "0 10px",
            fontSize: 12,
            fontWeight: 900,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        />

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          찾아보기
        </button>

        {workspaceIndexToast && (
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: 18,
              transform: "translateX(-50%)",
              zIndex: 5000,
              minWidth: 320,
              maxWidth: 560,
              border: "2px solid " + (
                workspaceIndexToast.type === "success"
                  ? "#22c55e"
                  : workspaceIndexToast.type === "warning"
                    ? "#f59e0b"
                    : "#ef4444"
              ),
              background:
                workspaceIndexToast.type === "success"
                  ? "#ecfdf5"
                  : workspaceIndexToast.type === "warning"
                    ? "#fffbeb"
                    : "#fef2f2",
              color:
                workspaceIndexToast.type === "success"
                  ? "#166534"
                  : workspaceIndexToast.type === "warning"
                    ? "#92400e"
                    : "#991b1b",
              borderRadius: 16,
              padding: "14px 16px",
              boxShadow: "0 18px 60px rgba(15,23,42,0.22)"
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ fontSize: 22 }}>
                {workspaceIndexToast.type === "success" ? "\u2705" : workspaceIndexToast.type === "warning" ? "\u26A0\uFE0F" : "\u274C"}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 950, marginBottom: 4 }}>
                  {workspaceIndexToast.title}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.45, wordBreak: "break-word" }}>
                  {workspaceIndexToast.message}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setWorkspaceIndexToast(null)}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.75)",
                  color: "inherit",
                  borderRadius: 999,
                  width: 24,
                  height: 24,
                  cursor: "pointer",
                  fontWeight: 900
                }}
              >
                {"\u00D7"}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={async () => {
            await saveWorkspace();
            await refreshWorkspaceIndex(workspacePath);
          }}
          disabled={workspaceSaving}
          style={{
            border: "none",
            background: workspaceSaving ? "#9ca3af" : "#111827",
            color: "#ffffff",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: workspaceSaving ? "not-allowed" : "pointer"
          }}
        >
          {workspaceSaving ? "저장 중" : "저장"}
        </button>

        <button
          type="button"
          onClick={() => refreshWorkspaceIndex()}
          disabled={workspaceIndexing}
          style={{
            border: "1px solid #d1d5db",
            background: workspaceIndexing ? "#e5e7eb" : "#f9fafb",
            color: workspaceIndexing ? "#6b7280" : "#111827",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: workspaceIndexing ? "not-allowed" : "pointer"
          }}
        >
          {workspaceIndexing ? "인덱싱 중" : "인덱스 갱신"}
        </button>

        <select
          value={`${executionProfile}:${responseStyle}`}
          onChange={(event) => {
            const [nextProfile, nextStyle] = event.target.value.split(":");

            setExecutionProfile(nextProfile || "quick");
            setResponseStyle(nextStyle || "short");

            if (nextProfile === "quick") {
              setSkills("");
              setToolsets("");
            }

            if (nextProfile === "agent" || nextProfile === "review") {
              setToolsets("");
            }
          }}
          style={{
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            minWidth: 156,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer"
          }}
          title="응답 방식"
        >
          <option value="quick:short">응답: Quick · 짧게</option>
          <option value="quick:normal">응답: Quick · 보통</option>
          <option value="quick:detailed">응답: Quick · 자세히</option>
          <option value="agent:normal">응답: Agent · 분석</option>
          <option value="coding:normal">응답: Coding · 코드작업</option>
          <option value="review:detailed">응답: Review · 검토</option>
          <option value="automation:normal">응답: Automation · 자동화</option>
        </select>

        <button
          type="button"
          onClick={() => {
            loadModels();
            loadCliModelGroups();
          }}
          style={{
            border: "1px solid #d1d5db",
            background: "#f9fafb",
            borderRadius: 10,
            padding: "8px 10px",
            height: 36,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          모델 갱신
        </button>

        <details style={{ position: "relative" }}>
          <summary
            style={{
              listStyle: "none",
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer"
            }}
          >
            고급 옵션
          </summary>

          <div
            style={{
              position: "absolute",
              right: 0,
              top: 42,
              zIndex: 80,
              width: 380,
              maxWidth: "calc(100vw - 120px)",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
              background: "#ffffff",
              boxShadow: "0 16px 40px rgba(15,23,42,0.18)"
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 900 }}>
                제공자
                <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                  {providerOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 900 }}>
                권한 모드
                <select value={mode} onChange={(event) => setMode(event.target.value)}>
                  {modeOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 900 }}>
                스킬
                <input value={skills} onChange={(event) => setSkills(event.target.value)} />
              </label>

              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 900 }}>
                도구 모음
                <input value={toolsets} onChange={(event) => setToolsets(event.target.value)} />
              </label>
            </div>
          </div>
        </details>
      </div>
<div
        ref={timelineRef}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          background: "#f9fafb",
          minHeight: 0,
          overflowY: "auto",
          padding: 14,
          display: "grid",
          alignContent: "start",
          gap: 12
        }}
      >
        {messages.length === 0 && !running && !error ? (
          <div style={{ color: "#9ca3af", fontSize: 13 }}>
            아직 대화가 없습니다. 아래 입력창에 작업을 입력하고 Enter로 전송하세요.
          </div>
        ) : null}

        {messages.map((msg, index) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start"
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  border: "1px solid " + (isUser ? "#bfdbfe" : "#e5e7eb"),
                  background: isUser ? "#eff6ff" : "#ffffff",
                  color: "#111827",
                  borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "10px 12px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}
              >
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, fontWeight: 900 }}>
                  {isUser ? "나" : "에이전트"} {msg.status ? "· " + msg.status : ""} {msg.runId ? "· " + msg.runId : ""}
                </div>
                {msg.content}

                    {!isUser && msg.status === "blocked" && msg.retryPrompt ? (
                      <button
                        type="button"
                        onClick={() => {
                          const ok = window.confirm(
                            "토큰 사용량이 높아 실제 실행 중 비용이 많이 들거나 실패할 수 있습니다. 그래도 강제 실행할까요?"
                          );

                          if (!ok) return;

                          runAgent(false, {
                            promptOverride: msg.retryPrompt,
                            allowHighTokenRisk: true,
                            skipUserMessage: true
                          });
                        }}
                        disabled={running}
                        style={{
                          display: "block",
                          marginTop: 12,
                          border: "1px solid #dc2626",
                          background: running ? "#fee2e2" : "#dc2626",
                          color: running ? "#991b1b" : "#ffffff",
                          borderRadius: 10,
                          padding: "8px 10px",
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: running ? "not-allowed" : "pointer"
                        }}
                      >
                        위험 감수하고 실행
                      </button>
                    ) : null}
                {msg.createdAt ? (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                    {formatTime(msg.createdAt)}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {running ? (
          <div style={{ color: "#1d4ed8", fontSize: 13, fontWeight: 900 }}>
            {runningLabel}...
          </div>
        ) : null}
      </div>

      <div
        style={{
          paddingTop: 20,
          position: "relative",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 176px",
          gridTemplateRows: "auto auto",
          columnGap: 10,
          rowGap: 8,
          alignItems: "stretch"
        }}
      >
        {prompt.trim() ? (
          <div
            data-name="MiniTokenBar"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              zIndex: 5,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              maxWidth: "72%",
              padding: "4px 9px",
              borderRadius: 7,
              border: "1px solid " + getTokenTone(tokenPreview?.severity).border,
              background: getTokenTone(tokenPreview?.severity).bg,
              color: getTokenTone(tokenPreview?.severity).color,
              fontSize: 10,
              lineHeight: 1.25,
              fontWeight: 850,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              boxShadow: "0 1px 4px rgba(15,23,42,0.08)"
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: tokenPreviewLoading ? "#94a3b8" : getTokenTone(tokenPreview?.severity).dot,
                display: "inline-block",
                flex: "0 0 7px"
              }}
            />

            <span>{executionProfile === "quick" ? "Quick" : executionProfile === "coding" ? "Coding" : "Agent"}</span>
            <span style={{ opacity: 0.45 }}>?</span>

            {tokenPreview ? (
              <>
                <span>
                  {formatMiniTokenCount(tokenPreview.estimatedInputTokens)} / {formatMiniTokenCount(tokenPreview.practicalLimit)}
                </span>
                <span style={{ opacity: 0.45 }}>?</span>
                <span>{Math.round((tokenPreview.ratio || 0) * 100)}%</span>
                <span style={{ opacity: 0.45 }}>?</span>
                <span>{tokenPreview.severity || "ok"}</span>
              </>
            ) : (
              <span>{tokenPreviewLoading ? "?? ?" : "?? ??"}</span>
            )}
          </div>
        ) : null}

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handlePromptKeyDown}
          placeholder="작업할 내용을 입력하세요. Enter 전송 / Shift+Enter 줄바꿈"
          style={{
            gridRow: "1 / 3",
            width: "100%",
            minHeight: 104,
            resize: "vertical",
            border: "1px solid #d1d5db",
            borderRadius: 14,
            padding: 14,
            fontSize: 14,
            lineHeight: 1.6,
            boxSizing: "border-box"
          }}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-start", alignItems: "center" }}>
          <button
            type="button"
            onClick={toggleSpeaker}
            style={{
              border: speaking ? "2px solid #dc2626" : "1px solid #d1d5db",
              background: speaking ? "#fee2e2" : "#ffffff",
              color: speaking ? "#991b1b" : "#111827",
              borderRadius: 999,
              width: 48,
              height: 48,
              fontSize: 22,
              cursor: "pointer",
              animation: speaking ? "speakerPulse 0.8s infinite" : "none"
            }}
            title="텍스트 음성 읽기"
          >
            🔊
          </button>

          <button
            type="button"
            onClick={toggleMic}
            style={{
              border: listening ? "2px solid #2563eb" : "1px solid #d1d5db",
              background: listening ? "#dbeafe" : "#ffffff",
              color: listening ? "#1d4ed8" : "#111827",
              borderRadius: 999,
              width: 48,
              height: 48,
              fontSize: 22,
              cursor: "pointer"
            }}
            title="음성 입력"
          >
            🎙
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={running ? stopRun : () => runAgent(false)}
            style={{
              border: "none",
              background: running ? "#dc2626" : "#16a34a",
              color: "#ffffff",
              borderRadius: 12,
              height: 48,
              padding: "0 12px",
              fontSize: 14,
              fontWeight: 950,
              cursor: "pointer"
            }}
          >
            {running ? "중지" : "전송"}
          </button>

          <button
            type="button"
            onClick={() => runAgent(true)}
            disabled={running}
            style={{
              border: "1px solid #bfdbfe",
              background: running ? "#e5e7eb" : "#eff6ff",
              color: running ? "#6b7280" : "#1d4ed8",
              borderRadius: 12,
              height: 48,
              padding: "0 10px",
              fontSize: 13,
              fontWeight: 900,
              cursor: running ? "not-allowed" : "pointer"
            }}
          >
            계획
          </button>
        </div>
      </div>
      <FolderPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectFolder}
      />
    </section>
  );
}
