# Running_Task product specification

## Approved identity

- Product name: **Running_Task**.
- Primary platform: Windows desktop.
- Primary user: one person on one work laptop.
- Operation: fully local; no account or cloud service.
- Startup: launch automatically at Windows sign-in by default.
- Installation: prebuilt current-user setup plus a portable no-install fallback.
- Normal installation must not require Administrator rights, while respecting company application-control policy.
- The setup must not attempt to install WebView2; compatibility is checked separately so prerequisite deployment remains under IT control.

## Approved hierarchy

```text
Workspace -> Topic -> optional Subtopic -> Card -> Checklist item -> optional nested item
```

A Card also has an independent Card Type. This permits `RFI` to be a Subtopic containing many specific RFI Cards while each Card can also be typed as `RFI`.

## Approved statuses

1. To Do
2. In Progress
3. Waiting
4. Review
5. Done

Done is terminal and moves the Card out of active workspaces into Archive.

## Active workspace behavior

- Default Board columns are Topics.
- Cards are grouped by Subtopic within Topic columns.
- Board column mode can be changed to active statuses.
- Completed Cards do not remain visible in active Board, List, Calendar, Flow, Dashboard, or smart queues.
- Archive provides completed-Card access, restoration, permanent deletion, backup management, import, and export.
- Create Task remains visibly available in the main top bar.

## Core Card fields

- Topic.
- Optional Subtopic.
- Optional Card Type.
- Status.
- Optional reference.
- Title.
- Short description.
- Notes.
- Priority.
- Optional target date.
- Optional fallback BIC.
- Tags.
- Nested checklist.
- Automatic created, updated, and completed timestamps.

## Checklist fields

- Title.
- Notes.
- Due date.
- BIC.
- Completion state.
- Parent item.
- Manual rank.

## Derived Card state

- Current action: first unfinished dated checklist item by ascending due date and then rank; otherwise first unfinished item by rank.
- Next date: current action date, otherwise Card target date.
- Current BIC: current action BIC, otherwise Card fallback BIC.
- Progress: completed checklist rows divided by total checklist rows.
- Overdue: next date earlier than the local calendar date.

## Views

- Dashboard.
- Topic or Status Board.
- Dense List.
- Monthly Calendar based on each Card's derived next date.
- Checklist and BIC Flow.
- Archive and Backups.
- Settings.

## Data safety requirements

- SQLite desktop database.
- Validation before commit.
- Transactional saves.
- Soft completion and archive behavior.
- Manual backup.
- One automatic backup per active day.
- Configurable automatic retention.
- Safety backup before restore.
- Integrity check before restore.
- Full JSON export and validated full-workspace JSON import.
- Safety backup before JSON import replacement.
- CSV and Markdown snapshot export.
- No OneNote migration.

## Distribution requirements

- NSIS setup mode is current user.
- GitHub Actions creates the setup executable on a hosted Windows runner.
- GitHub Actions also creates a portable ZIP and SHA-256 checksums.
- Local no-admin build mode never installs prerequisites or requests elevation.
- Source/build documentation must distinguish normal use from maintainer compilation.
- Running_Task does not bypass company endpoint policy.

Future capabilities are tracked in `docs/ROADMAP.md`.
