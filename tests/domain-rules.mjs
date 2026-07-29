import assert from "node:assert/strict";
import { loadApplication } from "./test-harness.mjs";

const { exports } = loadApplication([
  "starterData",
  "nextItemFor",
  "nextDateFor",
  "nextBicFor",
  "progressFor",
  "isDoneCard",
  "calendarDaysForMonth",
  "shiftMonth",
  "workspaceCsv",
  "workspaceMarkdown",
  "workspaceSummary",
  "prepareImportedWorkspace",
  "validateWorkspaceData"
]);
const { defaultData, starterData, nextItemFor, nextDateFor, nextBicFor, progressFor, isDoneCard, calendarDaysForMonth, shiftMonth, workspaceCsv, workspaceMarkdown, workspaceSummary, prepareImportedWorkspace, validateWorkspaceData } = exports;
for (const [name, value] of Object.entries(exports)) {
  assert.ok(value, `Application test export is missing: ${name}`);
}

const starter = starterData();
assert.equal(starter.cards.length, 0);
assert.equal(starter.checklistItems.length, 0);
assert.deepEqual(Array.from(starter.topics, topic => topic.name), ["General", "Personal"]);
assert.deepEqual(Array.from(starter.actors, actor => actor.name), ["Me"]);

const data = defaultData();
const card = data.cards.find(item => item.id === "card-rfi-traffic");
assert.ok(card, "Representative RFI task was not seeded.");
assert.equal(nextItemFor(data, card).id, "i-rfi-2");
assert.equal(nextDateFor(data, card), data.checklistItems.find(item => item.id === "i-rfi-2").dueDate);
assert.equal(nextBicFor(data, card).id, "actor-architect");
const progress = progressFor(data, card);
assert.equal(progress.done, 1);
assert.equal(progress.total, 4);
assert.equal(progress.percent, 25);

// Completing the current action advances both the date and the Ball in Court.
data.checklistItems.find(item => item.id === "i-rfi-2").completed = true;
assert.equal(nextItemFor(data, card).id, "i-rfi-3");
assert.equal(nextBicFor(data, card).id, "actor-me");

// A task without checklist rows falls back to its task-level target date and BIC.
const fallback = {
  ...card,
  id: "card-fallback-test",
  targetDate: "2030-05-01",
  fallbackBicId: "actor-me",
  statusId: "status-todo",
  isArchived: false
};
data.cards.push(fallback);
assert.equal(nextItemFor(data, fallback), null);
assert.equal(nextDateFor(data, fallback), "2030-05-01");
assert.equal(nextBicFor(data, fallback).id, "actor-me");

fallback.statusId = "status-done";
assert.equal(isDoneCard(data, fallback), true);
fallback.statusId = "status-todo";
fallback.isArchived = true;
assert.equal(isDoneCard(data, fallback), true);

const calendarDays = calendarDaysForMonth("2026-07-01");
assert.equal(calendarDays.length, 42);
assert.equal(calendarDays[0].date.getDay(), 1, "Calendar should start on Monday.");
assert.ok(calendarDays.some(day => day.key === "2026-07-01" && day.inMonth));
assert.equal(shiftMonth("2026-01-01", -1), "2025-12-01");
assert.equal(shiftMonth("2026-12-01", 1), "2027-01-01");

const csv = workspaceCsv(data);
assert.match(csv, /Topic,Subtopic,Card Type,Status/);
assert.match(csv, /RFI-2690/);
assert.match(csv, /Receive final response and next steps/);

const markdown = workspaceMarkdown(data);
assert.match(markdown, /# Running_Task workspace export/);
assert.match(markdown, /## TP25/);
assert.match(markdown, /RFI-2690/);
assert.match(markdown, /Ball in Court/);

const summary = workspaceSummary(data);
assert.equal(summary.cards, data.cards.length);
assert.equal(summary.checklistItems, data.checklistItems.length);

const imported = prepareImportedWorkspace(JSON.parse(JSON.stringify(data)));
assert.equal(imported.summary.cards, data.cards.length);
assert.equal(imported.data.meta.appVersion, "1.0.0-rc.1");
assert.deepEqual(Array.from(validateWorkspaceData(imported.data)), []);

const broken = JSON.parse(JSON.stringify(data));
broken.cards[0].topicId = "missing-topic";
assert.throws(() => prepareImportedWorkspace(broken), /missing Topic/);

const duplicate = JSON.parse(JSON.stringify(data));
duplicate.cards[1].id = duplicate.cards[0].id;
assert.throws(() => prepareImportedWorkspace(duplicate), /duplicate ID/);

const future = JSON.parse(JSON.stringify(data));
future.meta.schemaVersion = 999;
assert.throws(() => prepareImportedWorkspace(future), /newer than this build supports/);

console.log("PASS next-action, BIC, calendar, archive, import, CSV, and Markdown rules");
