@echo off
setlocal
cd /d "%~dp0app"

where node.exe >nul 2>nul
if errorlevel 1 goto no_node

if not exist node_modules goto install
goto build

:install
echo First launch: installing dependencies...
call npm.cmd install
if errorlevel 1 goto failed

:build
echo Building Asoul Diary v3...
call npm.cmd run build
if errorlevel 1 goto failed

echo Starting at http://localhost:3000
start "" /b powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0app\scripts\open-when-ready.ps1"
call npm.cmd run start
goto stopped

:no_node
echo Node.js was not found. Please install Node.js 22 or newer.
goto hold

:failed
echo Startup failed. Please keep this window and check the error above.
goto hold

:stopped
echo The local server has stopped.

:hold
pause
endlocal
