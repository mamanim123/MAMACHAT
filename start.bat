@echo off
setlocal

set PORTABLE_ROOT=%~dp0
set PORTABLE_ROOT=%PORTABLE_ROOT:~0,-1%

set CLI_ROOT=%PORTABLE_ROOT%\runtime\cli
set CLI_BIN=%CLI_ROOT%\node_modules.bin

set PATH=%CLI_BIN%;%PATH%

echo.
echo ========================================
echo Mamabot Portable Agent
echo ========================================
echo PORTABLE_ROOT=%PORTABLE_ROOT%
echo CLI_ROOT=%CLI_ROOT%
echo.

cd /d "%PORTABLE_ROOT%"

if not exist "%CLI_ROOT%" (
mkdir "%CLI_ROOT%"
)

echo [1/3] Checking portable runtime...
node scripts\portable\check-runtime.mjs

echo.
echo [2/3] Ensuring portable CLI runtime...
node scripts\portable\ensure-runtime.mjs

echo.
echo [3/3] Starting web UI...
npm run dev

endlocal