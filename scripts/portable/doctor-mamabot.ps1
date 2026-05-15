param(
  [switch]$Repair
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

function Write-Ok($msg) {
  Write-Host "[OK] $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
  Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Write-Fail($msg) {
  Write-Host "[FAIL] $msg" -ForegroundColor Red
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

$Drive = (Split-Path -Qualifier $Root).TrimEnd(":")
$DriveLower = $Drive.ToLower()
$PathNoDrive = $Root.Substring(2).TrimStart("\").Replace("\", "/")
$RootWsl = "/mnt/" + $DriveLower + "/" + $PathNoDrive

$HermesHomeWsl = $RootWsl + "/runtime/hermes/home"
$HermesAgentWsl = $HermesHomeWsl + "/hermes-agent"
$HermesBinWsl = $HermesAgentWsl + "/venv/bin/hermes"
$DashboardLogWsl = $RootWsl + "/runtime/hermes/logs/dashboard.log"

$rawDistros = ((wsl -l -q 2>$null) -join [Environment]::NewLine).Replace([string][char]0, "")
$Distros = @($rawDistros -split "[\r\n]+" | Where-Object { $_.Trim() } | ForEach-Object { $_.Trim() })

if ($Distros.Count -eq 0) {
  Write-Fail "WSL distro not found"
  exit 1
}

$Distro = $Distros | Where-Object { $_ -match '^Ubuntu' } | Select-Object -First 1
if (-not $Distro) {
  $Distro = $Distros[0]
}

function Run-Wsl($Command) {
  wsl -d $Distro -u root -e bash -lc $Command
}

Write-Host "=== Mamabot Doctor ===" -ForegroundColor Cyan
Write-Host "Root        : $Root"
Write-Host "WSL distro  : $Distro"
Write-Host "WSL root    : $RootWsl"
Write-Host ""

Write-Host "=== 1. WSL drive mount ===" -ForegroundColor Cyan
$mountCmd = "mkdir -p /mnt/$DriveLower; mountpoint -q /mnt/$DriveLower || mount -t drvfs " + $Drive + ": /mnt/$DriveLower; test -d '$RootWsl' && echo PATH_OK || echo PATH_FAIL"
$mountResult = Run-Wsl $mountCmd

if ($mountResult -match "PATH_OK") {
  Write-Ok "WSL can access $RootWsl"
} else {
  Write-Fail "WSL cannot access $RootWsl"
  exit 1
}

Write-Host ""
Write-Host "=== 2. Hermes folders ===" -ForegroundColor Cyan
$folderResult = Run-Wsl "test -d '$HermesHomeWsl' && echo HOME_OK; test -d '$HermesAgentWsl' && echo AGENT_OK"

if ($folderResult -match "HOME_OK") {
  Write-Ok "Hermes home exists"
} else {
  Write-Fail "Hermes home missing: $HermesHomeWsl"
  exit 1
}

if ($folderResult -match "AGENT_OK") {
  Write-Ok "Hermes agent exists"
} else {
  Write-Fail "Hermes agent missing: $HermesAgentWsl"
  exit 1
}

Write-Host ""
Write-Host "=== 3. Python 3.11 ===" -ForegroundColor Cyan
$pyCheck = Run-Wsl "python3.11 --version 2>&1 || true"

if ($pyCheck -match "Python 3\.11") {
  Write-Ok $pyCheck.Trim()
} else {
  Write-Warn "python3.11 not found"

  if ($Repair) {
    Write-Warn "Installing python3.11 packages..."
    Run-Wsl "apt update && apt install -y software-properties-common && add-apt-repository -y ppa:deadsnakes/ppa && apt update && apt install -y python3.11 python3.11-venv python3.11-dev python3-pip build-essential curl"
  } else {
    Write-Warn "Run with -Repair to install python3.11"
    exit 1
  }
}

Write-Host ""
Write-Host "=== 4. Hermes venv ===" -ForegroundColor Cyan
$venvLine = Run-Wsl "test -x '$HermesBinWsl' && head -n 1 '$HermesBinWsl' || echo MISSING"

$needsRebuild = $false

if ($venvLine -match "MISSING") {
  $needsRebuild = $true
  Write-Warn "Hermes venv is missing"
} elseif ($venvLine -notlike "*$HermesAgentWsl/venv/bin/python*") {
  $needsRebuild = $true
  Write-Warn "Hermes venv points to old path: $venvLine"
} else {
  Write-Ok "Hermes venv path looks valid"
}

if ($needsRebuild) {
  if (-not $Repair) {
    Write-Warn "Run with -Repair to rebuild Hermes venv"
    exit 1
  }

  Write-Warn "Rebuilding Hermes venv..."
  Run-Wsl "set -e; cd '$HermesAgentWsl'; rm -rf venv; python3.11 -m venv venv; source venv/bin/activate; python -m pip install --upgrade pip setuptools wheel; python -m pip install fastapi 'uvicorn[standard]' python-multipart sse-starlette jinja2 aiofiles; python -m pip install -e ."
}

Write-Host ""
Write-Host "=== 5. Hermes status ===" -ForegroundColor Cyan
$status = Run-Wsl "export HOME='$HermesHomeWsl'; export HERMES_HOME='$HermesHomeWsl'; '$HermesBinWsl' status 2>&1 | head -40"
$status

Write-Host ""
Write-Host "=== 6. Dashboard API ===" -ForegroundColor Cyan
try {
  $res = Invoke-WebRequest -Uri "http://127.0.0.1:9119/api/status" -UseBasicParsing -TimeoutSec 2
  if ($res.StatusCode -eq 200) {
    Write-Ok "Dashboard is running on 127.0.0.1:9119"
  }
} catch {
  Write-Warn "Dashboard is not running yet"
}

Write-Host ""
Write-Ok "Doctor finished"
