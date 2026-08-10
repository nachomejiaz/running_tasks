@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo Running_Task - maintainer GitHub publishing helper
echo ============================================================
echo.

echo This helper will open a browser for GitHub sign-in when needed.
echo It publishes to: https://github.com/nachomejiaz/running_tasks.git
echo It may offer to install Git or GitHub CLI and can therefore require IT approval.
echo Standard users should try PUBLISH_TO_GITHUB_NO_ADMIN.bat first.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Publish-ToGitHub.ps1"
set "RESULT=%ERRORLEVEL%"

echo.
if not "%RESULT%"=="0" (
  echo Publishing did not complete. Read the message above, then try again.
) else (
  echo Publishing completed successfully.
)
echo.
pause
exit /b %RESULT%
