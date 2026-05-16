@echo off
chcp 65001 > nul
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"

:MENU
cls
echo ==============================
echo [Mamabot] Git 작업 메뉴
echo ==============================
echo 1. 커밋에서 복구
echo 2. 현재 변경사항 커밋
echo 0. 종료
echo.
set /p "CHOICE=번호를 선택하세요: "

if "%CHOICE%"=="1" goto RESTORE
if "%CHOICE%"=="2" goto COMMIT
if "%CHOICE%"=="0" goto END

echo.
echo 잘못 입력했습니다. 다시 선택하세요.
pause
goto MENU


:RESTORE
cls
echo [Mamabot] 커밋에서 복구
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore-from-commit.ps1"
echo.
pause
goto MENU


:COMMIT
cls
echo [Mamabot] 현재 변경사항 커밋
echo.

git rev-parse --is-inside-work-tree > nul 2>&1
if errorlevel 1 (
    echo 현재 폴더는 Git 저장소가 아닙니다.
    echo 이 bat 파일을 프로젝트 루트 폴더에서 실행해주세요.
    echo.
    pause
    goto MENU
)

set "HAS_CHANGES="
for /f "delims=" %%A in ('git status --porcelain') do set "HAS_CHANGES=1"

if not defined HAS_CHANGES (
    echo 커밋할 변경사항이 없습니다.
    echo.
    git status --short
    echo.
    pause
    goto MENU
)

echo [현재 변경된 파일]
git status --short
echo.

set "COMMIT_MSG="
set /p "COMMIT_MSG=커밋 메모를 입력하세요: "

if "%COMMIT_MSG%"=="" (
    echo.
    echo 커밋 메모가 비어 있어 커밋을 취소합니다.
    echo.
    pause
    goto MENU
)

echo.
echo git add . 실행 중...
git add .
if errorlevel 1 (
    echo.
    echo git add 중 오류가 발생했습니다.
    echo.
    pause
    goto MENU
)

echo.
echo git commit 실행 중...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo.
    echo 커밋 중 오류가 발생했습니다. 위 메시지를 확인해주세요.
    echo.
    pause
    goto MENU
)

echo.
echo 커밋이 완료되었습니다.
echo.
pause
goto MENU


:END
echo 종료합니다.
endlocal
exit /b 0
