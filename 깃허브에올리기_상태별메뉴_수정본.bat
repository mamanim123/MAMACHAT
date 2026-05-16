@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

title Mamabot GitHub Commit Push Menu

:CHECK_ENV
where git >nul 2>nul
if errorlevel 1 (
  echo(
  echo([ERROR] Git command not found.
  echo(Git install or PATH setting is required.
  pause
  exit /b 1
)

if not exist ".git" (
  echo(
  echo([ERROR] This folder is not a Git repository.
  echo(Put this bat file in the Mamabot project root.
  echo(Current folder: %CD%
  pause
  exit /b 1
)

for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"
if "!BRANCH!"=="" (
  echo(
  echo([ERROR] Cannot detect current branch.
  pause
  exit /b 1
)

:MAIN_MENU
cls
set "HAS_CHANGES="
for /f "delims=" %%s in ('git status --porcelain') do set "HAS_CHANGES=1"

echo(
echo(========================================
echo([Mamabot] GitHub 올리기 / 커밋 메뉴
echo(========================================
echo(
echo(현재 폴더: %CD%
echo(현재 브랜치: !BRANCH!
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
echo(선택하세요.
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
echo(선택하세요.
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
echo([OK] 커밋 완료. push는 하지 않았습니다.
pause
goto MAIN_MENU

:PUSH_ONLY_WITH_CHANGES
echo(
echo([주의] 커밋되지 않은 변경사항은 GitHub에 올라가지 않습니다.
echo(이미 커밋된 내용만 push 합니다.
echo(
choice /C YN /M "그래도 push 할까요?"
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
  set "COMMIT_MSG=Mamabot 변경사항 저장 !DATE_PART!-!TIME_PART!"
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
echo(
echo(----------------------------------------
echo(GitHub에 push 합니다.
echo(
echo(대상: origin/!BRANCH!
echo(----------------------------------------
echo(
choice /C YN /M "정말 GitHub에 올릴까요?"
if errorlevel 2 (
  echo(
  echo(사용자가 취소했습니다.
  pause
  goto MAIN_MENU
)

echo(
echo(===== git push origin !BRANCH! =====
git push origin !BRANCH!
if errorlevel 1 (
  echo(
  echo([ERROR] push 실패.
  echo(네트워크, 인증, 원격 브랜치 상태를 확인하세요.
  pause
  goto MAIN_MENU
)

echo(
echo(===== push 완료 후 상태 =====
git status -sb
echo(
echo([OK] GitHub에 올리기 완료.
pause
goto MAIN_MENU

:CANCEL
echo(
echo(사용자가 취소했습니다.
echo(아무 작업도 하지 않았습니다.
pause
exit /b 0
