@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

title MAMACHAT GitHub Push Menu

set "REPO_URL=https://github.com/mamanim123/MAMACHAT.git"
set "REMOTE_NAME=origin"

:CHECK_ENV
where git >nul 2>nul
if errorlevel 1 (
  echo(
  echo([ERROR] Git command not found.
  echo(Install Git or check PATH.
  pause
  exit /b 1
)

if not exist ".git" (
  echo(
  echo([ERROR] This folder is not a Git repository.
  echo(Put this BAT file in the MAMACHAT project root folder.
  echo(Current folder: %CD%
  pause
  exit /b 1
)

call :ENSURE_REMOTE
if errorlevel 1 exit /b 1

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
echo([MAMACHAT] GitHub Push / Commit Menu
echo(========================================
echo(
echo(Current folder: %CD%
echo(Current branch: !BRANCH!
echo(Remote URL: !REPO_URL!
echo(
echo(===== Git Status =====
git status -sb
echo(

if defined HAS_CHANGES goto MENU_WITH_CHANGES
goto MENU_CLEAN

:MENU_CLEAN
echo([STATUS] No uncommitted changes.
echo(
echo(----------------------------------------
echo(Choose an option.
echo(
echo([1] Push already committed changes to GitHub
echo([2] Refresh status
echo([3] Exit
echo(----------------------------------------
echo(

choice /C 123 /M "Select"
if errorlevel 3 goto CANCEL
if errorlevel 2 goto MAIN_MENU
if errorlevel 1 goto DO_PUSH

:MENU_WITH_CHANGES
echo([STATUS] There are uncommitted changes.
echo(
git status --short
echo(
echo(----------------------------------------
echo(Choose an option.
echo(
echo([1] Commit changes, then push to GitHub
echo([2] Commit changes only
echo([3] Push already committed changes only
echo([4] Refresh status
echo([5] Exit
echo(----------------------------------------
echo(

choice /C 12345 /M "Select"
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
echo([OK] Commit completed. Push was not executed.
pause
goto MAIN_MENU

:PUSH_ONLY_WITH_CHANGES
echo(
echo([WARNING] Uncommitted files will NOT be pushed.
echo(Only already committed changes will be pushed.
echo(
choice /C YN /M "Continue push only"
if errorlevel 2 goto MAIN_MENU
goto DO_PUSH

:DO_COMMIT
echo(
echo(===== Commit target check =====
git status --short
echo(
echo(All changes above will be committed.
echo(
choice /C YN /M "Commit all changes"
if errorlevel 2 (
  echo(
  echo(Commit canceled.
  exit /b 1
)

echo(
set "COMMIT_MSG="
set /p COMMIT_MSG=Commit message: 

if "!COMMIT_MSG!"=="" (
  for /f "tokens=1-4 delims=/-. " %%a in ("%date%") do set "DATE_PART=%%a%%b%%c%%d"
  for /f "tokens=1-3 delims=:." %%a in ("%time%") do set "TIME_PART=%%a%%b%%c"
  set "TIME_PART=!TIME_PART: =0!"
  set "COMMIT_MSG=MAMACHAT auto save !DATE_PART!-!TIME_PART!"
  echo(
  echo(Empty message. Default message will be used:
  echo(!COMMIT_MSG!
)

echo(
echo(===== git add -A =====
git add -A
if errorlevel 1 (
  echo(
  echo([ERROR] git add failed.
  pause
  exit /b 1
)

echo(
echo(===== git commit =====
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
  echo(
  echo([ERROR] git commit failed.
  echo(There may be nothing to commit or Git returned an error.
  pause
  exit /b 1
)

echo(
echo([OK] Commit completed.
exit /b 0

:DO_PUSH
call :ENSURE_REMOTE
if errorlevel 1 goto MAIN_MENU

echo(
echo(----------------------------------------
echo(Push to GitHub.
echo(
echo(Target: !REMOTE_NAME!/!BRANCH!
echo(URL: !REPO_URL!
echo(----------------------------------------
echo(
choice /C YN /M "Push to GitHub now"
if errorlevel 2 (
  echo(
  echo(Push canceled.
  pause
  goto MAIN_MENU
)

echo(
echo(===== git push !REMOTE_NAME! !BRANCH! =====
git push !REMOTE_NAME! !BRANCH!
if errorlevel 1 (
  echo(
  echo([ERROR] Push failed.
  echo(Check network, authentication, or remote branch state.
  pause
  goto MAIN_MENU
)

echo(
echo(===== Status after push =====
git status -sb
echo(
echo([OK] Push completed.
pause
goto MAIN_MENU

:ENSURE_REMOTE
git remote get-url !REMOTE_NAME! >nul 2>nul
if errorlevel 1 (
  echo(
  echo([INFO] origin remote not found. Adding it now.
  git remote add !REMOTE_NAME! "!REPO_URL!"
  if errorlevel 1 (
    echo([ERROR] Failed to add origin.
    pause
    exit /b 1
  )
  exit /b 0
)

for /f "delims=" %%u in ('git remote get-url !REMOTE_NAME!') do set "CURRENT_REMOTE=%%u"
if /I "!CURRENT_REMOTE!"=="!REPO_URL!" exit /b 0

echo(
echo([WARNING] Current origin URL is different.
echo(Current: !CURRENT_REMOTE!
echo(Expected: !REPO_URL!
echo(
choice /C YN /M "Replace origin URL with MAMACHAT URL"
if errorlevel 2 (
  echo([STOP] Remote URL mismatch. Operation canceled.
  pause
  exit /b 1
)

git remote set-url !REMOTE_NAME! "!REPO_URL!"
if errorlevel 1 (
  echo([ERROR] Failed to update origin URL.
  pause
  exit /b 1
)
exit /b 0

:CANCEL
echo(
echo(Operation canceled.
pause
exit /b 0
