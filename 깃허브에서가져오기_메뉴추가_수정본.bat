@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

title Mamabot GitHub에서 가져오기

echo.
echo ========================================
echo [Mamabot] GitHub에서 가져오기
echo ========================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git 명령을 찾을 수 없습니다.
  echo Git 설치 또는 PATH 설정을 확인하세요.
  pause
  exit /b 1
)

if not exist ".git" (
  echo [ERROR] 현재 폴더는 Git 저장소가 아닙니다.
  echo 이 bat 파일을 F:\mamabot 프로젝트 루트에 두고 실행하세요.
  echo 현재 위치: %CD%
  pause
  exit /b 1
)

for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"

if "!BRANCH!"=="" (
  echo [ERROR] 현재 브랜치를 확인하지 못했습니다.
  pause
  exit /b 1
)

echo 현재 폴더: %CD%
echo 현재 브랜치: !BRANCH!
echo.

echo ===== 가져오기 전 Git 상태 =====
git status -sb
echo.

set "HAS_CHANGES="
for /f "delims=" %%s in ('git status --porcelain') do set "HAS_CHANGES=1"

for /f "tokens=1-4 delims=/-. " %%a in ("%date%") do set "DATE_PART=%%a%%b%%c%%d"
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set "TIME_PART=%%a%%b%%c"
set "TIME_PART=!TIME_PART: =0!"
set "BACKUP_DIR=F:\_mamabot_backups\github-pull-!DATE_PART!-!TIME_PART!"

if not defined HAS_CHANGES (
  echo ----------------------------------------
  echo 이제 GitHub의 최신 내용을 이 PC로 가져옵니다.
  echo.
  echo 대상:
  echo origin/!BRANCH!
  echo.
  echo 안전장치:
  echo - pull 전에 Git 기준점 백업 생성
  echo - 자동 merge 없이 ff-only pull만 허용
  echo.
  echo 백업 위치:
  echo !BACKUP_DIR!
  echo ----------------------------------------
  echo.

  choice /C YN /M "정말 GitHub에서 가져올까요?"
  if errorlevel 2 (
    echo.
    echo 사용자가 취소했습니다.
    echo 아무 작업도 하지 않았습니다.
    pause
    exit /b 0
  )

  goto SAFE_PULL
)

echo [주의] 현재 커밋되지 않은 변경사항이 있습니다.
echo.
git status --short
echo.
echo ----------------------------------------
echo 선택하세요.
echo.
echo [1] 중단하기
echo     - 아무 작업도 하지 않습니다.
echo.
echo [2] 내 커밋되지 않은 변경사항을 백업/stash 후 무시하고 가져오기
echo     - git stash -u 로 변경사항을 보관합니다.
echo     - 작업 폴더를 깨끗하게 만든 뒤 GitHub 내용을 가져옵니다.
echo     - 나중에 필요하면 git stash list / git stash apply 로 복구 가능합니다.
echo.
echo 권장:
echo 잘 모르면 1번을 선택하세요.
echo ----------------------------------------
echo.

choice /C 12 /M "메뉴를 선택하세요"
if errorlevel 2 goto DISCARD_LOCAL_AND_PULL
if errorlevel 1 goto CANCEL_PULL

:CANCEL_PULL
echo.
echo 사용자가 취소했습니다.
echo 아무 작업도 하지 않았습니다.
pause
exit /b 0

:MAKE_BACKUP
mkdir "!BACKUP_DIR!" >nul 2>nul

git rev-parse HEAD > "!BACKUP_DIR!\HEAD-before-pull.txt" 2>nul
git status -sb > "!BACKUP_DIR!\status-before-pull.txt" 2>nul
git diff > "!BACKUP_DIR!\unstaged-changes.patch" 2>nul
git diff --staged > "!BACKUP_DIR!\staged-changes.patch" 2>nul
git bundle create "!BACKUP_DIR!\mamabot-before-pull.bundle" HEAD >nul 2>nul

