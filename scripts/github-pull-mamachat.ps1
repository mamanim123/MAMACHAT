$ErrorActionPreference = "Stop"

chcp 65001 | Out-Null
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$remoteUrl = "https://github.com/mamanim123/MAMACHAT.git"

Write-Host ""
Write-Host "=== Mamabot GitHub 가져오기 ===" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host "Remote: $remoteUrl"

if (!(Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git이 설치되어 있지 않습니다."
}

if (!(Test-Path ".git")) {
  throw ".git 폴더가 없습니다. 처음 한 번은 git clone으로 받아야 합니다."
}

$existingRemote = git remote get-url origin 2>$null

if ([string]::IsNullOrWhiteSpace($existingRemote)) {
  git remote add origin $remoteUrl
} elseif ($existingRemote -ne $remoteUrl) {
  git remote set-url origin $remoteUrl
}

Write-Host ""
Write-Host "=== 로컬 변경 사항 확인 ===" -ForegroundColor Cyan
git status --short

$changes = git status --porcelain

if (![string]::IsNullOrWhiteSpace($changes)) {
  Write-Host ""
  Write-Host "로컬에 아직 커밋하지 않은 변경 사항이 있습니다." -ForegroundColor Yellow
  Write-Host "덮어쓰지 않기 위해 pull을 중단합니다." -ForegroundColor Yellow
  Write-Host "먼저 깃허브에올리기.bat으로 올리거나, 변경 사항을 정리하세요." -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "=== GitHub에서 pull ===" -ForegroundColor Cyan
git pull --rebase origin main

Write-Host ""
Write-Host "=== package 변경 여부 안내 ===" -ForegroundColor Cyan
Write-Host "package.json 또는 package-lock.json이 바뀐 날에는 npm install을 한 번 실행하세요." -ForegroundColor Yellow

Write-Host ""
Write-Host "=== 가져오기 완료 ===" -ForegroundColor Green
