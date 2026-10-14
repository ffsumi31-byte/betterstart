@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS version from https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules\three\build\three.module.js" (
  echo Installing Forge3D dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)
node build.mjs
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
start "Forge3D local server" cmd /k "cd /d ""%~dp0"" && node server.mjs"
timeout /t 2 >nul
start http://127.0.0.1:5173
