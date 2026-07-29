# Running_Task 0.3.0-alpha.3

Release date: 2026-07-24

## Purpose

This stage converts the company-PC installation concern into a defined no-admin delivery path and completes the first round-trip data-portability workflow.

## Added

- `BUILD_WINDOWS_NO_ADMIN.bat`, which never installs prerequisites or requests elevation.
- `CHECK_COMPANY_PC_COMPATIBILITY.bat` and a portable company-PC check package.
- A GitHub Actions Windows build that produces one easy-to-download artifact containing:
  - current-user Setup executable;
  - portable ZIP;
  - company-PC compatibility check;
  - browser preview;
  - launch instructions;
  - SHA-256 checksums and release manifest.
- Tagged GitHub release publication after the verified build job.
- Explicit WebView2 `skip` packaging mode so setup does not launch a prerequisite installer; the compatibility checker reports whether WebView2 is already present.
- Automatic Windows build after every push to `main`.
- GitHub-hosted build actions updated to their current supported major versions for checkout, Node setup, artifact upload, and artifact download.
- Browser-only GitHub upload route requiring no Git tools or Administrator rights.
- Explicit repository-root upload guidance to prevent the source tree from being nested under an extra folder.
- Stable, versioned release filenames.
- JSON import with validation, summary review, warnings, and a safety backup before workspace replacement.
- CSV export with one row per Card/checklist item.
- Markdown export grouped by Topic with checklist state, dates, and BIC.
- Import/export controls in Archive & Backups.
- Installation information in Settings.
- No-admin installation, launch, GitHub upload, and roadmap documentation.
- Repository bootstrap, release documentation, and a verified browser-upload payload for the approved `nachomejiaz/running_tasks` repository.
- Repository operations are batched after local verification to avoid interrupting implementation work.
- Release configuration and packaging smoke tests.

## Changed

- Normal-user documentation starts with the prebuilt Setup or Portable package instead of source compilation.
- `BUILD_WINDOWS_INSTALLER.bat` is explicitly a maintainer tool that may need Administrator approval only for developer prerequisites.
- Local and CI builds now use the same `Build-ReleaseAssets.ps1` packaging logic.
- The GitHub publishing helper has a no-admin mode, does not force-push, and recognizes the existing placeholder/source-bundle staging repository.

## Data compatibility

The workspace schema remains version 1. Existing 0.1 and 0.2 workspace data remains compatible. Supported imported workspaces are normalized to the current application version after validation.

## Validation completed in this environment

- TypeScript compilation.
- Self-contained preview generation.
- JavaScript syntax checks.
- Live SQLite schema execution.
- Domain tests for next action, BIC, Calendar, Archive, JSON import, CSV, and Markdown.
- Recursive UI render tests.
- No-admin, workflow, packaging, checksum-manifest, and secret-hygiene configuration tests.

## Remaining release gate

This environment cannot compile or acceptance-test the native Windows executable. The GitHub Actions Windows run and a standard-user smoke test on a representative managed PC remain required before using the alpha for irreplaceable work data.
