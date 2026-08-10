# Known limitations - 1.0.0-rc.1

## Distribution status

- This delivered artifact is source plus compiled frontend review assets, not a Windows setup executable compiled in this environment.
- The GitHub Actions workflow must build and exercise the native Windows artifacts after repository upload.
- The release candidate is not code-signed.
- Managed Windows devices may block setup execution, portable execution, WebView2, or startup registration even though the installer is current-user and no-admin.
- The installer intentionally does not install WebView2. Running_Task will not launch when the runtime is absent; IT must deploy it through an approved route.

## Data and recovery

- JSON import replaces the complete workspace after validation and backup; selective Card import is not implemented.
- CSV and Markdown are export-only snapshots.
- Schema migrations run automatically behind a pre-upgrade backup. Only forward migration is supported; an older build cannot open a newer workspace.
- OneNote migration is intentionally omitted.
- Local backups do not protect against laptop loss or drive failure unless copied to an approved separate location.
- SQLite restore replaces the complete workspace; selective Card restore is not implemented.
- Undo keeps the last 20 workspace changes in memory and is lost when the application closes. A run of typing in one field collapses into a single step.
- Permanent deletion in Archive is destructive after confirmation.
- Import safety backup creation must succeed before replacement, but native Windows behavior still requires acceptance testing.

## Task model

- One primary BIC is supported per checklist item.
- The Card next date shown on Board and List chooses one checklist item and does not display multiple same-day BIC owners as a combined value. Calendar is not affected: it places each dated step separately.
- Nested checklist completion does not automatically force parent or child completion.
- Dependencies between Cards are not implemented.
- Recurring tasks are not implemented.
- Attachments and linked local files are not implemented.
- Custom field definitions are not implemented.
- Notifications and Windows reminders are not implemented.
- Bulk-edit operations are limited.
- Tags are stored, searched, and exported but have no editor yet.
- Checklist item notes are stored and exported but have no editor yet.
- Saved views can be created and applied but not renamed or deleted.
- Reusable task and checklist templates remain a post-production backlog option and will be prioritized from real usage.
- Detailed per-Card activity history is not implemented; only created, updated, and completed timestamps are stored.

## Views and interaction

- Board drag-and-drop moves Cards between the configured column axis; fine-grained persisted ordering is basic.
- List columns are not user-reorderable or individually hideable.
- Flow is an action-handoff visualization, not a dependency network or critical-path engine.
- Calendar is monthly only. Drag-to-reschedule, week/day modes, recurrence, Gantt/Roadmap, analytics, and workload reports are not implemented.
- A day with many dated steps scrolls inside its cell; there is no overflow summary yet.
- Saved views do not store every visual preference.
- Search is an in-memory structured text search, not SQLite FTS.
- Mobile and multi-device layouts are not targets for this release.

## Desktop runtime

- Startup registration is best effort when Windows or company policy blocks it.
- Portable startup can break when the executable folder is moved after registration.
- There is no built-in passphrase encryption layer. Security relies on Windows account/device protection and approved storage policy.
- The application is single-user and does not implement collaboration or concurrent editing.
- Database writes replace normalized workspace rows in one transaction rather than using command-specific incremental updates. This should be revisited after large real-world datasets are profiled.

## Browser preview

- The preview includes demo records, while a new desktop database starts clean.
- File-based preview storage varies by browser. The local-server preview is more reliable.
- Preview storage is browser-local JSON, not SQLite.
- Native backup folder access, true Windows autostart, and native export paths are unavailable.
- Preview data does not automatically transfer into the desktop app, although the JSON export/import workflow can be used manually.
