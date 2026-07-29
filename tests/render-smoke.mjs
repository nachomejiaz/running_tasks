import assert from "node:assert/strict";
import { expandReactTree, loadApplication } from "./test-harness.mjs";

const { exports } = loadApplication(["CreateTaskModal", "ImportWorkspaceModal", "workspaceSummary"]);
const { RunningTaskApp, defaultData, CreateTaskModal, ImportWorkspaceModal, workspaceSummary } = exports;
assert.ok(RunningTaskApp, "RunningTaskApp was not available to the render test.");
assert.ok(defaultData, "defaultData was not available to the render test.");
assert.ok(CreateTaskModal, "CreateTaskModal was not available to the render test.");
assert.ok(ImportWorkspaceModal, "ImportWorkspaceModal was not available to the render test.");

const app = new RunningTaskApp({});
const data = defaultData();
const datedCreate = new CreateTaskModal({ data, defaultDate: "2030-05-14" });
assert.equal(datedCreate.state.targetDate, "2030-05-14");
assert.equal(datedCreate.state.nextDueDate, "2030-05-14");
app.state = {
  ...app.state,
  ready: true,
  data,
  storageInfo: { dataPath: "test.sqlite", backupPath: "backups", mode: "Smoke test" },
  backups: [{ id: "test.sqlite", name: "test.sqlite", path: "backups/test.sqlite", createdAt: new Date().toISOString(), sizeBytes: 4096 }]
};

for (const route of ["dashboard", "board", "list", "calendar", "flow", "archive", "settings"]) {
  app.state = { ...app.state, route, createOpen: false, filtersOpen: false, entityDialog: null, drawerCardId: null };
  const stats = expandReactTree(app.render());
  assert.ok(stats.hostElements > 15, `${route} rendered too few host elements (${stats.hostElements}).`);
  assert.ok(stats.components > 2, `${route} rendered too few components (${stats.components}).`);
}

app.state = { ...app.state, route: "board", createOpen: true, filtersOpen: true, drawerCardId: data.cards[0].id, importCandidate: { fileName: "workspace.json", data, summary: workspaceSummary(data), warnings: ["Version normalized."] } };
const overlayStats = expandReactTree(app.render());
assert.ok(overlayStats.hostElements > 100, "Modal/filter/drawer composition did not render the expected UI depth.");

console.log("PASS React render smoke checks for every primary view and overlay");
