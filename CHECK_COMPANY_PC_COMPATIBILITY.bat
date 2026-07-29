@echo off
setlocal
cd /d "%~dp0"
title Running_Task - Company PC Compatibility Check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Check-CompanyPcCompatibility.ps1"
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%
