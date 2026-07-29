RUNNING_TASK RELEASE FOLDER
===========================

A successful Windows build places these files here:

- Running_Task-<version>-Windows-x64-Setup.exe
  Current-user installer. Running_Task itself should not request Administrator
  elevation.

- Running_Task-<version>-Windows-x64-Portable.zip
  Extract and double-click Running_Task.exe. No installer is run.

- Running_Task-<version>-Company-PC-Check.zip
  No-install compatibility check for WebView2, local-data write access, and the
  current-user startup location.

- Running_Task-<version>-Preview.html
  Self-contained browser review file with demo data.

- Running_Task-<version>-START_HERE.txt and LAUNCH_GUIDE.md
  Plain-language launch and troubleshooting instructions.

- SHA256SUMS.txt and release-manifest.json
  Integrity hashes and machine-readable release metadata.

Normal company-PC users should download the prebuilt GitHub Actions artifact
rather than run compiler tools locally. See docs\LAUNCH_GUIDE.md.
