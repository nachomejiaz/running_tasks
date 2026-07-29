[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

if ($env:OS -ne "Windows_NT") {
    throw "The Tauri desktop development window is intended to run on Windows for this project."
}

$required = @("node.exe", "npm.cmd", "cargo.exe", "rustc.exe")
$missing = $required | Where-Object { -not (Get-Command $_ -ErrorAction SilentlyContinue) }
if ($missing.Count -gt 0) {
    Write-Host "Development tools are missing. Installing them now..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "Install-BuildTools.ps1")
}

Set-Location $ProjectRoot
& npm.cmd install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
& npm.cmd run dev
if ($LASTEXITCODE -ne 0) { throw "The development application exited with an error." }
