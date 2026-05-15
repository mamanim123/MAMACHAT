$ErrorActionPreference = "Stop"

chcp 65001 | Out-Null
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host ""
Write-Host "=== Mamabot 커밋 복구 도구 ===" -ForegroundColor Cyan
Write-Host "Root: $root"

if (!(Test-Path ".git")) {
  throw "현재 폴더는 Git 저장소가 아닙니다. F:\mamabot에서 실행하세요."
}

Write-Host ""
Write-Host "=== 현재 상태 ===" -ForegroundColor Cyan
git status -sb

Write-Host ""
Write-Host "=== 커밋 표시 개수 선택 ===" -ForegroundColor Cyan
Write-Host "그냥 Enter: 최근 10개" -ForegroundColor DarkGray
Write-Host "숫자 입력: 해당 개수만큼 표시" -ForegroundColor DarkGray
Write-Host "all 입력: 전체 표시" -ForegroundColor DarkGray

$countChoice = Read-Host "표시할 커밋 개수"

$logLimitArg = @("-n", "10")

if (![string]::IsNullOrWhiteSpace($countChoice)) {
  if ($countChoice -eq "all" -or $countChoice -eq "ALL") {
    $logLimitArg = @()
  } elseif ($countChoice -match "^\d+$") {
    $n = [int]$countChoice

    if ($n -lt 1) {
      throw "표시 개수는 1 이상이어야 합니다."
    }

    $logLimitArg = @("-n", "$n")
  } else {
    throw "잘못된 입력입니다. 숫자, all, 또는 Enter만 사용할 수 있습니다."
  }
}

Write-Host ""
Write-Host "=== 최근 커밋 목록 ===" -ForegroundColor Cyan

$rawCommits = git log --pretty=format:"%h|%ad|%s" --date=format:"%Y-%m-%d %H:%M" @logLimitArg
$commits = @()

foreach ($line in $rawCommits) {
  $parts = $line -split "\|", 3
  if ($parts.Count -ge 3) {
    $commits += [PSCustomObject]@{
      Hash = $parts[0]
      Date = $parts[1]
      Msg  = $parts[2]
    }
  }
}

for ($i = 0; $i -lt $commits.Count; $i++) {
  $n = $i + 1
  "{0,2}. {1}  {2}  {3}" -f $n, $commits[$i].Hash, $commits[$i].Date, $commits[$i].Msg
}

Write-Host ""
Write-Host "복구할 커밋 번호 또는 커밋 해시를 입력하세요." -ForegroundColor Yellow
Write-Host "취소하려면 q 입력" -ForegroundColor DarkGray

$choice = Read-Host "선택"

if ($choice -eq "q" -or $choice -eq "Q") {
  Write-Host "복구를 취소했습니다." -ForegroundColor Yellow
  exit 0
}

$targetHash = ""

if ($choice -match "^\d+$") {
  $idx = [int]$choice - 1
  if ($idx -lt 0 -or $idx -ge $commits.Count) {
    throw "잘못된 번호입니다."
  }
  $targetHash = $commits[$idx].Hash
} else {
  $targetHash = $choice.Trim()
}

git cat-file -e "$targetHash^{commit}" 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "존재하지 않는 커밋입니다: $targetHash"
}

Write-Host ""
Write-Host "선택한 커밋:" -ForegroundColor Cyan
git log --oneline -1 $targetHash

Write-Host ""
Write-Host "주의: 선택한 커밋으로 되돌리면 현재 커밋 이후의 작업 상태가 로컬에서 바뀝니다." -ForegroundColor Yellow
Write-Host "현재 상태는 백업 폴더와 backup 브랜치로 보존합니다." -ForegroundColor Yellow

$confirm = Read-Host "정말 복구할까요? y 입력 시 진행"

if ($confirm -ne "y" -and $confirm -ne "Y") {
  Write-Host "복구를 취소했습니다." -ForegroundColor Yellow
  exit 0
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = "F:\_mamabot_backups\git-restore-before-$stamp"
$beforeHead = (git rev-parse --short HEAD).Trim()
$backupBranch = "backup/restore-before-$stamp"

Write-Host ""
Write-Host "=== 현재 상태 외부 백업 생성 ===" -ForegroundColor Cyan
Write-Host $backupRoot

New-Item -ItemType Directory -Force $backupRoot | Out-Null

robocopy $root $backupRoot /E /XJ /R:1 /W:1 `
  /XD ".git" "node_modules" ".next" "backups" "backup" "참고자료" "runtime" "config\cache" `
  /XF "*.log" "*.tmp" "*.bak" "*.backup" "*.pid" "*.old" "*.pyc" ".env" ".env.local" "auth.json" "oauth_creds.json" | Out-Null

if ($LASTEXITCODE -gt 7) {
  throw "백업 중 오류가 발생했습니다. robocopy exitCode=$LASTEXITCODE"
}

Write-Host ""
Write-Host "=== 현재 HEAD 보존 브랜치 생성 ===" -ForegroundColor Cyan
git branch $backupBranch HEAD

Write-Host "보존 브랜치: $backupBranch"
Write-Host "복구 전 HEAD: $beforeHead"

Write-Host ""
Write-Host "=== 선택한 커밋으로 복구 ===" -ForegroundColor Cyan
git reset --hard $targetHash

Write-Host ""
Write-Host "=== 복구 완료 ===" -ForegroundColor Green
git status -sb
git log --oneline -3

Write-Host ""
Write-Host "되돌리기 전 상태로 다시 돌아가려면:" -ForegroundColor Yellow
Write-Host "git reset --hard $backupBranch" -ForegroundColor Yellow

Write-Host ""
Write-Host "백업 위치:" -ForegroundColor Cyan
Write-Host $backupRoot -ForegroundColor Green
