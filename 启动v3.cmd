@echo off
setlocal
cd /d "%~dp0app"
set "APP_PORT=33881"

where node.exe >nul 2>nul
if errorlevel 1 goto no_node

if not exist node_modules goto install
goto check_running

:check_running
powershell.exe -NoProfile -Command "$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, %APP_PORT%); try { $listener.Start(); $listener.Stop(); exit 0 } catch { exit 1 }"
if errorlevel 1 goto already_running
goto build

:install
echo First launch: installing dependencies...
call npm.cmd install
if errorlevel 1 goto failed

:build
echo Building Asoul Diary v3...
call npm.cmd run build
if errorlevel 1 goto failed

echo Starting at http://127.0.0.1:%APP_PORT%
start "" /b powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0app\scripts\open-when-ready.ps1" -Port %APP_PORT%
call npm.cmd run start -- --port %APP_PORT% --hostname 127.0.0.1
goto stopped

:already_running
echo Asoul Diary v3 is already running. Opening it now...
start "" "http://127.0.0.1:%APP_PORT%/"
goto done

:no_node
echo Node.js was not found. Please install Node.js 22 or newer.
goto hold

:failed
echo Startup failed. Please keep this window and check the error above.
goto hold

:stopped
echo The local server has stopped.
goto hold

:done
endlocal
exit /b 0

:hold
pause
endlocal
