# Architecture

## System overview

```text
+--------------------------------------------------------+
| Windows desktop process                               |
|                                                        |
|  Tauri WebView                                         |
|  +--------------------------------------------------+  |
|  | React + TypeScript interface                    |  |
|  | views, cards, filters, dialogs, local UI state  |  |
|  +-------------------------+------------------------+  |
|                            | Tauri invoke commands     |
|  +-------------------------v------------------------+  |
|  | Rust application services                       |  |
|  | validation, persistence, backup, restore, export|  |
|  +-------------------------+------------------------+  |
|                            |                           |
|  +-------------------------v------------------------+  |
|  | SQLite + local backup/export files              |  |
|  +--------------------------------------------------+  |
+--------------------------------------------------------+
```

## Frontend responsibilities

The frontend owns presentation and interaction:

- Route and drawer state.
- Search and filter evaluation.
- Card expansion.
- Drag-and-drop intent.
- Forms and keyboard shortcuts.
- Derived next-action presentation.
- Debounced persistence requests.
- A one-level in-session undo snapshot.

Important source:

- `frontend/src/app.ts`
- `frontend/dist/styles.css`
- `frontend/dist/index.html`

The production HTML loads only local vendored scripts and styles.

## Desktop/backend responsibilities

The Rust layer owns durable operations:

- Application-local directory creation.
- SQLite schema creation.
- Relationship and hierarchy validation.
- Transactional workspace replacement.
- Database loading and typed serialization.
- Daily and manual backups.
- Automatic-backup pruning.
- Backup integrity verification and restore.
- JSON, CSV, and Markdown export.
- Native data-folder opening.
- Windows startup registration through the Tauri autostart plugin.

Important source:

- `src-tauri/src/lib.rs`
- `src-tauri/src/main.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`

## Persistence approach

The release candidate sends one typed `AppData` document across the Tauri boundary and stores it in normalized SQLite tables. A save:

1. Validates all references and checklist hierarchy.
2. Opens SQLite with foreign keys and WAL mode.
3. Begins a transaction.
4. Replaces the current entity rows.
5. Inserts nested checklist rows without parent links.
6. Applies parent links after all rows exist.
7. Commits.
8. Creates/prunes the day's automatic backup as a non-fatal follow-up.

This full-workspace transaction is intentionally simple for a single-user local application. It provides atomicity and keeps the frontend/backend contract easy to inspect. A later high-volume release can switch individual operations to command-specific incremental writes without changing the user-facing information model.

## Entity relationships

```text
topics 1 -------- * subtopics
   |                    |
   |                    +---- cards.subtopic_id (optional)
   +------------------------- cards.topic_id

card_types 1 -------- * cards
statuses   1 -------- * cards
actors     1 -------- * cards.fallback_bic_id
cards      1 -------- * checklist_items
actors     1 -------- * checklist_items.bic_id
checklist_items 1 ---- * checklist_items.parent_id
```

## Validation rules

The backend rejects a save when:

- No Topic exists.
- No terminal status exists.
- A Subtopic references a missing Topic.
- A Card references a missing Topic, Status, Type, or BIC.
- A Card's Subtopic belongs to another Topic.
- A checklist row references a missing Card or BIC.
- A checklist parent belongs to another Card.
- A checklist row is its own ancestor.

## Startup sequence

1. Tauri starts the local process and opens the WebView.
2. The backend resolves the application-local data directory.
3. Backup and export directories are created.
4. SQLite is opened and the current schema is created if absent.
5. The saved autostart preference is read; absent preference defaults to enabled.
6. The current executable is registered or removed from autostart to match that preference.
7. The frontend loads persisted `AppData`.
8. When the database is new, the frontend supplies a clean starter workspace with General and Personal Topics, the approved statuses, reusable Card Types, and the `Me` BIC actor, then saves it. The browser preview separately uses representative demo cards.

## Workspace import boundary

JSON import is deliberately split across both application layers:

1. The frontend reads only the file explicitly selected by the user.
2. It rejects oversized files and unsupported future schema versions.
3. It normalizes the supported document shape and validates duplicate IDs, missing references, cross-Topic Subtopics, and checklist parent cycles.
4. It displays record counts and warnings before replacement.
5. On approval, the current workspace is saved and backed up.
6. The imported `AppData` is sent through the same backend save command used by ordinary edits.
7. The Rust layer independently validates relationships and commits the replacement in one SQLite transaction.

CSV and Markdown are intentionally one-way reporting formats in this stage. JSON is the supported round-trip workspace format.

## Browser preview architecture

The preview deliberately avoids pretending to be the desktop runtime:

```text
Local Node HTTP server -> browser -> localStorage + browser-local JSON backups
```

The same React interface is used, but native SQLite, OS autostart, folder opening, and SQLite restore operations are unavailable or simulated. JSON/CSV/Markdown exports download through the browser, and JSON import replaces only the preview workspace. Preview and desktop data are separate by design.

## Security boundary

The WebView content security policy allows local assets, data images, inline styles used by components, and the Tauri IPC endpoint. It does not permit arbitrary internet scripts. Native commands are a small explicit list registered in `generate_handler!`.

See `SECURITY_AND_PRIVACY.md` for the practical threat model.
