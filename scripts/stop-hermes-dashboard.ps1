$ErrorActionPreference = "Continue"

chcp 65001 | Out-Null
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$root = Split-Path -Parent $PSScriptRoot

function Convert-ToWslPath([string]$Path) {
  $full = [System.IO.Path]::GetFullPath($Path)
  $drive = $full.Substring(0, 1).ToLowerInvariant()
  $rest = $full.Substring(2) -replace '\\', '/'
  if (!$rest.StartsWith("/")) {
    $rest = "/" + $rest
  }
  return "/mnt/$drive$rest"
}

$wslRoot = Convert-ToWslPath $root
$pidFile = "$wslRoot/runtime/hermes/logs/dashboard-9119.pid"

Write-Host "Hermes Dashboard 중지 시도..." -ForegroundColor Cyan

wsl bash -lc "if [ -f '$pidFile' ]; then kill \$(cat '$pidFile') 2>/dev/null || true; rm -f '$pidFile'; fi"
wsl bash -lc "pkill -f 'hermes dashboard.*9119' 2>/dev/null || true"

Write-Host "완료" -ForegroundColor Green
