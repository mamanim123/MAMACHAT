# Mamabot Claude Code Guide

This is the local Claude Code guide for the Mamabot portable environment.

Use only files inside this Mamabot project unless the user explicitly asks otherwise.

## Local imports

@./.claude/COMMANDS.md
@./.claude/FLAGS.md
@./.claude/PRINCIPLES.md
@./.claude/RULES.md
@./.claude/MCP.md
@./.claude/PERSONAS.md
@./.claude/ORCHESTRATOR.md
@./.claude/MODES.md

## Portable rules

- Mamabot root: F:\mamabot
- WSL root: /mnt/f/mamabot
- Do not depend on F:\.claude for this project.
- Prefer Mamabot-local runtime folders.
- Do not modify user workspaces unless explicitly asked.
- For code changes, prefer backup before patch.
