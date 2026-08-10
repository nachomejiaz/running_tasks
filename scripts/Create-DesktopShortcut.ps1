[CmdletBinding()]
param(
    [string]$ExecutablePath = ""
)

$ErrorActionPreference = "Stop"
if ($env:OS -ne "Windows_NT") { throw "This shortcut helper must be run on Windows." }

if ([string]::IsNullOrWhiteSpace($ExecutablePath)) {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Running_Task\Running_Task.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Running_Task\Running_Task.exe"),
        (Join-Path $env:ProgramFiles "Running_Task\Running_Task.exe")
    )
    $ExecutablePath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($ExecutablePath) -or -not (Test-Path $ExecutablePath)) {
    throw "Running_Task.exe was not found. Install the application first, or run this script with -ExecutablePath followed by the full path to Running_Task.exe."
}

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Running_Task.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $ExecutablePath
$shortcut.WorkingDirectory = Split-Path -Parent $ExecutablePath
$shortcut.IconLocation = "$ExecutablePath,0"
$shortcut.Description = "Open the local Running_Task workspace"
$shortcut.Save()

Write-Host "Desktop shortcut created: $shortcutPath" -ForegroundColor Green
