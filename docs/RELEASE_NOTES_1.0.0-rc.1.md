# Running_Task 1.0.0-rc.1

**Release type:** First production release candidate  
**Scope:** Reliability, recovery, and Windows deployment stabilization  
**Feature baseline:** Approved 0.3 interface and workflows

## Purpose of this build

This release candidate freezes major feature development and prepares the approved Running_Task experience for real daily use. The release decision is based on persistence, recoverability, upgrade safety, and behavior on the target Windows PC rather than adding more features.

## Reliability changes

### Ordered, coalesced local saves

Rapid edits are now written through a serialized save queue. Only one database save can run at a time, and newer complete workspace snapshots are saved after older in-flight snapshots. A failed save remains queued for an explicit Retry instead of being discarded.

### Close-save protection

The desktop window listens for a close request. When local changes are still pending, Running_Task delays closing, flushes the latest snapshot, and closes only after the save succeeds. The browser preview also registers a best-effort unload safeguard.

### Fail-closed startup recovery

When the desktop database cannot be opened, Running_Task no longer creates starter data as a fallback. It shows a recovery screen with Retry and Open Data Folder controls. This prevents a temporary lock, unsupported schema, or damaged database from being overwritten by an empty workspace.

### Single-instance desktop behavior

Only one Running_Task desktop process is permitted at a time. Launching it again focuses the existing window, preventing two processes from independently writing the same local database.

### Upgrade safety snapshot

When an existing workspace was last opened by a different Running_Task version, the desktop backend creates a `Before_Upgrade_*.sqlite` safety backup before recording the new application version. Unsupported future or older schemas fail closed rather than being guessed or silently rewritten.

### Startup integrity and schema checks

An existing SQLite database receives an integrity check before the interface opens. The stored schema version must match the schema supported by this build. Restore operations repeat the same compatibility preparation after replacing the database.

## Windows delivery

The release workflow produces:

- A current-user NSIS setup executable intended not to request Administrator elevation.
- A portable ZIP requiring no installer.
- A company-PC compatibility-check package.
- A self-contained browser preview.
- SHA-256 checksums and a release manifest.
- Generated npm and Cargo dependency lockfiles as a separate CI artifact for the final production source lock.

The workflow runs on pushes to `main`, pushes to `release/**`, manual dispatch, and version tags.

## Verification completed in the source environment

- TypeScript compilation.
- Self-contained preview generation.
- JavaScript syntax validation.
- SQLite schema execution.
- Existing next-action, BIC, Calendar, Archive, import, CSV, and Markdown rules.
- Serialized-save ordering and coalescing.
- Failed-save retention and retry.
- Fail-closed database-load recovery.
- Recursive rendering of all main views and recovery UI.
- Current-user installer configuration.
- Portable and compatibility-package configuration.
- Version consistency and release-document checks.

## Required before v1.0.0 production

The native Windows output must be built by GitHub Actions and pass the target-PC acceptance checklist, including non-admin setup, portable launch, SQLite persistence after restart, backup/restore, alpha-to-RC upgrade backup, single-instance behavior, autostart, and company endpoint-policy review.

No planned post-v1.0 feature is a release blocker.
