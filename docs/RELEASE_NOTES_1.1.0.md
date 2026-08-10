# Running_Task 1.1.0

**Release type:** First production build intended for real daily use
**Scope:** Close a launch-blocking desktop defect, make schema change survivable, and remove the friction found in a full audit of 1.0.0-rc.1

## Why this release exists

1.0.0-rc.1 was never buildable. Every GitHub Actions run since the project
started had failed, so no installer was ever produced and no part of the
desktop runtime had been exercised. This release is the first one that
compiles, packages, and is meant to hold real work.

## Blocking fixes

### The desktop window could not be closed

Registering a JavaScript `onCloseRequested` listener makes Tauri suppress the
native close and hand the decision to the webview. The webview could only
finish that decision through a `core:window` command, and the application's
capability granted none, so every close attempt ended in a rejected call and
the window stayed open. Closing now runs through a dedicated backend command,
with an explicit capability as a fallback.

This defect was undetectable before now: the interface tests render React
without a Tauri runtime, and no binary had ever been built.

### A schema change would have locked the workspace out

The stored schema version was compared for exact equality with no migration
mechanism, so the first added column would have made every existing database
refuse to open. Migrations now run in order, inside one transaction, behind
the pre-upgrade backup that already existed. A partially applied upgrade is
never committed.

Schema 2 ships as the first real migration: statuses gain a `waiting` flag,
backfilled from the identifier the interface used to hardcode.

### The persistence layer had no tests

Validation, transactional save, migration, backup pruning, and backup path
safety are now covered by Rust tests that run in CI. Previously the only
checks on this layer were JavaScript assertions that read the Rust file as
text; one of those string checks was what had been failing every build.

## Daily-use changes

- **Undo keeps the last 20 changes.** A run of typing in one field collapses
  into a single step. Previously undo held one slot, so typing a single
  character permanently discarded whatever change came before it.
- **Configuration entities can be removed.** Topics, Subtopics, Card Types,
  and BIC actors can be deleted when nothing references them, and hidden when
  something does. Hidden items are listed and restorable in Settings.
- **The Waiting-On queue follows a status flag** instead of a fixed
  identifier, so a custom status set keeps working. The flag is editable per
  status.
- **Tags and checklist item notes have editors.** Both were already stored,
  searched, and exported with no way to enter them.
- **Saved views can be deleted.**
- **Archived tasks open read-only** from Archive, with a direct Restore.
- **Confirmations are in-app.** Deleting a task, restoring or deleting a
  backup, and naming a saved view no longer depend on WebView2 script dialogs,
  which are not guaranteed to appear under Tauri.
- **A render fault shows the recovery screen** instead of a blank window.
- Editing costs one workspace copy instead of three, and launching no longer
  rewrites an untouched database.
- The daily automatic backup keys off the local date rather than UTC.
- Dashboard tiles and Flow rows are keyboard operable; the `N` shortcut no
  longer fires behind an open dialog.

## Repository and build

- Restored `.gitattributes` and `.gitignore`, which the browser-upload route
  had silently dropped; Windows helper scripts had been committed with LF
  endings.
- Consolidated two Windows workflows that were racing on the same branch.
- Committed `package-lock.json` and `Cargo.lock`, so builds stop resolving
  fresh dependency versions on every run.
- Removed a corrupt 8 KB source archive and a duplicated acceptance document.
- The seeded demo workspace no longer contains real project, firm, or
  document identifiers.

## Known limitations

See `docs/KNOWN_LIMITATIONS.md`. The notable deferrals are the React 16
runtime, `strict` TypeScript, incremental SQLite writes, and the duplicated
export implementations between the Rust backend and the browser preview.

## Before trusting it with real work

Run `docs/RC_ACCEPTANCE_CHECKLIST.md` against the built installer. The
critical items are closing the window with the X button, the save/reopen
round trip, backup and restore, and the schema 1 to schema 2 upgrade.
