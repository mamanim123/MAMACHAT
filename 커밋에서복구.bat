@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo [Mamabot] 커밋에서 복구
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore-from-commit.ps1"
pause
