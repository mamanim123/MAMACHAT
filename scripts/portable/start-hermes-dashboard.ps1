param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Convert-ToWslPath([string]$Path) {
  $full = (Resolve-Path $Path).Path
  $drive = $full.Substring(0,1).ToLower()
  $rest = $full.Substring(2).Replace("\","/")
  return "/mnt/$drive$rest"
}

$ROOT_WIN = (Resolve-Path ".").Path
$ROOT_WSL = Convert-ToWslPath "."
$SH_WIN = Join-Path $ROOT_WIN "runtime\hermes\dashboard-portable.sh"
$SH_WSL = Convert-ToWslPath $SH_WIN

$script = @"
#!/usr/bin/env bash
set -euo pipefail

PORTABLE_ROOT="$ROOT_WSL"
export HERMES_HOME="\$PORTABLE_ROOT/runtime/hermes/home"
export HOME="\$HERMES_HOME"
export PATH="\$HERMES_HOME/hermes-agent/venv/bin:\$PATH"

echo "[Mamabot] PORTABLE_ROOT=\$PORTABLE_ROOT"
echo "[Mamabot] HERMES_HOME=\$HERMES_HOME"
echo "[Mamabot] Dashboard URL: http://127.0.0.1:9119"

if [ ! -x "\$HERMES_HOME/hermes-agent/venv/bin/hermes" ]; then
  echo "[Mamabot] ERROR: Hermes binary not found"
  exit 10
fi

cd "\$HERMES_HOME/hermes-agent"

BROWSER=/bin/true ./venv/bin/hermes dashboard
"@

Set-Content -Path $SH_WIN -Value $script -Encoding UTF8

Write-Host "[Mamabot] ROOT_WIN=$ROOT_WIN"
Write-Host "[Mamabot] ROOT_WSL=$ROOT_WSL"
Write-Host "[Mamabot] SH_WSL=$SH_WSL"
Write-Host "[Mamabot] Open: http://127.0.0.1:9119"

wsl -d Ubuntu -e bash -lc "chmod +x '$SH_WSL' && '$SH_WSL'"
