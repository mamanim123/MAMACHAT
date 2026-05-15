@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo [Mamabot] F:\mamabot-new 작업본을 GitHub에 올립니다.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\sync-from-mamabot-new-and-push.ps1"
pause
