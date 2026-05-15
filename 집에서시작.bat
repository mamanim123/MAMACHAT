@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo [Mamabot] Home start mode
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-mamabot.ps1"
pause
