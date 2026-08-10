# Running_Task 1.0.0-rc.1 target-PC acceptance checklist

Use a test workspace first. Do not move important work data into the release candidate until the critical section passes.

## A. Build artifact integrity

- [ ] The GitHub Actions run completes successfully on `windows-latest`.
- [ ] The Windows artifact contains Setup, Portable, Company-PC Check, Preview, instructions, checksums, and manifest.
- [ ] The separate lockfile artifact contains `package-lock.json` and `src-tauri/Cargo.lock`.
- [ ] SHA-256 values match the downloaded files.
- [ ] The release manifest identifies current-user installation and `administratorRequiredForInstall: false`.

## B. Company-PC launch and installation

- [ ] Company-PC Check runs without elevation and produces its report.
- [ ] Setup launches without a User Account Control Administrator prompt.
- [ ] Setup completes under the current Windows profile.
- [ ] Start-menu launch opens Running_Task.
- [ ] Portable ZIP launches from a permanent user-owned folder without installation.
- [ ] Windows/company endpoint controls do not block the executable, or the required IT review is documented.

## C. Critical data-safety checks

- [ ] First launch creates the clean General and Personal workspace.
- [ ] Create a uniquely named Topic, Card, and dated checklist item.
- [ ] Type rapidly in Card title, description, notes, and checklist fields.
- [ ] Immediately close the window with the X button and confirm the process exits.
- [ ] Reopen and confirm the final text is present.
- [ ] Top bar reaches `Saved locally` after an edit.
- [ ] Manual backup creates a readable SQLite file in the backup folder.
- [ ] Change a recognizable value, restore the earlier backup, and confirm the older value returns.
- [ ] A `Before_Restore_*.sqlite` safety file exists after restore.
- [ ] JSON export is readable and can be imported into a test workspace.
- [ ] Invalid JSON or broken references are rejected without replacing current data.
- [ ] Closing and restarting several times does not duplicate or lose Cards.

## D. Upgrade protection

- [ ] Place a copy of an older test database (schema 1) in the expected data folder.
- [ ] Launch the new build and confirm the workspace opens and reports schema 2.
- [ ] Confirm a `Before_Upgrade_*.sqlite` backup was created once.
- [ ] Restart and confirm another pre-upgrade backup is not created for the same version.
- [ ] Confirm Cards, checklists, BIC, dates, Archive, and settings remain intact.
- [ ] Confirm the Waiting status still drives the Waiting-On queue after the upgrade.
- [ ] Test a future schema copy and confirm Running_Task refuses to open it without writing starter data.

## E. Process and startup behavior

- [ ] While Running_Task is open, launch it a second time.
- [ ] The existing window receives focus and only one desktop process remains.
- [ ] Enable launch at sign-in, sign out/in or restart, and confirm Running_Task opens.
- [ ] Disable launch at sign-in and confirm it no longer opens automatically.
- [ ] Portable startup registration continues to work only while the executable remains at the registered path.

## F. Core workflow smoke test

- [ ] Create and manage Topics, Subtopics, Card Types, BIC actors, and statuses.
- [ ] Topic-column Board works and optional Status-column Board works.
- [ ] List expands/collapses checklists.
- [ ] Monthly Calendar places Cards on derived next-action dates.
- [ ] Flow displays dated checklist/BIC handoffs.
- [ ] Search and combined filters return expected Cards.
- [ ] Mark Done removes a Card from active views and places it in Archive.
- [ ] Restore from Archive returns the Card to active work.
- [ ] CSV and Markdown exports contain expected fields.

## G. Production decision

Release v1.0.0 when all critical data-safety checks pass, no release-blocking startup or primary-view defect remains, and any company-policy requirement is understood. Cosmetic issues and post-v1.0 feature requests do not block release.
