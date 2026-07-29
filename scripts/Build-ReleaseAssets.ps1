[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InstallerPath,

    [Parameter(Mandatory = $true)]
    [string]$ExecutablePath,

    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")),
    [string]$OutputDirectory
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $ProjectRoot "release"
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$Version = (Get-Content (Join-Path $ProjectRoot "VERSION") -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($Version)) { throw "VERSION is empty." }
if (-not (Test-Path -LiteralPath $InstallerPath -PathType Leaf)) { throw "Installer not found: $InstallerPath" }
if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) { throw "Desktop executable not found: $ExecutablePath" }

$BaseName = "Running_Task-$Version-Windows-x64"
$SetupPath = Join-Path $OutputDirectory "$BaseName-Setup.exe"
$PortableFolder = Join-Path $OutputDirectory "$BaseName-Portable"
$PortableZip = Join-Path $OutputDirectory "$BaseName-Portable.zip"
$CompatibilityFolder = Join-Path $OutputDirectory "Running_Task-$Version-Company-PC-Check"
$CompatibilityZip = Join-Path $OutputDirectory "Running_Task-$Version-Company-PC-Check.zip"
$PreviewPath = Join-Path $OutputDirectory "Running_Task-$Version-Preview.html"
$StartPath = Join-Path $OutputDirectory "Running_Task-$Version-START_HERE.txt"
$LaunchPath = Join-Path $OutputDirectory "Running_Task-$Version-LAUNCH_GUIDE.md"
$NotesPath = Join-Path $OutputDirectory "Running_Task-$Version-RELEASE_NOTES.md"
$ChecksumPath = Join-Path $OutputDirectory "SHA256SUMS.txt"
$ManifestPath = Join-Path $OutputDirectory "release-manifest.json"

foreach ($temporary in @($PortableFolder, $CompatibilityFolder)) {
    Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
}
foreach ($generated in @($SetupPath, $PortableZip, $CompatibilityZip, $PreviewPath, $StartPath, $LaunchPath, $NotesPath, $ChecksumPath, $ManifestPath)) {
    Remove-Item -LiteralPath $generated -Force -ErrorAction SilentlyContinue
}

Copy-Item -LiteralPath $InstallerPath -Destination $SetupPath -Force

New-Item -ItemType Directory -Path $PortableFolder -Force | Out-Null
Copy-Item -LiteralPath $ExecutablePath -Destination (Join-Path $PortableFolder "Running_Task.exe") -Force
$PortableReadme = @"
RUNNING_TASK PORTABLE - START HERE
==================================
Version: $Version

1. Extract this full ZIP to a permanent folder that you own, for example:
   Documents\Running_Task
2. Double-click Running_Task.exe.
3. Open Settings and choose whether Running_Task should launch when you sign in.
4. Keep the executable in the same folder after enabling automatic startup.

The portable package does not run an installer and does not request Administrator
rights. Running_Task stores the production SQLite workspace under the current
Windows user's local application-data folder, not inside this portable folder.

This release candidate is not code-signed. Do not bypass company policy when Windows or an
endpoint-management product blocks it; ask IT to review or allowlist the build.
"@
Set-Content -LiteralPath (Join-Path $PortableFolder "README_FIRST.txt") -Value $PortableReadme -Encoding UTF8
Copy-Item -LiteralPath (Join-Path $ProjectRoot "VERSION") -Destination (Join-Path $PortableFolder "VERSION.txt") -Force
foreach ($supportFile in @("LICENSE", "THIRD_PARTY_NOTICES.md")) {
    $source = Join-Path $ProjectRoot $supportFile
    if (Test-Path -LiteralPath $source -PathType Leaf) {
        Copy-Item -LiteralPath $source -Destination (Join-Path $PortableFolder $supportFile) -Force
    }
}
Compress-Archive -Path (Join-Path $PortableFolder "*") -DestinationPath $PortableZip -CompressionLevel Optimal -Force
Remove-Item -LiteralPath $PortableFolder -Recurse -Force

