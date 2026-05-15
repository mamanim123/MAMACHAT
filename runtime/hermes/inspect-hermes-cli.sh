#!/usr/bin/env bash
set -u

export HERMES_HOME=/mnt/f/test/mamabot/runtime/hermes/home
export HOME="$HERMES_HOME"
export PATH="$HERMES_HOME/hermes-agent/venv/bin:$PATH"

cd "$HERMES_HOME/hermes-agent"

echo "=== ENV ==="
echo "HERMES_HOME=$HERMES_HOME"
echo "PWD=$(pwd)"
echo ""

echo "=== HERMES BIN ==="
ls -la ./venv/bin/hermes
echo ""

echo "=== hermes --help ==="
./venv/bin/hermes --help 2>&1 | sed -n '1,180p'
echo ""

echo "=== command help scan ==="
for cmd in chat run ask exec prompt complete session sessions tui terminal dashboard doctor; do
  echo ""
  echo "----- hermes $cmd --help -----"
  ./venv/bin/hermes "$cmd" --help 2>&1 | sed -n '1,120p'
done