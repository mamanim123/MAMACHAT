#!/bin/bash
export HOME=/mnt/f/mamabot/runtime/hermes/home
cd $HOME
set -a
. ./.env
set +a
echo "=== start oneshot ==="
date
./hermes-agent/venv/bin/hermes -z "Reply OK only. One line." --provider openrouter -m nvidia/nemotron-3-super-120b-a12b:free
echo "=== EXIT=$? ==="
date