@echo off
setlocal
cd /d "%~dp0"
title Running_Task - Browser Preview
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js is required for the safe local preview server.
  echo.
  echo Install Node.js LTS by running INSTALL_BUILD_TOOLS.bat, or install Node.js LTS from your approved company software portal.
  echo.
  pause
  exit /b 1
)
node.exe "%~dp0scripts\preview-server.mjs"
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" echo The preview server stopped with an error.
pause
exit /b %RESULT%
