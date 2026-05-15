#!/bin/bash
export HOME=/mnt/f/mamabot/runtime/hermes/home
export HERMES_HOME=$HOME
cd $HOME
set -a
[ -f .env ] && . ./.env
set +a
echo "=== HOME=$HOME"
echo "=== PWD=$(pwd)"
echo "=== config.yaml ==="
ls -la config.yaml 2>&1
echo "=== which hermes ==="
ls -la ./hermes-agent/venv/bin/hermes
echo "=== shebang ==="
head -1 ./hermes-agent/venv/bin/hermes
echo "=== launching dashboard (20s max) ==="
timeout 20 ./hermes-agent/venv/bin/hermes dashboard --no-open --host 127.0.0.1 --port 9119 2>&1
ec=$?
echo "=== exit=$ec ==="