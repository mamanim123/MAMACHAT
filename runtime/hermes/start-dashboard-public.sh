#!/usr/bin/env bash
set -euxo pipefail

PORTABLE_ROOT="/mnt/f/test/mamabot"
export HERMES_HOME="$PORTABLE_ROOT/runtime/hermes/home"
export HOME="$HERMES_HOME"
export PATH="$HERMES_HOME/hermes-agent/venv/bin:$PATH"

HERMES_BIN="$HERMES_HOME/hermes-agent/venv/bin/hermes"
LOG="$HERMES_HOME/logs/mamabot-dashboard-public.log"

mkdir -p "$HERMES_HOME/logs"
cd "$HERMES_HOME/hermes-agent"

echo "=== ENV ==="
echo "HERMES_HOME=$HERMES_HOME"
echo "HERMES_BIN=$HERMES_BIN"
echo "LOG=$LOG"

echo "=== STOP OLD DASHBOARD ==="
"$HERMES_BIN" dashboard --stop || true
sleep 2

echo "=== START DASHBOARD 0.0.0.0 ==="
nohup env BROWSER=/bin/true "$HERMES_BIN" dashboard --host 0.0.0.0 --port 9119 --insecure --no-open > "$LOG" 2>&1 &

echo $! > "$HERMES_HOME/logs/mamabot-dashboard-public.pid"

sleep 5

echo "=== PROCESS ==="
ps -ef | grep -E "hermes.*dashboard|python.*hermes" | grep -v grep || true

echo "=== PORT ==="
ss -ltnp | grep 9119 || true

echo "=== LOG ==="
tail -120 "$LOG" || true

echo "=== WSL API TEST ==="
curl -i http://127.0.0.1:9119/api/status || true