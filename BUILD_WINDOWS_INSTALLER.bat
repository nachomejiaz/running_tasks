@echo off
setlocal
cd /d "%~dp0"
title Running_Task - Maintainer Windows Release Build

echo Running_Task maintainer build
echo.
echo Normal users should NOT run this file.
echo The prebuilt current-user Setup.exe and Portable ZIP require no development tools.
echo This maintainer build may install Node.js, Rust, and Microsoft C++ Build Tools,
echo and Windows may request Administrator approval.
echo.
choice /M "Continue with the maintainer build"
if errorlevel 2 exit /b 0

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Build-WindowsInstaller.ps1"
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" (
  echo The build did not finish successfully. Read the error above and see docs\TROUBLESHOOTING.md.
) else (
  echo The installer and portable ZIP are ready in the release folder.
)
echo.
pause
exit /b %RESULT%
