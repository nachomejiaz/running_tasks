# GitHub Upload and Build Guide

Approved repository:

```text
https://github.com/nachomejiaz/running_tasks.git
```

## Current publication status

The connected GitHub integration can write repository text files, and the 0.3.0-alpha.3 version, roadmap, launch guide, release notes, and validation status are now stored on `main`.

The full source package is delivered separately as:

- `Running_Task-0.3.0-alpha.3-source.zip`
- `Running_Task-0.3.0-alpha.3-repository.zip`
- `Running_Task-0.3.0-alpha.3-repository.bundle`

The repository-ready ZIP is the easiest path because it already contains the complete source, Git history, and configured GitHub remote.

## Easiest full-source upload

1. Download `Running_Task-0.3.0-alpha.3-repository.zip` from the build handoff.
2. Extract the entire ZIP to a normal Windows folder.
3. Open the extracted `Running_Task-0.3.0-alpha.3` folder.
4. Double-click `PUBLISH_TO_GITHUB_NO_ADMIN.bat` when Git for Windows and GitHub CLI are already installed for your user.
5. Complete the browser sign-in when requested.
6. Wait for the normal commit and push to finish.

This no-admin route never installs Git or GitHub CLI, never stores a token in the project, and never force-pushes. It stops with a clear message if either command is missing.

## Maintainer upload helper

`PUBLISH_TO_GITHUB.bat` can install Git for Windows or GitHub CLI through `winget` when they are missing. That may be restricted or require approval on a company PC. Use it only on an approved development computer.

## Standard command-line route

From an extracted repository-ready ZIP:

```powershell
git status
git remote -v
git pull --rebase origin main
git push -u origin main
```

When publishing from a plain source ZIP rather than the repository-ready ZIP:

```powershell
git clone https://github.com/nachomejiaz/running_tasks.git Running_Task
# Copy the source files into the clone, preserving .git
git add --all
git commit -m "Publish Running_Task 0.3.0-alpha.3"
git pull --rebase origin main
git push origin main
```

Do not force-push. Do not put a personal access token in a source file.

## Run the Windows build in GitHub

After the complete source tree and `.github/workflows/build-windows.yml` are on `main`:

1. Open the repository.
2. Select **Actions**.
3. Select **Build Running_Task for Windows**.
4. Select **Run workflow**.
5. Choose `main` and start the run.
6. Wait for all steps to turn green.
7. Open the completed run.
8. Download the `Running_Task-Windows-...` artifact.
9. Extract it before launching the Setup or Portable ZIP.

A successful artifact contains:

- Current-user Setup executable.
- Portable ZIP.
- Self-contained preview.
- SHA-256 checksums.
- JSON release manifest.

## Publish a tagged release

From an approved Git environment:

```powershell
git tag v0.3.0-alpha.3
git push origin v0.3.0-alpha.3
```

The tag starts the Windows workflow. When successful, it creates a GitHub Release and attaches the ready-to-use files.

## Files that must never be uploaded

The source `.gitignore` excludes common runtime and private data, including:

- SQLite databases and WAL files.
- Personal exports.
- Build logs.
- Rust compiler output.
- Locally generated release binaries.

Before every push, review `git status` and confirm that no personal workspace data appears.
