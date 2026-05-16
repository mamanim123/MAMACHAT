param(
  [Parameter(Mandatory=$true)]
  [string]$Workspace
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

$WorkspaceFull = (Resolve-Path $Workspace).Path
$Drive = $WorkspaceFull.Substring(0,1).ToLower()
$Rest = $WorkspaceFull.Substring(2).Replace("\","/")
$WorkspaceWsl = "/mnt/$Drive$Rest"

Write-Host "[Mamabot] Workspace Windows: $WorkspaceFull"
Write-Host "[Mamabot] Workspace WSL: $WorkspaceWsl"

wsl -d Ubuntu -e bash -lc '
set -e

PORTABLE_ROOT="$(pwd)"
WORKSPACE="$1"

export HERMES_HOME="$PORTABLE_ROOT/runtime/hermes/home"
export HOME="$HERMES_HOME"
export PATH="$HERMES_HOME/hermes-agent/venv/bin:$PATH"

mkdir -p "$WORKSPACE/.hermes-workspace"

echo "[Mamabot] PORTABLE_ROOT=$PORTABLE_ROOT"
echo "[Mamabot] HERMES_HOME=$HERMES_HOME"
echo "[Mamabot] WORKSPACE=$WORKSPACE"

cd "$WORKSPACE"
"$HERMES_HOME/hermes-agent/venv/bin/hermes" chat
' bash "$WorkspaceWsl"
