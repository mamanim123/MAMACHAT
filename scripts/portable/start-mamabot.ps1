$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

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
  Write-Host "[FAIL] WSL distro not found" -ForegroundColor Red
  exit 1
}

$Distro = $Distros | Where-Object { $_ -match '^Ubuntu' } | Select-Object -First 1
if (-not $Distro) {
  $Distro = $Distros[0]
}

function Run-Wsl($Command) {
  wsl -d $Distro -u root -e bash -lc $Command
}

Write-Host "=== Mamabot Start ===" -ForegroundColor Cyan
Write-Host "Root       : $Root"
Write-Host "WSL distro : $Distro"
Write-Host ""

Write-Host "=== 1. Doctor repair ===" -ForegroundColor Cyan
& (Join-Path $ScriptDir "doctor-mamabot.ps1") -Repair

Write-Host ""
Write-Host "=== 2. Start Hermes Dashboard ===" -ForegroundColor Cyan

try {
  $pre = Invoke-WebRequest -Uri "http://127.0.0.1:9119/api/status" -UseBasicParsing -TimeoutSec 2

  if ($pre.StatusCode -eq 200) {
    Write-Host "[OK] Hermes Dashboard already running. Reusing 127.0.0.1:9119" -ForegroundColor Green
  }
} catch {
  wsl -d $Distro -u root -e bash "$RootWsl/runtime/hermes/start-dashboard.sh"
}

Start-Sleep -Seconds 4

try {
  $res = Invoke-WebRequest -Uri "http://127.0.0.1:9119/api/status" -UseBasicParsing -TimeoutSec 5
  if ($res.StatusCode -eq 200) {
    Write-Host "[OK] Hermes Dashboard running: http://127.0.0.1:9119" -ForegroundColor Green
  }
} catch {
  Write-Host "[FAIL] Hermes Dashboard did not start. Log:" -ForegroundColor Red
  Run-Wsl "tail -120 '$DashboardLogWsl' 2>&1"
  exit 1
}

Write-Host ""
Write-Host "=== 3. Start Mamabot Next.js ===" -ForegroundColor Cyan

Set-Location $Root

if (-not (Test-Path "node_modules")) {
  Write-Host "[WARN] node_modules missing. Running npm install..." -ForegroundColor Yellow
  npm install
}

Write-Host ""
Write-Host "[OK] Open http://localhost:3200" -ForegroundColor Green
npm run dev
