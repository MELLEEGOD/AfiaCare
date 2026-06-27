@echo off
setlocal
cd /d "%~dp0"

set "AFIA_PORT=4173"
set "AFIA_URL=http://127.0.0.1:%AFIA_PORT%/"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found on PATH.
  echo Install Node.js, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 goto :fail
  echo.
)

echo Building latest AfiaCare UI...
call npm.cmd run build
if errorlevel 1 goto :fail

echo.
echo Opening %AFIA_URL%
start "" "%AFIA_URL%"
echo Starting local demo server...
echo.

node scripts\serve-dist.mjs %AFIA_PORT%
set "AFIA_EXIT=%ERRORLEVEL%"

echo.
if not "%AFIA_EXIT%"=="0" (
  echo AfiaCare stopped with error code %AFIA_EXIT%.
) else (
  echo AfiaCare stopped.
)
echo Press any key to close this window.
pause >nul
exit /b %AFIA_EXIT%

:fail
set "AFIA_EXIT=%ERRORLEVEL%"
echo.
echo AfiaCare could not start. Error code %AFIA_EXIT%.
echo Press any key to close this window.
pause >nul
exit /b %AFIA_EXIT%
