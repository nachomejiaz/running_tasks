import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { root } from "./test-harness.mjs";

const requiredFiles = [
  "START_HERE.txt",
  "README.md",
  "USER_GUIDE.md",
  "frontend/dist/index.html",
  "frontend/dist/styles.css",
  "frontend/dist/app.js",
  "frontend/dist/vendor/react.production.min.js",
  "frontend/dist/vendor/react-dom.production.min.js",
  "frontend/dist/vendor/htm.umd.js",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
  "src-tauri/src/lib.rs",
  "BUILD_WINDOWS_INSTALLER.bat",
  "BUILD_WINDOWS_NO_ADMIN.bat",
  "CHECK_COMPANY_PC_COMPATIBILITY.bat",
  "PUBLISH_TO_GITHUB.bat",
  "PUBLISH_TO_GITHUB_NO_ADMIN.bat",
  "scripts/Publish-ToGitHub.ps1",
  "scripts/Check-CompanyPcCompatibility.ps1",
  "docs/NO_ADMIN_INSTALL.md",
  "docs/GITHUB_UPLOAD_GUIDE.md",
  "docs/ROADMAP.md",
  "RUN_BROWSER_PREVIEW.bat",
  "preview/Running_Task_Preview.html"
];
for (const relative of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, relative)), `Required file is missing: ${relative}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync(path.join(root, "src-tauri/tauri.conf.json"), "utf8"));
const capability = JSON.parse(fs.readFileSync(path.join(root, "src-tauri/capabilities/default.json"), "utf8"));
assert.equal(packageJson.name, "running_task");
assert.equal(packageJson.version, "1.0.0-rc.1");
assert.equal(tauriConfig.productName, "Running_Task");
assert.deepEqual(tauriConfig.bundle.targets, ["nsis"]);
assert.equal(tauriConfig.bundle.windows.nsis.installMode, "currentUser");
assert.equal(tauriConfig.build.frontendDist, "../frontend/dist");
assert.ok(capability.permissions.includes("core:default"));

const html = fs.readFileSync(path.join(root, "frontend/dist/index.html"), "utf8");
assert.match(html, /<title>Running_Task<\/title>/);
assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//i, "The production HTML must not load remote assets.");

const singleFilePreview = fs.readFileSync(path.join(root, "preview/Running_Task_Preview.html"), "utf8");
assert.match(singleFilePreview, /<title>Running_Task Preview<\/title>/);
assert.doesNotMatch(singleFilePreview, /(?:src|href)=["']https?:\/\//i);
assert.ok(singleFilePreview.length > 200000, "Self-contained preview appears incomplete.");

const source = fs.readFileSync(path.join(root, "frontend/src/app.ts"), "utf8");
for (const status of ["To Do", "In Progress", "Waiting", "Review", "Done"]) {
  assert.ok(source.includes(`name: "${status}"`), `Default status missing: ${status}`);
}
for (const feature of [
  "Create Task",
  "Archive & Backups",
  'boardAxis: "topic"',
  "Launch when the computer starts",
  "Automatic backup retention",
  "Done tasks move to Archive",
  "Flow",
  "Monthly schedule",
  "Calendar",
  "Import JSON",
  "Export CSV",
  "Export Markdown",
  "Back Up and Import"
]) {
  assert.ok(source.includes(feature), `Expected feature marker missing: ${feature}`);
}
assert.doesNotMatch(source, /html\s*`\s*<>/, "HTM fragments are not supported by the vendored React version.");

const compiled = fs.readFileSync(path.join(root, "frontend/dist/app.js"), "utf8");
new vm.Script(compiled, { filename: "frontend/dist/app.js" });
assert.ok(compiled.length > 60000, "Compiled UI bundle appears unexpectedly small.");

const css = fs.readFileSync(path.join(root, "frontend/dist/styles.css"), "utf8");
for (const selector of [".app-shell", ".board-column", ".task-card", ".drawer", ".flow-row", ".calendar-shell", ".calendar-event", ".archive-card", ".import-modal", ".import-summary-grid"]) {
  assert.ok(css.includes(selector), `Expected UI style missing: ${selector}`);
}
assert.match(css, /--font:\s*"Alliance No\.1",\s*system-ui,/);
assert.match(source, /theme:\s*"dark"/);

const publisher = fs.readFileSync(path.join(root, "scripts/Publish-ToGitHub.ps1"), "utf8");
for (const marker of ["gh auth login", "Publish-ThroughFreshClone", "git clone", "push origin", "No force push was attempted"]) {
  assert.ok(publisher.includes(marker), `Expected GitHub publisher safeguard missing: ${marker}`);
}
assert.doesNotMatch(publisher, /git[^\r\n]*push[^\r\n]*--force/i, "GitHub publisher must never force-push.");
assert.doesNotMatch(publisher, /ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+/, "GitHub publisher must not contain an access token.");

const rust = fs.readFileSync(path.join(root, "src-tauri/src/lib.rs"), "utf8");
for (const marker of [
  "CREATE TABLE IF NOT EXISTS topics",
  "CREATE TABLE IF NOT EXISTS subtopics",
  "CREATE TABLE IF NOT EXISTS cards",
  "CREATE TABLE IF NOT EXISTS checklist_items",
  "PRAGMA journal_mode = WAL",
  "maybe_create_daily_backup",
  "restore_backup",
  "set_autostart",
  "validate_data",
  "VACUUM INTO",
  "export_csv",
  "export_markdown",
  "preflight_existing_schema",
  "prepare_database_for_current_app",
  "Before_Upgrade",
  "tauri_plugin_single_instance"
]) {
  assert.ok(rust.includes(marker), `Expected desktop/backend marker missing: ${marker}`);
}
assert.ok(rust.includes("tauri_plugin_autostart"));
assert.ok(source.includes("SerializedSaveQueue"));
assert.ok(source.includes("RecoveryScreen"));
assert.ok(source.includes("onCloseRequested"));

console.log("PASS frontend/static smoke checks");
