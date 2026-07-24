# Running_Task 0.3.0-alpha.3

## Focus

This build turns the approved 0.2 interface into a safer company-PC delivery workflow. Normal users no longer need to compile the application locally.

## Added

- `BUILD_WINDOWS_NO_ADMIN.bat`, which never installs prerequisites.
- `PUBLISH_TO_GITHUB_NO_ADMIN.bat`, which never installs Git or GitHub CLI.
- A centralized Windows release-asset packager.
- Portable Windows ZIP generation.
- Stable release filenames, SHA-256 checksums, and a JSON release manifest.
- GitHub Actions output containing the Setup, Portable ZIP, preview, checksums, and manifest.
- Automatic GitHub Release creation when a `v*` tag is pushed.
- Easy launch, GitHub upload, and remaining-roadmap documentation.
- Static packaging and version-consistency test coverage.

## Changed

- Normal-user documentation now leads with downloading a prebuilt GitHub artifact.
- `BUILD_WINDOWS_INSTALLER.bat` is explicitly labeled as a maintainer/developer tool.
- The build fails when the NSIS install mode is not `currentUser`.
- Settings explains the current-user and portable delivery modes.
- Version advanced to `0.3.0-alpha.3`.

## Important limitation

A current-user or portable build can still be blocked by company application-control policy because the alpha is not code-signed. Running_Task does not bypass those controls. IT approval or signing may be required.
