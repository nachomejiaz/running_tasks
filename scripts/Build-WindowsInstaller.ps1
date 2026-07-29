[CmdletBinding()]
param(
    [switch]$SkipToolInstall
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ReleaseDir = Join-Path $ProjectRoot "release"
$LogDir = Join-Path $ProjectRoot "build-logs"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = Join-Path $LogDir "windows-build_$Timestamp.log"
$Version = (Get-Content (Join-Path $ProjectRoot "VERSION") -Raw).Trim()

function Write-Step([string]$Number, [string]$Text) {
    Write-Host ""
    Write-Host "[$Number] $Text" -ForegroundColor Cyan
}

function Refresh-ProcessPath {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $cargo = Join-Path $HOME ".cargo\bin"
    $env:Path = "$machine;$user;$cargo"
}

function Has-Command([string]$Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Has-VcBuildTools {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
    if (-not (Test-Path $vswhere)) { return $false }
    $result = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    return -not [string]::IsNullOrWhiteSpace(($result | Select-Object -First 1))
}

function Find-DesktopExecutable {
    $releaseRoot = Join-Path $ProjectRoot "src-tauri\target\release"
    foreach ($candidateName in @("Running_Task.exe", "running_task.exe")) {
        $candidate = Join-Path $releaseRoot $candidateName
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    $candidate = Get-ChildItem -LiteralPath $releaseRoot -Filter "*.exe" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.DirectoryName -eq $releaseRoot } |
        Sort-Object Length -Descending |
        Select-Object -First 1
    if ($candidate) { return $candidate.FullName }
    return $null
}

if ($env:OS -ne "Windows_NT") {
    throw "The Windows setup executable must be built on Windows or by the included GitHub Actions workflow."
}

New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
Refresh-ProcessPath

Write-Host "Running_Task $Version - Windows release builder" -ForegroundColor Green
Write-Host "Project: $ProjectRoot"
Write-Host "Log:     $LogFile"
if ($SkipToolInstall) {
    Write-Host "Mode:    No-admin local build. Missing tools will NOT be installed." -ForegroundColor Yellow
} else {
    Write-Host "Mode:    Maintainer build. Missing compiler tools may request Administrator approval." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Normal users should download the prebuilt Setup or Portable package from GitHub rather than compile on a company PC." -ForegroundColor DarkGray

Write-Step "1/7" "Checking current-user installer configuration"
$TauriConfig = Get-Content (Join-Path $ProjectRoot "src-tauri\tauri.conf.json") -Raw | ConvertFrom-Json
if ($TauriConfig.bundle.windows.nsis.installMode -ne "currentUser") {
    throw "The NSIS installer must use installMode=currentUser so the finished setup does not require Administrator access."
}
if ($TauriConfig.bundle.windows.webviewInstallMode.type -ne "skip") {
    throw "The no-admin release expects webviewInstallMode=skip so the setup does not launch a prerequisite installer."
}
Write-Host "Verified: current-user installation and no prerequisite installer." -ForegroundColor Green

$missing = @()
if (-not (Has-Command "node.exe")) { $missing += "Node.js" }
if (-not (Has-Command "npm.cmd")) { $missing += "npm" }
if (-not (Has-Command "cargo.exe")) { $missing += "Rust/Cargo" }
if (-not (Has-VcBuildTools)) { $missing += "Visual Studio C++ Build Tools" }

if ($missing.Count -gt 0) {
    Write-Step "2/7" "Build prerequisites are missing"
    Write-Host ("Missing: " + ($missing -join ", ")) -ForegroundColor Yellow
    if ($SkipToolInstall) {
        throw "No-admin build stopped because required developer tools are missing. Nothing was installed. Use the GitHub Actions build, or ask IT to provide the listed developer prerequisites."
    }
    Write-Host "The next step may display a Windows Administrator prompt for Microsoft compiler components." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "Install-BuildTools.ps1")
    Refresh-ProcessPath
} else {
    Write-Step "2/7" "Build prerequisites are already installed"
}

foreach ($required in @("node.exe", "npm.cmd", "cargo.exe", "rustc.exe")) {
    if (-not (Has-Command $required)) {
        throw "$required is still unavailable. Restart Windows and try again, or use the GitHub Actions build."
    }
}
if (-not (Has-VcBuildTools)) {
    throw "Microsoft Visual C++ Build Tools are unavailable. Use GitHub Actions or ask IT to install the C++ build workload."
}

Set-Location $ProjectRoot

Write-Step "3/7" "Installing the declared project build dependencies"
Write-Host "This reads package.json and Cargo.toml. It does not upload your Running_Task workspace data."
if (Test-Path (Join-Path $ProjectRoot "package-lock.json")) {
    & npm.cmd ci --no-audit --no-fund 2>&1 | Tee-Object -FilePath $LogFile -Append | Out-Host
} else {
    & npm.cmd install --no-audit --no-fund 2>&1 | Tee-Object -FilePath $LogFile -Append | Out-Host
}
if ($LASTEXITCODE -ne 0) { throw "npm dependency installation failed. Review $LogFile" }

Write-Step "4/7" "Compiling and testing the source"
& npm.cmd run verify 2>&1 | Tee-Object -FilePath $LogFile -Append | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Application verification failed. Review $LogFile" }

Write-Step "5/7" "Compiling the Windows desktop application"
Write-Host "The first Rust build can take a while because it downloads and compiles desktop libraries."
& npm.cmd exec -- tauri build --bundles nsis 2>&1 | Tee-Object -FilePath $LogFile -Append | Out-Host
if ($LASTEXITCODE -ne 0) { throw "The Windows desktop build failed. Review $LogFile" }

Write-Step "6/7" "Preparing the installer, portable package, compatibility check, preview, and checksums"
$bundleDir = Join-Path $ProjectRoot "src-tauri\target\release\bundle\nsis"
$installer = Get-ChildItem -Path $bundleDir -Filter "*.exe" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $installer) { throw "No NSIS setup executable was found in $bundleDir" }
$desktopExecutable = Find-DesktopExecutable
if (-not $desktopExecutable) { throw "The portable desktop executable could not be found." }
& (Join-Path $PSScriptRoot "Build-ReleaseAssets.ps1") -InstallerPath $installer.FullName -ExecutablePath $desktopExecutable -ProjectRoot $ProjectRoot -OutputDirectory $ReleaseDir

Write-Step "7/7" "Build complete"
Write-Host ""
Write-Host "Open the release folder:" -ForegroundColor Green
Write-Host "  $ReleaseDir"
Write-Host ""
Write-Host "Normal installation:" -ForegroundColor Green
Write-Host "  1. Double-click the file ending in -Setup.exe."
Write-Host "  2. Install for the current user; Running_Task should not request elevation."
Write-Host "  3. Launch Running_Task from the Start menu."
Write-Host ""
Write-Host "Portable launch:" -ForegroundColor Green
Write-Host "  1. Extract the file ending in -Portable.zip."
Write-Host "  2. Double-click Running_Task.exe."
Write-Host ""
Write-Host "Build log: $LogFile"
