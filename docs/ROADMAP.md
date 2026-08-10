# Running_Task accelerated production roadmap

## Product strategy

Running_Task is a local, single-user application. Production readiness is defined by reliable storage, recovery, safe upgrades, and successful operation on the target company PC—not by completing every possible feature before release.

## Current build: 1.1.0

**Status:** Source stabilization complete; native Windows build and target-PC acceptance pending.

Release-candidate goals:

- Preserve the approved Dashboard, Topic Board, List, monthly Calendar, Flow, Archive, filters, Card details, and settings.
- Serialize rapid local saves and retain failed saves for Retry.
- Flush pending edits before the desktop window closes.
- Fail closed when the database cannot be opened.
- Prevent simultaneous desktop instances.
- Create a one-time pre-upgrade SQLite safety backup.
- Reject unsupported schema versions.
- Build current-user Setup and Portable packages through GitHub Actions.
- Complete real Windows acceptance without Administrator rights.

## Next build: 1.0.0 production

Release immediately after all critical RC checks pass or any release-blocking defects are corrected.

Production gate:

1. GitHub Actions compiles and packages the native Windows application.
2. Setup installs for a standard user without an elevation prompt.
3. Portable launch works from a user-owned folder.
4. Create/edit/close/reopen preserves the latest data.
5. Backup, restore, JSON export, and upgrade safety backup work on the compiled build.
6. A second launch focuses the existing instance.
7. Launch at sign-in behaves correctly.
8. Uninstall/reinstall does not unexpectedly remove workspace data.
9. No critical data-loss, startup, or primary-view defect remains.
10. Company security policy either permits the application or documents the required IT approval.

## After production: usage-driven releases

### 1.1.x — first-use refinements

Prioritize only friction observed during daily use, such as faster task capture, small UI corrections, better keyboard behavior, missing filters, or Calendar refinements.

### 1.2.x — highest-value workflow extension

Choose templates, recurrence, or reminders based on actual usage. None is predetermined as the next feature.

### Later candidates

Attachments, custom fields, bulk editing, detailed history, dependencies, roadmap visualization, and analytics remain backlog options. They do not block production and will be assessed against real needs.

## Test philosophy

Every production update must retain:

- Automated source verification.
- Database migration and compatibility tests when schema changes.
- Backup and restore validation.
- Upgrade testing against the latest production database.
- A Windows packaging test.
- A short target-PC smoke test before important work data is migrated.
