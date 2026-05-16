@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

title MAMACHAT GitHub 올리기 / 커밋 메뉴

set "REPO_URL=https://github.com/mamanim123/MAMACHAT.git"
set "REMOTE_NAME=origin"

:CHECK_ENV
where git >nul 2>nul
if errorlevel 1 (
  echo(
  echo([ERROR] Git 명령을 찾을 수 없습니다.
  echo(Git 설치 또는 PATH 설정을 확인하세요.
  pause
  exit /b 1
)

if not exist ".git" (
  echo(
  echo([ERROR] 현재 폴더는 Git 저장소가 아닙니다.
  echo(이 BAT 파일을 MAMACHAT 프로젝트 루트 폴더에 넣고 실행하세요.
  echo(현재 폴더: %CD%
  pause
  exit /b 1
)

call :ENSURE_REMOTE
if errorlevel 1 exit /b 1

for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"
if "!BRANCH!"=="" (
  echo(
  echo([ERROR] 현재 브랜치를 확인하지 못했습니다.
  pause
  exit /b 1
)

:MAIN_MENU
cls
set "HAS_CHANGES="
for /f "delims=" %%s in ('git status --porcelain') do set "HAS_CHANGES=1"

echo(
echo(========================================
echo([MAMACHAT] GitHub 올리기 / 커밋 메뉴
echo(========================================
echo(
echo(현재 폴더: %CD%
echo(현재 브랜치: !BRANCH!
echo(원격 주소: !REPO_URL!
echo(
echo(===== 현재 Git 상태 =====
git status -sb
echo(

if defined HAS_CHANGES goto MENU_WITH_CHANGES
goto MENU_CLEAN

:MENU_CLEAN
echo([상태] 커밋되지 않은 변경사항이 없습니다.
echo(
echo(----------------------------------------
echo(메뉴를 선택하세요.
echo(
echo([1] 이미 커밋된 내용 GitHub에 올리기
echo([2] 상태 새로고침
echo([3] 종료
echo(----------------------------------------
echo(

choice /C 123 /M "메뉴 선택"
if errorlevel 3 goto CANCEL
if errorlevel 2 goto MAIN_MENU
if errorlevel 1 goto DO_PUSH

:MENU_WITH_CHANGES
echo([상태] 커밋되지 않은 변경사항이 있습니다.
echo(
git status --short
echo(
echo(----------------------------------------
echo(메뉴를 선택하세요.
echo(
echo([1] 변경사항 커밋 후 GitHub에 올리기
echo([2] 변경사항 커밋만 하기
echo([3] 이미 커밋된 내용만 GitHub에 올리기
echo([4] 상태 새로고침
echo([5] 종료
echo(----------------------------------------
echo(

choice /C 12345 /M "메뉴 선택"
if errorlevel 5 goto CANCEL
if errorlevel 4 goto MAIN_MENU
if errorlevel 3 goto PUSH_ONLY_WITH_CHANGES
if errorlevel 2 goto COMMIT_ONLY
if errorlevel 1 goto COMMIT_AND_PUSH

:COMMIT_AND_PUSH
call :DO_COMMIT
if errorlevel 1 goto MAIN_MENU
goto DO_PUSH

:COMMIT_ONLY
call :DO_COMMIT
if errorlevel 1 goto MAIN_MENU
echo(
echo([OK] 커밋 완료. GitHub에는 올리지 않았습니다.
pause
goto MAIN_MENU

:PUSH_ONLY_WITH_CHANGES
echo(
echo([주의] 커밋되지 않은 변경사항은 GitHub에 올라가지 않습니다.
echo(이미 커밋된 내용만 GitHub에 올립니다.
echo(
choice /C YN /M "그래도 이미 커밋된 내용만 올릴까요?"
if errorlevel 2 goto MAIN_MENU
goto DO_PUSH

:DO_COMMIT
echo(
echo(===== 커밋 대상 확인 =====
git status --short
echo(
echo(위 변경사항을 모두 커밋합니다.
echo(
choice /C YN /M "정말 커밋할까요?"
if errorlevel 2 (
  echo(
  echo(커밋을 취소했습니다.
  exit /b 1
)

echo(
set "COMMIT_MSG="
set /p COMMIT_MSG=커밋 메시지를 입력하세요: 

if "!COMMIT_MSG!"=="" (
  for /f "tokens=1-4 delims=/-. " %%a in ("%date%") do set "DATE_PART=%%a%%b%%c%%d"
  for /f "tokens=1-3 delims=:." %%a in ("%time%") do set "TIME_PART=%%a%%b%%c"
  set "TIME_PART=!TIME_PART: =0!"
  set "COMMIT_MSG=MAMACHAT 변경사항 저장 !DATE_PART!-!TIME_PART!"
  echo(
  echo(커밋 메시지가 비어 있어 기본 메시지를 사용합니다:
  echo(!COMMIT_MSG!
)

echo(
echo(===== git add -A =====
git add -A
if errorlevel 1 (
  echo(
  echo([ERROR] git add 실패.
  pause
  exit /b 1
)

echo(
echo(===== git commit =====
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
  echo(
  echo([ERROR] git commit 실패.
  echo(커밋할 내용이 없거나 Git 오류가 발생했습니다.
  pause
  exit /b 1
)

echo(
echo([OK] 커밋 완료.
exit /b 0

:DO_PUSH
call :ENSURE_REMOTE
if errorlevel 1 goto MAIN_MENU

echo(
echo(----------------------------------------
echo(GitHub에 올립니다.
echo(
echo(대상: !REMOTE_NAME!/!BRANCH!
echo(주소: !REPO_URL!
echo(----------------------------------------
echo(
choice /C YN /M "정말 GitHub에 올릴까요?"
if errorlevel 2 (
  echo(
  echo(GitHub 올리기를 취소했습니다.
  pause
  goto MAIN_MENU
)

echo(
echo(===== git push !REMOTE_NAME! !BRANCH! =====
git push !REMOTE_NAME! !BRANCH!
if errorlevel 1 (
  echo(
  echo([ERROR] GitHub 올리기 실패.
  echo(네트워크, 로그인, 원격 브랜치 상태를 확인하세요.
  pause
  goto MAIN_MENU
)

echo(
echo(===== 올리기 완료 후 상태 =====
git status -sb
echo(
echo([OK] GitHub에 올리기 완료.
pause
goto MAIN_MENU

:ENSURE_REMOTE
git remote get-url !REMOTE_NAME! >nul 2>nul
if errorlevel 1 (
  echo(
  echo([INFO] origin 원격 저장소가 없어 자동으로 추가합니다.
  git remote add !REMOTE_NAME! "!REPO_URL!"
  if errorlevel 1 (
    echo([ERROR] origin 추가 실패.
    pause
    exit /b 1
  )
  exit /b 0
)

for /f "delims=" %%u in ('git remote get-url !REMOTE_NAME!') do set "CURRENT_REMOTE=%%u"
if /I "!CURRENT_REMOTE!"=="!REPO_URL!" exit /b 0

echo(
echo([주의] 현재 origin 주소가 MAMACHAT 주소와 다릅니다.
echo(현재 주소: !CURRENT_REMOTE!
echo(기준 주소: !REPO_URL!
echo(
choice /C YN /M "origin 주소를 MAMACHAT 주소로 바꿀까요?"
if errorlevel 2 (
  echo([STOP] 원격 주소가 달라 작업을 중단합니다.
  pause
  exit /b 1
)

git remote set-url !REMOTE_NAME! "!REPO_URL!"
if errorlevel 1 (
  echo([ERROR] origin 주소 변경 실패.
  pause
  exit /b 1
)
exit /b 0

:CANCEL
echo(
echo(사용자가 취소했습니다.
echo(아무 작업도 하지 않았습니다.
pause
exit /b 0