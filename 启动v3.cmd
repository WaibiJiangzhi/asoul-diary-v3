@echo off
setlocal
cd /d "%~dp0app"
set "APP_PORT=33881"

where node.exe >nul 2>nul
if errorlevel 1 goto no_node

if not exist node_modules goto install
goto check_running

:check_running
powershell.exe -NoProfile -Command "$connection = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort %APP_PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if (-not $connection) { exit 0 }; try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:%APP_PORT%/' -UseBasicParsing -TimeoutSec 3; if ($response.Content -notmatch '<title>Asoul') { exit 2 }; Stop-Process -Id $connection.OwningProcess -Force; Start-Sleep -Milliseconds 650; exit 0 } catch { exit 2 }"
if errorlevel 2 goto port_in_use
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

:port_in_use
echo Port %APP_PORT% is being used by another application.
echo Close that application, then run this launcher again.
goto hold

:no_node
echo Node.js was not found. Please install Node.js 22 or newer.
goto hold

:failed
echo Startup failed. Please keep this window and check the error above.
goto hold

:stopped
echo The local server has stopped.
goto hold

:hold
pause
endlocal
