"use client";

import WorkbenchPanel from "./WorkbenchPanel.jsx";

export default function DashboardPanel({
  activeSessionId = "",
  activeRunId = "",
  resetKey = 0,
  onSessionChanged = null,
  onRunOpened = null,
  onOpenTab = null
} = {}) {
  return (
    <WorkbenchPanel
      activeSessionId={activeSessionId}
      activeRunId={activeRunId}
      resetKey={resetKey}
      onSessionChanged={onSessionChanged}
      onRunOpened={onRunOpened}
      onOpenTab={onOpenTab}
    />
  );
}
