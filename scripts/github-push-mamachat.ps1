param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

chcp 65001 | Out-Null
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$remoteUrl = "https://github.com/mamanim123/MAMACHAT.git"

Write-Host ""
Write-Host "=== Mamabot GitHub 업로드 ===" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host "Remote: $remoteUrl"

if (!(Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git이 설치되어 있지 않습니다."
}

if (!(Test-Path ".git")) {
  Write-Host ""
  Write-Host ".git 폴더가 없어 새 Git 저장소로 초기화합니다." -ForegroundColor Yellow
  git init
}

$existingRemote = ""
try {
  $existingRemote = git remote get-url origin 2>$null
} catch {}

if ([string]::IsNullOrWhiteSpace($existingRemote)) {
  git remote add origin $remoteUrl
} elseif ($existingRemote -ne $remoteUrl) {
  Write-Host "origin 주소가 달라서 MAMACHAT으로 변경합니다." -ForegroundColor Yellow
  git remote set-url origin $remoteUrl
}

git branch -M main

Write-Host ""
Write-Host "=== Git에 올리면 안 되는 파일 확인 ===" -ForegroundColor Cyan

$dangerFiles = @(
  "secrets/.env.local",
  ".env",
  ".env.local"
)

foreach ($dangerFile in $dangerFiles) {
  if (Test-Path $dangerFile) {
    $tracked = git ls-files -- $dangerFile
    if (![string]::IsNullOrWhiteSpace($tracked)) {
      throw "비밀 파일이 이미 Git 추적 대상입니다: $dangerFile"
    }
  }
}

Write-Host "비밀 파일 추적 없음" -ForegroundColor Green

Write-Host ""
Write-Host "=== 변경 파일 추가 ===" -ForegroundColor Cyan

git add -A

Write-Host ""
Write-Host "=== 현재 변경 상태 ===" -ForegroundColor Cyan
git status --short

$changes = git status --porcelain

if ([string]::IsNullOrWhiteSpace($changes)) {
  Write-Host "업로드할 변경 사항이 없습니다." -ForegroundColor Green
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "Mamabot 변경 사항 동기화"
}

Write-Host ""
Write-Host "=== 커밋 ===" -ForegroundColor Cyan
git commit -m $Message

Write-Host ""
Write-Host "=== GitHub로 push ===" -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host "=== 업로드 완료 ===" -ForegroundColor Green
