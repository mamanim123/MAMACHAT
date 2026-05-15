param(
  [string]$SourceRoot = "",
  [string]$OutputRoot = "",
  [bool]$IncludeSecrets = $true,
  [bool]$IncludeGit = $true,
  [bool]$IncludeSessions = $true
)

$ErrorActionPreference = "Stop"

chcp 65001 | Out-Null
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$scriptDir = $PSScriptRoot
$defaultRoot = Split-Path -Parent $scriptDir

if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
  $SourceRoot = $defaultRoot
}

$SourceRoot = [System.IO.Path]::GetFullPath($SourceRoot)

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $SourceRoot "backups\exports"
}

if (!(Test-Path $SourceRoot)) {
  throw "SourceRoot not found: $SourceRoot"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "mamabot-home-$stamp"
$stageRoot = Join-Path $OutputRoot $packageName
$zipPath = Join-Path $OutputRoot "$packageName.zip"

New-Item -ItemType Directory -Force $OutputRoot | Out-Null

if (Test-Path $stageRoot) {
  Remove-Item $stageRoot -Recurse -Force
}

$excludeDirs = @(
  ".next",
  "node_modules",
  "backup",
  "backups",
  "backups\exports",
  "참고자료",
  "runtime\workspace-index",
  "runtime\logs",
  "runtime\hermes\logs",
  "runtime\hermes\runs",
  "runtime\hermes\home\hermes-agent\venv",
  "config\cache",
  "mamabot_exports",
  "_exports"
)

if (!$IncludeGit) {
  $excludeDirs += ".git"
}

if (!$IncludeSecrets) {
  $excludeDirs += "secrets"
}

if (!$IncludeSessions) {
  $excludeDirs += "runtime\hermes\sessions"
}

$excludeFiles = @(
  "*.log",
  "*.tmp",
  "*.bak",
  "*.backup",
  "*.pid",
  "*.old",
  "*.pyc"
)

Write-Host ""
Write-Host "=== Mamabot Home ZIP Export ===" -ForegroundColor Cyan
Write-Host "Source : $SourceRoot"
Write-Host "Stage  : $stageRoot"
Write-Host "Zip    : $zipPath"
Write-Host ""

Write-Host "=== 제외 폴더 ===" -ForegroundColor Yellow
$excludeDirs | ForEach-Object { Write-Host "- $_" }

Write-Host ""
Write-Host "=== 복사 시작 ===" -ForegroundColor Cyan

$robocopyArgs = @(
  $SourceRoot,
  $stageRoot,
  "/E",
  "/XJ",
  "/R:1",
  "/W:1",
  "/NFL",
  "/NDL",
  "/NP",
  "/XD"
) + $excludeDirs + @("/XF") + $excludeFiles

& robocopy @robocopyArgs
$code = $LASTEXITCODE

if ($code -gt 7) {
  throw "robocopy failed. exitCode=$code"
}

Write-Host ""
Write-Host "=== README 생성 ===" -ForegroundColor Cyan

$readme = @"
# Mamabot Portable Package

생성일: $stamp

## 집/사무실 실행 방법

### 사무실에서 실행
01-start-office.bat

### 집에서 실행
01-start-home.bat

## 처음 가져온 PC에서 필요한 경우

setup-office.bat 또는 npm run setup:office 실행

## 개발 서버

브라우저:
http://localhost:3200

## 포함 여부

- secrets 포함: $IncludeSecrets
- git 기록 포함: $IncludeGit
- 대화 세션 포함: $IncludeSessions

## 제외된 주요 폴더

- node_modules
- .next
- backups
- 참고자료
- runtime/workspace-index
- runtime/hermes/logs
- runtime/hermes/runs
- runtime/hermes/home/hermes-agent/venv
- config/cache

## 참고

- Quick Mode를 바로 쓰려면 secrets\.env.local 안에 OPENROUTER_API_KEY가 있어야 합니다.
- Hermes venv는 PC 환경 의존성이 있어 제외합니다.
- 새 PC에서는 setup-office.bat을 한 번 실행하세요.
- 매일 실행은 01-start-office.bat 또는 01-start-home.bat만 누르면 됩니다.
"@

$readme | Set-Content (Join-Path $stageRoot "README_PORTABLE_RUN.md") -Encoding UTF8

Write-Host ""
Write-Host "=== ZIP 생성 ===" -ForegroundColor Cyan

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -Force

$zip = Get-Item $zipPath
$sizeMb = [Math]::Round($zip.Length / 1MB, 2)

Write-Host ""
Write-Host "=== 완료 ===" -ForegroundColor Green
Write-Host "ZIP : $zipPath"
Write-Host "SIZE: $sizeMb MB"
Write-Host ""
Write-Host "집으로 가져갈 파일:"
Write-Host $zipPath -ForegroundColor Green
