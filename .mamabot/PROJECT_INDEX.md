# Mamabot Project Index

Use this file only when workspace index candidates are not already provided.

## Core files

### app/api/agent/run/route.js
Agent run API.
Relevant areas:
- auth CLI routing
- Codex CLI / Claude Code CLI / Gemini CLI execution
- workspace index attachment
- run save / session append
- background execution
- token budget guard

### app/components/WorkbenchChatPanel.jsx
Workbench chat UI.
Relevant areas:
- provider/model selection
- response mode selection
- execution request body
- session creation
- polling/toast behavior
- workspace index refresh button

### app/components/AppShell.jsx
Main shell and side panels.
Relevant areas:
- dashboard/workbench layout
- sidebar state
- session/run panel switching

### app/components/AgentRunHistoryPanel.jsx
Run history UI.
Relevant areas:
- run list
- run detail
- output/compressed output display
- workspace candidate display

### app/components/ConversationSidebar.jsx
Conversation/session sidebar.
Relevant areas:
- session list
- refresh
- favorite/delete
- run/message counts

### app/lib/workspaceIndex.js
Workspace index build/search logic.

### app/lib/runStore.js
Run persistence and run index.

### app/lib/sessionStore.js
Session persistence and message append.

### app/lib/tokenBudgetGuard.js
Token budget estimation and blocking.

### app/lib/commandOutputCompressor.js
Command output compression.

## Restricted by default

Do not read these unless explicitly requested:
- .mamabot/CHECKLIST.md
- .mamabot/DECISIONS.md
- .mamabot/ACTIVE_PLAN.md
- .mamabot/WORKLOG.md
- runtime/
- backups/
- node_modules/
- .next/
- run logs
- generated artifacts
