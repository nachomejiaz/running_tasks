# Running_Task Roadmap

The roadmap is organized by acceptance gate rather than calendar date. A build advances only after its tests pass and the preceding user-interface stage is approved.

## Completed

### 0.1.0-alpha.1 — Functional local-workspace foundation

- Topic, Subtopic, Card Type, status, BIC, Card, and nested checklist model.
- Board, List, Flow, Dashboard, Archive, filters, search, backups, and local SQLite architecture.

### 0.2.0-alpha.2 — Calendar and visual-system stage

- Monthly Calendar.
- Dark-first professional UI.
- Alliance No.1-first local font stack with system fallbacks.
- Calendar creation and next-action-date placement.

### 0.3.0-alpha.3 — No-admin delivery and release automation

- Current-user installer enforcement.
- Portable Windows package.
- No-admin local build and publishing helpers.
- GitHub Actions verification, Setup build, portable packaging, checksums, and tagged releases.
- Launch and GitHub upload guides.
- Packaging and version-consistency tests.

## Remaining planned builds

### 0.4.0-beta.1 — Daily-use productivity

Planned scope:

- Card templates with reusable checklist structures.
- Recurring tasks with explicit next-instance rules.
- Local file links and attachment metadata without cloud upload.
- Bulk status, BIC, Topic, and due-date changes.
- Calendar drag/reschedule workflow, subject to interaction testing.
- Improved command palette and keyboard-first capture.

Acceptance tests:

- Template creation and task instantiation preserve hierarchy and dates.
- Recurrence handles month ends, skipped instances, completion, and disabled rules.
- Broken local file links fail safely without deleting Card data.
- Bulk changes are transactional and undoable.
- Keyboard-only creation, editing, filtering, and completion pass.
- Existing 0.3 databases migrate without data loss.

### 0.5.0-beta.2 — Advanced tracking and insight

Planned scope:

- Custom fields for package-specific metadata.
- Card dependencies and blocked-state indicators.
- BIC aging, overdue trends, and Topic health reports.
- CSV import/export mapping; OneNote migration remains excluded.
- More saved-view controls and portable local view definitions.

Acceptance tests:

- Every custom-field type validates and round-trips through backup/export.
- Dependency cycles are rejected.
- Reports reconcile exactly with source Cards and checklist items.
- CSV import uses preview, validation, duplicate detection, and rollback.
- Large filter combinations remain responsive.

### 0.6.0-rc.1 — Reliability and corporate-Windows hardening

Planned scope:

- Full Windows 10/11 acceptance run on clean standard-user profiles.
- Upgrade and rollback testing across all prior database versions.
- Accessibility audit and focus-order corrections.
- Large-dataset performance tuning.
- Crash-recovery and backup/restore drills.
- Code-signing and IT-distribution readiness documentation.

Acceptance tests:

- Setup and portable launch without Administrator rights.
- No task loss through forced-close, restart, migration, backup, or restore scenarios.
- 10,000 Cards and 100,000 checklist items meet agreed interaction targets.
- Screen-reader labels, contrast, keyboard focus, and non-color cues pass review.
- Clean uninstall leaves user data intact unless explicitly removed.

### 1.0.0 — Stable personal release

Release gate:

- All release-candidate blockers closed.
- Signed or company-approved Windows distribution path selected.
- Restore tested from a real backup on another Windows profile.
- Complete user, backup, troubleshooting, and upgrade documentation.
- Final source, installer, portable ZIP, checksums, and release notes published.
