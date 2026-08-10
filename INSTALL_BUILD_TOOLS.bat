@echo off
setlocal
cd /d "%~dp0"
title Running_Task - Install Build Tools
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Install-BuildTools.ps1"
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" echo Tool setup did not finish successfully. Read the error above.
echo.
pause
exit /b %RESULT%
