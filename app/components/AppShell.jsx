"use client";

import { useEffect, useState } from "react";
import AgentRunHistoryPanel from "./AgentRunHistoryPanel.jsx";
import CronPanel from "./CronPanel.jsx";
import DashboardPanel from "./DashboardPanel.jsx";
import HermesSetupPanel from "./HermesSetupPanel.jsx";
import HermesDashboardPanel from "./HermesDashboardPanel.jsx";
import LogsPanel from "./LogsPanel.jsx";
import AISettingsPanel from "./AISettingsPanel.jsx";
import PatchApprovalPanel from "./PatchApprovalPanel.jsx";
import PlaceholderPanel from "./PlaceholderPanel.jsx";
import SessionsPanel from "./SessionsPanel.jsx";
import Sidebar from "./Sidebar.jsx";
import SkillsPanel from "./SkillsPanel.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import TopStatusBar from "./TopStatusBar.jsx";
import WorkflowTemplatesPanel from "./WorkflowTemplatesPanel.jsx";
import WorkspaceSelector from "./WorkspaceSelector.jsx";
import ConversationSidebar from "./ConversationSidebar.jsx";
import RunCompletionToast from "./RunCompletionToast.jsx";

export default function AppShell() {
  const [activeTab, setActiveTab] = useState("dashboard");
  

  useEffect(() => {
    const handler = (event) => {
      setActiveTab("dashboard");

      const prompt =
        event?.detail?.prompt ||
        window.localStorage.getItem("mamabot.pendingWorkbenchPrompt") ||
        "";

      const deliver = () => {
        if (prompt) {
          window.localStorage.setItem("mamabot.pendingWorkbenchPrompt", prompt);
        }

        window.dispatchEvent(
          new CustomEvent("mamabot:workbench-prompt-ready", {
            detail: { prompt }
          })
        );
      };

      window.setTimeout(deliver, 80);
      window.setTimeout(deliver, 250);
      window.setTimeout(deliver, 600);
      window.setTimeout(deliver, 1100);
    };

    window.addEventListener("mamabot:send-to-workbench", handler);

    return () => {
      window.removeEventListener("mamabot:send-to-workbench", handler);
    };
  }, []);
const [activeSessionId, setActiveSessionId] = useState("");
  const [activeRunId, setActiveRunId] = useState("");
  const [workbenchResetKey, setWorkbenchResetKey] = useState(0);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleSessionsRefresh(event) {
      setSessionRefreshKey((prev) => prev + 1);

      const nextSessionId = event?.detail?.sessionId || "";
      const shouldSelect = event?.detail?.select === true;

      if (shouldSelect && nextSessionId) {
        setActiveSessionId(nextSessionId);
      }
    }

    window.addEventListener("mamabot:sessions-refresh", handleSessionsRefresh);

    return () => {
      window.removeEventListener("mamabot:sessions-refresh", handleSessionsRefresh);
    };
  }, []);

  function handleSessionChanged(sessionId = "") {
    if (sessionId) setActiveSessionId(sessionId);
    setSessionRefreshKey((prev) => prev + 1);
  }

  function handleNewWork() {
    setActiveSessionId("");
    setActiveRunId("");
    setWorkbenchResetKey((prev) => prev + 1);
    setActiveTab("dashboard");
  }

  function renderPanel() {
    if (activeTab === "dashboard") {
      return <DashboardPanel activeSessionId={activeSessionId} activeRunId={activeRunId} resetKey={workbenchResetKey} onSessionChanged={handleSessionChanged} onRunOpened={setActiveRunId} onOpenTab={setActiveTab} />;
    }

    if (activeTab === "workspace") {
      return <WorkspaceSelector />;
    }

    if (activeTab === "models") {
      return <AISettingsPanel />;
    }

    if (activeTab === "skills") {
      return <SkillsPanel />;
    }

    if (activeTab === "logs") {
      return <LogsPanel />;
    }

    if (activeTab === "hermes") {
      return <HermesSetupPanel />;
    }

    if (activeTab === "hermesDashboard") {
      return <HermesDashboardPanel />;
    }

    if (activeTab === "chat") {
    return <DashboardPanel activeSessionId={activeSessionId} activeRunId={activeRunId} resetKey={workbenchResetKey} onSessionChanged={handleSessionChanged} onRunOpened={setActiveRunId} onOpenTab={setActiveTab} />;
  }

    if (activeTab === "history") {
      return <AgentRunHistoryPanel initialRunId={activeRunId} />;
    }

    if (activeTab === "sessions") {
      return <SessionsPanel />;
    }

    if (activeTab === "patches") {
      return <PatchApprovalPanel />;
    }

    if (activeTab === "workflows") {
      return <WorkflowTemplatesPanel />;
    }

    if (activeTab === "automations") {
      return <CronPanel />;
    }

    if (activeTab === "settings") {
      return <SettingsPanel />;
    }

    return <DashboardPanel />;
  }

  const isWorkbench = activeTab === "dashboard";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        minHeight: "100vh",
        background: "#f3f4f6",
        overflow: "hidden"
      }}
    >
      <Sidebar activeTab={activeTab} onChange={setActiveTab} />
      <RunCompletionToast runId={activeRunId} />

      <ConversationSidebar
        selectedSessionId={activeSessionId}
        refreshKey={sessionRefreshKey}
        onSelectSession={(sessionId) => {
          setActiveSessionId(sessionId || "");
          setActiveRunId("");
          if (sessionId) setActiveTab("dashboard");
        }}
        onSessionChanged={handleSessionChanged}
        onSelectRun={(runId) => {
          setActiveRunId(runId || "");
          if (runId) setActiveTab("history");
        }}
        onNewWork={handleNewWork}
      />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <TopStatusBar />

        <main
          style={{
            padding: isWorkbench ? 8 : 24,
            boxSizing: "border-box",
            flex: 1,
            minHeight: 0,
            overflow: isWorkbench ? "hidden" : "auto"
          }}
        >
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}