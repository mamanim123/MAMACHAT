$ErrorActionPreference = "Stop"

chcp 65001 | Out-Null
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

function Convert-ToWslPath([string]$Path) {
  $full = [System.IO.Path]::GetFullPath($Path)
  $drive = $full.Substring(0, 1).ToLowerInvariant()
  $rest = $full.Substring(2) -replace '\\', '/'
  if (!$rest.StartsWith("/")) {
    $rest = "/" + $rest
  }
  return "/mnt/$drive$rest"
}

function Test-Dashboard {
  try {
    $res = Invoke-WebRequest "http://127.0.0.1:9119/api/status" -UseBasicParsing -TimeoutSec 2
    return ($res.StatusCode -eq 200)
  } catch {
    return $false
  }
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$wslRoot = Convert-ToWslPath $root
$agent = "$wslRoot/runtime/hermes/home/hermes-agent"
$hermesBin = "$agent/venv/bin/hermes"

$logDirWin = Join-Path $root "runtime\hermes\logs"
$dashboardLogWin = Join-Path $logDirWin "dashboard-9119.log"

$logDirWsl = "$wslRoot/runtime/hermes/logs"
$dashboardLogWsl = "$logDirWsl/dashboard-9119.log"

Write-Host ""
Write-Host "=== Mamabot 시작 ===" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host "WSL : $wslRoot"

Write-Host ""
Write-Host "=== 기본 파일 확인 ===" -ForegroundColor Cyan

if (!(Test-Path "node_modules")) {
  Write-Host "node_modules가 없습니다. setup-office.bat을 먼저 실행합니다." -ForegroundColor Yellow
  & "$root\scripts\setup-office-hermes.ps1"
}

$hermesCheck = wsl bash -lc "test -x '$hermesBin' && echo OK || echo MISSING"

if ($hermesCheck -notmatch "OK") {
  Write-Host "Hermes 실행 파일이 없습니다. Hermes 설정을 먼저 복구합니다." -ForegroundColor Yellow
  & "$root\scripts\setup-office-hermes.ps1" -SkipNpmInstall
}

Write-Host ""
Write-Host "=== Hermes Dashboard 확인 ===" -ForegroundColor Cyan

if (Test-Dashboard) {
  Write-Host "Hermes Dashboard 이미 실행 중: http://127.0.0.1:9119" -ForegroundColor Green
} else {
  Write-Host "Hermes Dashboard가 꺼져 있어 백그라운드로 실행합니다." -ForegroundColor Yellow

  New-Item -ItemType Directory -Force $logDirWin | Out-Null

  # 포트는 죽어 있는데 프로세스만 남은 경우 정리
  wsl bash -lc "pkill -f 'hermes dashboard.*9119' 2>/dev/null || true"
  wsl bash -lc "mkdir -p '$logDirWsl'"

  $dashboardCommand = "export HOME='$wslRoot/runtime/hermes/home'; cd '$agent'; exec ./venv/bin/hermes dashboard --no-open --host 127.0.0.1 --port 9119 >> '$dashboardLogWsl' 2>&1"

  Start-Process -FilePath "wsl.exe" `
    -ArgumentList @("bash", "-lc", $dashboardCommand) `
    -WindowStyle Hidden

  Write-Host "Dashboard 시작 대기 중..." -ForegroundColor Cyan

  $ready = $false

  for ($i = 1; $i -le 45; $i++) {
    Start-Sleep -Seconds 1

    if (Test-Dashboard) {
      $ready = $true
      break
    }

    if ($i % 5 -eq 0) {
      Write-Host "대기 중... $i초" -ForegroundColor DarkGray
    }
  }

  if (!$ready) {
    Write-Host ""
    Write-Host "Dashboard가 45초 안에 응답하지 않았습니다." -ForegroundColor Red
    Write-Host "로그 확인:" -ForegroundColor Yellow
    Write-Host $dashboardLogWin -ForegroundColor Yellow

    if (Test-Path $dashboardLogWin) {
      Get-Content $dashboardLogWin -Tail 80
    } else {
      Write-Host "로그 파일이 아직 생성되지 않았습니다." -ForegroundColor Yellow
    }

    throw "Hermes Dashboard 시작 실패"
  }

  Write-Host "Hermes Dashboard 실행 확인 완료" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Mamabot dev 서버 실행 ===" -ForegroundColor Cyan
Write-Host "브라우저: http://localhost:3200" -ForegroundColor Green
Write-Host ""

npm run dev
