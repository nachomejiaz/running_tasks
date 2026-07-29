@echo off
setlocal
cd /d "%~dp0"
title Running_Task - No-Admin Windows Build

echo Running_Task no-admin build mode
echo.
echo This script NEVER installs development tools and NEVER requests elevation.
echo It only works when Node.js, Rust, and Microsoft C++ Build Tools are already available.
echo For a normal company-PC installation, use the prebuilt Setup.exe or Portable ZIP instead.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Build-WindowsInstaller.ps1" -SkipToolInstall
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" (
  echo The no-admin build did not finish. Read the message above.
  echo The recommended alternative is GitHub Actions; see docs\NO_ADMIN_INSTALL.md.
) else (
  echo The current-user installer and portable ZIP are ready in the release folder.
)
echo.
pause
exit /b %RESULT%
