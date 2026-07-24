# Running_Task Launch Guide

This guide is written for a normal user on a managed Windows computer. Building from source is not required.

## Recommended: current-user Setup

After the complete source is uploaded and the Windows workflow is enabled:

1. Open the repository's **Actions** tab.
2. Open the newest successful **Build Running_Task for Windows** run.
3. Download the `Running_Task-Windows-...` artifact.
4. Extract the downloaded artifact ZIP.
5. Double-click `Running_Task-<version>-Windows-x64-Setup.exe`.
6. Complete the installer.
7. Open **Running_Task** from the Start menu.
8. Open **Settings** and confirm **Launch when the computer starts** is enabled.

The Setup configuration uses `currentUser`. Running_Task therefore installs beneath the current Windows user's profile and should not request Administrator elevation.

A company may still block unsigned or unapproved executables through endpoint-security policy. Running_Task does not attempt to bypass those controls. Ask IT to approve, sign, or deploy the build when it is blocked.

## No-installer portable launch

1. Download the same successful GitHub Actions artifact.
2. Extract `Running_Task-<version>-Windows-x64-Portable.zip` into a folder you own.
3. Open the extracted folder.
4. Double-click `Running_Task.exe`.

The portable executable and installed executable use the same local data model. The SQLite database remains in the Windows local application-data folder, so replacing or moving the executable does not move or erase the database.

## Interface-only preview

Open `preview/Running_Task_Preview.html` directly in a browser. It needs no installation and contains representative demo data.

The preview uses browser-local storage. It is not the production SQLite database and should not hold the only copy of important work.

## Local no-admin compilation

`BUILD_WINDOWS_NO_ADMIN.bat` is available for a developer account that already has all prerequisites:

- Node.js and npm.
- Rust and Cargo.
- The `x86_64-pc-windows-msvc` toolchain.
- Microsoft Visual C++ Build Tools.

The helper passes `-SkipToolInstall`. It never installs prerequisites and stops when any are missing. This avoids elevation prompts but cannot remove the compiler requirement.

## Maintainer compilation

`BUILD_WINDOWS_INSTALLER.bat` may install missing prerequisites. Installing Microsoft compiler components can require Administrator approval. Normal users should use the prebuilt GitHub file instead.

## First-launch checklist

1. Create one test task.
2. Add a dated checklist item and BIC.
3. Close and reopen the application; confirm the task remains.
4. Open **Archive & Backups** and create a manual backup.
5. Open the data folder and confirm that the database and backup are present.
6. Sign out and back in once to validate launch-at-sign-in, when company policy permits it.
