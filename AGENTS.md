# Mamabot Agent Rules

## Primary rule
Use the smallest possible context. Do not scan the whole repository.

## Context loading policy
1. If the prompt already contains `[WORKSPACE INDEX CANDIDATES]`, use those candidate files first.
2. Do not read `PROJECT_INDEX.md` when workspace candidates are already provided.
3. If no workspace candidates are provided, read `.mamabot/PROJECT_INDEX.md` once to locate relevant files.
4. Do not read `.mamabot/CHECKLIST.md`, `.mamabot/DECISIONS.md`, `.mamabot/ACTIVE_PLAN.md`, or `.mamabot/WORKLOG.md` unless the user explicitly asks about planning, status, decisions, checklist, or work history.
5. Never read `runtime/`, `backups/`, `.next/`, `node_modules/`, run logs, or generated files unless directly requested.

## File reading policy
- Do not read an entire large file.
- Prefer targeted ranges, search results, or small snippets.
- For `app/api/agent/run/route.js`, inspect only the relevant function/block first.
- If more context is needed, explain why before expanding.

## Mode policy
### Quick
- Do not read project files.
- Answer briefly.

### Review
- Read only relevant snippets.
- Do not modify files.
- Summarize issues clearly.

### Coding
- Use workspace candidates first.
- Before modifying files, create a backup outside the project when possible.
- After changes, run the smallest useful verification.

### Agent
- Use project context only as needed.
- Avoid broad exploration.
- Keep output concise.

## Output policy
- Korean by default.
- Do not mention internal model/provider unless asked.
- Report what files were read.
- Report if a file was not read because it was unnecessary.
