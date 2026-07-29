# GitHub upload guide

Target repository: `https://github.com/nachomejiaz/running_tasks.git`  
Target branch for this release candidate: `release/v1.0.0-rc.1`

## Current 1.0.0-rc.1 status

The repository is initialized with build status, release documentation, and a Windows workflow. The complete RC source should be published to `release/v1.0.0-rc.1`. The workflow is configured to build `release/**` branches, so the Windows release-candidate artifact can be tested before the branch is merged into `main`.

## Route A: browser upload — easiest and no local tools

Use the supplied file:

```text
Running_Task-1.0.0-rc.1-github-web-upload.zip
```

1. Download and extract the ZIP to a normal folder.
2. Open the extracted payload folder.
3. Select **everything inside the payload folder**, including `.github`, `frontend`, `src-tauri`, `scripts`, `tests`, `docs`, and all root files. Do **not** upload the outer payload folder itself, or the project will be nested one level too deep.
4. Sign in to GitHub in a browser.
5. Open `nachomejiaz/running_tasks`.
6. Select **Add file**, then **Upload files**.
7. Drag the selected contents into the upload area.
8. Enter the commit message `Build Running_Task 1.0.0 release candidate`.
9. Create or select branch `release/v1.0.0-rc.1`, then commit the upload there. Merge to `main` only after the Windows acceptance gate passes.
10. Open **Actions**. The Windows build starts automatically.

The prepared payload contains fewer than 100 files and no file approaches GitHub's browser-upload size limit. Extract the ZIP first; do not upload the outer ZIP or outer payload folder as the project.

## Route B: no-admin publishing helper

Use this route only when Git for Windows and GitHub CLI are already approved and installed.

1. Extract the repository-ready Running_Task ZIP.
2. Double-click `PUBLISH_TO_GITHUB_NO_ADMIN.bat`.
3. Complete browser sign-in when prompted.
4. Wait for the normal commit and push to finish.
5. Open the repository and then **Actions**.

The helper does not install tools, request elevation, store a token, or force-push. It safely recognizes the existing Running_Task placeholder/source-bundle staging repository.

## Route C: GitHub Desktop

1. Open GitHub Desktop and sign in.
2. Clone `nachomejiaz/running_tasks` to a user-owned folder.
3. Copy the complete Running_Task source into the cloned folder.
4. Remove obsolete `source-bundle` staging folders after the expanded source is present.
5. Do not copy `node_modules`, `src-tauri/target`, `build-logs`, SQLite files, backups, or exports.
6. Review the changed files.
7. Commit with `Build Running_Task 1.0.0 release candidate`.
8. Select **Push origin**.

## Route D: command line

From the repository-ready project folder:

```powershell
git remote set-url origin https://github.com/nachomejiaz/running_tasks.git
git status
git add --all
git commit -m "Build Running_Task 1.0.0 release candidate"
git checkout -B release/v1.0.0-rc.1
git pull --rebase origin release/v1.0.0-rc.1
git push -u origin release/v1.0.0-rc.1
```

When the delivered repository already contains the final commit, `git status` may show nothing to commit. In that case, run only the pull/rebase and push commands. Authenticate through GitHub's browser or credential-manager flow. Never put a token in a source file.

## Route E: another approved computer

When the company PC blocks source upload or Git tools:

1. Transfer the repository-ready ZIP through an approved method.
2. Publish it from an approved development or personal computer.
3. Let GitHub Actions build the Windows files.
4. Download only the finished artifact on the company PC.

## Run and download the Windows build

1. Open **Actions**.
2. Open **Build Running_Task for Windows**.
3. Open the newest successful run, or select **Run workflow** to start one manually.
4. Download the artifact beginning `Running_Task-Windows-`.
5. Extract it.
6. Run the versioned Setup executable or extract the versioned Portable ZIP.

A push to `main`, a push to `release/**`, and a `v*` tag trigger the workflow. A version tag also creates a GitHub release containing the same verified files.

## Repository safety rules

- Never commit SQLite databases, backups, exports, real work records, passwords, or tokens.
- Never force-push through the supplied helper.
- Run `npm run verify` before publishing when developer tools are available.
- Use a tag such as `v1.0.0-rc.1` only after the source commit and Windows Actions build succeed.
- Review every changed file before committing from GitHub Desktop or the command line.
