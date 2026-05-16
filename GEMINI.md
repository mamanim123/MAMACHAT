# Mamabot Gemini CLI Guide

# Mamabot Agent Router Guide

This file is intentionally short because it may be loaded at the start of agent sessions.

## Project role
Mamabot is a portable personal agent dashboard for running Hermes Agent, Claude Code, Codex CLI, Gemini CLI, and verified model providers from one UI.

## First-read rule
Do not scan the entire project first.

Before reading source files, check:

1. .mamabot/PROJECT_INDEX.md
2. .mamabot/ACTIVE_PLAN.md
3. .mamabot/CHECKLIST.md
4. .mamabot/DECISIONS.md

Use those files to locate the exact source files needed for the task.

## Do not auto-read
Do not read these unless the user explicitly asks:

- .mamabot/WORKLOG.md
- old plan history
- backups/
- runtime/hermes/runs/
- runtime/hermes/logs/
- node_modules/
- .next/
- large generated files

## plan.md rule
plan.md must stay short. It only contains the current goal and next steps.
Long history belongs in .mamabot/WORKLOG.md.

## Work method
1. Identify the task type.
2. Check .mamabot/PROJECT_INDEX.md for relevant files.
3. Read only the smallest necessary file ranges.
4. Before editing, create an external backup under F:\_mamabot_backups.
5. Make the smallest safe change.
6. Verify with targeted checks, not full-project scans.
7. Summarize changed files and next checks.

## Safety
- Do not modify user workspaces unless explicitly asked.
- Do not run destructive commands.
- Do not expose secrets or tokens.
- Prefer suggest/plan mode before write mode.


## Gemini-specific notes
- This file is for coding/agent work only.
- For Quick Chat, Mamabot should run Gemini from a clean isolated cwd so project context is not loaded.
- Use gemini-2.5-flash for normal quick coding checks unless the user chooses Pro.
