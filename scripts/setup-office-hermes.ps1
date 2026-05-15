param(
  [switch]$SkipNpmInstall = $false,
  [switch]$ForceRebuild = $false
)

$ErrorActionPreference = "Stop"

function Convert-ToWslPath([string]$Path) {
  $full = [System.IO.Path]::GetFullPath($Path)
  $drive = $full.Substring(0, 1).ToLowerInvariant()
  $rest = $full.Substring(2) -replace '\\', '/'
  if (!$rest.StartsWith("/")) {
    $rest = "/" + $rest
  }
  return "/mnt/$drive$rest"
}


chcp 65001 | Out-Null
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host ""
Write-Host "=== Mamabot Office Setup ===" -ForegroundColor Cyan
Write-Host "Root: $root"

if (!$SkipNpmInstall) {
  Write-Host ""
  Write-Host "=== npm install ===" -ForegroundColor Cyan
  npm install
}

Write-Host ""
Write-Host "=== WSL Python 3.11 확인 ===" -ForegroundColor Cyan

$pyCheck = wsl bash -lc "command -v python3.11 >/dev/null 2>&1 && python3.11 --version || true"

if (!$pyCheck -or $pyCheck -notmatch "Python 3\.11") {
  Write-Host "WSL Python 3.11이 없습니다." -ForegroundColor Red
  Write-Host "아래 명령을 한 번 실행한 뒤 다시 setup-office.bat을 실행하세요." -ForegroundColor Yellow
  Write-Host "wsl bash -lc `"sudo apt update && sudo apt install -y python3.11 python3.11-venv python3.11-dev`"" -ForegroundColor Yellow
  throw "WSL Python 3.11 required"
}

Write-Host $pyCheck -ForegroundColor Green

$wslRoot = Convert-ToWslPath $root
$agent = "$wslRoot/runtime/hermes/home/hermes-agent"

Write-Host ""
Write-Host "=== Hermes Agent 확인 ===" -ForegroundColor Cyan
wsl bash -lc "test -f '$agent/pyproject.toml'"

if ($LASTEXITCODE -ne 0) {
  throw "Hermes pyproject.toml을 찾을 수 없습니다: $agent"
}

Write-Host ""
Write-Host "=== Hermes venv 확인/생성 ===" -ForegroundColor Cyan

if ($ForceRebuild) {
  wsl bash -lc "rm -rf '$agent/venv'"
}

$venvOk = wsl bash -lc "test -x '$agent/venv/bin/python' && '$agent/venv/bin/python' --version || true"

if ($venvOk -and $venvOk -match "Python 3\.11") {
  Write-Host "기존 WSL Hermes venv 재사용: $venvOk" -ForegroundColor Green
} else {
  Write-Host "WSL Hermes venv 생성" -ForegroundColor Cyan
  wsl bash -lc "cd '$agent' && rm -rf venv && python3.11 -m venv venv"
}

Write-Host ""
Write-Host "=== Hermes 의존성 설치/확인 ===" -ForegroundColor Cyan

wsl bash -lc "cd '$agent' && ./venv/bin/python -m pip install --upgrade pip setuptools wheel"
wsl bash -lc "cd '$agent' && ./venv/bin/python -m pip install -e ."
wsl bash -lc "cd '$agent' && ./venv/bin/python -m pip install fastapi 'uvicorn[standard]'"

Write-Host ""
Write-Host "=== 설치 확인 ===" -ForegroundColor Cyan
wsl bash -lc "cd '$agent' && ./venv/bin/python --version && ./venv/bin/python -m pip show hermes-agent fastapi uvicorn | grep -E 'Name:|Version:'"

Write-Host ""
Write-Host "=== Setup 완료 ===" -ForegroundColor Green
Write-Host "이제 매일 아침에는 start-mamabot.bat만 실행하면 됩니다." -ForegroundColor Green