echo 백업 위치: !BACKUP_DIR!
exit /b 0

:SAFE_PULL
call :MAKE_BACKUP
echo.
echo ===== 원격 정보 가져오기 =====
git fetch origin
if errorlevel 1 (
  echo.
  echo [ERROR] fetch 실패.
  echo 네트워크, 인증, 원격 저장소 설정을 확인하세요.
  echo 백업 위치: !BACKUP_DIR!
  pause
  exit /b 1
)

echo.
echo ===== ff-only pull 실행 =====
git pull --ff-only origin !BRANCH!
if errorlevel 1 (
  echo.
  echo [ERROR] pull 실패.
  echo 원격과 로컬 이력이 갈라졌거나 충돌 가능성이 있습니다.
  echo 자동 merge를 만들지 않기 위해 중단했습니다.
  echo 백업 위치: !BACKUP_DIR!
  pause
  exit /b 1
)

echo.
echo ===== 가져오기 후 상태 =====
git status -sb
echo.
echo [OK] GitHub에서 가져오기 완료.
echo 백업 위치: !BACKUP_DIR!
pause
exit /b 0

:DISCARD_LOCAL_AND_PULL
echo.
echo ----------------------------------------
echo [최종 확인]
echo 커밋되지 않은 로컬 변경사항을 stash/백업하고,
echo 작업 폴더를 깨끗하게 만든 뒤 GitHub 내용을 가져옵니다.
echo.
echo 이 작업은 현재 작업 중이던 파일을 화면에서 사라지게 만들 수 있습니다.
echo 대신 백업/stash를 남깁니다.
echo ----------------------------------------
echo.

choice /C YN /M "정말 내 커밋되지 않은 변경사항을 무시하고 가져올까요?"
if errorlevel 2 (
  echo.
  echo 사용자가 취소했습니다.
  echo 아무 작업도 하지 않았습니다.
  pause
  exit /b 0
)

call :MAKE_BACKUP

echo.
echo ===== 변경사항 stash 백업 =====
git stash push -u -m "auto-backup before github pull !DATE_PART!-!TIME_PART!"
if errorlevel 1 (
  echo.
  echo [ERROR] stash 실패.
  echo 변경사항 보존이 확실하지 않으므로 중단합니다.
  echo 백업 위치: !BACKUP_DIR!
  pause
  exit /b 1
)

echo.
echo ===== 작업 폴더 정리 =====
git reset --hard HEAD
if errorlevel 1 (
  echo.
  echo [ERROR] reset 실패.
  echo 백업 위치: !BACKUP_DIR!
  pause
  exit /b 1
)

git clean -fd
if errorlevel 1 (
  echo.
  echo [ERROR] clean 실패.
  echo 백업 위치: !BACKUP_DIR!
  pause
  exit /b 1
)

echo.
echo ===== 원격 정보 가져오기 =====
git fetch origin
if errorlevel 1 (
  echo.
  echo [ERROR] fetch 실패.
  echo 백업/stash는 남아 있습니다.
  echo 백업 위치: !BACKUP_DIR!
  git stash list -n 5
  pause
  exit /b 1
)

echo.
echo ===== ff-only pull 실행 =====
git pull --ff-only origin !BRANCH!
if errorlevel 1 (
  echo.
  echo [ERROR] pull 실패.
  echo 원격과 로컬 이력이 갈라졌거나 충돌 가능성이 있습니다.
  echo 백업/stash는 남아 있습니다.
  echo 백업 위치: !BACKUP_DIR!
  git stash list -n 5
  pause
  exit /b 1
)

echo.
echo ===== 가져오기 후 상태 =====
git status -sb
echo.
echo ===== 최근 stash 확인 =====
git stash list -n 5
echo.
echo [OK] 로컬 미커밋 변경사항을 stash/백업 후 GitHub에서 가져오기 완료.
echo 백업 위치: !BACKUP_DIR!
echo.
echo 필요 시 복구:
echo git stash list
echo git stash apply stash@{0}
pause
exit /b 0
