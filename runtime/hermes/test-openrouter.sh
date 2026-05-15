#!/usr/bin/env bash
set -euo pipefail

export HERMES_HOME="/mnt/f/test/mamabot/runtime/hermes/home"
export HOME="$HERMES_HOME"
export PATH="$HERMES_HOME/hermes-agent/venv/bin:$PATH"

cd /mnt/f/test/mama-v1.2

echo "=== ENV CHECK ==="
if grep -q '^OPENROUTER_API_KEY=' "$HERMES_HOME/.env"; then
  echo "OPENROUTER_API_KEY=SET"
else
  echo "OPENROUTER_API_KEY=EMPTY"
fi

echo "=== HERMES TEST ==="
hermes -z "?ˆë…•. ??ë¬¸ìž¥?¼ë¡œë§??€?µí•´ì¤?" --provider openrouter --model openai/gpt-4o-mini
