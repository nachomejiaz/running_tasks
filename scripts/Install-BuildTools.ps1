[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

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

if ($env:OS -ne "Windows_NT") {
    throw "This helper installs the Windows build tools and must be run on Windows 10 or Windows 11."
}

Write-Host "Running_Task - Windows build tools setup" -ForegroundColor Green
Write-Host "This prepares this PC to build the local desktop installer from source."
Write-Host "It does not upload task data or install the Running_Task application itself."

Write-Step "1/5" "Checking Windows Package Manager (winget)"
if (-not (Has-Command "winget.exe")) {
    throw @"
Windows Package Manager (winget) was not found.
Open Microsoft Store, install or update 'App Installer', restart this window, and run INSTALL_BUILD_TOOLS.bat again.
On a managed work laptop, your IT department may need to perform this step.
"@
}
winget.exe source update | Out-Host

Write-Step "2/5" "Installing Node.js LTS"
winget.exe install --id OpenJS.NodeJS.LTS --exact --accept-source-agreements --accept-package-agreements --silent

Write-Step "3/5" "Installing Rustup and the Rust compiler"
winget.exe install --id Rustlang.Rustup --exact --accept-source-agreements --accept-package-agreements --silent

Write-Step "4/5" "Installing Microsoft Visual Studio C++ Build Tools"
Write-Host "Windows may ask for administrator approval. This is the largest installation and can take several minutes."
winget.exe install --id Microsoft.VisualStudio.2022.BuildTools --exact --accept-source-agreements --accept-package-agreements --override "--wait --passive --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"

Refresh-ProcessPath

Write-Step "5/5" "Finishing the Rust toolchain"
if (-not (Has-Command "rustup.exe")) {
    throw "Rustup was installed but is not visible yet. Restart Windows, then run INSTALL_BUILD_TOOLS.bat again."
}
rustup.exe toolchain install stable-x86_64-pc-windows-msvc --profile minimal
rustup.exe default stable-x86_64-pc-windows-msvc

Refresh-ProcessPath

Write-Host ""
Write-Host "Installed tool versions:" -ForegroundColor Green
if (Has-Command "node.exe") { node.exe --version | ForEach-Object { Write-Host "  Node.js: $_" } }
if (Has-Command "npm.cmd") { npm.cmd --version | ForEach-Object { Write-Host "  npm:     $_" } }
if (Has-Command "rustc.exe") { rustc.exe --version | ForEach-Object { Write-Host "  Rust:    $_" } }
if (Has-Command "cargo.exe") { cargo.exe --version | ForEach-Object { Write-Host "  Cargo:   $_" } }

Write-Host ""
Write-Host "Build tools are ready." -ForegroundColor Green
Write-Host "Next: double-click BUILD_WINDOWS_INSTALLER.bat in the project folder."
