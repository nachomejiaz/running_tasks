# Data, backups, import, and export

## Production storage

The desktop application stores its database in the application-local data directory resolved by Tauri for `com.runningtask.desktop`.

Do not rely on a manually typed path. Open **Archive & Backups** and use **Open Data Folder** to reach the exact directory on the current computer.

The directory contains:

```text
application-local data folder/
|-- running-task.sqlite       Current database
|-- running-task.sqlite-wal   Temporary SQLite WAL file when present
|-- running-task.sqlite-shm   Temporary SQLite shared-memory file when present
|-- backups/
|   |-- Auto_*.sqlite
|   |-- Running_Task_*.sqlite
|   |-- Before_Restore_*.sqlite
|   `-- other safety backups
`-- exports/
    |-- Running_Task_Export_*.json
    |-- Running_Task_Export_*.csv
    `-- Running_Task_Export_*.md
```

## What the database contains

- Application settings.
- Topics and Subtopics.
- Card Types and statuses.
- BIC actors.
- Cards, descriptions, notes, dates, priorities, and tags.
- Checklist rows and nesting.
- Saved views.
- Application and schema metadata.

Attachments are not implemented in this release candidate.

## Automatic backups

After a successful data save, the application checks for an automatic backup for the current UTC date.

- At most one `Auto_YYYYMMDD_*.sqlite` backup is created per active day.
- Default retention is 14 automatic backups.
- Retention can be set to 7, 14, 30, 60, or 90 in Settings.
- Retention pruning applies only to files beginning with `Auto_`.
- A backup warning does not roll back an already committed task edit.

## Manual backups

Select **Back Up Now** in Archive and Backups. Manual files begin with `Running_Task_` and remain until explicitly deleted.

Create a manual backup before:

- Major reorganization.
- Large deletion.
- Testing a new installer build.
- Moving data to another computer.
- Restoring an older backup.
- Importing a workspace from another file.

## SQLite restore process

Restoring is intentionally conservative:

1. The selected backup name is validated to prevent paths outside the backup directory.
2. SQLite runs a quick integrity check on the selected file.
3. Running_Task creates a `Before_Restore_` safety backup of the current database.
4. The selected backup is copied to a temporary file.
5. The temporary database is integrity-checked.
6. WAL and SHM side files are removed when present.
7. The temporary file replaces the active database.
8. The schema initializer ensures required tables and indexes exist.
9. The interface reloads the restored workspace.

A restore replaces the complete workspace, not one Card.

## JSON export and import

JSON is the supported full-workspace round-trip format.

Export JSON:

1. Open **Archive & Backups**.
2. Select **Export JSON**.
3. The desktop application writes a formatted file under `exports`.

Import JSON:

1. Open **Archive & Backups**.
2. Select **Import JSON**.
3. Choose a Running_Task JSON export.
4. Review the file name, Topic count, Card count, checklist count, archived count, and warnings.
5. Select **Back Up and Import**.

Before replacement, Running_Task:

- Validates the top-level format.
- Rejects unsupported future schema versions.
- Validates IDs and references between Topics, Subtopics, Cards, BIC actors, statuses, and checklist items.
- Rejects checklist parent cycles.
- Saves the current workspace.
- Creates a safety backup.
- Replaces the full workspace only after validation and backup succeed.

The prior workspace remains available through the backup list.

## CSV export

CSV creates a flattened snapshot suitable for Excel or other table tools. It contains one row per checklist item and repeats the parent Card columns. Cards without checklist items still receive one row.

CSV includes:

- Topic and Subtopic.
- Card Type and status.
- Reference, title, description, priority, tags, and archive state.
- Target date, derived next date, and current BIC.
- Checklist title, parent title, due date, BIC, completion state, and notes.

CSV is not an import format. JSON is the only supported round-trip workspace format.

## Markdown export

Markdown creates a human-readable snapshot grouped by Topic. It includes Card status, type, priority, next date, current BIC, description, checklist state, due dates, checklist BIC, and notes.

Markdown is intended for records and review. It is not an import format.

## Recommended backup practice

Local automatic backups protect against many editing mistakes, but they remain on the same laptop. For protection against device loss or drive failure:

1. Create a manual backup regularly.
2. Close Running_Task.
3. Copy the manual `.sqlite` file or a JSON export to an IT-approved encrypted location.
4. Follow company policy for project and personal data.
5. Periodically test restoration using a disposable copy or test Windows account.

Running_Task does not automatically send backups to OneDrive, SharePoint, email, USB, or another service.

## Browser preview storage

The preview stores JSON in the browser profile and keeps browser-local backup objects. Import and export can be reviewed in the preview, but this storage can disappear when browser data is cleared or a different profile is used.

Preview data is not the desktop SQLite database and does not transfer automatically.