New-Item -ItemType Directory -Path (Join-Path $CompatibilityFolder "scripts") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $ProjectRoot "CHECK_COMPANY_PC_COMPATIBILITY.bat") -Destination (Join-Path $CompatibilityFolder "CHECK_COMPANY_PC_COMPATIBILITY.bat") -Force
Copy-Item -LiteralPath (Join-Path $ProjectRoot "scripts\Check-CompanyPcCompatibility.ps1") -Destination (Join-Path $CompatibilityFolder "scripts\Check-CompanyPcCompatibility.ps1") -Force
$CompatibilityReadme = @"
RUNNING_TASK COMPANY-PC CHECK
=============================
Version: $Version

1. Extract this ZIP.
2. Double-click CHECK_COMPANY_PC_COMPATIBILITY.bat.
3. Read the results and keep compatibility-report.txt for IT when needed.

The check does not install software, request elevation, change startup settings,
or disable company security controls.
"@
Set-Content -LiteralPath (Join-Path $CompatibilityFolder "README_FIRST.txt") -Value $CompatibilityReadme -Encoding UTF8
Compress-Archive -Path (Join-Path $CompatibilityFolder "*") -DestinationPath $CompatibilityZip -CompressionLevel Optimal -Force
Remove-Item -LiteralPath $CompatibilityFolder -Recurse -Force

$PreviewSource = Join-Path $ProjectRoot "preview\Running_Task_Preview.html"
if (Test-Path -LiteralPath $PreviewSource -PathType Leaf) {
    Copy-Item -LiteralPath $PreviewSource -Destination $PreviewPath -Force
}
Copy-Item -LiteralPath (Join-Path $ProjectRoot "START_HERE.txt") -Destination $StartPath -Force
Copy-Item -LiteralPath (Join-Path $ProjectRoot "docs\LAUNCH_GUIDE.md") -Destination $LaunchPath -Force
Copy-Item -LiteralPath (Join-Path $ProjectRoot "docs\RELEASE_NOTES_1.0.0-rc.1.md") -Destination $NotesPath -Force

$ReleaseFiles = @($SetupPath, $PortableZip, $CompatibilityZip, $StartPath, $LaunchPath, $NotesPath)
if (Test-Path -LiteralPath $PreviewPath -PathType Leaf) { $ReleaseFiles += $PreviewPath }

$ChecksumLines = foreach ($file in $ReleaseFiles) {
    $hash = Get-FileHash -LiteralPath $file -Algorithm SHA256
    "{0}  {1}" -f $hash.Hash.ToLowerInvariant(), (Split-Path -Leaf $file)
}
Set-Content -LiteralPath $ChecksumPath -Value ($ChecksumLines -join [Environment]::NewLine) -Encoding ASCII

$ManifestFiles = @($ReleaseFiles) + @($ChecksumPath)
$ManifestEntries = @($ManifestFiles | ForEach-Object {
    $item = Get-Item -LiteralPath $_
    [ordered]@{
        name = $item.Name
        sizeBytes = $item.Length
        sha256 = (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLowerInvariant()
    }
})
$Manifest = [ordered]@{
    product = "Running_Task"
    version = $Version
    platform = "windows-x64"
    installerScope = "currentUser"
    administratorRequiredForInstall = $false
    portablePackageAvailable = $true
    webView2PreinstalledRequired = $true
    generatedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    files = $ManifestEntries
}
$Manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

Write-Host "Release assets prepared:" -ForegroundColor Green
foreach ($file in @($SetupPath, $PortableZip, $CompatibilityZip, $PreviewPath, $StartPath, $LaunchPath, $NotesPath, $ChecksumPath, $ManifestPath)) {
    if (Test-Path -LiteralPath $file) { Write-Host "  $file" }
}
