@echo off
setlocal
color 0A
echo.
echo Forge3D - allow your hosted website to talk to YOUR local Ollama model
echo This does not create a cloud AI API; prompts are sent to the Ollama running on this PC.
echo.
set /p SITE_ORIGIN=Enter the exact website origin (example https://your-app.onrender.com): 
if "%SITE_ORIGIN%"=="" (
  echo No website origin entered. Nothing changed.
  pause
  exit /b 1
)
rem Keep the origin exactly as entered; do not include a path or trailing slash.
set "ALLOWED=%SITE_ORIGIN%,http://localhost:5173,http://127.0.0.1:5173"
setx OLLAMA_ORIGINS "%ALLOWED%" >nul
if errorlevel 1 (
  echo Could not save OLLAMA_ORIGINS. Run this file as your user and try again.
  pause
  exit /b 1
)
echo.
echo Saved OLLAMA_ORIGINS for your Windows user.
echo 1. Fully quit Ollama from the Windows system tray.
echo 2. Start Ollama again from the Start menu.
echo 3. Reopen Forge3D, enable local AI, and click Test connection.
echo.
echo Only allow origins you trust. Do not replace this with a wildcard on a shared PC or network.
pause
