# Build and release guide

## Audience

Normal users should download a prebuilt artifact and should not compile Running_Task on a company PC. This document is for maintainers and release operators.

## Recommended release path: GitHub Actions

The workflow is `.github/workflows/build-windows.yml`. It runs on a GitHub-hosted Windows runner after a push to `main` or `release/**`, a manual workflow dispatch, or a `v*` tag.

The build job:

1. Checks out the source with read-only repository permission.
2. Installs Node.js 22 and the Rust MSVC toolchain on the temporary runner.
3. Installs declared JavaScript dependencies.
4. Runs `npm run verify`.
5. Builds the Tauri NSIS package.
6. Runs `scripts/Build-ReleaseAssets.ps1`.
7. Uploads one artifact named `Running_Task-Windows-<run number>`.
8. Uploads generated `package-lock.json` and `src-tauri/Cargo.lock` in a separate lockfile artifact for production reproducibility.

The artifact contains:

```text
Running_Task-<version>-Windows-x64-Setup.exe
Running_Task-<version>-Windows-x64-Portable.zip
Running_Task-<version>-Company-PC-Check.zip
Running_Task-<version>-Preview.html
Running_Task-<version>-START_HERE.txt
Running_Task-<version>-LAUNCH_GUIDE.md
Running_Task-<version>-RELEASE_NOTES.md
SHA256SUMS.txt
release-manifest.json
```

A `v*` tag starts a separate release job with write permission. That job downloads the verified artifact and publishes the same files as a GitHub release.

## Current-user setup mode

`src-tauri/tauri.conf.json` configures NSIS with `installMode: currentUser`. The finished setup is intended to install below the current user's Windows profile without an Administrator prompt.

`webviewInstallMode` is `skip`. The setup does not download or launch a WebView2 prerequisite installer. WebView2 must already exist on the target computer; use the company-PC compatibility check before installation.

Company application-control policy can still block unsigned software.

## Local no-admin build

Run `BUILD_WINDOWS_NO_ADMIN.bat`.

This mode passes `-SkipToolInstall` to the PowerShell builder. It never installs a prerequisite or requests elevation. It stops when Node.js, Rust/Cargo, or Microsoft C++ Build Tools are missing. When all prerequisites exist, it produces the same versioned release files as GitHub Actions.

## Maintainer build

Run `BUILD_WINDOWS_INSTALLER.bat`.

This route may install missing developer tools and may request Administrator approval. It is intentionally separated from normal installation.

```text
BUILD_WINDOWS_INSTALLER.bat
  -> scripts/Build-WindowsInstaller.ps1
  -> check or install prerequisites
  -> npm install or npm ci
  -> npm run verify
  -> tauri build --bundles nsis
  -> scripts/Build-ReleaseAssets.ps1
  -> versioned release files and checksums
```

## Local prerequisites

- Node.js and npm.
- Rustup and stable `x86_64-pc-windows-msvc`.
- Microsoft Visual Studio C++ Build Tools with x64 C++ tools.
- Internet access for initial dependency acquisition.

A managed work laptop may require IT approval for these tools. Use GitHub Actions when approval is unavailable.

## Developer commands

```powershell
npm install --no-audit --no-fund
npm run verify
npm run dev
npm run build:windows
```

## Verification gate

`npm run verify` runs:

1. TypeScript compilation.
2. Self-contained preview generation.
3. JavaScript syntax parsing.
4. Static product and configuration checks.
5. Live SQLite schema execution when `node:sqlite` is available.
6. Domain rules for next action, BIC, Calendar, Archive, JSON import, CSV export, and Markdown export.
7. Serialized-save, retry-retention, and fail-closed recovery tests.
8. Recursive React render smoke tests for primary routes, overlays, and recovery UI.
9. Release configuration checks for current-user install, WebView2 skip mode, no-admin helpers, compatibility check, GitHub Actions, and secret hygiene.
10. Packaging checks for versioned filenames, portable ZIP, company-PC check, checksums, and manifest.

Do not distribute a release when verification fails.

## Version locations

Update all of these together:

- `VERSION`
- `package.json`
- `frontend/src/app.ts` (`APP_VERSION`)
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `CHANGELOG.md`
- release notes and versioned documentation

The frontend display version, Cargo package version, and Tauri bundle version are all `1.0.0-rc.1`.

## Source publishing

See `docs/GITHUB_UPLOAD_GUIDE.md`.

- Browser upload needs no Git installation.
- `PUBLISH_TO_GITHUB_NO_ADMIN.bat` requires existing Git and GitHub CLI but never installs them.
- `PUBLISH_TO_GITHUB.bat` is a maintainer helper that may offer to install missing Git tools.
- The helper never force-pushes and excludes databases, backups, exports, credentials, and build output.

## Windows release checklist

1. `npm run verify` passes.
2. GitHub Actions completes on `windows-latest`.
3. The artifact includes every expected versioned file.
4. `SHA256SUMS.txt` matches the downloaded files.
5. Setup installs for a standard current user without elevation.
6. Portable build launches from a permanent user-owned folder.
7. Application works offline after installation.
8. New desktop database contains General and Personal with no demo Cards.
9. Create, edit, close, reopen, and persistence checks pass.
10. Startup enable/disable passes or a company-policy warning is recorded.
11. Backup, restore, JSON import/export, CSV export, and Markdown export pass.
12. Done Cards remain absent from active views and visible in Archive.
13. Upgrade and uninstall behavior is recorded.
14. No database, backup, export, token, or personal data appears in source or release files.
