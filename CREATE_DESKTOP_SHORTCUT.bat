@echo off
setlocal
cd /d "%~dp0"
title Running_Task - Create Desktop Shortcut
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Create-DesktopShortcut.ps1"
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%
