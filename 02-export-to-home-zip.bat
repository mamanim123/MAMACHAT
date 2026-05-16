@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo [Mamabot] Export ZIP for home
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\export-mamabot-office.ps1"
pause
