import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { root } from "./test-harness.mjs";

const rust = fs.readFileSync(path.join(root, "src-tauri/src/lib.rs"), "utf8");
const start = rust.indexOf("fn initialize_database");
const end = rust.indexOf("fn put_meta", start);
assert.ok(start >= 0 && end > start, "Could not locate the database initializer.");
const block = rust.slice(start, end);
const match = block.match(/execute_batch\(\s*"([\s\S]*?)"\s*,?\s*\)/);
assert.ok(match, "Could not extract the SQLite schema string.");
const schema = match[1];

const expectedTables = [
  "app_meta",
  "settings",
  "topics",
  "subtopics",
  "card_types",
  "statuses",
  "actors",
  "cards",
  "checklist_items",
  "saved_views"
];
for (const table of expectedTables) {
  assert.ok(schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `Schema is missing table ${table}.`);
}

let sqlite;
try {
  sqlite = await import("node:sqlite");
} catch (_error) {
  console.log("SKIP live SQLite schema execution: this Node.js version does not provide node:sqlite");
  process.exit(0);
}

const database = new sqlite.DatabaseSync(":memory:");
try {
  database.exec(schema);
  const rows = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
  const names = new Set(rows.map(row => String(row.name)));
  for (const table of expectedTables) assert.ok(names.has(table), `SQLite did not create table ${table}.`);
  const integrity = database.prepare("PRAGMA integrity_check").get();
  assert.equal(String(integrity.integrity_check).toLowerCase(), "ok");
} finally {
  database.close();
}

console.log("PASS SQLite schema executes and creates all expected tables");
