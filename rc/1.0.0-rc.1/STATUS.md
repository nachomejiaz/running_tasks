# Running_Task 1.0.0-rc.1 status

**Release type:** Production release candidate

**Source implementation:** Complete

**Local source verification:** Passed

**Native Windows build:** Pending GitHub Actions after the expanded source payload is committed to this branch

**Target branch:** `release/v1.0.0-rc.1`

## Release focus

This candidate freezes the approved feature scope and concentrates on persistence, backup, restore, recovery, no-admin Windows delivery, and upgrade safety.

## Hardening included

- Serialized workspace saves and a close-time final-save gate.
- Visible save-failure recovery control.
- SQLite WAL, full synchronization, foreign keys, transactions, and integrity checks.
- Fail-closed startup recovery rather than replacing unreadable data with a blank workspace.
- Verified backup restore with rollback-safe database replacement.
- Pre-upgrade backup.
- Single-instance desktop behavior.
- Current-user NSIS installer and portable Windows package.
- Native Windows smoke-test automation for first launch, reopen, install, reinstall, and uninstall data preservation.

## Verified source artifacts

- Source ZIP SHA-256: `cf9c71cffd4273dcd29589b5c8fbef501faf01ac073238594c103b38b13e9c61`
- GitHub web-upload ZIP SHA-256: `07e8a0affb8cdd8b7fd78f541bf95773d36a2cb4d6bf64b2dbd47f5ed470c9c7`
- Repository ZIP SHA-256: `cf8c56975fd3ae714220ac6c2a1ea65b76c8428770cdfbb21fdf940ac133d38f`
- Repository bundle SHA-256: `9f1de709a48b00f6b2f1768e9c72cdc5f6331637d338a63d517cee08f2d6499b`
- Preview SHA-256: `50f7ac1ddb88eabe7808562ff18c9cdc93e1b0e41691b97b314fabac81131806`

## Promotion gate

Promote this candidate to `1.0.0` after the GitHub-hosted Windows build and the standard-user acceptance checklist pass on the intended company PC. Only release-blocking corrections should be added before promotion.
