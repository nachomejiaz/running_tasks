# Running_Task 1.0.0-rc.1

This branch contains the first production release candidate.

The approved 0.3.0-alpha.3 source bundle remains the reproducible baseline stored on `main`. The files under `rc-patch/` are a checksum-verified compressed patch that converts that baseline into the complete 1.0.0-rc.1 source tree during the Windows build. The patch exists because this connector cannot upload the expanded working tree as one atomic directory operation; the downloadable handoff also contains the expanded source and normal Git repository.

## Release-candidate focus

- serialized and retryable SQLite saves
- fail-closed recovery after database-load errors
- one-time pre-upgrade database backups
- explicit schema-version rejection
- single-instance desktop behavior
- save flushing before close, backup, restore, import, and export
- current-user NSIS installer and portable Windows package
- company-PC compatibility check

## Verification

All source-level TypeScript, SQLite schema, domain-rule, reliability, rendering, configuration, and packaging checks pass locally. Native Windows compilation and the target-PC acceptance checklist remain required before promotion to `v1.0.0`.

## Windows build

The `Build Running_Task 1.0 RC for Windows` workflow reconstructs the approved baseline, verifies and applies the RC patch, runs `npm run verify`, compiles the Tauri application, and uploads the installer, portable package, compatibility checker, preview, documentation, checksums, and generated dependency lockfiles.

Do not merge this branch to `main` or promote it to `v1.0.0` until the critical items in `docs/RC_ACCEPTANCE_CHECKLIST.md` pass on a standard, non-administrator Windows account.
