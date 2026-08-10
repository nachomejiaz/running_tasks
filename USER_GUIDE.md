# Running_Task User Guide

## 1. The screen at a glance

The application has three permanent areas:

- **Top bar:** global search, undo, filters, view selection, save state, and the blue **Create Task** button.
- **Left sidebar:** Dashboard, smart queues, Topics, saved views, Archive & Backups, and Settings.
- **Main workspace:** Dashboard, Board, List, Calendar, Flow, Archive, or Settings.

Selecting a task opens a detail drawer on the right while keeping the surrounding workspace visible.

## 2. Create a task

1. Click **Create Task** in the top-right area, or press `N` while no text field is active.
2. Enter a title. This is the only required user-entered value.
3. Pick a Topic.
4. Optionally pick a Subtopic, Card Type, reference, status, priority, target date, and BIC.
5. Add a short description.
6. Click **Create Task**.
7. Open the new card to add checklist items.

A task may sit directly inside a Topic. A Subtopic is optional.

## 3. Work with Topics and Subtopics

A Topic is a main board container such as `General`, `Personal`, `Package A - Structure`, or `Area 14`.

A Subtopic is a section inside one Topic, such as `RFI`, `PCO`, `Procurement`, `Onboarding`, or `CM`.

To add or edit them:

1. Open **Settings**.
2. Use the Topics or Subtopics section.
3. Give the item a name and color.
4. For a Subtopic, choose its parent Topic.

The default Board uses one column per active Topic and groups cards inside that column by Subtopic.

## 4. Open and edit a task card

Click a card or a List row. The detail drawer contains:

- Identity: Topic, Subtopic, Card Type, reference, title, and description.
- Workflow: status and priority.
- Planning: overall target date and fallback BIC.
- Checklist: dated actions and BIC assignments.
- Notes and task actions.

Changes save automatically after a short delay. The top bar shows `Saving`, `Saved locally`, or `Save failed`.

## 5. Add checklist items

1. Open a task.
2. Go to its Checklist section.
3. Click **Add checklist item**.
4. Enter the action title.
5. Add a due date and BIC as needed.
6. Use indent/outdent controls to create or remove nesting.
7. Check the box when the action is complete.

The task's displayed next date and BIC come from the next unfinished checklist item. Completing that item advances the card automatically.

## 6. Understand the dates

Running_Task distinguishes two dates:

- **Next date:** derived from the earliest dated unfinished checklist item.
- **Target date:** an optional overall deadline for the full task.

When there is no dated unfinished checklist item, Running_Task still shows the first unfinished action. When there are no unfinished checklist items, it falls back to the task-level target date and BIC.

Date emphasis:

- Overdue actions are marked as overdue.
- Today's actions are highlighted.
- Undated work appears in the **No Date** queue.

## 7. Understand Ball in Court

Ball in Court identifies the person, company, team, or role responsible for the next action.

Examples:

- `Me`
- `Trade Partner`
- `General Contractor`
- `Architect`
- `Owner`

Use **Settings -> BIC Actors** to add and edit entries. The **My Ball** queue uses the actor selected as `Me` in application settings. The **Waiting On** queue shows cards whose current BIC is someone else.

## 8. Board view

The default Board has Topic columns. Within a Topic, cards are grouped by Subtopic.

Use the Board to:

- Scan active work by Topic.
- Expand or collapse a card's checklist.
- Drag a card into another Topic column.
- Create a task directly in a column.
- Switch the column axis to Status.
- Filter cards without changing the stored data.

Open **Settings -> Board columns** to make Topic or Status the default.

In Status-column mode, `Done` is not shown as an active column. Completing a task sends it to Archive.

## 9. List view

List view is the dense replacement for the old OneNote running-task page.

It provides sortable, scannable rows with:

- Task and reference.
- Topic and Subtopic.
- Status.
- Next date.
- Current BIC.
- Checklist progress.
- Priority.

Expand a row to work with its checklist without opening the full drawer.

## 10. Calendar view

Calendar view places every active task on its **derived next date**. This is the earliest dated unfinished checklist item; the task-level target date is used only when no unfinished checklist item has a date.

Use the monthly Calendar to:

- See scheduled work across Topics in one date grid.
- Move between months with the arrow buttons.
- Return to the current month with **Today**.
- Open any task by clicking its calendar card.
- Click the **+** in a day cell to create a task with that date prefilled for both its target date and first next-action date.
- Open the **Unscheduled** queue for active tasks without a derived or target date.
- Apply the same Topic scope, search, BIC, status, priority, and due-window filters used by other active views.

