param(
  [string]$SourceRoot = "F:\mamabot-new",
  [string]$Message = "밤새 작업 파일 동기화"
)

$ErrorActionPreference = "Stop"

chcp 65001 | Out-Null
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$TargetRoot = Split-Path -Parent $PSScriptRoot
Set-Location $TargetRoot

Write-Host ""
Write-Host "=== 밤새 작업본 GitHub 업로드 준비 ===" -ForegroundColor Cyan
Write-Host "작업본: $SourceRoot"
Write-Host "기준폴더: $TargetRoot"

if (!(Test-Path $SourceRoot)) {
  throw "작업본 폴더가 없습니다: $SourceRoot"
}

if (!(Test-Path ".git")) {
  throw "현재 기준폴더에 .git이 없습니다. F:\mamabot에서 실행해야 합니다."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "F:\_mamabot_backups\manual\before-sync-from-mamabot-new-$stamp"
New-Item -ItemType Directory -Force $backupDir | Out-Null

Write-Host ""
Write-Host "=== 현재 기준폴더 백업 ===" -ForegroundColor Cyan
Write-Host $backupDir

robocopy $TargetRoot $backupDir /E /XJ /R:1 /W:1 `
  /XD ".git" "node_modules" ".next" "backups" "backup" "참고자료" "runtime\workspace-index" "runtime\logs" "runtime\hermes\logs" "runtime\hermes\runs" "runtime\hermes\sessions" "runtime\hermes\home\hermes-agent\venv" "config\cache" `
  /XF "*.log" "*.tmp" "*.bak" "*.backup" "*.pid" "*.old" "*.pyc" ".env" ".env.local" "auth.json" | Out-Null

if ($LASTEXITCODE -gt 7) {
  throw "백업 robocopy 실패: $LASTEXITCODE"
}

Write-Host ""
Write-Host "=== 작업본을 기준폴더에 덮어쓰기 ===" -ForegroundColor Cyan

robocopy $SourceRoot $TargetRoot /E /XJ /R:1 /W:1 `
  /XD ".git" "node_modules" ".next" "backups" "backup" "참고자료" "runtime\workspace-index" "runtime\logs" "runtime\hermes\logs" "runtime\hermes\runs" "runtime\hermes\sessions" "runtime\hermes\home\hermes-agent\venv" "runtime\hermes\home\hermes-agent\.git" "config\cache" `
  /XF "*.log" "*.tmp" "*.bak" "*.backup" "*.pid" "*.old" "*.pyc" ".env" ".env.local" "auth.json" | Out-Null

if ($LASTEXITCODE -gt 7) {
  throw "작업본 동기화 robocopy 실패: $LASTEXITCODE"
}

Write-Host ""
Write-Host "=== 보안 파일 추적 여부 확인 ===" -ForegroundColor Cyan

$danger = git ls-files | Select-String "auth.json|env.local|\.env$"

if ($danger) {
  Write-Host $danger -ForegroundColor Red
  throw "위험 파일이 Git 추적 대상에 있습니다. push 중단."
}

Write-Host "위험 파일 추적 없음" -ForegroundColor Green

Write-Host ""
Write-Host "=== Git 변경 상태 ===" -ForegroundColor Cyan
git status --short

$changes = git status --porcelain

if ([string]::IsNullOrWhiteSpace($changes)) {
  Write-Host "업로드할 변경 사항이 없습니다." -ForegroundColor Green
  exit 0
}

Write-Host ""
Write-Host "=== 커밋 ===" -ForegroundColor Cyan
git add -A
git commit -m $Message

Write-Host ""
Write-Host "=== GitHub로 push ===" -ForegroundColor Cyan
git push

if ($LASTEXITCODE -ne 0) {
  throw "GitHub push 실패"
}

Write-Host ""
Write-Host "=== 완료 ===" -ForegroundColor Green
Write-Host "F:\mamabot-new 변경분을 F:\mamabot에 반영하고 GitHub에 업로드했습니다."
