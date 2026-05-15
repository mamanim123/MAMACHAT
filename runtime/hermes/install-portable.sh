#!/usr/bin/env bash
set -o pipefail

PORTABLE_ROOT_WSL='/mnt/f/test/mamabot'
HERMES_ROOT='/mnt/f/test/mamabot/runtime/hermes'
HERMES_HOME='/mnt/f/test/mamabot/runtime/hermes/home'
HERMES_INSTALL_DIR='/mnt/f/test/mamabot/runtime/hermes/home/hermes-agent'
HERMES_INSTALL_PARENT='/mnt/f/test/mamabot/runtime/hermes/home'
HERMES_LOGS='/mnt/f/test/mamabot/runtime/hermes/logs'

export PORTABLE_ROOT_WSL HERMES_ROOT HERMES_HOME HERMES_INSTALL_DIR HERMES_INSTALL_PARENT HERMES_LOGS

echo "[Mamabot] Starting Portable Hermes Agent install..."
echo "[Mamabot] PORTABLE_ROOT_WSL=$PORTABLE_ROOT_WSL"
echo "[Mamabot] HERMES_ROOT=$HERMES_ROOT"
echo "[Mamabot] HERMES_HOME=$HERMES_HOME"
echo "[Mamabot] HERMES_INSTALL_DIR=$HERMES_INSTALL_DIR"

if [ -z "$PORTABLE_ROOT_WSL" ] || [ -z "$HERMES_HOME" ] || [ -z "$HERMES_INSTALL_DIR" ]; then
  echo "[Mamabot] ERROR: required path variable is empty"
  exit 20
fi

mkdir -p "$HERMES_ROOT" "$HERMES_HOME" "$HERMES_LOGS" "$HERMES_INSTALL_PARENT"

echo "[Mamabot] Checking WSL prerequisites..."
command -v git || echo "[Mamabot] git not found in WSL"
command -v curl || echo "[Mamabot] curl not found in WSL"

echo "[Mamabot] Checking existing install directory..."
if [ -d "$HERMES_INSTALL_DIR" ] && [ ! -d "$HERMES_INSTALL_DIR/.git" ] && [ -z "$(ls -A "$HERMES_INSTALL_DIR" 2>/dev/null)" ]; then
  echo "[Mamabot] Removing empty broken install dir"
  rmdir "$HERMES_INSTALL_DIR"
fi

if [ -d "$HERMES_INSTALL_DIR" ] && [ ! -d "$HERMES_INSTALL_DIR/.git" ]; then
  echo "[Mamabot] ERROR: install dir exists but is not a git repo and is not empty"
  ls -la "$HERMES_INSTALL_DIR"
  exit 22
fi

echo "[Mamabot] Downloading official installer..."
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh -o /tmp/mamabot-hermes-install.sh
chmod +x /tmp/mamabot-hermes-install.sh

echo "[Mamabot] Running installer with explicit portable paths..."
echo "[Mamabot] Installer command: bash /tmp/mamabot-hermes-install.sh --dir $HERMES_INSTALL_DIR --hermes-home $HERMES_HOME --skip-setup"

bash /tmp/mamabot-hermes-install.sh --dir "$HERMES_INSTALL_DIR" --hermes-home "$HERMES_HOME" --skip-setup
INSTALL_CODE=$?

echo "[Mamabot] Installer exit code: $INSTALL_CODE"

echo "[Mamabot] Checking portable hermes executable..."
if [ -f "$HERMES_INSTALL_DIR/hermes" ]; then
  chmod +x "$HERMES_INSTALL_DIR/hermes"
fi

if [ -x "$HERMES_INSTALL_DIR/hermes" ]; then
  "$HERMES_INSTALL_DIR/hermes" --version || true
  echo "[Mamabot] PORTABLE_HERMES_FOUND"
else
  echo "[Mamabot] PORTABLE_HERMES_NOT_FOUND"
fi

echo "[Mamabot] Portable install flow finished."
exit $INSTALL_CODE
