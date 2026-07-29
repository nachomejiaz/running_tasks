import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { expandReactTree, loadApplication, root } from "./test-harness.mjs";

const requestedExports = ["CreateTaskModal", "ImportWorkspaceModal", "workspaceSummary"];
const { exports } = loadApplication(requestedExports);
const { RunningTaskApp, defaultData, CreateTaskModal, ImportWorkspaceModal, workspaceSummary } = exports;
const availableExports = Object.entries(exports)
  .filter(([, value]) => value !== undefined)
  .map(([name]) => name)
  .sort();

function requireExport(name, value) {
  assert.ok(
    value,
    `${name} was not available to the render test. Available exports: ${availableExports.join(", ") || "none"}.`
  );
}

requireExport("RunningTaskApp", RunningTaskApp);
requireExport("defaultData", defaultData);
requireExport("CreateTaskModal", CreateTaskModal);
requireExport("ImportWorkspaceModal", ImportWorkspaceModal);
requireExport("workspaceSummary", workspaceSummary);

const appBundle = path.join(root, "frontend", "dist", "app.js");
const bundleSize = fs.statSync(appBundle).size;
console.log(
  `render-smoke: node=${process.version} platform=${process.platform} arch=${process.arch} appBundleBytes=${bundleSize} exports=${availableExports.join(",")}`
);

const app = new RunningTaskApp({});
const data = defaultData();
const datedCreate = new CreateTaskModal({ data, defaultDate: "2030-05-14" });
console.log(
  `render-smoke: create-modal targetDate=${JSON.stringify(datedCreate.state.targetDate)} nextDueDate=${JSON.stringify(datedCreate.state.nextDueDate)}`
);
assert.equal(
  datedCreate.state.targetDate,
  "2030-05-14",
  `CreateTaskModal target date prefill changed: ${JSON.stringify(datedCreate.state.targetDate)}.`
);
assert.equal(
  datedCreate.state.nextDueDate,
  "2030-05-14",
  `CreateTaskModal first-checklist date prefill changed: ${JSON.stringify(datedCreate.state.nextDueDate)}.`
);

app.state = {
  ...app.state,
  ready: true,
  data,
  storageInfo: { dataPath: "test.sqlite", backupPath: "backups", mode: "Smoke test" },
  backups: [{ id: "test.sqlite", name: "test.sqlite", path: "backups/test.sqlite", createdAt: new Date().toISOString(), sizeBytes: 4096 }]
};

function inspectRender(label, render, minimums = { nodes: 20, hostElements: 16, components: 3 }) {
  let stats;
  try {
    stats = expandReactTree(render());
  } catch (error) {
    console.error(`render-smoke: ${label} threw while expanding the React tree.`);
    console.error(error);
    throw error;
  }

  console.log(
    `render-smoke: ${label} nodes=${stats.nodes} hostElements=${stats.hostElements} components=${stats.components}`
  );

  try {
    assert.ok(
      stats.nodes >= minimums.nodes,
      `${label} rendered too few total nodes (${stats.nodes}; expected at least ${minimums.nodes}).`
    );
    assert.ok(
      stats.hostElements >= minimums.hostElements,
      `${label} rendered too few host elements (${stats.hostElements}; expected at least ${minimums.hostElements}).`
    );
    assert.ok(
      stats.components >= minimums.components,
      `${label} rendered too few components (${stats.components}; expected at least ${minimums.components}).`
    );
  } catch (error) {
    console.error(`render-smoke: detailed stats for ${label}: ${JSON.stringify(stats, null, 2)}`);
    console.error(
      `render-smoke: route=${JSON.stringify(app.state.route)} ready=${app.state.ready} cards=${app.state.data?.cards?.length ?? "unavailable"}`
    );
    throw error;
  }

  return stats;
}

for (const route of ["dashboard", "board", "list", "calendar", "flow", "archive", "settings"]) {
  app.state = { ...app.state, route, createOpen: false, filtersOpen: false, entityDialog: null, drawerCardId: null };
  inspectRender(`route=${route}`, () => app.render());
}

app.state = {
  ...app.state,
  route: "board",
  createOpen: true,
  filtersOpen: true,
  drawerCardId: data.cards[0].id,
  importCandidate: {
    fileName: "workspace.json",
    data,
    summary: workspaceSummary(data),
    warnings: ["Version normalized."]
  }
};
inspectRender("overlay-composition", () => app.render(), { nodes: 150, hostElements: 100, components: 10 });

console.log("PASS React render smoke checks for every primary view and overlay");
