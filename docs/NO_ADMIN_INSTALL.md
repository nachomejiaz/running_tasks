# No-admin installation and company-PC use

## Recommended route

Build Running_Task on GitHub Actions, then install or launch the already-built application on the company PC. The company PC does not need Node.js, Rust, Visual Studio, Git, or GitHub CLI for normal use.

## Current-user setup

1. Open the repository's **Actions** tab.
2. Open the newest successful **Build Running_Task for Windows** run.
3. Download the artifact beginning `Running_Task-Windows-`.
4. Extract the artifact.
5. Double-click `Running_Task-<version>-Windows-x64-Setup.exe`.
6. Complete the installer and open Running_Task from the Start menu.

The NSIS configuration uses `installMode: currentUser`, so Running_Task is installed under the current user's profile rather than `C:\Program Files` and is designed not to request Administrator rights.

The installer also uses `webviewInstallMode: skip`. It does not download or install WebView2, preventing that prerequisite from introducing an elevation prompt. The application will not launch when WebView2 is absent.

## Portable ZIP

1. Extract `Running_Task-<version>-Windows-x64-Portable.zip` to a permanent user-owned folder.
2. Double-click `Running_Task.exe`.
3. Keep the executable at the same path after enabling automatic startup.

No installer runs. Production data is still stored below the current Windows user's local application-data directory.

## Compatibility check

Extract `Running_Task-<version>-Company-PC-Check.zip`, then double-click `CHECK_COMPANY_PC_COMPATIBILITY.bat`.

The check:

- Does not install software.
- Does not request elevation.
- Does not change startup settings.
- Tests write access to the local application-data area.
- Looks for WebView2 in common locations.
- Checks access to the current-user startup registry location.
- Writes `compatibility-report.txt` for IT review.

## Browser preview

Use the versioned Preview HTML file when executable software is blocked but local browser files are permitted. It is suitable for interface review and temporary testing, not as the only storage location for important work.

## Local no-admin compilation

`BUILD_WINDOWS_NO_ADMIN.bat` never installs tools or requests elevation. It only works when all of these are already available:

- Node.js and npm.
- Rust and Cargo with `x86_64-pc-windows-msvc`.
- Microsoft Visual C++ Build Tools.

A managed work laptop commonly blocks installation of those developer tools. GitHub Actions is the preferred release path.

## Company application control

No-admin installation does not override company security. SmartScreen, AppLocker, Windows Defender Application Control, antivirus, endpoint management, or allowlist policy may still block Running_Task.

Do not attempt to bypass those controls. Give IT the executable, `SHA256SUMS.txt`, `release-manifest.json`, `compatibility-report.txt`, public source repository, and security documentation. Code-signing support is planned for the release-candidate stage when an approved certificate is available.
