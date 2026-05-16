@echo off
setlocal EnableExtensions DisableDelayedExpansion

REM Keep this BAT ASCII-only to avoid Korean encoding errors in Windows CMD.
REM Target GitHub repository:
set "REPO_URL=https://github.com/mamanim123/MAMACHAT.git"

if /I not "%~1"=="__INSIDE__" (
    start "Mamabot Git Menu" cmd /k ""%~f0" __INSIDE__"
    exit /b
)

cd /d "%~dp0"

:MENU
cls
echo ==========================================
echo [Mamabot] Git Work Menu
echo ==========================================
echo Current path: %CD%
echo Target repo : %REPO_URL%
echo.
echo 1. Pull changes from GitHub
echo 2. Restore from commit
echo 3. Commit current changes
echo 4. Show Git remote
echo 0. Exit
echo.
set /p "CHOICE=Select number: "

if "%CHOICE%"=="1" goto PULL
if "%CHOICE%"=="2" goto RESTORE
if "%CHOICE%"=="3" goto COMMIT
if "%CHOICE%"=="4" goto SHOW_REMOTE
if "%CHOICE%"=="0" goto END

echo.
echo Invalid input.
pause
goto MENU


:CHECK_GIT
git --version > nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Git command was not found.
    echo Please install Git for Windows or check PATH.
    echo.
    pause
    goto MENU
)

git rev-parse --is-inside-work-tree > nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] This folder is not a Git repository.
    echo Put this BAT file in the project root folder where .git exists.
    echo Current path: %CD%
    echo.
    pause
    goto MENU
)
goto :eof


:ENSURE_REMOTE
set "CURRENT_REMOTE="

for /f "delims=" %%A in ('git remote get-url origin 2^>nul') do set "CURRENT_REMOTE=%%A"

if not defined CURRENT_REMOTE (
    echo.
    echo No origin remote found.
    echo Target repo: %REPO_URL%
    echo.
    set /p "ADD_REMOTE=Add this URL as origin? Type Y to continue, N to cancel: "
    if /I not "%ADD_REMOTE%"=="Y" (
        echo.
        echo Remote setup canceled.
        echo.
        pause
        goto MENU
    )

    git remote add origin "%REPO_URL%"
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to add origin remote.
        echo.
        pause
        goto MENU
    )

    echo.
    echo origin remote added.
    goto :eof
)

echo.
echo Current origin:
echo %CURRENT_REMOTE%
echo.
echo Target repo:
echo %REPO_URL%
echo.

if /I "%CURRENT_REMOTE%"=="%REPO_URL%" goto :eof

echo [WARNING] Current origin is different from target repo.
echo.
set /p "CHANGE_REMOTE=Change origin to target repo? Type Y to change, N to cancel: "

if /I not "%CHANGE_REMOTE%"=="Y" (
    echo.
    echo Pull canceled because origin is different.
    echo.
    pause
    goto MENU
)

git remote set-url origin "%REPO_URL%"
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to change origin remote.
    echo.
    pause
    goto MENU
)

echo.
echo origin remote changed.
goto :eof


:PULL
cls
echo ==========================================
echo [Mamabot] Pull changes from GitHub
echo ==========================================
echo.

call :CHECK_GIT
call :ENSURE_REMOTE

if not exist "%~dp0scripts\github-pull-mamachat.ps1" (
    echo [ERROR] scripts\github-pull-mamachat.ps1 was not found.
    echo BAT location: %~dp0
    echo.
    pause
    goto MENU
)

echo Current remote:
git remote -v
echo.
echo Current branch:
git branch --show-current
echo.
echo Before pull - current changes:
git status --short
echo.
echo WARNING:
echo Pulling from GitHub may change files in this project folder.
echo Target repo: %REPO_URL%
echo.
set /p "CONFIRM=Continue pull? Type Y to continue, N to cancel: "

if /I not "%CONFIRM%"=="Y" (
    echo.
    echo Pull canceled.
    echo.
    pause
    goto MENU
)

echo.
echo Starting GitHub pull...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\github-pull-mamachat.ps1"

echo.
echo Task finished. Check messages above.
pause
goto MENU


:RESTORE
cls
echo ==========================================
echo [Mamabot] Restore from commit
echo ==========================================
echo.

call :CHECK_GIT

if not exist "%~dp0scripts\restore-from-commit.ps1" (
    echo [ERROR] scripts\restore-from-commit.ps1 was not found.
    echo BAT location: %~dp0
    echo.
    pause
    goto MENU
)

echo Before restore - current changes:
git status --short
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore-from-commit.ps1"

echo.
echo Task finished. Check messages above.
pause
goto MENU


:COMMIT
cls
echo ==========================================
echo [Mamabot] Commit current changes
echo ==========================================
echo.

call :CHECK_GIT

set "HAS_CHANGES="
for /f "delims=" %%A in ('git status --porcelain') do set "HAS_CHANGES=1"

if not defined HAS_CHANGES (
    echo No changes to commit.
    echo.
    git status --short
    echo.
    pause
    goto MENU
)

echo Changed files:
git status --short
echo.

set "COMMIT_MSG="
set /p "COMMIT_MSG=Enter commit message: "

if "%COMMIT_MSG%"=="" (
    echo.
    echo Commit message is empty. Commit canceled.
    echo.
    pause
    goto MENU
)

echo.
set /p "COMMIT_CONFIRM=Commit with this message? Type Y to continue, N to cancel: "

if /I not "%COMMIT_CONFIRM%"=="Y" (
    echo.
    echo Commit canceled.
    echo.
    pause
    goto MENU
)

echo.
echo Running git add -A...
git add -A
if errorlevel 1 (
    echo.
    echo [ERROR] git add failed.
    echo.
    pause
    goto MENU
)

echo.
echo Running git commit...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo.
    echo [ERROR] git commit failed.
    echo Check the error message above.
    echo.
    pause
    goto MENU
)

echo.
echo Commit completed.
echo.
git log -1 --oneline
echo.
pause
goto MENU


:SHOW_REMOTE
cls
echo ==========================================
echo [Mamabot] Show Git remote
echo ==========================================
echo.

call :CHECK_GIT

echo Target repo:
echo %REPO_URL%
echo.
echo Current remotes:
git remote -v
echo.
echo Current branch:
git branch --show-current
echo.
echo Git status:
git status --short
echo.
pause
goto MENU


:END
echo.
echo Bye.
pause
endlocal
exit /b 0
