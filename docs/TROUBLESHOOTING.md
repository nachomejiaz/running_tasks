# Troubleshooting

## Start with the correct delivery route

Normal users should download either the prebuilt current-user installer or the portable ZIP from a successful GitHub Actions run. They should not run `BUILD_WINDOWS_INSTALLER.bat`.

- Download the newest artifact whose name begins `Running_Task-Windows-`.
- Installer route: extract the artifact and run `Running_Task-<version>-Windows-x64-Setup.exe`.
- Portable route: extract `Running_Task-<version>-Windows-x64-Portable.zip` to a permanent user-owned folder and run `Running_Task.exe`.
- Source-review route: open `preview/Running_Task_Preview.html` directly in a browser.

Run `CHECK_COMPANY_PC_COMPATIBILITY.bat` when IT needs a no-change compatibility report.

## BUILD_WINDOWS_INSTALLER.bat closes or reports an error

This is a maintainer/developer tool. It can install missing compilers and may require Administrator approval.

Run it again and read the final error. Detailed output is also written to `build-logs/windows-build_*.log`.

Do not move one source subfolder by itself. The batch file, `frontend`, `src-tauri`, `scripts`, `tests`, and `package.json` must remain together.

For a local build that never installs tools or requests elevation, use `BUILD_WINDOWS_NO_ADMIN.bat`. It succeeds only when every compiler prerequisite is already available.

## `winget` was not found

Windows Package Manager is normally supplied through Microsoft's App Installer package.

1. Open Microsoft Store or your company's software portal.
2. Install/update **App Installer**.
3. Restart Windows.
4. Run `INSTALL_BUILD_TOOLS.bat` again.

On a managed laptop, contact IT when Store or winget access is disabled.

## Node, npm, cargo, or rustc is still unavailable

Newly installed tools may not be visible to an already-open terminal.

1. Close all command and PowerShell windows.
2. Restart Windows.
3. Run `INSTALL_BUILD_TOOLS.bat`.
4. Then run `BUILD_WINDOWS_INSTALLER.bat`.

## Microsoft C++ Build Tools fail to install

The Visual Studio Build Tools installer may require administrator approval, disk space, a Windows restart, and access to Microsoft download endpoints. Ask IT to install **Visual Studio 2022 Build Tools** with the **Desktop development with C++ / VCTools** workload.

## npm install fails

Likely causes:

- Corporate proxy or registry block.
- TLS inspection/certificate issue.
- No internet connection.
- Temporary package-registry outage.
- Node installation not complete.

Do not disable certificate validation. Use the company's approved npm proxy/registry settings or ask IT to build through an approved pipeline.

## Cargo/Rust downloads fail

The Rust crates registry or source hosts may be blocked. Use company-approved proxy settings or the included Windows GitHub Actions workflow only when organization policy permits source upload.

## Setup executable is blocked by Windows SmartScreen or company application control

A locally built release candidate is not code-signed. Do not bypass company controls. Have IT review/build/sign the source through an approved process.

Provide IT with the setup executable or portable executable, `SHA256SUMS.txt`, `compatibility-report.txt`, the repository address, and `docs/SECURITY_AND_PRIVACY.md`.

## Running_Task installs but does not open

Run `CHECK_COMPANY_PC_COMPATIBILITY.bat` and inspect the WebView2 result. The setup intentionally does not install this prerequisite because doing so could trigger company-policy or elevation requirements. When WebView2 is missing or blocked, ask IT to deploy the approved Microsoft WebView2 Runtime. Do not download or bypass company controls independently.

## Application does not launch at sign-in

1. Launch Running_Task manually.
2. Open Settings.
3. Turn **Launch when the computer starts** off and back on.
4. Sign out and back in.
5. Check whether company policy blocks startup applications.

Manual launch remains available when startup registration is blocked.

## The application opens but data does not save

Look at the top-bar save state.

- `Saved locally` means the latest in-memory state was committed.
- `Saving` should clear shortly.
- `Save failed` means the SQLite command returned an error.

Open Archive & Backups, open the data folder, and preserve the database and logs before attempting repair. Check disk space, folder permissions, endpoint-protection quarantine, and whether another process has made the database read-only.

## A task disappeared

Active views deliberately hide:

- Done tasks.
- Manually archived tasks.
- Tasks excluded by current search, Topic, smart scope, or filters.

Open **Archive & Backups** first. Then clear search and filters.

## Restore did not show the expected state

A restore replaces the full workspace. Confirm the selected backup timestamp and size. Running_Task creates a `Before_Restore_` safety copy, so the previous state should still be available for another restore.

## Browser preview data is missing

Preview data belongs to the browser profile and local server origin. It can be lost when browser storage is cleared or when using another browser/profile. The preview is not the production database. Use the desktop build and SQLite backups for important work.

## Browser preview does not open

First, open `preview/Running_Task_Preview.html` directly. It is self-contained and does not require Node.js.

Use `RUN_BROWSER_PREVIEW.bat` only when reviewing the multi-file development preview. For that route:

1. Run `node --version` in Command Prompt.
2. When Node.js is unavailable, use the self-contained preview instead of installing development tools on a company PC.
3. With Node.js already present, run `RUN_BROWSER_PREVIEW.bat` again.
4. Copy the printed `http://127.0.0.1:.../` address into a browser manually.
5. Leave the command window open.

## JSON import is rejected

Running_Task rejects a file without replacing current data when it contains invalid JSON, an unsupported future schema, duplicate IDs, missing Topic/Status/BIC references, a Subtopic from another Topic, or a checklist parent cycle.

Use a JSON file created by **Export JSON**. CSV and Markdown are reporting exports and cannot be imported in this stage. Preserve the current workspace and the rejected file before attempting manual repair.

## Creating a desktop shortcut fails

Install Running_Task first. Then run `CREATE_DESKTOP_SHORTCUT.bat`. When the app was installed to a nonstandard path, run the PowerShell helper with the exact executable path:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\Create-DesktopShortcut.ps1 -ExecutablePath "C:\full\path\Running_Task.exe"
```
