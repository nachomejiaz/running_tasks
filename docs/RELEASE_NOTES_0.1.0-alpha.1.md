# Running_Task 0.1.0-alpha.1

Release type: source alpha for product review and Windows build validation.

## Delivered

- Complete first-pass React/TypeScript interface.
- Dashboard with actionable queues.
- Topic-first Board with Subtopic grouping.
- Optional Status-first Board.
- Dense List view.
- Checklist/BIC Flow view.
- Visible Create Task workflow.
- Card detail drawer and nested checklist editing.
- Next-date and BIC derivation.
- Search, filters, saved views, and keyboard shortcuts.
- Done/manual archive behavior with restore and permanent deletion.
- Archive & Backups center.
- SQLite schema, validation, transactional saves, backup/restore, JSON export, and data-folder command.
- Startup-launch integration enabled by default.
- Theme and density settings.
- Self-contained and local-server browser previews with representative demo data; clean first-run desktop starter data.
- Windows prerequisite, build, preview, development, and shortcut helpers.
- Static, domain, and render smoke tests.
- User, architecture, data-safety, build, acceptance, troubleshooting, privacy, and limitation documentation.

## Approved product changes reflected

- Product renamed to `Running_Task`.
- Topic columns are the default Board layout.
- RFI may be both a Subtopic and a Card Type.
- Statuses are To Do, In Progress, Waiting, Review, Done.
- Done cards are removed from active workspaces and retained in Archive.
- Main page contains Create Task.
- Windows launch-at-sign-in enabled by default.
- OneNote migration removed from scope.

## Verification performed in the source preparation environment

- TypeScript compilation succeeded.
- Compiled JavaScript syntax parsing succeeded.
- Static product/configuration smoke checks succeeded.
- Domain-rule tests succeeded.
- React recursive render smoke tests succeeded for primary screens and overlays.
- JSON files were parsed.
- SQLite schema text was executed against an isolated SQLite engine.

## Not yet verified in this artifact

- Rust compilation on Windows.
- Tauri WebView runtime behavior on the target work laptop.
- NSIS setup execution on the target work laptop.
- Company application-control compatibility.
- Actual Windows startup registration on the target work laptop.
- Long-duration use with real production data.

## Recommended review order

1. Read `START_HERE.txt`.
2. Run `RUN_BROWSER_PREVIEW.bat` for UI review.
3. Complete `docs/ACCEPTANCE_TESTS.md` against a Windows build.
4. Use a copy/test dataset before entering important work.
