@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

title MAMACHAT GitHub Push

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
  echo [오류] 현재 폴더는 Git 저장소가 아닙니다.
  echo 이 파일을 MAMACHAT 프로젝트 루트 폴더에서 실행하세요.
  echo 현재 폴더: %CD%
  pause
  exit /b 1
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

echo.
echo ========================================
echo [MAMACHAT] GitHub 올리기
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
  echo [상태] 커밋되지 않은 변경사항이 있습니다.
  echo.
  git status --short
  echo.
  echo ----------------------------------------
  echo [1] 변경사항 커밋 후 GitHub에 올리기
  echo [2] 변경사항 커밋만 하기
  echo [3] 이미 커밋된 내용만 GitHub에 올리기
  echo [4] 상태 새로고침
  echo [5] 종료
  echo ----------------------------------------
  echo.
  choice /C 12345 /M "메뉴 선택"
  if errorlevel 5 goto END
  if errorlevel 4 goto MENU
  if errorlevel 3 goto PUSH_ONLY
  if errorlevel 2 goto COMMIT_ONLY
  if errorlevel 1 goto COMMIT_AND_PUSH
) else (
  echo [상태] 커밋되지 않은 변경사항이 없습니다.
  echo.
  echo ----------------------------------------
  echo [1] 이미 커밋된 내용 GitHub에 올리기
  echo [2] 상태 새로고침
  echo [3] 종료
  echo ----------------------------------------
  echo.
  choice /C 123 /M "메뉴 선택"
  if errorlevel 3 goto END
  if errorlevel 2 goto MENU
  if errorlevel 1 goto PUSH_ONLY
)

:COMMIT_AND_PUSH
call :COMMIT
if errorlevel 1 goto MENU
goto PUSH_ONLY

:COMMIT_ONLY
call :COMMIT
if errorlevel 1 goto MENU
echo.
echo [완료] 커밋만 완료했습니다. GitHub에는 올리지 않았습니다.
pause
goto MENU

:COMMIT
echo.
echo ===== 커밋 대상 확인 =====
git status --short
echo.
choice /C YN /M "위 변경사항을 모두 커밋할까요"
if errorlevel 2 (
  echo 커밋을 취소했습니다.
  exit /b 1
)

echo.
set "COMMIT_MSG="
set /p COMMIT_MSG=커밋 메시지를 입력하세요: 

if "!COMMIT_MSG!"=="" (
  set "COMMIT_MSG=MAMACHAT 변경사항 저장"
)

echo.
echo ===== git add -A =====
git add -A
if errorlevel 1 (
  echo [오류] git add 실패
  pause
  exit /b 1
)

echo.
echo ===== git commit =====
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
  echo [오류] git commit 실패
  pause
  exit /b 1
)

echo.
echo [완료] 커밋 완료
exit /b 0

:PUSH_ONLY
echo.
echo ----------------------------------------
echo GitHub에 올립니다.
echo 대상: %REMOTE_NAME%/!BRANCH!
echo ----------------------------------------
echo.
choice /C YN /M "정말 GitHub에 올릴까요"
if errorlevel 2 (
  echo GitHub 올리기를 취소했습니다.
  pause
  goto MENU
)

echo.
echo ===== git push %REMOTE_NAME% !BRANCH! =====
git push %REMOTE_NAME% !BRANCH!
if errorlevel 1 (
  echo.
  echo [오류] GitHub 올리기 실패
  echo 네트워크, 로그인, 원격 저장소 상태를 확인하세요.
  pause
  goto MENU
)

echo.
echo ===== 올리기 완료 후 상태 =====
git status -sb
echo.
echo [완료] GitHub에 올리기 완료
pause
goto MENU

:END
echo.
echo 종료합니다.
pause
exit /b 0
