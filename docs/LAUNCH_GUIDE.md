# Running_Task launch guide

## Recommended company-PC route

Use the prebuilt artifact from GitHub Actions. Normal installation does not require Node.js, Rust, Visual Studio, Git, GitHub CLI, or Administrator credentials.

1. Open `nachomejiaz/running_tasks` in a browser.
2. Open **Actions**, then the newest successful **Build Running_Task for Windows** run.
3. Download the artifact whose name begins `Running_Task-Windows-`.
4. Extract the downloaded ZIP.
5. Optional: extract `Running_Task-<version>-Company-PC-Check.zip` and run `CHECK_COMPANY_PC_COMPATIBILITY.bat`.
6. Double-click `Running_Task-<version>-Windows-x64-Setup.exe`.
7. Complete the current-user installer.
8. Open Running_Task from the Start menu.
9. In Settings, confirm **Launch when the computer starts** is enabled.

The setup installs for the current Windows user rather than into `C:\Program Files`. It also skips WebView2 installation so the setup does not launch a prerequisite installer that might request elevation. WebView2 must already exist; the compatibility check reports whether it was found in common locations.

## Portable no-install route

Use this route when installer execution is restricted but a standalone executable is permitted.

1. Extract `Running_Task-<version>-Windows-x64-Portable.zip`.
2. Move the extracted folder to a permanent user-owned location such as `Documents\Running_Task`.
3. Double-click `Running_Task.exe`.
4. Do not move the executable after enabling automatic startup because the startup entry points to that path.

The portable and installed builds use the same local-data model. Removing or moving the executable does not intentionally delete the SQLite workspace.

## Browser preview route

1. Open `Running_Task-<version>-Preview.html` from the Actions artifact, or `preview/Running_Task_Preview.html` from source.
2. Review Dashboard, Board, List, Calendar, Flow, Archive, Settings, Create Task, filters, and import/export.

Preview data is stored by the browser and is separate from the production SQLite database. Do not use the preview as the only copy of important work.

## First launch checks

1. Create a test task.
2. Add a dated checklist item and BIC.
3. Close and reopen the application; confirm the task remains.
4. Open Archive & Backups and create a manual backup.
5. Export JSON once and confirm the file appears in the local exports folder.
6. Sign out and back in once to test automatic startup when company policy permits it.

## When Windows or company policy blocks the application

1. Run `CHECK_COMPANY_PC_COMPATIBILITY.bat` from the company-PC check package.
2. Keep the generated `compatibility-report.txt`.
3. Give IT the report, the setup or portable file, `SHA256SUMS.txt`, and `docs/SECURITY_AND_PRIVACY.md`.
4. Ask IT to review, sign, allowlist, or deploy the application through the approved process.

Running_Task does not disable or bypass SmartScreen, AppLocker, Windows Defender Application Control, antivirus, or endpoint-management rules.

## Local source-build routes

- `BUILD_WINDOWS_NO_ADMIN.bat` never installs tools and stops when prerequisites are missing.
- `BUILD_WINDOWS_INSTALLER.bat` is a maintainer tool and may need elevation to install compiler prerequisites.
- GitHub Actions is the recommended release builder for a managed company PC.
