import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { root } from "./test-harness.mjs";

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

const displayVersion = read("VERSION").trim();
const packageJson = JSON.parse(read("package.json"));
const tauri = JSON.parse(read("src-tauri/tauri.conf.json"));
const cargo = read("src-tauri/Cargo.toml");
const source = read("frontend/src/app.ts");
const workflow = read(".github/workflows/build-windows.yml");
const buildScript = read("scripts/Build-WindowsInstaller.ps1");
const assetScript = read("scripts/Build-ReleaseAssets.ps1");
const noAdminBuild = read("BUILD_WINDOWS_NO_ADMIN.bat");
const noAdminPublish = read("PUBLISH_TO_GITHUB_NO_ADMIN.bat");

assert.equal(displayVersion, "1.0.0-rc.1");
assert.equal(packageJson.version, displayVersion);
assert.match(source, new RegExp(`APP_VERSION = ["']${displayVersion.replaceAll(".", "\\.")}["']`));
assert.equal(tauri.version, "1.0.0-rc.1");
assert.match(cargo, /\nversion = "1\.0\.0-rc\.1"\n/);
assert.match(cargo, /tauri-plugin-single-instance = "2"/);

assert.equal(tauri.bundle.windows.nsis.installMode, "currentUser");
assert.equal(tauri.bundle.windows.webviewInstallMode.type, "skip");
assert.match(buildScript, /installMode -ne "currentUser"/);
assert.match(buildScript, /-SkipToolInstall|\$SkipToolInstall/);
assert.match(noAdminBuild, /Build-WindowsInstaller\.ps1" -SkipToolInstall/);
assert.match(noAdminPublish, /Publish-ToGitHub\.ps1" -SkipToolInstall/);
assert.doesNotMatch(noAdminBuild, /Install-BuildTools/i);
assert.doesNotMatch(noAdminPublish, /winget install/i);

for (const marker of [
  "Build-ReleaseAssets.ps1",
  "Running_Task-*-Windows-x64-Setup.exe",
  "Running_Task-*-Windows-x64-Portable.zip",
  "Running_Task-*-Company-PC-Check.zip",
  "SHA256SUMS.txt",
  "release-manifest.json",
  "actions/upload-artifact@v7",
  "actions/download-artifact@v8",
  "gh release create"
]) {
  assert.ok(workflow.includes(marker), `GitHub workflow marker missing: ${marker}`);
}

for (const marker of [
  "administratorRequiredForInstall = $false",
  "webView2PreinstalledRequired = $true",
  "Compress-Archive",
  "Get-FileHash",
  "README_FIRST.txt",
  "installerScope = \"currentUser\"",
  "Company-PC-Check.zip",
  "LAUNCH_GUIDE.md"
]) {
  assert.ok(assetScript.includes(marker), `Release asset marker missing: ${marker}`);
}

for (const relative of [
  "docs/LAUNCH_GUIDE.md",
  "docs/GITHUB_UPLOAD_GUIDE.md",
  "docs/NO_ADMIN_INSTALL.md",
  "docs/ROADMAP.md",
  "docs/RELEASE_NOTES_1.0.0-rc.1.md"
]) {
  assert.ok(fs.existsSync(path.join(root, relative)), `Release documentation missing: ${relative}`);
}

assert.ok(packageJson.scripts.verify.includes("test:release"));
assert.ok(packageJson.scripts.verify.includes("test:packaging"));
assert.ok(packageJson.scripts.verify.includes("test:reliability"));
console.log("PASS no-admin packaging, workflow artifacts, release manifest, and version consistency checks");
