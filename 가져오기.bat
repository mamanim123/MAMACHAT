@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

title MAMACHAT GitHub Pull

set "REPO_URL=https://github.com/mamanim123/MAMACHAT.git"
set "REMOTE_NAME=origin"

where git >nul 2>nul
if errorlevel 1 (
  echo.
  echo [오류] Git 명령을 찾을 수 없습니다.
  echo Git 설치 또는 PATH 설정을 확인하세요.
  pause
  exit /b 1
)

if not exist ".git" (
  echo.
  echo ========================================
  echo [MAMACHAT] GitHub에서 처음 가져오기
  echo ========================================
  echo.
  echo 현재 폴더는 Git 저장소가 아닙니다.
  echo 원격 주소: %REPO_URL%
  echo 현재 폴더: %CD%
  echo.
  choice /C YN /M "이 폴더에 MAMACHAT 저장소를 clone 할까요"
  if errorlevel 2 (
    echo 작업을 취소했습니다.
    pause
    exit /b 0
  )

  git clone "%REPO_URL%" .
  if errorlevel 1 (
    echo.
    echo [오류] clone 실패
    echo 현재 폴더가 비어 있는지 확인하세요.
    pause
    exit /b 1
  )
)

git remote get-url %REMOTE_NAME% >nul 2>nul
if errorlevel 1 (
  echo.
  echo [안내] origin 원격 저장소가 없어 자동으로 추가합니다.
  git remote add %REMOTE_NAME% "%REPO_URL%"
  if errorlevel 1 (
    echo [오류] origin 추가 실패
    pause
    exit /b 1
  )
)

for /f "delims=" %%u in ('git remote get-url %REMOTE_NAME%') do set "CURRENT_REMOTE=%%u"
if /I not "!CURRENT_REMOTE!"=="%REPO_URL%" (
  echo.
  echo [주의] 현재 origin 주소가 MAMACHAT 주소와 다릅니다.
  echo 현재 주소: !CURRENT_REMOTE!
  echo 기준 주소: %REPO_URL%
  echo.
  choice /C YN /M "origin 주소를 MAMACHAT 주소로 바꿀까요"
  if errorlevel 2 (
    echo 작업을 중단합니다.
    pause
    exit /b 1
  )
  git remote set-url %REMOTE_NAME% "%REPO_URL%"
)

for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"
if "!BRANCH!"=="" (
  echo.
  echo [오류] 현재 브랜치를 확인하지 못했습니다.
  pause
  exit /b 1
)

:MENU
cls
set "HAS_CHANGES="
for /f "delims=" %%s in ('git status --porcelain') do set "HAS_CHANGES=1"

for /f "tokens=1-4 delims=/-. " %%a in ("%date%") do set "DATE_PART=%%a%%b%%c%%d"
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set "TIME_PART=%%a%%b%%c"
set "TIME_PART=!TIME_PART: =0!"
set "BACKUP_DIR=F:\_mamabot_backups\github-pull-!DATE_PART!-!TIME_PART!"

echo.
echo ========================================
echo [MAMACHAT] GitHub에서 가져오기
echo ========================================
echo.
echo 현재 폴더: %CD%
echo 현재 브랜치: !BRANCH!
echo 원격 주소: %REPO_URL%
echo.
echo ===== 현재 Git 상태 =====
git status -sb
echo.

if defined HAS_CHANGES (
  echo [주의] 커밋되지 않은 변경사항이 있습니다.
  echo.
  git status --short
  echo.
  echo ----------------------------------------
  echo [1] 중단하기
  echo [2] 내 변경사항을 백업/stash 후 무시하고 가져오기
  echo [3] 상태 새로고침
  echo ----------------------------------------
  echo.
  choice /C 123 /M "메뉴 선택"
  if errorlevel 3 goto MENU
  if errorlevel 2 goto FORCE_PULL
  if errorlevel 1 goto END
) else (
  echo [상태] 커밋되지 않은 변경사항이 없습니다.
  echo.
  echo ----------------------------------------
  echo [1] GitHub 최신 내용 가져오기
  echo [2] 상태 새로고침
  echo [3] 종료
  echo ----------------------------------------
  echo.
  choice /C 123 /M "메뉴 선택"
  if errorlevel 3 goto END
  if errorlevel 2 goto MENU
  if errorlevel 1 goto SAFE_PULL
)

:BACKUP
mkdir "!BACKUP_DIR!" >nul 2>nul
git rev-parse HEAD > "!BACKUP_DIR!\HEAD-before-pull.txt" 2>nul
git status -sb > "!BACKUP_DIR!\status-before-pull.txt" 2>nul
git diff > "!BACKUP_DIR!\unstaged-changes.patch" 2>nul
git diff --staged > "!BACKUP_DIR!\staged-changes.patch" 2>nul
git bundle create "!BACKUP_DIR!\mamachat-before-pull.bundle" HEAD >nul 2>nul
echo 백업 위치: !BACKUP_DIR!
exit /b 0

:SAFE_PULL
echo.
choice /C YN /M "정말 GitHub에서 가져올까요"
if errorlevel 2 goto MENU

call :BACKUP

echo.
echo ===== git fetch %REMOTE_NAME% =====
git fetch %REMOTE_NAME%
if errorlevel 1 (
  echo [오류] fetch 실패
  pause
  goto MENU
)

echo.
echo ===== git pull --ff-only %REMOTE_NAME% !BRANCH! =====
git pull --ff-only %REMOTE_NAME% !BRANCH!
if errorlevel 1 (
  echo.
  echo [오류] pull 실패
  echo 자동 merge를 만들지 않기 위해 중단했습니다.
  echo 백업 위치: !BACKUP_DIR!
  pause
  goto MENU
)

echo.
echo [완료] GitHub에서 가져오기 완료
echo 백업 위치: !BACKUP_DIR!
pause
goto MENU

:FORCE_PULL
echo.
echo [최종 확인]
echo 커밋되지 않은 변경사항을 stash/백업하고,
echo 작업 폴더를 깨끗하게 만든 뒤 GitHub 내용을 가져옵니다.
echo.
choice /C YN /M "정말 내 변경사항을 무시하고 가져올까요"
if errorlevel 2 goto MENU

call :BACKUP

echo.
echo ===== git stash push -u =====
git stash push -u -m "auto-backup before github pull !DATE_PART!-!TIME_PART!"
if errorlevel 1 (
  echo [오류] stash 실패
  pause
  goto MENU
)

echo.
echo ===== 작업 폴더 정리 =====
git reset --hard HEAD
git clean -fd

echo.
echo ===== git fetch %REMOTE_NAME% =====
git fetch %REMOTE_NAME%
if errorlevel 1 (
  echo [오류] fetch 실패
  pause
  goto MENU
)

echo.
echo ===== git pull --ff-only %REMOTE_NAME% !BRANCH! =====
git pull --ff-only %REMOTE_NAME% !BRANCH!
if errorlevel 1 (
  echo [오류] pull 실패
  echo stash는 남아 있습니다.
  git stash list -n 5
  pause
  goto MENU
)

echo.
echo [완료] 변경사항을 stash/백업 후 GitHub에서 가져오기 완료
echo 백업 위치: !BACKUP_DIR!
echo.
echo 필요 시 복구:
echo git stash list
echo git stash apply stash@0
pause
goto MENU

:END
echo.
echo 종료합니다.
pause
exit /b 0
