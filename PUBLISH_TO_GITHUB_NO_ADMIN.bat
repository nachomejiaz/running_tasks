@echo off
setlocal
cd /d "%~dp0"
title Running_Task - No-Admin GitHub Publish

echo Running_Task no-admin GitHub publishing mode
echo.
echo This script will not install Git or GitHub CLI and will not request elevation.
echo Git for Windows and GitHub CLI must already be available.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Publish-ToGitHub.ps1" -SkipToolInstall
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" (
  echo Publishing did not complete. See docs\GITHUB_UPLOAD_GUIDE.md for alternatives.
) else (
  echo Publishing completed successfully.
)
echo.
pause
exit /b %RESULT%
