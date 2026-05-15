@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo [Mamabot] GitHub에서 변경 파일 가져오기
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\github-pull-mamachat.ps1"
pause
