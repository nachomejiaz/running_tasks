[CmdletBinding()]
param(
    [string]$RepositoryUrl = "https://github.com/nachomejiaz/running_tasks.git",
    [string]$Branch = "release/v1.0.0-rc.1",
    [switch]$SkipToolInstall
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Version = (Get-Content (Join-Path $ProjectRoot "VERSION") -Raw).Trim()
$HadLocalGit = Test-Path (Join-Path $ProjectRoot ".git")
$GitHubProfile = $null

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machine;$user"
}

function Ensure-Command([string]$Command, [string]$WingetId, [string]$FriendlyName) {
    if (Get-Command $Command -ErrorAction SilentlyContinue) { return }

    if ($SkipToolInstall) {
        throw "$FriendlyName is not installed. No-admin publishing mode does not install tools. Install it through an approved company process, use GitHub Desktop, or publish from another computer."
    }

    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "$FriendlyName is not installed, and Windows Package Manager (winget) was not found. Install $FriendlyName, then run this helper again."
    }

    Write-Step "Installing $FriendlyName"
    & winget install --id $WingetId --exact --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw "$FriendlyName installation did not finish successfully." }
    Refresh-Path
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "$FriendlyName was installed but is not available in this terminal yet. Close this window and run PUBLISH_TO_GITHUB.bat again."
    }
}

function Ensure-GitIdentity([string]$WorkingTree) {
    $currentName = (& git -C $WorkingTree config --get user.name 2>$null)
    $currentEmail = (& git -C $WorkingTree config --get user.email 2>$null)
    if (-not [string]::IsNullOrWhiteSpace($currentName) -and -not [string]::IsNullOrWhiteSpace($currentEmail)) { return }

    if ($null -eq $script:GitHubProfile) {
        $script:GitHubProfile = (& gh api user | ConvertFrom-Json)
    }
    if ([string]::IsNullOrWhiteSpace($currentName)) {
        $name = if ([string]::IsNullOrWhiteSpace($script:GitHubProfile.name)) { $script:GitHubProfile.login } else { $script:GitHubProfile.name }
        & git -C $WorkingTree config user.name $name
        if ($LASTEXITCODE -ne 0) { throw "Could not set the Git author name." }
    }
    if ([string]::IsNullOrWhiteSpace($currentEmail)) {
        & git -C $WorkingTree config user.email "$($script:GitHubProfile.id)+$($script:GitHubProfile.login)@users.noreply.github.com"
        if ($LASTEXITCODE -ne 0) { throw "Could not set the Git author email." }
    }
}

function Set-Origin([string]$WorkingTree) {
    $remoteUrl = (& git -C $WorkingTree remote get-url origin 2>$null)
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remoteUrl)) {
        & git -C $WorkingTree remote add origin $RepositoryUrl
    } elseif ($remoteUrl.Trim() -ne $RepositoryUrl) {
        & git -C $WorkingTree remote set-url origin $RepositoryUrl
    }
    if ($LASTEXITCODE -ne 0) { throw "Could not configure the GitHub repository address." }
}

function Copy-Project([string]$Destination) {
    $excludedDirectories = @(
        (Join-Path $ProjectRoot ".git"),
        (Join-Path $ProjectRoot "node_modules"),
        (Join-Path $ProjectRoot "target"),
        (Join-Path $ProjectRoot "src-tauri\target"),
        (Join-Path $ProjectRoot "build-logs")
    )
    $arguments = @(
        $ProjectRoot,
        $Destination,
        "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:2", "/W:1",
        "/NFL", "/NDL", "/NJH", "/NJS", "/NP",
        "/XD"
    ) + $excludedDirectories + @(
        "/XF", "*.sqlite", "*.sqlite-wal", "*.sqlite-shm",
        "Running_Task_Export_*.json", "Running_Task_Export_*.csv", "Running_Task_Export_*.md",
        "compatibility-report.txt"
    )

    & robocopy @arguments | Out-Host
    $robocopyCode = $LASTEXITCODE
    if ($robocopyCode -gt 7) { throw "Could not copy the source into the GitHub staging folder. Robocopy exit code: $robocopyCode" }
}

