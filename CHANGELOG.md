# Changelog

## 0.3.0-alpha.3 - 2026-07-24

### Added

- No-admin local build mode that never installs developer prerequisites.
- Company-PC compatibility check and report.
- One GitHub Actions download containing the current-user setup, portable ZIP, company-PC check, preview, checksums, and release manifest.
- Validated JSON workspace import with a review modal and safety backup.
- CSV and Markdown export.
- No-admin installation, GitHub upload, and staged roadmap documentation.
- Release configuration and packaging smoke tests.

### Changed

- Normal-user instructions now begin with prebuilt artifacts instead of source compilation.
- Maintainer build now creates both installer and portable packages.
- Maintainer-only scripts are clearly separated from normal user launch steps.
- GitHub workflow dependencies use maintained action versions for checkout, Node setup, artifact upload, and artifact download.
- The approved `running_tasks` repository is bootstrapped; the prepared browser-upload payload completes the expanded source-tree publication.

## 0.2.0-alpha.2 — 2026-07-23

### Added

- Monthly Calendar view using each Card's derived next-action date.
- Monday-first six-week month grid with previous, Today, and next navigation.
- Day-cell quick creation with the selected date prefilled.
- Unscheduled-task entry point from Calendar.
- Calendar domain and render smoke coverage.
- Guided Windows GitHub publisher targeting `nachomejiaz/running_tasks`.
- Git attributes and source-safety exclusions for repository publication.

### Changed

- Adopted an `Alliance No.1`-first local font stack with broad system fallbacks.
- Refined the visual system toward a neutral, high-contrast dark workspace with quieter borders, surfaces, and controls.
- Dark is now the default theme for new workspaces; light and system themes remain available.
- Bumped the source alpha and native package versions for the next review stage.

## 0.1.0-alpha.1 — 2026-07-22

### Added

- Initial Running_Task product implementation.
- Topic/Subtopic/Card/checklist hierarchy.
- BIC and due-date tracking.
- Topic and Status Board modes.
- Dashboard, List, Flow, Archive, and Settings.
- Search, filters, smart queues, saved views, and keyboard shortcuts.
- Completion/archive lifecycle.
- SQLite desktop persistence and local backup/restore/export services.
- Windows autostart integration.
- Browser preview and Windows build helpers.
- Automated source/render/domain smoke tests.
- Full first-pass user and developer documentation.

## 1.0.0-rc.1 — 2026-07-27

### Added

- Serialized, coalesced local save queue with explicit Retry after failure.
- Close-save guard for pending desktop edits.
- Fail-closed local-data recovery screen.
- Single-instance desktop enforcement.
- Startup SQLite integrity and schema compatibility checks.
- One-time `Before_Upgrade` SQLite safety backup.
- Target-PC production acceptance checklist.
- Automated reliability tests for save ordering, retry retention, and load recovery.
- Release-branch Windows builds and generated dependency-lockfile artifacts.

### Changed

- Froze the approved product feature baseline for production stabilization.
- Replaced the long pre-production feature roadmap with one release candidate followed by v1.0.0.
- Backup, restore, import, and export operations now flush pending edits first.
- Database startup errors remain recoverable in the UI instead of causing starter data to be written.
