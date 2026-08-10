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
assert.deepEqual(Array.from(persisted), [defaultData().meta.appVersion]);

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

// Undo must survive a run of typing. Before coalescing, every keystroke pushed
// a fresh snapshot and silently discarded the structural change before it.
const undoApp = new RunningTaskApp({});
undoApp.mounted = true;
undoApp.setState = update => {
  const patch = typeof update === "function" ? update(undoApp.state, undoApp.props) : update;
  undoApp.state = { ...undoApp.state, ...patch };
};
undoApp.provider = { desktop: false, save: async () => {} };
undoApp.state = { ...undoApp.state, ready: true, data: defaultData(), loadError: null };

const targetCard = undoApp.state.data.cards[0].id;
const titleBefore = undoApp.state.data.cards.find(c => c.id === targetCard).title;

// A structural change: delete every checklist item on the card.
undoApp.updateData(data => { data.checklistItems = data.checklistItems.filter(i => i.cardId !== targetCard); }, "Checklist cleared.");
const itemsAfterDelete = undoApp.state.data.checklistItems.filter(i => i.cardId === targetCard).length;
assert.equal(itemsAfterDelete, 0);

// Then type into the title, one character at a time.
for (const text of ["A", "Ab", "Abc", "Abcd"]) {
  undoApp.updateCard(targetCard, "title", text);
}
assert.equal(undoApp.state.data.cards.find(c => c.id === targetCard).title, "Abcd");

// The whole typing run collapses into a single undo step.
assert.equal(undoApp.state.undoStack.length, 2, "Four keystrokes should add one undo step, not four.");

undoApp.undoLastChange();
assert.equal(
  undoApp.state.data.cards.find(c => c.id === targetCard).title,
  titleBefore,
  "Undo should discard the entire typing run, not one character."
);
assert.equal(
  undoApp.state.data.checklistItems.filter(i => i.cardId === targetCard).length,
  0,
  "The first undo should only reverse the typing run."
);

// The structural change before the typing is still reachable, which one-level
// undo could never do: the first keystroke used to discard it permanently.
undoApp.undoLastChange();
assert.ok(
  undoApp.state.data.checklistItems.filter(i => i.cardId === targetCard).length > 0,
  "A second undo should reach back past the typing run to the structural change."
);

// A different field starts a new undo group rather than joining the previous run.
undoApp.updateCard(targetCard, "title", "First");
undoApp.updateCard(targetCard, "notes", "Second");
undoApp.undoLastChange();
assert.equal(undoApp.state.data.cards.find(c => c.id === targetCard).title, "First", "Editing a different field should start its own undo step.");

// state.data is replaced, never mutated: the undo snapshot must not alias it.
const aliasApp = new RunningTaskApp({});
aliasApp.mounted = true;
aliasApp.setState = update => {
  const patch = typeof update === "function" ? update(aliasApp.state, aliasApp.props) : update;
  aliasApp.state = { ...aliasApp.state, ...patch };
};
aliasApp.provider = { desktop: false, save: async () => {} };
aliasApp.state = { ...aliasApp.state, ready: true, data: defaultData(), loadError: null };
const aliasCard = aliasApp.state.data.cards[0].id;
const priorityBefore = aliasApp.state.data.cards[0].priority;
aliasApp.updateData(data => { data.cards.find(c => c.id === aliasCard).priority = "Critical"; }, "Priority raised.");
const aliasTop = aliasApp.state.undoStack[aliasApp.state.undoStack.length - 1];
assert.notEqual(aliasTop.data, aliasApp.state.data, "The snapshot must not be the live object.");
assert.equal(aliasTop.data.cards.find(c => c.id === aliasCard).priority, priorityBefore, "The snapshot must retain the pre-edit value.");
assert.equal(aliasApp.state.data.cards.find(c => c.id === aliasCard).priority, "Critical");

// The stack is bounded, so long sessions cannot grow without limit.
const depthApp = new RunningTaskApp({});
depthApp.mounted = true;
depthApp.setState = update => {
  const patch = typeof update === "function" ? update(depthApp.state, depthApp.props) : update;
  depthApp.state = { ...depthApp.state, ...patch };
};
depthApp.provider = { desktop: false, save: async () => {} };
depthApp.state = { ...depthApp.state, ready: true, data: defaultData(), loadError: null };
for (let index = 0; index < 60; index += 1) {
  depthApp.updateData(data => { data.cards[0].rank = index; }, `Step ${index}`);
}
assert.ok(depthApp.state.undoStack.length <= 20, `Undo stack should stay bounded, saw ${depthApp.state.undoStack.length}.`);
assert.ok(depthApp.state.undoStack.length > 1, "Distinct structural changes should each get an undo step.");

console.log("PASS serialized saves, retry retention, undo coalescing, and fail-closed recovery checks");
