import assert from "node:assert/strict";
import { expandReactTree, loadApplication } from "./test-harness.mjs";

const { exports } = loadApplication(["SerializedSaveQueue", "RecoveryScreen"]);
const { SerializedSaveQueue, RecoveryScreen, RunningTaskApp, defaultData } = exports;
assert.ok(SerializedSaveQueue, "SerializedSaveQueue was not exported to the reliability test.");
assert.ok(RecoveryScreen, "RecoveryScreen was not exported to the reliability test.");

// A newer snapshot queued while a save is in flight must be persisted second,
// never overtaken by the older write.
const saved = [];
let releaseFirst;
const firstGate = new Promise(resolve => { releaseFirst = resolve; });
const queue = new SerializedSaveQueue(async value => {
  saved.push(`start-${value.revision}`);
  if (value.revision === 1) await firstGate;
  saved.push(`finish-${value.revision}`);
});
queue.enqueue({ revision: 1 });
const flush = queue.flush();
await Promise.resolve();
queue.enqueue({ revision: 2 });
releaseFirst();
await flush;
assert.deepEqual(saved, ["start-1", "finish-1", "start-2", "finish-2"]);
assert.equal(queue.hasWork(), false);
assert.equal(queue.savedRevision(), 2);

// A failed write remains pending so a user-triggered Retry can save it.
let attempts = 0;
const retryQueue = new SerializedSaveQueue(async value => {
  attempts += 1;
  if (attempts === 1) throw new Error("simulated disk failure");
  assert.equal(value.title, "latest workspace");
});
retryQueue.enqueue({ title: "latest workspace" });
await assert.rejects(retryQueue.flush(), /simulated disk failure/);
assert.equal(retryQueue.hasWork(), true, "Failed workspace snapshot was not retained for retry.");
await retryQueue.flush();
assert.equal(retryQueue.hasWork(), false);
assert.equal(attempts, 2);

// A successful new workspace snapshot is queued and persisted before backup/export.
const saveApp = new RunningTaskApp({});
saveApp.mounted = true;
saveApp.setState = update => {
  const patch = typeof update === "function" ? update(saveApp.state, saveApp.props) : update;
  saveApp.state = { ...saveApp.state, ...patch };
};
const persisted = [];
saveApp.provider = { desktop: false, save: async data => { persisted.push(data.meta.appVersion); } };
saveApp.state = { ...saveApp.state, ready: true, data: defaultData(), loadError: null };
saveApp.scheduleSave();
assert.equal(saveApp.saveQueue.hasWork(), true);
assert.equal(await saveApp.flushPendingSave(true), true);
assert.deepEqual(persisted, ["1.0.0-rc.1"]);

// A desktop load error fails closed and renders recovery instead of starter data.
const app = new RunningTaskApp({});
app.mounted = true;
app.setState = update => {
  const patch = typeof update === "function" ? update(app.state, app.props) : update;
  app.state = { ...app.state, ...patch };
};
app.provider = {
  desktop: true,
  load: async () => { throw new Error("database is locked"); },
  storageInfo: async () => ({ dataPath: "C:/Users/Test/AppData/Local/Running_Task/running-task.sqlite", backupPath: "backups", mode: "SQLite" }),
  openDataFolder: async () => {}
};
const originalConsoleError = console.error;
console.error = () => {};
try { await app.loadWorkspace(); } finally { console.error = originalConsoleError; }
assert.equal(app.state.data, null);
assert.match(app.state.loadError, /database is locked/);
assert.equal(app.saveQueue.hasWork(), false, "Load recovery must not queue replacement starter data.");
const recoveryStats = expandReactTree(app.render());
assert.ok(recoveryStats.hostElements > 8, "Recovery screen did not render enough structure.");

console.log("PASS serialized saves, retry retention, and fail-closed recovery checks");
