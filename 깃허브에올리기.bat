@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo [Mamabot] GitHub에 변경 파일 올리기
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\github-push-mamachat.ps1"
pause