function Get-RemoteWorkspaceKind([string]$WorkingTree) {
    $entries = @(Get-ChildItem -LiteralPath $WorkingTree -Force | Where-Object { $_.Name -ne ".git" })
    if ($entries.Count -eq 0) { return "empty" }

    $allowedStagingNames = @(
        "VERSION", "source-parts", "source-bundle", "source-bundle-v0.3",
        "README.md", ".github", "RESTORE_SOURCE.bat", "RESTORE_SOURCE.ps1"
    )
    $unexpectedStagingEntries = @($entries | Where-Object { $allowedStagingNames -notcontains $_.Name })
    if ($unexpectedStagingEntries.Count -eq 0) {
        $readmePath = Join-Path $WorkingTree "README.md"
        $readme = if (Test-Path $readmePath) { Get-Content $readmePath -Raw -ErrorAction SilentlyContinue } else { "" }
        $knownPlaceholder = "Repository initialization for the Running_Task local personal-operations application."
        $knownBundle = "rebuildable source bundle"
        $hasBundle = (Test-Path (Join-Path $WorkingTree "source-bundle")) -or (Test-Path (Join-Path $WorkingTree "source-bundle-v0.3"))
        if ($hasBundle -or ($readme -and ($readme.Contains($knownPlaceholder) -or $readme.Contains($knownBundle)))) { return "staging" }
    }

    $looksLikeRunningTask = (
        (Test-Path (Join-Path $WorkingTree "package.json")) -and
        (Test-Path (Join-Path $WorkingTree "frontend")) -and
        (Test-Path (Join-Path $WorkingTree "src-tauri")) -and
        (Test-Path (Join-Path $WorkingTree "README.md"))
    )
    if ($looksLikeRunningTask) { return "running-task" }

    return "unknown"
}

function Clear-TrackedWorkspace([string]$WorkingTree) {
    $trackedFiles = @(& git -C $WorkingTree ls-files)
    if ($LASTEXITCODE -ne 0) { throw "Could not read the existing tracked-file list." }

    foreach ($relativePath in $trackedFiles) {
        if ([string]::IsNullOrWhiteSpace($relativePath)) { continue }
        $fullPath = Join-Path $WorkingTree $relativePath
        if (Test-Path -LiteralPath $fullPath) {
            Remove-Item -LiteralPath $fullPath -Recurse -Force
        }
    }
}

function Commit-IfNeeded([string]$WorkingTree) {
    Ensure-GitIdentity $WorkingTree
    & git -C $WorkingTree add --all
    if ($LASTEXITCODE -ne 0) { throw "Could not stage the project files." }

    & git -C $WorkingTree diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        & git -C $WorkingTree commit -m "Build Running_Task $Version release candidate"
        if ($LASTEXITCODE -ne 0) { throw "Could not create the Git commit." }
        return $true
    }

    Write-Host "No uncommitted source changes were found." -ForegroundColor DarkGray
    return $false
}

function Publish-FromCurrentFolder([bool]$RemoteBranchExists) {
    Write-Step "Preparing the local Git repository"
    if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) {
        & git -C $ProjectRoot init -b $Branch
        if ($LASTEXITCODE -ne 0) { throw "Could not initialize the Git repository." }
    }
    Set-Origin $ProjectRoot
    [void](Commit-IfNeeded $ProjectRoot)

    if ($RemoteBranchExists) {
        Write-Step "Synchronizing with the existing GitHub history"
        & git -C $ProjectRoot pull --rebase origin $Branch
        if ($LASTEXITCODE -ne 0) { throw "Could not rebase the local commit on the GitHub branch. No force push was attempted." }
    }

    Write-Step "Pushing $Branch to GitHub"
    & git -C $ProjectRoot branch -M $Branch
    & git -C $ProjectRoot push --set-upstream origin $Branch
    if ($LASTEXITCODE -ne 0) { throw "GitHub rejected the push. Review the Git message above." }
}

