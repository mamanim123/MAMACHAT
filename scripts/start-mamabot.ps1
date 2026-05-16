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

function Test-Dashboard {
  try {
    $res = Invoke-WebRequest "http://127.0.0.1:9119/api/status" -UseBasicParsing -TimeoutSec 2
    return ($res.StatusCode -eq 200)
  } catch {
    return $false
  }
}

Write-Host ""
Write-Host "=== Mamabot Start ===" -ForegroundColor Cyan
Write-Host "Root: $root"

Write-Host ""
Write-Host "=== 기본 파일 확인 ===" -ForegroundColor Cyan

if (!(Test-Path "node_modules")) {
  Write-Host "node_modules가 없습니다. setup-office.bat을 먼저 실행합니다." -ForegroundColor Yellow
  & "$root\scripts\setup-office-hermes.ps1"
}

$wslRoot = Convert-ToWslPath $root
$agent = "$wslRoot/runtime/hermes/home/hermes-agent"

$venvOk = wsl bash -lc "test -x '$agent/venv/bin/hermes' && echo OK || echo MISSING"

if ($venvOk -notmatch "OK") {
  Write-Host "Hermes venv 또는 hermes 실행 파일이 없습니다. setup-office.bat을 먼저 실행합니다." -ForegroundColor Yellow
  & "$root\scripts\setup-office-hermes.ps1" -SkipNpmInstall
}

Write-Host ""
Write-Host "=== Hermes Dashboard 확인 ===" -ForegroundColor Cyan

if (Test-Dashboard) {
  Write-Host "Hermes Dashboard 이미 실행 중: http://127.0.0.1:9119" -ForegroundColor Green
} else {
  Write-Host "Hermes Dashboard가 꺼져 있어 백그라운드로 실행합니다." -ForegroundColor Yellow

  $dashboardLog = "$wslRoot/runtime/hermes/logs/dashboard-9119.log"
  $dashboardPid = "$wslRoot/runtime/hermes/logs/dashboard-9119.pid"

  wsl bash -lc "mkdir -p '$wslRoot/runtime/hermes/logs'"
  Start-Process -FilePath "wsl.exe" -ArgumentList @("bash", "-lc", "cd '$wslRoot' && bash scripts/start-hermes-dashboard-wsl.sh >> '$dashboardLog' 2>&1") -WindowStyle Minimized

  Write-Host "Dashboard 시작 대기 중..." -ForegroundColor Cyan

  $ready = $false

  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1

    if (Test-Dashboard) {
      $ready = $true
      break
    }
  }

  if (!$ready) {
    Write-Host "Dashboard가 30초 안에 응답하지 않습니다." -ForegroundColor Red
    Write-Host "새로 열린 Dashboard 창의 에러 메시지를 확인하세요." -ForegroundColor Yellow
    throw "Hermes Dashboard startup failed"
  }

  Write-Host "Hermes Dashboard 실행 확인 완료" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Mamabot dev 서버 실행 ===" -ForegroundColor Cyan
Write-Host "브라우저: http://localhost:3200" -ForegroundColor Green
Write-Host ""

npm run dev

