#!/usr/bin/env bash
set -euxo pipefail

PORTABLE_ROOT="/mnt/f/test/mamabot"
export HERMES_HOME="$PORTABLE_ROOT/runtime/hermes/home"
export HOME="$HERMES_HOME"
export PATH="$HERMES_HOME/hermes-agent/venv/bin:$PATH"

HERMES_BIN="$HERMES_HOME/hermes-agent/venv/bin/hermes"

echo "=== ENV ==="
echo "PORTABLE_ROOT=$PORTABLE_ROOT"
echo "HERMES_HOME=$HERMES_HOME"
echo "HOME=$HOME"
echo "HERMES_BIN=$HERMES_BIN"

echo "=== CHECK FILES ==="
ls -la "$HERMES_HOME"
ls -la "$HERMES_HOME/hermes-agent"
ls -la "$HERMES_BIN"

echo "=== VERSION ==="
"$HERMES_BIN" --version || true

echo "=== DASHBOARD HELP ==="
"$HERMES_BIN" dashboard --help || true

echo "=== START DASHBOARD FOREGROUND ==="
cd "$HERMES_HOME/hermes-agent"
exec env BROWSER=/bin/true "$HERMES_BIN" dashboard