@echo off
setlocal
cd /d "%~dp0"
title Running_Task - Development Mode
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Run-Development.ps1"
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%