function Publish-ThroughFreshClone {
    $stagingRoot = Join-Path ([IO.Path]::GetTempPath()) ("Running_Task_publish_" + [Guid]::NewGuid().ToString("N"))
    try {
        Write-Step "Cloning the existing GitHub branch into a safe staging folder"
        & git clone --branch $Branch --single-branch -- $RepositoryUrl $stagingRoot
        if ($LASTEXITCODE -ne 0) { throw "Could not clone the existing GitHub repository." }

        $workspaceKind = Get-RemoteWorkspaceKind $stagingRoot
        if ($workspaceKind -eq "unknown") {
            throw "The GitHub repository contains files that do not look like Running_Task or the known initial staging upload. Nothing was changed. Review the repository manually before publishing."
        }

        if ($workspaceKind -eq "staging") {
            Write-Step "Replacing the known incomplete staging upload while preserving Git history"
        } elseif ($workspaceKind -eq "running-task") {
            Write-Step "Updating the existing Running_Task source while preserving Git history"
        } else {
            Write-Step "Preparing the empty GitHub branch"
        }

        Clear-TrackedWorkspace $stagingRoot
        Copy-Project $stagingRoot
        [void](Commit-IfNeeded $stagingRoot)

        Write-Step "Pushing $Branch to GitHub"
        & git -C $stagingRoot push origin $Branch
        if ($LASTEXITCODE -ne 0) { throw "GitHub rejected the push. No force push was attempted." }

        if (-not $HadLocalGit) {
            Write-Step "Linking this source folder to the published GitHub history"
            $destinationGit = Join-Path $ProjectRoot ".git"
            & robocopy (Join-Path $stagingRoot ".git") $destinationGit /E /COPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Host
            if ($LASTEXITCODE -gt 7) { throw "The source was pushed, but local Git metadata could not be copied back. Clone the repository before making the next update." }
        } else {
            Write-Host "The existing local .git folder was left unchanged because its history was not related to GitHub's current branch." -ForegroundColor Yellow
            Write-Host "For future updates, clone the GitHub repository and work from that clone." -ForegroundColor Yellow
        }
    } finally {
        if (Test-Path $stagingRoot) { Remove-Item $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

Set-Location $ProjectRoot
Ensure-Command "git" "Git.Git" "Git for Windows"
Ensure-Command "gh" "GitHub.cli" "GitHub CLI"

Write-Step "Checking GitHub sign-in"
& gh auth status --hostname github.com 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "A browser window will open. Sign in to the GitHub account that owns the repository." -ForegroundColor Yellow
    & gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) { throw "GitHub sign-in was not completed." }
}
& gh auth setup-git
if ($LASTEXITCODE -ne 0) { throw "GitHub could not configure Git authentication." }

Write-Step "Checking the existing repository history"
$remoteMain = (& git ls-remote --heads $RepositoryUrl "refs/heads/$Branch" 2>$null)
if ($LASTEXITCODE -ne 0) { throw "GitHub could not read the repository. Confirm that the signed-in account can access it." }
$remoteBranchExists = -not [string]::IsNullOrWhiteSpace($remoteMain)

$canUseCurrentHistory = -not $remoteBranchExists
if ($remoteBranchExists -and $HadLocalGit) {
    Set-Origin $ProjectRoot
    & git -C $ProjectRoot fetch origin $Branch
    if ($LASTEXITCODE -eq 0) {
        & git -C $ProjectRoot rev-parse --verify HEAD 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            & git -C $ProjectRoot merge-base HEAD "origin/$Branch" 2>$null | Out-Null
            $canUseCurrentHistory = $LASTEXITCODE -eq 0
        }
    }
}

if ($remoteBranchExists -and -not $canUseCurrentHistory) {
    Publish-ThroughFreshClone
} else {
    Publish-FromCurrentFolder $remoteBranchExists
}

Write-Host ""
Write-Host "Running_Task $Version is now published:" -ForegroundColor Green
Write-Host ($RepositoryUrl -replace '\.git$','') -ForegroundColor Green
