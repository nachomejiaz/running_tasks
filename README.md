# Running_Task

Running_Task is a private, local personal operations board for Windows. It combines dense task tracking with Jira-style cards, filters, Board/List/Calendar/Flow views, nested checklists, due dates, and Ball in Court ownership.

Current source stage: **1.1.0**.

## Install or launch without Administrator rights

Normal users should not compile the application on a company PC.

The GitHub Actions workflow creates one download named `Running_Task-Windows-<run number>`. After extracting it, choose one of these files:

- `Running_Task-<version>-Windows-x64-Setup.exe` — preferred current-user installer.
- `Running_Task-<version>-Windows-x64-Portable.zip` — no-installer fallback.
- `Running_Task-<version>-Company-PC-Check.zip` — optional compatibility check.
- `Running_Task-<version>-Preview.html` — browser-only interface review.

The setup uses NSIS `currentUser` mode and is intended to install below the current Windows profile without an Administrator prompt. The installer intentionally skips WebView2 installation, so WebView2 must already exist on the PC. Company application-control policy can still block unsigned or unapproved software; Running_Task does not bypass those controls.

Start with [START_HERE.txt](START_HERE.txt) or the [Launch guide](docs/LAUNCH_GUIDE.md).

## Product model

```text
Workspace
  -> Topic
     -> optional Subtopic
        -> Card
           -> nested Checklist items
```

Card Type is independent from Subtopic. For example, `RFI` can be a Subtopic containing many Cards, while an individual Card can also have Card Type `RFI`.

Default active statuses are To Do, In Progress, Waiting, Review, and Done. Done and manually archived Cards disappear from active workspaces and remain available in Archive.

## Main views

- Dashboard with overdue, My Ball, waiting, upcoming, and Topic queues.
- Board with Topic columns by default and optional Status columns.
- Dense List with expandable checklists.
- Monthly Calendar placing every dated checklist step on its own date.
- Flow showing dated checklist and BIC handoffs.
- Archive & Backups for completed work, restore, import, export, and local data safety.
- Settings for hierarchy, Card Types, statuses, BIC actors, appearance, startup, and backups.

## Data portability in the production baseline

Archive & Backups supports:

- Full JSON export.
- Validated JSON import with review and a safety backup before replacement.
- CSV export with one row per Card/checklist item.
- Markdown export grouped by Topic.
- SQLite backup, integrity-checked restore, and automatic daily retention.

JSON is the supported round-trip workspace format. CSV and Markdown are snapshots.

## Local storage and privacy

The desktop application stores its SQLite database, backups, exports, and logs below the current user's local application-data directory. The exact folder can be opened from Archive & Backups.

The current design uses SQLite foreign keys, WAL journaling, transactional saves, validation before commit, automatic daily backups, and safety backups before restore or import. It has no account, advertising, analytics, cloud synchronization, or required network connection after installation.

## Automatic startup

Running_Task attempts to enable launch at Windows sign-in on first desktop launch. Change the setting at any time in Settings. For the portable build, put the extracted application in a permanent folder before enabling startup. Company policy may block startup registration without blocking manual launch.

## Build and verification

### Recommended: GitHub Actions

A push to `main`, a manual workflow run, or a `v*` tag starts `.github/workflows/build-windows.yml`. The workflow verifies the source on a GitHub-hosted Windows runner, creates the current-user setup, portable package, company-PC check, preview, checksums, and manifest, then uploads them as one artifact. A version tag also creates a GitHub release.

### Local no-admin build

`BUILD_WINDOWS_NO_ADMIN.bat` never installs prerequisites or requests elevation. It succeeds only when Node.js, Rust/Cargo, and Microsoft C++ Build Tools are already present.

### Maintainer build

`BUILD_WINDOWS_INSTALLER.bat` can offer to install missing developer prerequisites and may therefore require Administrator approval. It is not part of normal installation.

### Source verification

```powershell
npm install --no-audit --no-fund
npm run verify
```

Verification covers TypeScript compilation, preview generation, JavaScript syntax, live SQLite schema execution, next-action/BIC/Calendar/Archive/import/export domain rules, recursive UI rendering, no-admin configuration, portable packaging, GitHub Actions, and release metadata.

## GitHub publishing

The approved repository is `nachomejiaz/running_tasks`. It is initialized with the 1.1.0 build status, release documentation, and Windows workflow. Use the supplied repository package or GitHub synchronization process to publish the complete `1.1.0` source tree. After extraction, open the payload folder and upload the **contents inside it** to the repository root—not the outer payload folder itself. A commit to `release/v1.1.0` starts the verified Windows artifact workflow; merge to `main` after target-PC acceptance. See the [GitHub upload guide](docs/GITHUB_UPLOAD_GUIDE.md).

The browser upload route requires no local Git installation or Administrator rights. GitHub Desktop and the no-admin `PUBLISH_TO_GITHUB_NO_ADMIN.bat` helper remain alternatives when those tools are already approved. None of the supplied helpers stores a token or force-pushes.

## Documentation

- [START_HERE.txt](START_HERE.txt) — shortest launch instructions.
- [Launch guide](docs/LAUNCH_GUIDE.md) — setup, portable, preview, startup, and first-run checks.
- [USER_GUIDE.md](USER_GUIDE.md) — product workflows.
- [No-admin installation](docs/NO_ADMIN_INSTALL.md) — company-PC options and limitations.
- [GitHub upload guide](docs/GITHUB_UPLOAD_GUIDE.md) — browser, helper, Desktop, and command-line routes.
- [Roadmap](docs/ROADMAP.md) — remaining builds and test gates.
- [Build and release](docs/BUILD_AND_RELEASE.md) — maintainer and CI details.
- [Data and backups](docs/DATA_AND_BACKUPS.md) — storage, import/export, backup, and recovery.
- [Acceptance tests](docs/ACCEPTANCE_TESTS.md) — release review checklist.
- [Known limitations](docs/KNOWN_LIMITATIONS.md) — current release-candidate boundaries.
- [Release notes](docs/RELEASE_NOTES_1.1.0.md) — changes in this build.
