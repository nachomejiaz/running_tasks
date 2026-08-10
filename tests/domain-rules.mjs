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
  "validateWorkspaceData",
  "isWaitingCard",
  "firstActiveStatusId",
  "ensureDataShape"
]);
const { defaultData, starterData, nextItemFor, nextDateFor, nextBicFor, progressFor, isDoneCard, calendarDaysForMonth, shiftMonth, workspaceCsv, workspaceMarkdown, workspaceSummary, prepareImportedWorkspace, validateWorkspaceData, isWaitingCard, firstActiveStatusId, ensureDataShape } = exports;
for (const [name, value] of Object.entries(exports)) {
  assert.ok(value, `Application test export is missing: ${name}`);
}

const starter = starterData();
assert.equal(starter.cards.length, 0);
assert.equal(starter.checklistItems.length, 0);
assert.deepEqual(Array.from(starter.topics, topic => topic.name), ["General", "Personal"]);
assert.deepEqual(Array.from(starter.actors, actor => actor.name), ["Me"]);

const data = defaultData();
const card = data.cards.find(item => item.id === "card-rfi-coating");
assert.ok(card, "Representative RFI task was not seeded.");
assert.equal(nextItemFor(data, card).id, "i-coat-2");
assert.equal(nextDateFor(data, card), data.checklistItems.find(item => item.id === "i-coat-2").dueDate);
assert.equal(nextBicFor(data, card).id, "actor-architect");
const progress = progressFor(data, card);
assert.equal(progress.done, 1);
assert.equal(progress.total, 4);
assert.equal(progress.percent, 25);

// Completing the current action advances both the date and the Ball in Court.
data.checklistItems.find(item => item.id === "i-coat-2").completed = true;
assert.equal(nextItemFor(data, card).id, "i-coat-3");
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
assert.match(csv, /RFI-0102/);
assert.match(csv, /Receive final response and next steps/);

const markdown = workspaceMarkdown(data);
assert.match(markdown, /# Running_Task workspace export/);
assert.match(markdown, /## Package A/);
assert.match(markdown, /RFI-0102/);
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

// The Waiting-On queue must follow the status flag, not a hardcoded identifier,
// so a renamed or rebuilt status set keeps working.
const waitingData = defaultData();
const waitingStatus = waitingData.statuses.find(status => status.waiting);
assert.ok(waitingStatus, "The default status set should flag one waiting status.");
const ownCard = waitingData.cards.find(card => card.statusId === waitingStatus.id);
assert.ok(ownCard, "Expected a seeded card in the waiting status.");
ownCard.fallbackBicId = waitingData.settings.myActorId;
waitingData.checklistItems.filter(item => item.cardId === ownCard.id).forEach(item => { item.bicId = waitingData.settings.myActorId; });
assert.equal(isWaitingCard(waitingData, ownCard), true, "A waiting status should count as waiting even when I hold the ball.");

waitingStatus.id = "status-renamed-by-user";
waitingData.cards.filter(card => card.statusId === waitingStatus.id).forEach(() => {});
ownCard.statusId = "status-renamed-by-user";
assert.equal(isWaitingCard(waitingData, ownCard), true, "Renaming the status identifier must not break the queue.");

waitingStatus.waiting = false;
assert.equal(isWaitingCard(waitingData, ownCard), false, "Clearing the flag should remove the card from the queue.");

// A card whose next action belongs to somebody else is waiting regardless.
const delegated = waitingData.cards.find(card => card.id !== ownCard.id);
delegated.fallbackBicId = "actor-architect";
waitingData.checklistItems.filter(item => item.cardId === delegated.id).forEach(item => { item.bicId = "actor-architect"; });
assert.equal(isWaitingCard(waitingData, delegated), true);

assert.equal(firstActiveStatusId(defaultData()), "status-todo");

// Schema 1 exports predate the waiting flag and could omit tags entirely.
const legacy = JSON.parse(JSON.stringify(defaultData()));
legacy.statuses.forEach(status => { delete status.waiting; });
delete legacy.cards[0].tags;
const upgraded = ensureDataShape(legacy);
assert.equal(upgraded.statuses.find(status => /^waiting/i.test(status.name)).waiting, true, "The waiting flag should be inferred from the status name.");
assert.deepEqual(Array.from(upgraded.cards[0].tags), [], "A card without tags must not crash search or export.");
assert.equal(upgraded.meta.schemaVersion >= 1, true);

console.log("PASS next-action, BIC, waiting queue, calendar, archive, import, CSV, and Markdown rules");
