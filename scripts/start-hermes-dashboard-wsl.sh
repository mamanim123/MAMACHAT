#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export HOME="$ROOT/runtime/hermes/home"

cd "$ROOT/runtime/hermes/home/hermes-agent"

if [ ! -x "./venv/bin/hermes" ]; then
  echo "Hermes executable not found. Run setup-office.bat first."
  exit 1
fi

echo "Hermes Dashboard starting..."
echo "URL: http://127.0.0.1:9119"

exec ./venv/bin/hermes dashboard --no-open --host 127.0.0.1 --port 9119
