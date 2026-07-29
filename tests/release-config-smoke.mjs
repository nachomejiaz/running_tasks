import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { root } from "./test-harness.mjs";

const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const tauri = JSON.parse(read("src-tauri/tauri.conf.json"));
const packageJson = JSON.parse(read("package.json"));
const workflow = read(".github/workflows/build-windows.yml");
const noAdminBatch = read("BUILD_WINDOWS_NO_ADMIN.bat");
const maintainerBatch = read("BUILD_WINDOWS_INSTALLER.bat");
const builder = read("scripts/Build-WindowsInstaller.ps1");
const assets = read("scripts/Build-ReleaseAssets.ps1");
const compatibility = read("scripts/Check-CompanyPcCompatibility.ps1");
const publisherNoAdmin = read("PUBLISH_TO_GITHUB_NO_ADMIN.bat");
const noAdminGuide = read("docs/NO_ADMIN_INSTALL.md");
const uploadGuide = read("docs/GITHUB_UPLOAD_GUIDE.md");
const publishHelper = read("scripts/Publish-ToGitHub.ps1");
const launchGuide = read("docs/LAUNCH_GUIDE.md");

assert.equal(packageJson.version, "1.0.0-rc.1");
assert.equal(tauri.version, "1.0.0-rc.1");
assert.equal(tauri.bundle.windows.nsis.installMode, "currentUser");
assert.equal(tauri.bundle.windows.webviewInstallMode.type, "skip");
assert.deepEqual(tauri.bundle.targets, ["nsis"]);

for (const marker of [
  "actions/checkout@v6",
  "actions/setup-node@v6",
  "actions/upload-artifact@v7",
  "actions/download-artifact@v8",
  "Build-ReleaseAssets.ps1",
  "Running_Task-Windows-${{ github.run_number }}",
  "Running_Task-*-Windows-x64-Setup.exe",
  "Running_Task-*-Windows-x64-Portable.zip",
  "Running_Task-*-Company-PC-Check.zip",
  "SHA256SUMS.txt",
  "release-manifest.json",
  "tauri build --bundles nsis",
  "npm run verify",
  "contents: read",
  "contents: write",
  "gh release create"
]) {
  assert.ok(workflow.includes(marker), `Workflow marker missing: ${marker}`);
}
assert.ok(workflow.includes('"release/**"') || workflow.includes("release/**"), "Release branches must trigger the Windows build.");
assert.ok(workflow.includes("package-lock.json"), "The Windows build must retain the generated npm lockfile.");
assert.ok(workflow.includes("src-tauri/Cargo.lock"), "The Windows build must retain the generated Cargo lockfile.");

assert.ok(noAdminBatch.includes("-SkipToolInstall"));
assert.doesNotMatch(noAdminBatch, /Install-BuildTools\.ps1/i);
assert.ok(maintainerBatch.includes("Normal users should NOT run this file"));
assert.ok(builder.includes("No-admin build stopped"));
assert.ok(builder.includes("installMode=currentUser"));
assert.ok(builder.includes("webviewInstallMode=skip"));
assert.ok(builder.includes("Build-ReleaseAssets.ps1"));
assert.ok(assets.includes("administratorRequiredForInstall = $false"));
assert.ok(assets.includes("Company-PC-Check.zip"));
assert.ok(assets.includes("Portable.zip"));
assert.ok(assets.includes("release-manifest.json"));
assert.ok(compatibility.includes("does not install software"));
assert.ok(compatibility.includes("compatibility-report.txt"));
assert.ok(publisherNoAdmin.includes("-SkipToolInstall"));

for (const marker of ["current-user", "Portable", "Administrator", "GitHub Actions", "WebView2"]) {
  assert.ok(noAdminGuide.includes(marker), `No-admin guide marker missing: ${marker}`);
}
for (const marker of ["github-web-upload.zip", "Add file", "Upload files", "PUBLISH_TO_GITHUB_NO_ADMIN.bat", "GitHub Desktop", "Build Running_Task for Windows", "main"]) {
  assert.ok(uploadGuide.includes(marker), `GitHub guide marker missing: ${marker}`);
}
assert.ok(publishHelper.includes("Repository initialization for the Running_Task local personal-operations application."));
for (const marker of ["Running_Task-Windows-", "Company-PC-Check", "CHECK_COMPANY_PC_COMPATIBILITY.bat", "automatic startup"]) {
  assert.ok(launchGuide.includes(marker), `Launch guide marker missing: ${marker}`);
}

const ignoredDirs = new Set([".git", "node_modules", "target", "build-logs"]);
function sourceFiles(directory, relative = "") {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...sourceFiles(full, rel));
    else if (!/\.(sqlite|sqlite-wal|sqlite-shm)$/i.test(entry.name) && !/^Running_Task_Export_/i.test(entry.name)) result.push({ full, rel });
  }
  return result;
}
const browserUploadFiles = sourceFiles(root);
assert.ok(browserUploadFiles.length <= 100, `Browser upload contains ${browserUploadFiles.length} files; GitHub supports at most 100 per upload.`);
for (const file of browserUploadFiles) {
  assert.ok(fs.statSync(file.full).size <= 25 * 1024 * 1024, `${file.rel} exceeds GitHub's 25 MiB browser-upload limit.`);
}

const combined = [workflow, noAdminBatch, maintainerBatch, builder, assets, compatibility, publisherNoAdmin, noAdminGuide, uploadGuide, publishHelper, launchGuide].join("\n");
assert.doesNotMatch(combined, /ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+/);
assert.doesNotMatch(combined, /git[^\r\n]*push[^\r\n]*--force/i);

console.log("PASS no-admin delivery, portable packaging, compatibility check, and GitHub release configuration checks");
