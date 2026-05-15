#!/bin/bash
export HOME=/mnt/f/mamabot/runtime/hermes/home
export HERMES_HOME=$HOME
cd $HOME
set -a
[ -f .env ] && . ./.env
set +a

LOG=/mnt/f/mamabot/runtime/hermes/logs/dashboard.log
mkdir -p /mnt/f/mamabot/runtime/hermes/logs

# 기존 인스턴스 정리
pkill -f "hermes dashboard" 2>/dev/null
sleep 1

# setsid로 완전히 세션 분리 + disown
setsid nohup ./hermes-agent/venv/bin/hermes dashboard --no-open --host 127.0.0.1 --port 9119 < /dev/null > "$LOG" 2>&1 &
PID=$!
disown $PID 2>/dev/null
echo "PID=$PID"

# 부팅 대기 (최대 12초)
for i in $(seq 1 12); do
  sleep 1
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9119/api/status 2>/dev/null | grep -q "^200$"; then
    echo "READY after ${i}s"
    exit 0
  fi
done

echo "NOT_READY"
echo "=== log tail ==="
tail -30 "$LOG"
exit 1