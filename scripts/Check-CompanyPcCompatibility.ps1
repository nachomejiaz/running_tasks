[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ReportPath = Join-Path $ProjectRoot "compatibility-report.txt"
$Lines = New-Object System.Collections.Generic.List[string]
$Failures = 0
$Warnings = 0

function Add-Result([string]$Name, [string]$State, [string]$Detail) {
    $script:Lines.Add(("{0,-34} {1,-8} {2}" -f $Name, $State, $Detail))
    if ($State -eq "FAIL") { $script:Failures++ }
    if ($State -eq "WARN") { $script:Warnings++ }
}

$Lines.Add("Running_Task company-PC compatibility report")
$Lines.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
$Lines.Add("This check does not install software, request elevation, or change startup settings.")
$Lines.Add("")

if ($env:OS -eq "Windows_NT") {
    Add-Result "Windows operating system" "PASS" ([Environment]::OSVersion.VersionString)
} else {
    Add-Result "Windows operating system" "FAIL" "Running_Task desktop packaging targets Windows."
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Add-Result "Administrator session" "INFO" $(if ($isAdmin) { "Elevated, but elevation is not required for the prebuilt current-user setup." } else { "Standard user session detected, which is the intended install mode." })

if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
    Add-Result "LOCALAPPDATA available" "FAIL" "Windows did not provide a local application-data folder."
} else {
    try {
        $probeRoot = Join-Path $env:LOCALAPPDATA "Running_Task_Compatibility_Probe"
        New-Item -ItemType Directory -Path $probeRoot -Force | Out-Null
        $probe = Join-Path $probeRoot "write-test.txt"
        Set-Content -Path $probe -Value "Running_Task write test" -Encoding UTF8
        Remove-Item $probe -Force
        Remove-Item $probeRoot -Force
        Add-Result "Local data folder writable" "PASS" $env:LOCALAPPDATA
    } catch {
        Add-Result "Local data folder writable" "FAIL" $_.Exception.Message
    }
}

$webViewPaths = @(
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\EdgeWebView\Application"),
    (Join-Path $env:ProgramFiles "Microsoft\EdgeWebView\Application"),
    (Join-Path $env:LOCALAPPDATA "Microsoft\EdgeWebView\Application")
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
$webView = $webViewPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($webView) {
    Add-Result "Microsoft Edge WebView2" "PASS" $webView
} else {
    Add-Result "Microsoft Edge WebView2" "WARN" "Not detected in common locations. The installer may be blocked from obtaining it; IT may need to provide the runtime."
}

try {
    $startupKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    if (Test-Path $startupKey) {
        Add-Result "Current-user startup registry" "PASS" "Readable. Running_Task will attempt to register here through the Tauri autostart plugin."
    } else {
        Add-Result "Current-user startup registry" "WARN" "The expected HKCU startup key was not found. Company policy may control startup applications."
    }
} catch {
    Add-Result "Current-user startup registry" "WARN" $_.Exception.Message
}

$downloadFolder = Join-Path $HOME "Downloads"
if (Test-Path $downloadFolder) {
    Add-Result "Downloads folder" "PASS" $downloadFolder
} else {
    Add-Result "Downloads folder" "WARN" "A standard Downloads folder was not detected."
}

try {
    $policy = Get-ExecutionPolicy -Scope CurrentUser
    Add-Result "PowerShell current-user policy" "INFO" $policy
} catch {
    Add-Result "PowerShell current-user policy" "INFO" "Could not read: $($_.Exception.Message)"
}

$Lines.Add("")
$Lines.Add("Summary: $Failures failure(s), $Warnings warning(s).")
$Lines.Add("PASS means the local prerequisite was detected. WARN does not necessarily prevent use.")
$Lines.Add("Company application-control systems can still block unsigned software even when no Administrator rights are requested.")
$Lines.Add("Recommended normal-user route: download the GitHub Actions installer artifact and run Running_Task-Setup.exe.")
$Lines.Add("Fallback route: download the portable ZIP, extract it to a permanent user-owned folder, and run Running_Task.exe.")

$Lines | Set-Content -Path $ReportPath -Encoding UTF8
$Lines | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "Report saved to: $ReportPath" -ForegroundColor Cyan

if ($Failures -gt 0) { exit 1 }
exit 0
