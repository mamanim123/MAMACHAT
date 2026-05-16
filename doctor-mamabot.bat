@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\portable\doctor-mamabot.ps1" -Repair
pause