The Calendar starts on Monday and always renders six complete weeks so month-to-month navigation does not shift the overall layout.

## 11. Flow view

Flow view displays unfinished checklist actions as chronological handoff nodes for each card. It helps answer:

- Where is the ball now?
- Who receives it next?
- Which handoff is overdue?
- Which tasks have missing dates?

The first open node is the current action. Later nodes show the expected sequence.

## 12. Dashboard and smart queues

The Dashboard focuses on action rather than decorative reporting. Sidebar queues include:

- **Today** — next actions due today.
- **Overdue** — next actions before today.
- **My Ball** — current action assigned to your `Me` actor.
- **Waiting On** — current action assigned to another actor.
- **No Date** — active tasks without a derived or target date.

Click a queue to scope the List view.

## 13. Search and filters

The global search checks task title, reference, description, notes, tags, checklist text, Topic, Subtopic, Card Type, and BIC names.

Press `/` or `Ctrl+K` to focus search.

Filters include:

- Status.
- BIC.
- Due-date window.
- Priority.
- Topic through sidebar selection.
- Smart queue scope.

A filtered configuration can be saved as a named view and pinned to the sidebar.

## 14. Complete, archive, restore, and delete

### Mark Done

1. Open the task.
2. Click **Mark Done**.
3. The task receives the terminal Done status.
4. It disappears from active workspaces.
5. It remains in **Archive & Backups**.

### Archive without completing

Use **Archive** in the task drawer. Running_Task remembers the last active status.

### Restore

1. Open **Archive & Backups**.
2. Find the task.
3. Click **Restore**.
4. Running_Task returns it to its previous active status when possible, otherwise To Do.

### Permanently delete

Use the trash button in Archive. Permanent deletion removes the card and its checklist from current data. Create a manual backup first when the record might be needed later.

## 15. Backups, import, and export

Open **Archive & Backups** to:

- Create a manual SQLite backup.
- Review, restore, or delete available backups.
- Export a complete JSON workspace.
- Import a complete JSON workspace after validation and review.
- Export a flattened CSV snapshot for Excel.
- Export a human-readable Markdown snapshot.
- Open the local data folder in the desktop application.

The desktop application creates one automatic SQLite backup on each active day when data is successfully changed. Automatic retention defaults to 14. Manual and pre-restore backups are not automatically pruned.

Restoring a backup replaces the complete workspace. Running_Task validates the selected database and creates a safety backup first.

JSON import also replaces the complete workspace. Before replacement, Running_Task validates the file, shows record counts and warnings, saves the current workspace, and creates a safety backup. CSV and Markdown are export-only formats.

## 16. Settings

Settings currently cover:

- Board columns: Topic or Status.
- Startup launch.
- Theme: light, dark, or system.
- Density: comfortable or compact.
- Description visibility.
- Automatic-backup retention.
- Topics and Subtopics.
- BIC actors.
- Card Types.
- Statuses.

At least one terminal status must exist. The included terminal status is Done.

## 17. Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `N` | Create a task |
| `/` | Focus global search |
| `Ctrl+K` | Focus global search |
| `Ctrl+Z` | Undo the latest in-session data change |
| `Esc` | Close the topmost filter, dialog, task creator, or drawer |

Shortcuts do not activate while typing into a text box, date field, or selector.

## 18. Installation and startup behavior

The preferred company-PC delivery is a prebuilt current-user setup executable from GitHub Actions. The installer is configured not to request Administrator rights. A portable no-install ZIP is also available.

The installed desktop application has **Launch when the computer starts** enabled by default. Running_Task registers the current executable for the current Windows user on first launch. Disable the setting when automatic startup is not desired.

For the portable build, keep its folder in a permanent location before enabling startup. Moving the executable later can leave the startup registration pointing to the old path.

Company security controls can block setup execution, portable execution, WebView2, or startup registration. Running_Task does not bypass those controls and continues to work manually when only startup registration is blocked.

Run `CHECK_COMPANY_PC_COMPATIBILITY.bat` to create a no-change report for IT review.

## 19. Browser preview warning

The browser preview is for interface review. It uses that browser profile's local storage and browser-local JSON backups. It does not use the SQLite database, Windows startup registration, or native data-folder commands. Do not assume preview data will appear in the installed desktop application.
