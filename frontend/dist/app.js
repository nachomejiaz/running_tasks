const html = htm.bind(React.createElement);
const Component = React.Component;
const APP_VERSION = "1.0.0-rc.1";
const APP_SCHEMA_VERSION = 2;
const STORAGE_KEY = "running_task.workspace.v1";
const BACKUP_KEY = "running_task.browser_backups.v1";
const UNDO_COALESCE_MS = 4000;
const UNDO_DEPTH = 20;
function uid(prefix) {
    const cryptoAny = window.crypto;
    if (cryptoAny && typeof cryptoAny.randomUUID === "function")
        return `${prefix}-${cryptoAny.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function nowIso() { return new Date().toISOString(); }
function dateOnly(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
function addDays(days) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return dateOnly(d);
}
function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}
function currentMonthKey() { return monthKey(new Date()); }
function parseMonthKey(value) {
    const parsed = parseDateOnly(value);
    if (!parsed)
        return new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12, 0, 0, 0);
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12, 0, 0, 0);
}
function shiftMonth(value, delta) {
    const d = parseMonthKey(value);
    d.setMonth(d.getMonth() + delta);
    return monthKey(d);
}
function formatMonth(value) {
    return parseMonthKey(value).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function calendarDaysForMonth(value) {
    const month = parseMonthKey(value);
    const start = new Date(month.getFullYear(), month.getMonth(), 1, 12, 0, 0, 0);
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    const today = dateOnly(new Date());
    return Array.from({ length: 42 }, (_unused, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const key = dateOnly(date);
        return { key, date, inMonth: date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear(), isToday: key === today };
    });
}
function calendarDayLabel(day) {
    if (day.date.getDate() === 1)
        return day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return String(day.date.getDate());
}
function parseDateOnly(value) {
    if (!value)
        return null;
    const parts = value.split("-").map(Number);
    if (parts.length !== 3)
        return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}
function dayOffset(value) {
    const parsed = parseDateOnly(value);
    if (!parsed)
        return null;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return Math.round((parsed.getTime() - today.getTime()) / 86400000);
}
function formatDate(value, compact = false) {
    const d = parseDateOnly(value);
    if (!d)
        return "No date";
    const offset = dayOffset(value);
    if (offset === 0)
        return "Today";
    if (offset === 1)
        return "Tomorrow";
    if (offset === -1)
        return "Yesterday";
    return d.toLocaleDateString(undefined, compact ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
}
function formatTimestamp(value) {
    const d = new Date(value);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function bytes(value) {
    if (!Number.isFinite(value) || value <= 0)
        return "0 KB";
    if (value < 1024 * 1024)
        return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
function initials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join("") || "?";
}
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function sortRank(items) { return items.slice().sort((a, b) => a.rank - b.rank); }
function stop(event) { event.stopPropagation(); }
function isTypingTarget(target) {
    const tag = String(target && target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || !!(target && target.isContentEditable);
}
function statusById(data, id) { return data.statuses.find(s => s.id === id); }
function topicById(data, id) { return data.topics.find(t => t.id === id); }
function subtopicById(data, id) { return data.subtopics.find(t => t.id === id); }
function actorById(data, id) { return data.actors.find(a => a.id === id); }
function typeById(data, id) { return data.cardTypes.find(t => t.id === id); }
function checklistFor(data, cardId) { return data.checklistItems.filter(i => i.cardId === cardId).sort((a, b) => a.rank - b.rank); }
function openChecklistFor(data, cardId) { return checklistFor(data, cardId).filter(i => !i.completed); }
function nextItemFor(data, card) {
    const open = openChecklistFor(data, card.id);
    const dated = open.filter(i => !!i.dueDate).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)) || a.rank - b.rank);
    return dated[0] || open[0] || null;
}
function nextDateFor(data, card) {
    const item = nextItemFor(data, card);
    return item && item.dueDate ? item.dueDate : card.targetDate;
}
function nextBicFor(data, card) {
    const item = nextItemFor(data, card);
    return actorById(data, item && item.bicId ? item.bicId : card.fallbackBicId);
}
function progressFor(data, card) {
    const items = checklistFor(data, card.id);
    const done = items.filter(i => i.completed).length;
    return { done, total: items.length, percent: items.length ? Math.round(done / items.length * 100) : 0 };
}
function dueClass(value) {
    const offset = dayOffset(value);
    if (offset === null)
        return "";
    if (offset < 0)
        return "overdue";
    if (offset === 0)
        return "today";
    return "";
}
function isWaitingCard(data, card) {
    var _a;
    const bic = nextBicFor(data, card);
    if (bic && bic.id !== data.settings.myActorId)
        return true;
    return !!((_a = statusById(data, card.statusId)) === null || _a === void 0 ? void 0 : _a.waiting);
}
function firstActiveStatusId(data) {
    var _a, _b;
    return ((_a = sortRank(data.statuses.filter(s => !s.terminal))[0]) === null || _a === void 0 ? void 0 : _a.id) || ((_b = data.statuses[0]) === null || _b === void 0 ? void 0 : _b.id) || "";
}
function isDoneCard(data, card) {
    const status = statusById(data, card.statusId);
    return !!(status && status.terminal) || card.isArchived;
}
function normalizeText(value) { return String(value || "").toLowerCase().trim(); }
function csvEscape(value) {
    const text = String(value === null || value === undefined ? "" : value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function downloadTextFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return name;
}
function workspaceCsv(data) {
    const headers = [
        "Topic", "Subtopic", "Card Type", "Status", "Reference", "Card Title", "Card Description", "Priority",
        "Target Date", "Next Date", "Current BIC", "Tags", "Archive State", "Completed At",
        "Checklist Item", "Checklist Parent", "Checklist Due Date", "Checklist BIC", "Checklist Complete", "Checklist Notes"
    ];
    const rows = [headers];
    const cards = data.cards.slice().sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));
    cards.forEach(card => {
        var _a, _b, _c, _d, _e;
        const topic = ((_a = topicById(data, card.topicId)) === null || _a === void 0 ? void 0 : _a.name) || "";
        const subtopic = ((_b = subtopicById(data, card.subtopicId)) === null || _b === void 0 ? void 0 : _b.name) || "";
        const cardType = ((_c = typeById(data, card.cardTypeId)) === null || _c === void 0 ? void 0 : _c.name) || "";
        const status = ((_d = statusById(data, card.statusId)) === null || _d === void 0 ? void 0 : _d.name) || "";
        const currentBic = ((_e = nextBicFor(data, card)) === null || _e === void 0 ? void 0 : _e.name) || "";
        const items = checklistFor(data, card.id);
        const byId = new Map(items.map(item => [item.id, item]));
        const cardColumns = [topic, subtopic, cardType, status, card.reference, card.title, card.description, card.priority,
            card.targetDate || "", nextDateFor(data, card) || "", currentBic, card.tags.join("; "),
            card.isArchived ? (card.archiveReason || "archived") : "active", card.completedAt || ""];
        if (!items.length)
            rows.push([...cardColumns, "", "", "", "", "", ""]);
        items.forEach(item => {
            var _a, _b;
            return rows.push([...cardColumns, item.title, item.parentId ? (((_a = byId.get(item.parentId)) === null || _a === void 0 ? void 0 : _a.title) || "") : "",
                item.dueDate || "", ((_b = actorById(data, item.bicId)) === null || _b === void 0 ? void 0 : _b.name) || "", item.completed ? "Yes" : "No", item.notes]);
        });
    });
    return `${rows.map(row => row.map(csvEscape).join(",")).join("\r\n")}\r\n`;
}
function markdownText(value) { return String(value || "").replace(/[\r\n]+/g, " ").trim(); }
function workspaceMarkdown(data) {
    const lines = [`# Running_Task workspace export`, "", `Exported: ${new Date().toLocaleString()}`, `Version: ${APP_VERSION}`, ""];
    const topics = sortRank(data.topics);
    topics.forEach(topic => {
        lines.push(`## ${markdownText(topic.name)}`, "");
        const topicCards = data.cards.filter(card => card.topicId === topic.id).sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));
        if (!topicCards.length) {
            lines.push("_No tasks._", "");
            return;
        }
        topicCards.forEach(card => {
            var _a, _b, _c, _d;
            const status = ((_a = statusById(data, card.statusId)) === null || _a === void 0 ? void 0 : _a.name) || "Unknown";
            const prefix = card.isArchived ? "[Archived] " : "";
            lines.push(`### ${prefix}${card.reference ? `${markdownText(card.reference)} - ` : ""}${markdownText(card.title)}`);
            lines.push(`- Status: ${markdownText(status)}`);
            const subtopic = (_b = subtopicById(data, card.subtopicId)) === null || _b === void 0 ? void 0 : _b.name;
            if (subtopic)
                lines.push(`- Subtopic: ${markdownText(subtopic)}`);
            const cardType = (_c = typeById(data, card.cardTypeId)) === null || _c === void 0 ? void 0 : _c.name;
            if (cardType)
                lines.push(`- Card type: ${markdownText(cardType)}`);
            lines.push(`- Priority: ${card.priority}`);
            lines.push(`- Next date: ${nextDateFor(data, card) || "No date"}`);
            lines.push(`- Ball in Court: ${((_d = nextBicFor(data, card)) === null || _d === void 0 ? void 0 : _d.name) || "Unassigned"}`);
            if (card.description)
                lines.push("", markdownText(card.description));
            const items = checklistFor(data, card.id);
            if (items.length) {
                lines.push("", "Checklist:");
                const depths = checklistDepthMap(items);
                items.forEach(item => {
                    var _a;
                    const indent = "  ".repeat(depths.get(item.id) || 0);
                    const details = [item.dueDate || "No date", ((_a = actorById(data, item.bicId)) === null || _a === void 0 ? void 0 : _a.name) || "No BIC"].join(" | ");
                    lines.push(`${indent}- [${item.completed ? "x" : " "}] ${markdownText(item.title)} (${details})`);
                });
            }
            if (card.notes)
                lines.push("", `Notes: ${markdownText(card.notes)}`);
            lines.push("");
        });
    });
    return `${lines.join("\n").trim()}\n`;
}
function workspaceSummary(data) {
    return {
        topics: data.topics.length,
        subtopics: data.subtopics.length,
        cards: data.cards.length,
        checklistItems: data.checklistItems.length,
        archivedCards: data.cards.filter(card => isDoneCard(data, card)).length,
        actors: data.actors.length
    };
}
function validateWorkspaceData(data) {
    const errors = [];
    const uniqueIds = (label, items) => {
        const ids = new Set();
        items.forEach(item => {
            if (!item.id || typeof item.id !== "string")
                errors.push(`${label} contains a record without an ID.`);
            else if (ids.has(item.id))
                errors.push(`${label} contains duplicate ID ${item.id}.`);
            else
                ids.add(item.id);
        });
    };
    uniqueIds("Topics", data.topics);
    uniqueIds("Subtopics", data.subtopics);
    uniqueIds("Card types", data.cardTypes);
    uniqueIds("Statuses", data.statuses);
    uniqueIds("BIC actors", data.actors);
    uniqueIds("Cards", data.cards);
    uniqueIds("Checklist", data.checklistItems);
    uniqueIds("Saved views", data.savedViews);
    if (!data.topics.length)
        errors.push("At least one Topic is required.");
    if (!data.statuses.length)
        errors.push("At least one Status is required.");
    if (!data.statuses.some(status => status.terminal))
        errors.push("A terminal Done status is required.");
    const topicIds = new Set(data.topics.map(item => item.id));
    const subtopicByKey = new Map(data.subtopics.map(item => [item.id, item]));
    const typeIds = new Set(data.cardTypes.map(item => item.id));
    const statusIds = new Set(data.statuses.map(item => item.id));
    const actorIds = new Set(data.actors.map(item => item.id));
    const cardIds = new Set(data.cards.map(item => item.id));
    data.subtopics.forEach(item => { if (!topicIds.has(item.topicId))
        errors.push(`Subtopic ${item.name || item.id} references a missing Topic.`); });
    data.cards.forEach(card => {
        if (!card.title || !card.title.trim())
            errors.push(`Card ${card.id} has no title.`);
        if (!topicIds.has(card.topicId))
            errors.push(`Card ${card.title || card.id} references a missing Topic.`);
        if (!statusIds.has(card.statusId))
            errors.push(`Card ${card.title || card.id} references a missing Status.`);
        if (card.subtopicId) {
            const subtopic = subtopicByKey.get(card.subtopicId);
            if (!subtopic)
                errors.push(`Card ${card.title || card.id} references a missing Subtopic.`);
            else if (subtopic.topicId !== card.topicId)
                errors.push(`Card ${card.title || card.id} has a Subtopic from another Topic.`);
        }
        if (card.cardTypeId && !typeIds.has(card.cardTypeId))
            errors.push(`Card ${card.title || card.id} references a missing Card Type.`);
        if (card.fallbackBicId && !actorIds.has(card.fallbackBicId))
            errors.push(`Card ${card.title || card.id} references a missing BIC actor.`);
    });
    const itemById = new Map(data.checklistItems.map(item => [item.id, item]));
    data.checklistItems.forEach(item => {
        if (!cardIds.has(item.cardId))
            errors.push(`Checklist item ${item.title || item.id} references a missing Card.`);
        if (item.bicId && !actorIds.has(item.bicId))
            errors.push(`Checklist item ${item.title || item.id} references a missing BIC actor.`);
        if (item.parentId) {
            const parent = itemById.get(item.parentId);
            if (!parent)
                errors.push(`Checklist item ${item.title || item.id} references a missing parent.`);
            else if (parent.cardId !== item.cardId)
                errors.push(`Checklist item ${item.title || item.id} has a parent from another Card.`);
            const visited = new Set();
            let cursor = item;
            while (cursor === null || cursor === void 0 ? void 0 : cursor.parentId) {
                if (visited.has(cursor.id)) {
                    errors.push(`Checklist item ${item.title || item.id} is part of a parent cycle.`);
                    break;
                }
                visited.add(cursor.id);
                cursor = itemById.get(cursor.parentId);
            }
        }
    });
    return Array.from(new Set(errors));
}
function prepareImportedWorkspace(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new Error("The selected file is not a Running_Task workspace object.");
    if (!raw.meta || !Array.isArray(raw.cards) || !Array.isArray(raw.topics))
        throw new Error("The selected JSON does not contain Running_Task workspace data.");
    const schemaVersion = Number(raw.meta.schemaVersion || 1);
    if (!Number.isFinite(schemaVersion) || schemaVersion < 1)
        throw new Error("The workspace schema version is invalid.");
    if (schemaVersion > APP_SCHEMA_VERSION)
        throw new Error(`This file uses schema ${schemaVersion}, which is newer than this build supports.`);
    const sourceVersion = String(raw.meta.appVersion || "Unknown");
    const data = ensureDataShape(deepClone(raw));
    const errors = validateWorkspaceData(data);
    if (errors.length)
        throw new Error(`Import validation failed: ${errors.slice(0, 6).join(" ")}${errors.length > 6 ? ` Plus ${errors.length - 6} more issue(s).` : ""}`);
    data.meta.schemaVersion = APP_SCHEMA_VERSION;
    data.meta.appVersion = APP_VERSION;
    data.meta.updatedAt = nowIso();
    const warnings = [];
    if (sourceVersion !== APP_VERSION)
        warnings.push(`The file was created by Running_Task ${sourceVersion}; it will be normalized for ${APP_VERSION}.`);
    if (!data.cards.length)
        warnings.push("The imported workspace contains no Cards.");
    return { data, summary: workspaceSummary(data), warnings };
}
function defaultData() {
    const stamp = nowIso();
    const statuses = [
        { id: "status-todo", name: "To Do", color: "#6b778c", rank: 10, terminal: false, waiting: false },
        { id: "status-progress", name: "In Progress", color: "#0c66e4", rank: 20, terminal: false, waiting: false },
        { id: "status-waiting", name: "Waiting", color: "#b65c02", rank: 30, terminal: false, waiting: true },
        { id: "status-review", name: "Review", color: "#6e5dc6", rank: 40, terminal: false, waiting: false },
        { id: "status-done", name: "Done", color: "#1f845a", rank: 50, terminal: true, waiting: false }
    ];
    // Demo content only. Every name, reference, and organization here is a
    // neutral placeholder: this dataset ships in the public browser preview and
    // must never contain real project, client, or vendor information.
    const topics = [
        { id: "topic-general", name: "General", color: "#0c66e4", icon: "layers", rank: 10, archived: false },
        { id: "topic-pkg-a", name: "Package A — Structure", color: "#8f5b2e", icon: "package", rank: 20, archived: false },
        { id: "topic-pkg-b", name: "Package B — Finishes", color: "#6e5dc6", icon: "grid", rank: 30, archived: false },
        { id: "topic-pkg-c", name: "Package C — Furnishings", color: "#1f845a", icon: "package", rank: 40, archived: false },
        { id: "topic-personal", name: "Personal", color: "#e56910", icon: "user", rank: 50, archived: false }
    ];
    const subtopics = [
        { id: "sub-general", topicId: "topic-general", name: "General", color: "#0c66e4", rank: 10, archived: false },
        { id: "sub-area-a", topicId: "topic-general", name: "Area A", color: "#1f845a", rank: 20, archived: false },
        { id: "sub-quality", topicId: "topic-general", name: "Quality Control", color: "#6e5dc6", rank: 30, archived: false },
        { id: "sub-onboarding-a", topicId: "topic-pkg-a", name: "Onboarding", color: "#1f845a", rank: 10, archived: false },
        { id: "sub-pco-a", topicId: "topic-pkg-a", name: "PCO", color: "#6e5dc6", rank: 20, archived: false },
        { id: "sub-rfi-a", topicId: "topic-pkg-a", name: "RFI", color: "#0c66e4", rank: 30, archived: false },
        { id: "sub-proc-b", topicId: "topic-pkg-b", name: "Procurement", color: "#1f845a", rank: 10, archived: false },
        { id: "sub-onboarding-b", topicId: "topic-pkg-b", name: "Onboarding", color: "#0c66e4", rank: 20, archived: false },
        { id: "sub-rfi-b", topicId: "topic-pkg-b", name: "RFI / Submittals", color: "#6e5dc6", rank: 30, archived: false },
        { id: "sub-cm-b", topicId: "topic-pkg-b", name: "Change Management", color: "#b65c02", rank: 40, archived: false },
        { id: "sub-proc-c", topicId: "topic-pkg-c", name: "Procurement", color: "#1f845a", rank: 10, archived: false },
        { id: "sub-onboarding-c", topicId: "topic-pkg-c", name: "Onboarding", color: "#0c66e4", rank: 20, archived: false },
        { id: "sub-personal", topicId: "topic-personal", name: "Personal Admin", color: "#e56910", rank: 10, archived: false }
    ];
    const actors = [
        { id: "actor-me", name: "Me", organization: "Personal", color: "#0c66e4", rank: 10, archived: false },
        { id: "actor-design", name: "Design Team", organization: "Design", color: "#6e5dc6", rank: 20, archived: false },
        { id: "actor-trade", name: "Trade Partner", organization: "Subcontractor", color: "#1f845a", rank: 30, archived: false },
        { id: "actor-gc", name: "General Contractor", organization: "Construction", color: "#e56910", rank: 40, archived: false },
        { id: "actor-field", name: "Field Lead", organization: "Project Team", color: "#ae2e24", rank: 50, archived: false },
        { id: "actor-pm", name: "Project Manager", organization: "Project Team", color: "#0055cc", rank: 60, archived: false },
        { id: "actor-architect", name: "Architect", organization: "Design", color: "#8270db", rank: 70, archived: false },
        { id: "actor-owner", name: "Owner", organization: "Client", color: "#227d9b", rank: 80, archived: false }
    ];
    const cardTypes = [
        { id: "type-action", name: "Action", color: "#0c66e4", icon: "check", rank: 10, archived: false },
        { id: "type-rfi", name: "RFI", color: "#0055cc", icon: "help", rank: 20, archived: false },
        { id: "type-pco", name: "PCO", color: "#6e5dc6", icon: "dollar", rank: 30, archived: false },
        { id: "type-submittal", name: "Submittal", color: "#1f845a", icon: "send", rank: 40, archived: false },
        { id: "type-procurement", name: "Procurement", color: "#b65c02", icon: "package", rank: 50, archived: false },
        { id: "type-meeting", name: "Meeting", color: "#227d9b", icon: "calendar", rank: 60, archived: false },
        { id: "type-log", name: "Log", color: "#6b778c", icon: "list", rank: 70, archived: false },
        { id: "type-scope", name: "Scope", color: "#e56910", icon: "layers", rank: 80, archived: false }
    ];
    const card = (id, topicId, subtopicId, typeId, statusId, reference, title, description, priority, rank) => ({
        id, topicId, subtopicId, cardTypeId: typeId, statusId, reference, title, description, notes: "", priority,
        targetDate: null, fallbackBicId: "actor-me", tags: [], rank, isArchived: false, archiveReason: null,
        lastActiveStatusId: null, completedAt: null, createdAt: stamp, updatedAt: stamp
    });
    const cards = [
        card("card-rfi-openings", "topic-general", "sub-general", "type-rfi", "status-review", "RFI-0101", "Door frame opening coordination", "Confirm coordination and capture the final response for the door-frame openings.", "High", 10),
        card("card-long-lead", "topic-general", "sub-general", "type-log", "status-progress", "LOG-0001", "Long lead log", "Maintain the long-lead log and coordinate the current procurement dates.", "Normal", 20),
        card("card-quality-walk", "topic-general", "sub-quality", "type-action", "status-waiting", "QC-0014", "Quality walk and priority areas", "Track the quality walk, markup, and release of the priority areas.", "High", 30),
        card("card-safety", "topic-pkg-a", "sub-onboarding-a", "type-submittal", "status-waiting", "SUB-0025", "Safety submittals", "Collect and approve the complete safety-submittal package.", "High", 10),
        card("card-pco-scope", "topic-pkg-a", "sub-pco-a", "type-pco", "status-progress", "PCO-0044", "Remaining pre-installation scope", "Price and close the remaining scope before installation begins.", "Critical", 20),
        card("card-rfi-coating", "topic-pkg-a", "sub-rfi-a", "type-rfi", "status-review", "RFI-0102", "Protective coating at walkway", "Obtain the final response and confirm next steps for the walkway coating.", "High", 30),
        card("card-finish-samples", "topic-pkg-b", "sub-rfi-b", "type-submittal", "status-waiting", "SUB-0017", "Finish samples review", "Complete sample review, approval, and return to the trade partner.", "High", 10),
        card("card-install-materials", "topic-pkg-b", "sub-proc-b", "type-procurement", "status-todo", "PROC-0009", "Installation materials", "Confirm all installation materials and release them in the project system.", "Normal", 20),
        card("card-rfi-finish", "topic-pkg-b", "sub-rfi-b", "type-rfi", "status-todo", "RFI-0103", "Finish detail clarification", "Resolve the finish details and any required orientation information.", "Normal", 30),
        card("card-furniture-log", "topic-pkg-c", "sub-proc-c", "type-log", "status-progress", "LOG-0002", "Furnishings long lead log", "Add furnishings, verify dates, and keep the long-lead log current.", "Normal", 10),
        card("card-schedule-review", "topic-pkg-c", "sub-proc-c", "type-procurement", "status-review", "SCH-0006", "Partner schedule review", "Coordinate exclusions and return the reviewed partner schedule.", "High", 20),
        card("card-expense", "topic-personal", "sub-personal", "type-action", "status-todo", "", "Submit monthly expense report", "Organize receipts and submit the monthly expense report.", "Normal", 10)
    ];
    const item = (id, cardId, title, dueDate, bicId, completed, rank, parentId = null) => ({
        id, cardId, parentId, title, notes: "", dueDate, bicId, completed, rank, completedAt: completed ? stamp : null
    });
    const checklistItems = [
        item("i-open-1", "card-rfi-openings", "Confirm priority areas and openings list", addDays(-3), "actor-me", true, 10),
        item("i-open-2", "card-rfi-openings", "Receive updated response from the design team", addDays(1), "actor-design", false, 20),
        item("i-open-3", "card-rfi-openings", "Release coordinated direction to field", addDays(2), "actor-me", false, 30),
        item("i-log-1", "card-long-lead", "Update current procurement dates", addDays(0), "actor-me", false, 10),
        item("i-log-2", "card-long-lead", "Review delayed items with trade partners", addDays(3), "actor-me", false, 20),
        item("i-qc-1", "card-quality-walk", "Quality walk schedule", addDays(-1), "actor-field", true, 10),
        item("i-qc-2", "card-quality-walk", "Next quality walk", addDays(2), "actor-field", false, 20),
        item("i-qc-3", "card-quality-walk", "Receive updated inventory tables", addDays(4), "actor-field", false, 30),
        item("i-safe-1", "card-safety", "Receive site-specific safety plan", addDays(-2), "actor-trade", true, 10),
        item("i-safe-2", "card-safety", "Receive fall-protection plan", addDays(1), "actor-trade", false, 20),
        item("i-safe-3", "card-safety", "Review and upload complete package", addDays(2), "actor-me", false, 30),
        item("i-pco-1", "card-pco-scope", "Send remaining scope out for pricing", addDays(0), "actor-me", false, 10),
        item("i-pco-2", "card-pco-scope", "Receive pricing", addDays(5), "actor-gc", false, 20),
        item("i-pco-3", "card-pco-scope", "Review change-order scope", addDays(7), "actor-me", false, 30),
        item("i-coat-1", "card-rfi-coating", "Issue RFI by email", addDays(-3), "actor-me", true, 10),
        item("i-coat-2", "card-rfi-coating", "Receive final response and next steps", addDays(1), "actor-architect", false, 20),
        item("i-coat-3", "card-rfi-coating", "Confirm added scope", addDays(2), "actor-me", false, 30, "i-coat-2"),
        item("i-coat-4", "card-rfi-coating", "Update cost log", addDays(4), "actor-me", false, 40),
        item("i-sample-1", "card-finish-samples", "Deliver samples to the design team", addDays(-1), "actor-me", true, 10),
        item("i-sample-2", "card-finish-samples", "Issue reviewed sample submittal", addDays(0), "actor-field", false, 20),
        item("i-sample-3", "card-finish-samples", "Return approved sample to the trade partner", addDays(2), "actor-me", false, 30),
        item("i-mat-1", "card-install-materials", "Submit installation materials for review", addDays(4), "actor-trade", false, 10),
        item("i-mat-2", "card-install-materials", "Review complete package", addDays(6), "actor-me", false, 20),
        item("i-finish-1", "card-rfi-finish", "Confirm required finish details", null, "actor-design", false, 10),
        item("i-furn-1", "card-furniture-log", "Add furnishings to long-lead log", addDays(0), "actor-me", false, 10),
        item("i-furn-2", "card-furniture-log", "Receive vendor update", addDays(3), "actor-design", false, 20),
        item("i-sched-1", "card-schedule-review", "Send schedule out for review", addDays(1), "actor-me", false, 10),
        item("i-sched-2", "card-schedule-review", "Receive marked-up schedule", addDays(4), "actor-design", false, 20),
        item("i-exp-1", "card-expense", "Collect receipts", addDays(2), "actor-me", false, 10),
        item("i-exp-2", "card-expense", "Submit report", addDays(4), "actor-me", false, 20)
    ];
    return {
        meta: { schemaVersion: 1, appVersion: APP_VERSION, createdAt: stamp, updatedAt: stamp },
        settings: { boardAxis: "topic", theme: "dark", density: "comfortable", autostart: true, myActorId: "actor-me", showDescriptions: true, backupRetention: 14 },
        topics, subtopics, cardTypes, statuses, actors, cards, checklistItems,
        savedViews: [
            { id: "view-next-7", name: "Next 7 days", route: "list", selectedTopicId: null, scope: "", filters: { statusId: "", bicId: "", due: "7days", priority: "" } },
            { id: "view-waiting", name: "Waiting on others", route: "list", selectedTopicId: null, scope: "waiting", filters: { statusId: "", bicId: "", due: "all", priority: "" } }
        ]
    };
}
function starterData() {
    const data = defaultData();
    const allowedTopics = new Set(["topic-general", "topic-personal"]);
    data.topics = data.topics.filter(topic => allowedTopics.has(topic.id));
    data.subtopics = [];
    data.actors = data.actors.filter(actor => actor.id === "actor-me");
    data.cards = [];
    data.checklistItems = [];
    data.meta.createdAt = nowIso();
    data.meta.updatedAt = data.meta.createdAt;
    return data;
}
function ensureDataShape(raw) {
    const fallback = starterData();
    if (!raw || !raw.meta || !Array.isArray(raw.cards))
        return fallback;
    const data = raw;
    data.meta.appVersion = APP_VERSION;
    data.meta.schemaVersion = data.meta.schemaVersion || 1;
    data.settings = Object.assign({}, fallback.settings, data.settings || {});
    data.topics = Array.isArray(data.topics) ? data.topics : fallback.topics;
    data.subtopics = Array.isArray(data.subtopics) ? data.subtopics : [];
    data.cardTypes = Array.isArray(data.cardTypes) ? data.cardTypes : fallback.cardTypes;
    data.statuses = Array.isArray(data.statuses) && data.statuses.length ? data.statuses : fallback.statuses;
    // Schema 1 workspaces predate the waiting flag; infer it from the name once.
    data.statuses.forEach(status => { if (typeof status.waiting !== "boolean")
        status.waiting = /^waiting/i.test(status.name || ""); });
    data.cards.forEach(card => { if (!Array.isArray(card.tags))
        card.tags = []; });
    data.actors = Array.isArray(data.actors) && data.actors.length ? data.actors : fallback.actors;
    data.checklistItems = Array.isArray(data.checklistItems) ? data.checklistItems : [];
    data.savedViews = Array.isArray(data.savedViews) ? data.savedViews : [];
    return data;
}
const tauriWindow = window;
function hasTauri() { return !!(tauriWindow.__TAURI__ && tauriWindow.__TAURI__.core && tauriWindow.__TAURI__.core.invoke); }
async function tauriInvoke(command, args) {
    return await tauriWindow.__TAURI__.core.invoke(command, args || {});
}
/**
 * Serializes local writes and coalesces rapid edits into the latest complete
 * workspace snapshot. This prevents an older, slower save from finishing after
 * a newer edit and replacing it on disk.
 */
class SerializedSaveQueue {
    constructor(saver) {
        this.saver = saver;
        this.pending = null;
        this.inFlight = null;
        this.nextRevision = 0;
        this.persistedRevision = 0;
    }
    enqueue(value) {
        const revision = ++this.nextRevision;
        this.pending = { revision, value };
        return revision;
    }
    hasWork() { return !!this.pending || !!this.inFlight; }
    latestRevision() { return this.nextRevision; }
    savedRevision() { return this.persistedRevision; }
    async flush() {
        if (this.inFlight) {
            await this.inFlight;
            if (this.pending)
                await this.flush();
            return;
        }
        if (!this.pending)
            return;
        this.inFlight = this.drain();
        try {
            await this.inFlight;
        }
        finally {
            this.inFlight = null;
        }
        if (this.pending)
            await this.flush();
    }
    async drain() {
        while (this.pending) {
            const current = this.pending;
            this.pending = null;
            try {
                await this.saver(current.value);
                this.persistedRevision = Math.max(this.persistedRevision, current.revision);
            }
            catch (error) {
                // A newer snapshot already includes this edit. If no newer snapshot
                // exists, retain the failed one so Retry can persist it.
                if (!this.pending)
                    this.pending = current;
                throw error;
            }
        }
    }
}
class DataProvider {
    constructor() {
        this.desktop = hasTauri();
        /** False when load() had to synthesize a starter or demo workspace. */
        this.loadedExistingWorkspace = false;
        this.browserStorageAvailable = true;
        this.memoryData = null;
        this.memoryBackups = [];
    }
    readBrowserBackups() {
        if (!this.browserStorageAvailable)
            return this.memoryBackups.slice();
        try {
            const items = JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
            this.memoryBackups = Array.isArray(items) ? items : [];
            return this.memoryBackups.slice();
        }
        catch (_error) {
            this.browserStorageAvailable = false;
            return this.memoryBackups.slice();
        }
    }
    writeBrowserBackups(items) {
        this.memoryBackups = deepClone(items);
        if (!this.browserStorageAvailable)
            return;
        try {
            localStorage.setItem(BACKUP_KEY, JSON.stringify(items));
        }
        catch (_error) {
            this.browserStorageAvailable = false;
        }
    }
    async load() {
        if (this.desktop) {
            const raw = await tauriInvoke("get_app_data");
            this.loadedExistingWorkspace = !!raw;
            return raw ? ensureDataShape(raw) : starterData();
        }
        if (!this.browserStorageAvailable && this.memoryData)
            return deepClone(this.memoryData);
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            this.loadedExistingWorkspace = !!raw;
            const data = raw ? ensureDataShape(JSON.parse(raw)) : defaultData();
            this.memoryData = deepClone(data);
            return data;
        }
        catch (_error) {
            this.browserStorageAvailable = false;
            const data = this.memoryData ? deepClone(this.memoryData) : defaultData();
            this.memoryData = deepClone(data);
            return data;
        }
    }
    async save(data) {
        if (this.desktop) {
            await tauriInvoke("save_app_data", { data });
            return;
        }
        this.memoryData = deepClone(data);
        if (this.browserStorageAvailable) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }
            catch (_error) {
                this.browserStorageAvailable = false;
            }
        }
        this.ensureBrowserDailyBackup(data);
    }
    ensureBrowserDailyBackup(data) {
        const list = this.readBrowserBackups();
        const day = dateOnly(new Date());
        if (!list.some((backup) => backup.kind === "automatic" && backup.day === day)) {
            list.unshift({ id: uid("backup"), kind: "automatic", day, name: `Auto_${day}.json`, createdAt: nowIso(), data: deepClone(data) });
        }
        const automatic = list.filter((backup) => backup.kind === "automatic").sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        const keep = new Set(automatic.slice(0, Math.max(1, data.settings.backupRetention || 14)).map((backup) => backup.id));
        const retained = list.filter((backup) => backup.kind !== "automatic" || keep.has(backup.id)).slice(0, 200);
        this.writeBrowserBackups(retained);
    }
    async setAutostart(enabled) {
        if (this.desktop)
            return await tauriInvoke("set_autostart", { enabled });
        return enabled;
    }
    async getAutostart() {
        if (this.desktop)
            return await tauriInvoke("get_autostart");
        return true;
    }
    async listBackups() {
        if (this.desktop)
            return await tauriInvoke("list_backups");
        const items = this.readBrowserBackups();
        const location = this.browserStorageAvailable ? "Browser preview storage" : "Temporary in-memory preview storage";
        return items.map((b) => ({ id: b.id, name: b.name, path: location, createdAt: b.createdAt, sizeBytes: JSON.stringify(b.data).length }));
    }
    async createBackup(data) {
        if (this.desktop)
            return await tauriInvoke("create_backup");
        const list = this.readBrowserBackups();
        const backup = { id: uid("backup"), kind: "manual", name: `Running_Task_${new Date().toISOString().replace(/[:.]/g, "-")}.json`, createdAt: nowIso(), data: deepClone(data) };
        list.unshift(backup);
        this.writeBrowserBackups(list.slice(0, 200));
        return { id: backup.id, name: backup.name, path: this.browserStorageAvailable ? "Browser preview storage" : "Temporary in-memory preview storage", createdAt: backup.createdAt, sizeBytes: JSON.stringify(backup.data).length };
    }
    async restoreBackup(id) {
        if (this.desktop) {
            await tauriInvoke("restore_backup", { backupId: id });
            return await this.load();
        }
        const backup = this.readBrowserBackups().find((b) => b.id === id);
        if (!backup)
            throw new Error("Backup not found.");
        const restored = ensureDataShape(deepClone(backup.data));
        await this.save(restored);
        return restored;
    }
    async deleteBackup(id) {
        if (this.desktop) {
            await tauriInvoke("delete_backup", { backupId: id });
            return;
        }
        this.writeBrowserBackups(this.readBrowserBackups().filter((b) => b.id !== id));
    }
    async exportJson(data) {
        if (this.desktop)
            return await tauriInvoke("export_json");
        return downloadTextFile(`Running_Task_${dateOnly(new Date())}.json`, JSON.stringify(data, null, 2), "application/json");
    }
    async exportCsv(data) {
        if (this.desktop)
            return await tauriInvoke("export_csv");
        return downloadTextFile(`Running_Task_${dateOnly(new Date())}.csv`, workspaceCsv(data), "text/csv;charset=utf-8");
    }
    async exportMarkdown(data) {
        if (this.desktop)
            return await tauriInvoke("export_markdown");
        return downloadTextFile(`Running_Task_${dateOnly(new Date())}.md`, workspaceMarkdown(data), "text/markdown;charset=utf-8");
    }
    async storageInfo() {
        if (this.desktop)
            return await tauriInvoke("get_storage_info");
        if (!this.browserStorageAvailable)
            return { dataPath: "Temporary memory for this preview tab", backupPath: "Temporary memory for this preview tab", mode: "Browser preview (storage unavailable)" };
        return { dataPath: "This browser profile (localStorage preview)", backupPath: "This browser profile (localStorage preview)", mode: "Browser preview" };
    }
    async openDataFolder() {
        if (this.desktop)
            await tauriInvoke("open_data_folder");
    }
}
const iconPaths = {
    dashboard: html `<g><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></g>`,
    board: html `<g><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></g>`,
    list: html `<g><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></g>`,
    flow: html `<g><circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 12h3a4 4 0 0 0 4-4V6h3M7 12h3a4 4 0 0 1 4 4v2h3"/></g>`,
    archive: html `<g><path d="M4 7h16v14H4zM3 3h18v4H3zM9 11h6"/></g>`,
    settings: html `<g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/></g>`,
    plus: html `<path d="M12 5v14M5 12h14"/>`,
    search: html `<g><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></g>`,
    x: html `<path d="m6 6 12 12M18 6 6 18"/>`,
    filter: html `<path d="M4 5h16l-6 7v5l-4 2v-7z"/>`,
    calendar: html `<g><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></g>`,
    user: html `<g><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></g>`,
    check: html `<path d="m5 12 4 4L19 6"/>`,
    chevronDown: html `<path d="m7 9 5 5 5-5"/>`,
    chevronRight: html `<path d="m9 7 5 5-5 5"/>`,
    more: html `<g><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></g>`,
    layers: html `<g><path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></g>`,
    package: html `<g><path d="m4 7 8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></g>`,
    grid: html `<g><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></g>`,
    clock: html `<g><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></g>`,
    alert: html `<g><path d="M12 3 2.5 20h19z"/><path d="M12 9v4M12 17h.01"/></g>`,
    save: html `<g><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></g>`,
    download: html `<g><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/></g>`,
    upload: html `<g><path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 4h16"/></g>`,
    fileText: html `<g><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 12h8M8 16h8"/></g>`,
    rotate: html `<g><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></g>`,
    trash: html `<g><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></g>`,
    edit: html `<g><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10z"/><path d="m13.5 6.5 3.5 3.5"/></g>`,
    arrowLeft: html `<path d="m15 18-6-6 6-6"/>`,
    arrowRight: html `<path d="m9 18 6-6-6-6"/>`,
    arrowUp: html `<path d="m6 15 6-6 6 6"/>`,
    arrowDown: html `<path d="m6 9 6 6 6-6"/>`,
    help: html `<g><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4 2.4c-.9.5-1.5 1-1.5 2.1M12 17h.01"/></g>`,
    dollar: html `<g><path d="M12 2v20M17 6.5c-1-1-2.4-1.5-4-1.5-2.2 0-4 1.2-4 3s1.6 2.6 4 3 4 1.2 4 3-1.8 3-4 3c-1.8 0-3.4-.6-4.5-1.8"/></g>`,
    send: html `<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>`,
    folder: html `<path d="M3 6h7l2 2h9v11H3z"/>`,
    sparkle: html `<g><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z"/><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/></g>`,
    inbox: html `<g><path d="M4 4h16v16H4z"/><path d="M4 14h5l2 3h2l2-3h5"/></g>`,
    home: html `<g><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/></g>`,
    tag: html `<g><path d="M20 13 13 20 4 11V4h7z"/><circle cx="8" cy="8" r="1"/></g>`,
    external: html `<g><path d="M14 3h7v7M21 3l-9 9"/><path d="M18 13v7H4V6h7"/></g>`,
    copy: html `<g><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></g>`,
    grip: html `<g><circle cx="9" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="1" fill="currentColor" stroke="none"/></g>`,
    undo: html `<g><path d="M9 7 4 12l5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/></g>`,
    hardDrive: html `<g><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h.01M11 15h2M3 12h18"/></g>`,
    briefcase: html `<g><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18"/></g>`
};
function Icon(props) {
    const size = props.size || 18;
    return html `<svg aria-hidden="true" width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className=${props.className || ""}>${iconPaths[props.name] || iconPaths.help}</svg>`;
}
function ActorPill(props) {
    if (!props.actor)
        return html `<span className="bic-pill"><span className="actor-avatar" style=${{ background: "#6b778c" }}>?</span><span className="actor-name">Unassigned</span></span>`;
    return html `<span className="bic-pill" title=${props.actor.organization || props.actor.name}><span className="actor-avatar" style=${{ background: props.actor.color }}>${initials(props.actor.name)}</span>${props.compact ? null : html `<span className="actor-name">${props.actor.name}</span>`}</span>`;
}
function DueChip(props) {
    return html `<span className=${`due-chip ${dueClass(props.date)}`}><${Icon} name="calendar" size=${13}/>${formatDate(props.date, true)}</span>`;
}
function StatusBadge(props) {
    if (!props.status)
        return null;
    return html `<span className="badge badge-status" style=${{ color: props.status.color, background: `${props.status.color}18` }}>${props.status.name}</span>`;
}
function TypeBadge(props) {
    if (!props.type)
        return null;
    return html `<span className="badge" style=${{ color: props.type.color, background: `${props.type.color}18` }}>${props.type.name}</span>`;
}
function PriorityBadge(props) {
    if (!props.priority || props.priority === "None" || props.priority === "Normal")
        return null;
    const color = props.priority === "Critical" ? "var(--danger)" : props.priority === "High" ? "var(--warning)" : "var(--text-2)";
    return html `<span className="badge" style=${{ color }}>${props.priority}</span>`;
}
function Topbar(props) {
    const route = props.route;
    const showViews = route !== "archive" && route !== "settings";
    return html `<header className="topbar">
    <div className="brand" title="Running_Task">
      <div className="brand-mark"><${Icon} name="check" size=${21}/></div>
      <span className="brand-name">Running_Task</span>
    </div>
    <div className="topbar-center">
      <div className="search-wrap">
        <${Icon} name="search" size=${18}/>
        <input id="global-search" className="search-input" type="search" value=${props.search} onInput=${(e) => props.onSearch(e.target.value)} placeholder="Search tasks, checklists, references, BIC…" aria-label="Search all tasks" />
        ${props.search ? html `<button className="btn btn-ghost btn-icon search-clear" onClick=${() => props.onSearch("")} aria-label="Clear search"><${Icon} name="x" size=${15}/></button>` : null}
      </div>
      ${showViews ? html `<div className="segmented" aria-label="Visualization mode">
        ${["board", "list", "calendar", "flow"].map(name => html `<button key=${name} className=${`btn ${route === name ? "active" : ""}`} onClick=${() => props.onRoute(name)} title=${name.charAt(0).toUpperCase() + name.slice(1)}><${Icon} name=${name} size=${16}/><span>${name.charAt(0).toUpperCase() + name.slice(1)}</span></button>`)}
      </div>` : null}
    </div>
    <div className="topbar-actions">
      ${showViews ? html `<button className="btn btn-secondary" onClick=${props.onToggleFilters} aria-expanded=${props.filtersOpen}><${Icon} name="filter" size=${16}/>Filters${props.activeFilterCount ? html `<span className="nav-count">${props.activeFilterCount}</span>` : null}</button>` : null}
      <button className="btn btn-secondary btn-icon" onClick=${props.onUndo} disabled=${!props.undoAvailable} title="Undo last workspace change (Ctrl+Z)" aria-label="Undo last workspace change"><${Icon} name="undo" size=${17}/></button>
      <button className="btn btn-primary" onClick=${props.onCreate}><${Icon} name="plus" size=${18}/>Create Task</button>
      <button
        className=${`save-state ${props.saveState}`}
        title=${props.saveState === "error" ? "The latest local save failed. Select to retry." : props.desktop ? "Stored in the local SQLite database" : "Browser preview stores data in this browser profile"}
        onClick=${props.saveState === "error" ? props.onRetrySave : undefined}
        disabled=${props.saveState !== "error"}
        aria-label=${props.saveState === "error" ? "Local save failed. Retry save." : undefined}
      >
        <span className=${`save-dot ${props.saveState}`}></span>
        ${props.saveState === "saving" ? "Saving…" : props.saveState === "error" ? "Save failed — Retry" : props.desktop ? "Saved locally" : "Preview storage"}
      </button>
      <div className="avatar" title="My Ball in Court">ME</div>
    </div>
  </header>`;
}
function Sidebar(props) {
    const data = props.data;
    const activeCards = data.cards.filter((c) => !isDoneCard(data, c));
    const countTopic = (id) => activeCards.filter(c => c.topicId === id).length;
    const smartCount = (scope) => {
        return activeCards.filter(card => {
            const date = nextDateFor(data, card);
            const offset = dayOffset(date);
            const bic = nextBicFor(data, card);
            if (scope === "today")
                return offset === 0;
            if (scope === "overdue")
                return offset !== null && offset < 0;
            if (scope === "my-ball")
                return !!bic && bic.id === data.settings.myActorId;
            if (scope === "waiting")
                return isWaitingCard(data, card);
            if (scope === "no-date")
                return !date;
            return true;
        }).length;
    };
    const nav = (route, label, icon) => html `<button className=${`nav-item ${props.route === route && !props.scope && !props.selectedTopicId ? "active" : ""}`} onClick=${() => props.onNavigate(route, null, "")}><${Icon} name=${icon} size=${18}/><span className="nav-label">${label}</span></button>`;
    const smart = (scope, label, icon) => html `<button className=${`nav-item ${props.scope === scope ? "active" : ""}`} onClick=${() => props.onNavigate("list", null, scope)}><${Icon} name=${icon} size=${18}/><span className="nav-label">${label}</span><span className="nav-count">${smartCount(scope)}</span></button>`;
    return html `<aside className="sidebar">
    <div className="sidebar-scroll">
      <section className="sidebar-section">
        <div className="sidebar-heading"><span>Workspace</span></div>
        ${nav("dashboard", "Dashboard", "dashboard")}
        ${nav("board", "Board", "board")}
        ${nav("list", "List", "list")}
        ${nav("calendar", "Calendar", "calendar")}
        ${nav("flow", "Flow", "flow")}
      </section>
      <section className="sidebar-section">
        <div className="sidebar-heading"><span>Focus</span></div>
        ${smart("today", "Due Today", "calendar")}
        ${smart("overdue", "Overdue", "alert")}
        ${smart("my-ball", "My Ball", "user")}
        ${smart("waiting", "Waiting On", "clock")}
        ${smart("no-date", "No Date", "help")}
      </section>
      <section className="sidebar-section">
        <div className="sidebar-heading"><span>Topics</span><button className="btn btn-ghost btn-icon btn-small" onClick=${props.onAddTopic} title="Create topic"><${Icon} name="plus" size=${14}/></button></div>
        ${sortRank(data.topics.filter(t => !t.archived)).map(topic => html `<button key=${topic.id} className=${`nav-item ${props.selectedTopicId === topic.id && !props.scope ? "active" : ""}`} onClick=${() => props.onNavigate("board", topic.id, "")}><span className="topic-dot" style=${{ background: topic.color }}></span><span className="nav-label">${topic.name}</span><span className="nav-count">${countTopic(topic.id)}</span></button>`)}
      </section>
      ${data.savedViews.length ? html `<section className="sidebar-section">
        <div className="sidebar-heading"><span>Saved Views</span></div>
        ${data.savedViews.map(view => html `<button key=${view.id} className="nav-item" onClick=${() => props.onSavedView(view)}><${Icon} name="save" size=${17}/><span className="nav-label">${view.name}</span></button>`)}
      </section>` : null}
    </div>
    <div className="sidebar-footer">
      <button className=${`nav-item ${props.route === "archive" ? "active" : ""}`} onClick=${() => props.onNavigate("archive", null, "")}><${Icon} name="archive" size=${18}/><span className="nav-label">Archive & Backups</span><span className="nav-count">${data.cards.filter(c => isDoneCard(data, c)).length}</span></button>
      <button className=${`nav-item ${props.route === "settings" ? "active" : ""}`} onClick=${() => props.onNavigate("settings", null, "")}><${Icon} name="settings" size=${18}/><span className="nav-label">Settings</span></button>
    </div>
  </aside>`;
}
function PageHeader(props) {
    return html `<div className="page-header">
    <div className="page-heading"><div className="eyebrow">${props.eyebrow || "Running_Task"}</div><h1 className="page-title">${props.title}</h1>${props.subtitle ? html `<div className="page-subtitle">${props.subtitle}</div>` : null}</div>
    <div className="page-actions">${props.children}</div>
  </div>`;
}
function ActiveFilterBar(props) {
    const chips = [];
    const data = props.data;
    if (props.selectedTopicId) {
        const topic = topicById(data, props.selectedTopicId);
        if (topic)
            chips.push(html `<span className="filter-chip" key="topic"><span className="topic-dot" style=${{ background: topic.color }}></span>${topic.name}<button onClick=${() => props.onClearTopic()}><${Icon} name="x" size=${13}/></button></span>`);
    }
    if (props.scope)
        chips.push(html `<span className="filter-chip" key="scope">${String(props.scope).replace(/-/g, " ")}<button onClick=${() => props.onClearScope()}><${Icon} name="x" size=${13}/></button></span>`);
    if (props.filters.statusId) {
        const s = statusById(data, props.filters.statusId);
        if (s)
            chips.push(html `<span className="filter-chip" key="status">Status: ${s.name}<button onClick=${() => props.onFilter("statusId", "")}><${Icon} name="x" size=${13}/></button></span>`);
    }
    if (props.filters.bicId) {
        const a = actorById(data, props.filters.bicId);
        if (a)
            chips.push(html `<span className="filter-chip" key="bic">BIC: ${a.name}<button onClick=${() => props.onFilter("bicId", "")}><${Icon} name="x" size=${13}/></button></span>`);
    }
    if (props.filters.due !== "all")
        chips.push(html `<span className="filter-chip" key="due">Due: ${props.filters.due}<button onClick=${() => props.onFilter("due", "all")}><${Icon} name="x" size=${13}/></button></span>`);
    if (props.filters.priority)
        chips.push(html `<span className="filter-chip" key="priority">Priority: ${props.filters.priority}<button onClick=${() => props.onFilter("priority", "")}><${Icon} name="x" size=${13}/></button></span>`);
    if (!chips.length)
        return null;
    return html `<div className="filter-bar">${chips}<div className="filter-spacer"></div><button className="btn btn-ghost btn-small" onClick=${props.onClearAll}>Clear all</button></div>`;
}
function TaskCard(props) {
    const data = props.data;
    const card = props.card;
    const status = statusById(data, card.statusId);
    const type = typeById(data, card.cardTypeId);
    const next = nextItemFor(data, card);
    const nextDate = nextDateFor(data, card);
    const bic = nextBicFor(data, card);
    const progress = progressFor(data, card);
    const items = checklistFor(data, card.id);
    return html `<article className=${`task-card ${props.dragging ? "dragging" : ""}`} draggable=${true}
    onDragStart=${(e) => props.onDragStart(e, card.id)} onDragEnd=${props.onDragEnd} onClick=${() => props.onOpen(card.id)}>
    <div className="card-main">
      <div className="card-topline"><div className="card-title-wrap">${card.reference ? html `<div className="card-reference">${card.reference}</div>` : null}<div className="card-title">${card.title}</div>${data.settings.showDescriptions && card.description ? html `<div className="card-description">${card.description}</div>` : null}</div>
        ${items.length ? html `<button className="expand-button" onClick=${(e) => { stop(e); props.onToggleExpand(card.id); }} aria-label=${props.expanded ? "Collapse checklist" : "Expand checklist"}><${Icon} name=${props.expanded ? "chevronDown" : "chevronRight"} size=${16}/></button>` : null}
      </div>
      <div className="card-badges"><${StatusBadge} status=${status}/><${TypeBadge} type=${type}/><${PriorityBadge} priority=${card.priority}/></div>
      <div className="card-next"><div className="card-next-label">Next action</div><div className="card-next-title">${next ? next.title : card.targetDate ? "Overall target date" : "No next action defined"}</div></div>
      <div className="card-footer">
        <div className="progress-wrap"><div className="progress-track"><div className="progress-fill" style=${{ width: `${progress.percent}%` }}></div></div><span className="progress-label">${progress.done}/${progress.total}</span></div>
        <${DueChip} date=${nextDate}/><${ActorPill} actor=${bic} compact=${true}/>
      </div>
    </div>
    ${props.expanded && items.length ? html `<div className="card-checklist">${items.slice(0, 8).map(item => html `<label key=${item.id} className=${`quick-check ${item.completed ? "completed" : ""}`} style=${{ paddingLeft: item.parentId ? "19px" : "2px" }} onClick=${stop}><input type="checkbox" checked=${item.completed} onChange=${() => props.onToggleItem(item.id)}/><span>${item.title}</span><span className="quick-check-meta">${item.dueDate ? formatDate(item.dueDate, true) : ""}</span></label>`)}${items.length > 8 ? html `<button className="btn btn-ghost btn-small btn-wide" onClick=${(e) => { stop(e); props.onOpen(card.id); }}>Open all ${items.length} items</button>` : null}</div>` : null}
  </article>`;
}
function BoardView(props) {
    var _a;
    const data = props.data;
    const axis = data.settings.boardAxis;
    const allCards = props.cards;
    const columns = axis === "topic"
        ? sortRank(data.topics.filter(t => !t.archived && (!props.selectedTopicId || t.id === props.selectedTopicId))).map(topic => ({ id: topic.id, title: topic.name, color: topic.color, kind: "topic" }))
        : sortRank(data.statuses.filter(s => !s.terminal)).map(status => ({ id: status.id, title: status.name, color: status.color, kind: "status" }));
    const cardsFor = (col) => allCards.filter(c => axis === "topic" ? c.topicId === col.id : c.statusId === col.id).sort((a, b) => a.rank - b.rank);
    const renderColumnBody = (col) => {
        const cards = cardsFor(col);
        if (!cards.length)
            return html `<div className="empty-column">Drop a task here or create a new one.</div>`;
        if (axis === "status")
            return cards.map(card => html `<${TaskCard} key=${card.id} data=${data} card=${card} expanded=${props.expanded.has(card.id)} dragging=${props.draggingId === card.id} onOpen=${props.onOpen} onToggleExpand=${props.onToggleExpand} onToggleItem=${props.onToggleItem} onDragStart=${props.onDragStart} onDragEnd=${props.onDragEnd}/>`);
        const subtopics = sortRank(data.subtopics.filter(s => !s.archived && s.topicId === col.id));
        const grouped = subtopics.map(sub => ({ id: sub.id, title: sub.name, cards: cards.filter(c => c.subtopicId === sub.id) })).filter(g => g.cards.length);
        const ungrouped = cards.filter(c => !c.subtopicId || !subtopics.some(s => s.id === c.subtopicId));
        if (ungrouped.length)
            grouped.unshift({ id: "none", title: "General", cards: ungrouped });
        return grouped.map(group => html `<section className="subtopic-group" key=${group.id}><div className="subtopic-header">${group.title}<span>${group.cards.length}</span></div>${group.cards.map(card => html `<${TaskCard} key=${card.id} data=${data} card=${card} expanded=${props.expanded.has(card.id)} dragging=${props.draggingId === card.id} onOpen=${props.onOpen} onToggleExpand=${props.onToggleExpand} onToggleItem=${props.onToggleItem} onDragStart=${props.onDragStart} onDragEnd=${props.onDragEnd}/>`)} </section>`);
    };
    return html `<div className="view-contents">
    <${PageHeader} eyebrow=${props.selectedTopicId ? "Topic workspace" : "All active topics"} title=${props.selectedTopicId ? (((_a = topicById(data, props.selectedTopicId)) === null || _a === void 0 ? void 0 : _a.name) || "Board") : "Board"} subtitle=${axis === "topic" ? "Columns are Topics. Cards are grouped by Subtopic." : "Columns are active Statuses. Done tasks move to Archive."}>
      <div className="segmented"><button className=${`btn ${axis === "topic" ? "active" : ""}`} onClick=${() => props.onAxis("topic")}><${Icon} name="layers" size=${15}/>Topics</button><button className=${`btn ${axis === "status" ? "active" : ""}`} onClick=${() => props.onAxis("status")}><${Icon} name="flow" size=${15}/>Statuses</button></div>
      <button className="btn btn-secondary" onClick=${props.onExpandAll}>${props.allExpanded ? "Collapse all" : "Expand all"}</button>
    <//>
    <${ActiveFilterBar} data=${data} selectedTopicId=${props.selectedTopicId} scope=${props.scope} filters=${props.filters} onClearTopic=${props.onClearTopic} onClearScope=${props.onClearScope} onFilter=${props.onFilter} onClearAll=${props.onClearFilters}/>
    <div className="content-scroll flush"><div className="board-scroll"><div className="board">
      ${columns.map(col => html `<section key=${col.id} className=${`board-column ${props.dragOverId === col.id ? "drag-over" : ""}`} onDragOver=${(e) => props.onDragOver(e, col.id)} onDragLeave=${props.onDragLeave} onDrop=${(e) => props.onDrop(e, col.id, col.kind)}>
        <div className="column-header"><span className="topic-dot" style=${{ background: col.color }}></span><span className="column-title">${col.title}</span><span className="column-count">${cardsFor(col).length}</span><button className="btn btn-ghost btn-icon btn-small" onClick=${() => props.onQuickCreate(col)} title="Create task here"><${Icon} name="plus" size=${15}/></button></div>
        <div className="column-body">${renderColumnBody(col)}</div>
      </section>`)}
      ${axis === "topic" && !props.selectedTopicId ? html `<button className="add-column" onClick=${props.onAddTopic}><${Icon} name="plus" size=${16}/> Create Topic</button>` : null}
    </div></div></div>
  </div>`;
}
function ListView(props) {
    const data = props.data;
    const cards = props.cards.slice().sort((a, b) => {
        const da = nextDateFor(data, a) || "9999-99-99";
        const db = nextDateFor(data, b) || "9999-99-99";
        return da.localeCompare(db) || a.rank - b.rank;
    });
    return html `<div className="view-contents">
    <${PageHeader} eyebrow=${props.scope ? "Smart view" : "Workspace"} title=${props.title || "Task List"} subtitle="A dense, sortable view with expandable task checklists.">
      <button className="btn btn-secondary" onClick=${props.onExpandAll}>${props.allExpanded ? "Collapse all" : "Expand all"}</button>
    <//>
    <${ActiveFilterBar} data=${data} selectedTopicId=${props.selectedTopicId} scope=${props.scope} filters=${props.filters} onClearTopic=${props.onClearTopic} onClearScope=${props.onClearScope} onFilter=${props.onFilter} onClearAll=${props.onClearFilters}/>
    <div className="content-scroll">
      ${cards.length ? html `<div className="data-table">
        <div className="table-head"><div>Task</div><div>Topic</div><div>Subtopic</div><div>Status</div><div>Next Date</div><div>Ball in Court</div><div>Progress</div></div>
        ${cards.map(card => {
        const topic = topicById(data, card.topicId);
        const sub = subtopicById(data, card.subtopicId);
        const status = statusById(data, card.statusId);
        const bic = nextBicFor(data, card);
        const prog = progressFor(data, card);
        const items = checklistFor(data, card.id);
        const expanded = props.expanded.has(card.id);
        return html `<div key=${card.id}>
            <div className="table-row" onClick=${() => props.onOpen(card.id)}>
              <div className="table-task"><button className="expand-button" onClick=${(e) => { stop(e); props.onToggleExpand(card.id); }} disabled=${!items.length}><${Icon} name=${expanded ? "chevronDown" : "chevronRight"} size=${15}/></button><div className="card-title-wrap"><div className="table-title">${card.title}</div>${card.reference ? html `<div className="table-ref">${card.reference}</div>` : null}</div></div>
              <div className="table-cell-muted"><span className="topic-dot" style=${{ background: (topic === null || topic === void 0 ? void 0 : topic.color) || "#6b778c", display: "inline-block", marginRight: "6px" }}></span>${(topic === null || topic === void 0 ? void 0 : topic.name) || "—"}</div>
              <div className="table-cell-muted">${(sub === null || sub === void 0 ? void 0 : sub.name) || "—"}</div>
              <div><${StatusBadge} status=${status}/></div>
              <div><${DueChip} date=${nextDateFor(data, card)}/></div>
              <div><${ActorPill} actor=${bic}/></div>
              <div><div className="progress-wrap"><div className="progress-track"><div className="progress-fill" style=${{ width: `${prog.percent}%` }}></div></div><span className="progress-label">${prog.done}/${prog.total}</span></div></div>
            </div>
            ${expanded ? html `<div className="table-checklist">${items.length ? items.map(item => html `<label key=${item.id} className=${`table-check-row ${item.completed ? "completed" : ""}`} style=${{ paddingLeft: item.parentId ? "24px" : "0" }} onClick=${stop}><input type="checkbox" checked=${item.completed} onChange=${() => props.onToggleItem(item.id)}/><span>${item.title}</span><span>${item.dueDate ? formatDate(item.dueDate) : "No date"}</span><${ActorPill} actor=${actorById(data, item.bicId)}/></label>`) : html `<div className="panel-empty">No checklist items yet.</div>`}</div>` : null}
          </div>`;
    })}
      </div>` : html `<${EmptyState} icon="list" title="No tasks match this view" copy="Clear a filter or create a new task to get started." onAction=${props.onCreate} action="Create Task"/>`}
    </div>
  </div>`;
}
function CalendarView(props) {
    const data = props.data;
    const cards = props.cards;
    const days = calendarDaysForMonth(props.month);
    const monthStart = parseMonthKey(props.month);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 12, 0, 0, 0);
    const datedCards = cards.filter(card => !!nextDateFor(data, card));
    const unscheduled = cards.filter(card => !nextDateFor(data, card));
    const visibleMonthCount = datedCards.filter(card => {
        const date = parseDateOnly(nextDateFor(data, card));
        return !!date && date >= monthStart && date <= monthEnd;
    }).length;
    const cardsOn = (key) => datedCards
        .filter(card => nextDateFor(data, card) === key)
        .sort((a, b) => {
        var _a, _b;
        const topicA = ((_a = topicById(data, a.topicId)) === null || _a === void 0 ? void 0 : _a.rank) || 9999;
        const topicB = ((_b = topicById(data, b.topicId)) === null || _b === void 0 ? void 0 : _b.rank) || 9999;
        return topicA - topicB || a.rank - b.rank || a.title.localeCompare(b.title);
    });
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return html `<div className="view-contents">
    <${PageHeader} eyebrow=${props.selectedTopicId ? "Topic schedule" : "Monthly schedule"} title=${formatMonth(props.month)} subtitle="Each task is placed on the date of its earliest incomplete checklist item, with the overall target date as fallback.">
      ${unscheduled.length ? html `<button className="btn btn-secondary" onClick=${() => props.onNavigate("list", props.selectedTopicId || null, "no-date")}><${Icon} name="help" size=${15}/>${unscheduled.length} unscheduled</button>` : null}
      <div className="calendar-nav" aria-label="Calendar month navigation">
        <button className="btn btn-secondary btn-icon" onClick=${() => props.onMonth(shiftMonth(props.month, -1))} aria-label="Previous month"><${Icon} name="arrowLeft" size=${17}/></button>
        <button className="btn btn-secondary" onClick=${() => props.onMonth(currentMonthKey())}>Today</button>
        <button className="btn btn-secondary btn-icon" onClick=${() => props.onMonth(shiftMonth(props.month, 1))} aria-label="Next month"><${Icon} name="arrowRight" size=${17}/></button>
      </div>
    <//>
    <${ActiveFilterBar} data=${data} selectedTopicId=${props.selectedTopicId} scope=${props.scope} filters=${props.filters} onClearTopic=${props.onClearTopic} onClearScope=${props.onClearScope} onFilter=${props.onFilter} onClearAll=${props.onClearFilters}/>
    <div className="content-scroll calendar-scroll">
      <div className="calendar-summary"><span><strong>${visibleMonthCount}</strong> scheduled ${visibleMonthCount === 1 ? "task" : "tasks"} this month</span><span>Monday–Sunday · Click <strong>+</strong> on a day to schedule a task</span></div>
      <section className="calendar-shell" aria-label=${`Monthly calendar for ${formatMonth(props.month)}`}>
        <div className="calendar-weekdays">${weekdays.map(name => html `<div className="calendar-weekday" key=${name}>${name}</div>`)}</div>
        <div className="calendar-grid">
          ${days.map(day => {
        const dayCards = cardsOn(day.key);
        const weekend = day.date.getDay() === 0 || day.date.getDay() === 6;
        return html `<article key=${day.key} className=${`calendar-day ${day.inMonth ? "" : "outside"} ${day.isToday ? "today" : ""} ${weekend ? "weekend" : ""}`}>
              <div className="calendar-day-header">
                <span className="calendar-date" aria-current=${day.isToday ? "date" : undefined}>${calendarDayLabel(day)}</span>
                <button className="calendar-day-add" onClick=${() => props.onCreateDate(day.key)} title=${`Create task due ${day.key}`} aria-label=${`Create task due ${day.key}`}><${Icon} name="plus" size=${13}/></button>
              </div>
              <div className="calendar-day-events">
                ${dayCards.map(card => {
            const topic = topicById(data, card.topicId);
            const type = typeById(data, card.cardTypeId);
            const status = statusById(data, card.statusId);
            const bic = nextBicFor(data, card);
            const next = nextItemFor(data, card);
            return html `<button key=${card.id} className=${`calendar-event ${dueClass(day.key)}`} style=${{ borderLeftColor: (topic === null || topic === void 0 ? void 0 : topic.color) || "var(--muted)" }} onClick=${() => props.onOpen(card.id)} title=${`${card.reference ? `${card.reference} — ` : ""}${card.title}${next ? `
Next: ${next.title}` : ""}${bic ? `
BIC: ${bic.name}` : ""}`}>
                    <span className="calendar-event-title">${card.reference ? html `<span className="calendar-event-ref">${card.reference}</span>` : null}${card.title}</span>
                    <span className="calendar-event-meta"><span className="calendar-event-topic"><span className="calendar-event-dot" style=${{ background: (topic === null || topic === void 0 ? void 0 : topic.color) || "var(--muted)" }}></span>${(topic === null || topic === void 0 ? void 0 : topic.name) || "No topic"}</span>${type ? html `<span className="calendar-event-type" style=${{ color: type.color }}>${type.name}</span>` : null}${status ? html `<span className="calendar-event-status" style=${{ color: status.color }}>${status.name}</span>` : null}</span>
                  </button>`;
        })}
                ${!dayCards.length && day.inMonth ? html `<button className="calendar-empty-add" onClick=${() => props.onCreateDate(day.key)}>Add task</button>` : null}
              </div>
            </article>`;
    })}
        </div>
      </section>
    </div>
  </div>`;
}
function FlowView(props) {
    const data = props.data;
    const cards = props.cards.slice().sort((a, b) => (nextDateFor(data, a) || "9999").localeCompare(nextDateFor(data, b) || "9999"));
    return html `<div className="view-contents">
    <${PageHeader} eyebrow="Handoff sequence" title="Flow" subtitle="Open checklist steps in date order, with the Ball in Court visible at every handoff." />
    <${ActiveFilterBar} data=${data} selectedTopicId=${props.selectedTopicId} scope=${props.scope} filters=${props.filters} onClearTopic=${props.onClearTopic} onClearScope=${props.onClearScope} onFilter=${props.onFilter} onClearAll=${props.onClearFilters}/>
    <div className="content-scroll">
      ${cards.length ? html `<div className="flow-list">${cards.map(card => {
        const open = openChecklistFor(data, card.id).slice().sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || a.rank - b.rank);
        const topic = topicById(data, card.topicId);
        const sub = subtopicById(data, card.subtopicId);
        return html `<div key=${card.id} className="flow-row" onClick=${() => props.onOpen(card.id)} onKeyDown=${activateOnKey(() => props.onOpen(card.id))} role="button" tabIndex="0">
          <div><div className="flow-card-title">${card.reference ? `${card.reference} — ` : ""}${card.title}</div><div className="flow-card-meta"><span className="topic-dot" style=${{ background: (topic === null || topic === void 0 ? void 0 : topic.color) || "#6b778c", display: "inline-block", marginRight: "6px" }}></span>${(topic === null || topic === void 0 ? void 0 : topic.name) || "No topic"}${sub ? ` · ${sub.name}` : ""}</div></div>
          ${open.length ? html `<div className="flow-track">${open.map((item, index) => html `<div className="flow-node-wrap" key=${item.id}><div className=${`flow-node ${index === 0 ? "current" : ""} ${dayOffset(item.dueDate) !== null && dayOffset(item.dueDate) < 0 ? "overdue" : ""}`}><div className="flow-node-date"><span>${item.dueDate ? formatDate(item.dueDate, true) : "No date"}</span><${ActorPill} actor=${actorById(data, item.bicId)} compact=${true}/></div><div className="flow-node-title">${item.title}</div></div>${index < open.length - 1 ? html `<div className="flow-connector"></div>` : null}</div>`)}</div>` : html `<div className="flow-empty">No open checklist steps</div>`}
        </div>`;
    })}</div>` : html `<${EmptyState} icon="flow" title="No flow to display" copy="Tasks with open checklist items will appear here." onAction=${props.onCreate} action="Create Task"/>`}
    </div>
  </div>`;
}
function MiniTask(props) {
    const data = props.data;
    const card = props.card;
    const topic = topicById(data, card.topicId);
    const bic = nextBicFor(data, card);
    return html `<button className="mini-task" onClick=${() => props.onOpen(card.id)}><div><div className="mini-title">${card.reference ? `${card.reference} — ` : ""}${card.title}</div><div className="mini-meta"><span className="topic-dot" style=${{ background: (topic === null || topic === void 0 ? void 0 : topic.color) || "#6b778c", display: "inline-block", marginRight: "5px" }}></span>${(topic === null || topic === void 0 ? void 0 : topic.name) || "No topic"} · ${(bic === null || bic === void 0 ? void 0 : bic.name) || "Unassigned"}</div></div><${DueChip} date=${nextDateFor(data, card)}/></button>`;
}
function DashboardPanel(props) {
    return html `<section className="panel"><div className="panel-header"><${Icon} name=${props.icon} size=${17}/><div className="panel-title">${props.title}</div><div className="panel-count">${props.cards.length}</div></div><div className="panel-body">${props.cards.length ? props.cards.slice(0, 6).map((card) => html `<${MiniTask} key=${card.id} data=${props.data} card=${card} onOpen=${props.onOpen}/>`) : html `<div className="panel-empty">Nothing here right now.</div>`}</div></section>`;
}
function DashboardView(props) {
    const data = props.data;
    const cards = props.cards;
    const overdue = cards.filter(c => { const d = dayOffset(nextDateFor(data, c)); return d !== null && d < 0; });
    const today = cards.filter(c => dayOffset(nextDateFor(data, c)) === 0);
    const mine = cards.filter(c => { var _a; return ((_a = nextBicFor(data, c)) === null || _a === void 0 ? void 0 : _a.id) === data.settings.myActorId; });
    const waiting = cards.filter(c => isWaitingCard(data, c));
    const noDate = cards.filter(c => !nextDateFor(data, c));
    const upcoming = cards.filter(c => { const d = dayOffset(nextDateFor(data, c)); return d !== null && d >= 0 && d <= 7; }).sort((a, b) => String(nextDateFor(data, a)).localeCompare(String(nextDateFor(data, b))));
    const metrics = [
        { label: "Due today", value: today.length, helper: "Needs attention", scope: "today" },
        { label: "Overdue", value: overdue.length, helper: "Open next actions", scope: "overdue" },
        { label: "My ball", value: mine.length, helper: "Assigned to me", scope: "my-ball" },
        { label: "Waiting on", value: waiting.length, helper: "Other parties", scope: "waiting" },
        { label: "No date", value: noDate.length, helper: "Needs scheduling", scope: "no-date" }
    ];
    return html `<div className="view-contents"><${PageHeader} eyebrow="Personal operations" title="Dashboard" subtitle="What needs to happen next, by when, and whose ball is it?">
    <button className="btn btn-secondary" onClick=${() => props.onNavigate("list", null, "my-ball")}><${Icon} name="user" size=${16}/>Open My Ball</button>
  <//><div className="content-scroll">
    <div className="metric-grid">${metrics.map(m => html `<div className="metric-card" key=${m.label} onClick=${() => props.onNavigate("list", null, m.scope)} onKeyDown=${activateOnKey(() => props.onNavigate("list", null, m.scope))} role="button" tabIndex="0"><div className="metric-label">${m.label}</div><div className="metric-value">${m.value}</div><div className="metric-helper">${m.helper}</div></div>`)}</div>
    <div className="dashboard-grid">
      <${DashboardPanel} title="My next actions" icon="user" cards=${mine.sort((a, b) => String(nextDateFor(data, a)).localeCompare(String(nextDateFor(data, b))))} data=${data} onOpen=${props.onOpen}/>
      <${DashboardPanel} title="Waiting on others" icon="clock" cards=${waiting} data=${data} onOpen=${props.onOpen}/>
      <${DashboardPanel} title="Upcoming — next 7 days" icon="calendar" cards=${upcoming} data=${data} onOpen=${props.onOpen}/>
      <section className="panel"><div className="panel-header"><${Icon} name="layers" size=${17}/><div className="panel-title">Topic workload</div><div className="panel-count">${cards.length} active</div></div><div className="panel-body">${sortRank(data.topics.filter(t => !t.archived)).map(topic => { const count = cards.filter(c => c.topicId === topic.id).length; return html `<div className="topic-health" key=${topic.id}><div><div className="topic-health-name"><span className="topic-dot" style=${{ background: topic.color }}></span>${topic.name}</div><div className="progress-track" style=${{ marginTop: "7px" }}><div className="progress-fill" style=${{ width: `${cards.length ? Math.max(3, count / cards.length * 100) : 0}%`, background: topic.color }}></div></div></div><div className="topic-health-count">${count} tasks</div></div>`; })}</div></section>
    </div>
  </div></div>`;
}
function activateOnKey(handler) {
    return (event) => {
        if (event.key !== "Enter" && event.key !== " ")
            return;
        event.preventDefault();
        handler();
    };
}
function EmptyState(props) {
    return html `<div className="empty-state"><div><div className="empty-icon"><${Icon} name=${props.icon} size=${26}/></div><div className="empty-title">${props.title}</div><div className="empty-copy">${props.copy}</div>${props.onAction ? html `<button className="btn btn-primary" onClick=${props.onAction}><${Icon} name="plus" size=${16}/>${props.action || "Create Task"}</button>` : null}</div></div>`;
}
function ArchiveView(props) {
    var _a, _b;
    const data = props.data;
    const cards = data.cards.filter(c => isDoneCard(data, c)).sort((a, b) => String(b.completedAt || b.updatedAt).localeCompare(String(a.completedAt || a.updatedAt)));
    const handleFile = (event) => {
        const file = event.target.files && event.target.files[0];
        if (file)
            props.onImportFile(file);
        event.target.value = "";
    };
    return html `<div className="view-contents"><${PageHeader} eyebrow="Completed work and data safety" title="Archive & Backups" subtitle="Completed tasks are kept here and excluded from active workspaces.">
    <button className="btn btn-secondary" onClick=${props.onRefresh}><${Icon} name="rotate" size=${16}/>Refresh</button>
    <button className="btn btn-primary" onClick=${props.onBackup} disabled=${props.backupBusy}><${Icon} name="save" size=${16}/>${props.backupBusy ? "Working..." : "Back Up Now"}</button>
  <//><div className="content-scroll"><div className="archive-layout">
    <section className="panel"><div className="panel-header"><${Icon} name="archive" size=${17}/><div className="panel-title">Completed and archived tasks</div><div className="panel-count">${cards.length}</div></div><div className="panel-body" style=${{ padding: 0 }}>
      ${cards.length ? cards.map(card => { const topic = topicById(data, card.topicId); return html `<div className="archive-card" key=${card.id}><div><div className="table-title">${card.reference ? `${card.reference} - ` : ""}${card.title}</div><div className="table-ref">${(topic === null || topic === void 0 ? void 0 : topic.name) || "No topic"} - ${card.archiveReason === "completed" ? "Completed" : "Archived"}</div></div><div className="table-cell-muted">${card.completedAt ? formatTimestamp(card.completedAt) : formatTimestamp(card.updatedAt)}</div><div><${StatusBadge} status=${statusById(data, card.statusId)}/></div><div className="archive-actions"><button className="btn btn-secondary btn-small" onClick=${() => props.onRestoreCard(card.id)}><${Icon} name="undo" size=${14}/>Restore</button><button className="btn btn-danger btn-icon btn-small" title="Permanently delete" onClick=${() => props.onDeleteCard(card.id)}><${Icon} name="trash" size=${14}/></button></div></div>`; }) : html `<div className="panel-empty">Completed tasks will be stored here.</div>`}
    </div></section>
    <div className="archive-side">
      <section className="panel"><div className="panel-header"><${Icon} name="hardDrive" size=${17}/><div className="panel-title">Backup center</div></div><div className="backup-card">
        <div className="setting-label">Local data location</div><div className="setting-help">${((_a = props.storageInfo) === null || _a === void 0 ? void 0 : _a.mode) || "Loading..."}</div><div className="storage-path">${((_b = props.storageInfo) === null || _b === void 0 ? void 0 : _b.dataPath) || "Loading local storage information..."}</div>
        <div className="backup-actions"><button className="btn btn-primary btn-small" onClick=${props.onBackup} disabled=${props.backupBusy}><${Icon} name="save" size=${14}/>Create backup</button>${props.desktop ? html `<button className="btn btn-secondary btn-small" onClick=${props.onOpenFolder}><${Icon} name="folder" size=${14}/>Open data folder</button>` : null}</div>
        <div className="setting-label">Available backups</div><div className="setting-help">Restore creates a safety backup first, then reloads the workspace.</div>
        <div className="backup-list">${props.backups.length ? props.backups.map((b) => html `<div className="backup-row" key=${b.id}><div><div className="backup-name" title=${b.path}>${b.name}</div><div className="backup-meta">${formatTimestamp(b.createdAt)} - ${bytes(b.sizeBytes)}</div></div><div className="archive-actions"><button className="btn btn-secondary btn-icon btn-small" title="Restore this backup" onClick=${() => props.onRestoreBackup(b.id)}><${Icon} name="rotate" size=${14}/></button><button className="btn btn-danger btn-icon btn-small" title="Delete this backup" onClick=${() => props.onDeleteBackup(b.id)}><${Icon} name="trash" size=${14}/></button></div></div>`) : html `<div className="panel-empty">No backups yet.</div>`}</div>
      </div></section>
      <section className="panel"><div className="panel-header"><${Icon} name="fileText" size=${17}/><div className="panel-title">Import and export</div></div><div className="backup-card">
        <div className="setting-label">Portable workspace files</div><div className="setting-help">JSON is the full round-trip format. CSV and Markdown are readable snapshots for Excel, review, and records.</div>
        <div className="backup-actions"><button className="btn btn-secondary btn-small" onClick=${props.onExportJson}><${Icon} name="download" size=${14}/>Export JSON</button><button className="btn btn-secondary btn-small" onClick=${props.onExportCsv}><${Icon} name="download" size=${14}/>Export CSV</button><button className="btn btn-secondary btn-small" onClick=${props.onExportMarkdown}><${Icon} name="download" size=${14}/>Export Markdown</button></div>
        <label className="btn btn-primary btn-small file-import-button"><${Icon} name="upload" size=${14}/>Import JSON<input className="visually-hidden" type="file" accept=".json,application/json" onChange=${handleFile}/></label>
        <div className="import-safety-note"><${Icon} name="save" size=${15}/><span>Before an approved import replaces the workspace, Running_Task creates a safety backup of the current data.</span></div>
      </div></section>
    </div>
  </div></div></div>`;
}
function SettingsView(props) {
    var _a;
    const data = props.data;
    const topicRows = sortRank(data.topics.filter(t => !t.archived));
    const actorRows = sortRank(data.actors.filter(a => !a.archived));
    const typeRows = sortRank(data.cardTypes.filter(t => !t.archived));
    const statusRows = sortRank(data.statuses);
    return html `<div className="view-contents"><${PageHeader} eyebrow="Workspace configuration" title="Settings" subtitle="Customize the default workspace layout, local startup behavior, and your hierarchy." />
    <div className="content-scroll"><div className="settings-layout">
      <section className="settings-card"><div className="settings-card-header"><div className="settings-card-title">Workspace</div><div className="settings-card-desc">Choose how the active Board is structured. Topic columns are the default.</div></div>
        <div className="setting-row"><div className="setting-copy"><div className="setting-label">Board columns</div><div className="setting-help">Completed tasks never appear in either active layout.</div></div><div className="radio-cards"><button className=${`radio-card ${data.settings.boardAxis === "topic" ? "active" : ""}`} onClick=${() => props.onSetting("boardAxis", "topic")}><div className="radio-card-title">Per Topic</div><div className="radio-card-help">General, packages, areas</div></button><button className=${`radio-card ${data.settings.boardAxis === "status" ? "active" : ""}`} onClick=${() => props.onSetting("boardAxis", "status")}><div className="radio-card-title">Per Status</div><div className="radio-card-help">To Do through Review</div></button></div></div>
        <div className="setting-row"><div className="setting-copy"><div className="setting-label">Launch when the computer starts</div><div className="setting-help">Enabled by default for the installed desktop application.</div></div><button className=${`switch ${data.settings.autostart ? "on" : ""}`} onClick=${() => props.onAutostart(!data.settings.autostart)} aria-label="Toggle launch at startup"></button></div>
        <div className="setting-row"><div className="setting-copy"><div className="setting-label">Theme</div><div className="setting-help">Applied immediately and stored locally.</div></div><select className="select" style=${{ width: "160px" }} value=${data.settings.theme} onChange=${(e) => props.onSetting("theme", e.target.value)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></div>
        <div className="setting-row"><div className="setting-copy"><div className="setting-label">Information density</div><div className="setting-help">Compact hides descriptions on Board cards.</div></div><select className="select" style=${{ width: "160px" }} value=${data.settings.density} onChange=${(e) => props.onSetting("density", e.target.value)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></div>
        <div className="setting-row"><div className="setting-copy"><div className="setting-label">Show card descriptions</div><div className="setting-help">Descriptions remain available in the task drawer.</div></div><button className=${`switch ${data.settings.showDescriptions ? "on" : ""}`} onClick=${() => props.onSetting("showDescriptions", !data.settings.showDescriptions)} aria-label="Toggle card descriptions"></button></div>
        <div className="setting-row"><div className="setting-copy"><div className="setting-label">Automatic backup retention</div><div className="setting-help">The desktop app keeps one automatic SQLite backup per active day. Manual and pre-restore backups remain until you delete them.</div></div><select className="select" style=${{ width: "180px" }} value=${String(data.settings.backupRetention)} onChange=${(e) => props.onSetting("backupRetention", Number(e.target.value))}><option value="7">7 automatic backups</option><option value="14">14 automatic backups</option><option value="30">30 automatic backups</option><option value="60">60 automatic backups</option><option value="90">90 automatic backups</option></select></div>
      </section>

      <section className="settings-card"><div className="settings-card-header"><div className="settings-card-title">Topics and Subtopics</div><div className="settings-card-desc">A Topic is a workspace column. Subtopics organize cards inside each Topic.</div></div><div className="entity-toolbar"><span>${topicRows.length} active Topics</span><button className="btn btn-primary btn-small" onClick=${() => props.onEntityDialog("topic")}><${Icon} name="plus" size=${14}/>Add Topic</button></div><div className="entity-list">${topicRows.map(topic => {
        const subs = sortRank(data.subtopics.filter(s => !s.archived && s.topicId === topic.id));
        return html `<div className="entity-row entity-row-tall" key=${topic.id}><span className="topic-dot" style=${{ background: topic.color }}></span><div className="entity-name entity-name-stack"><div>${topic.name}</div><div className="subtopic-chips">${subs.length ? subs.map(sub => html `<button key=${sub.id} className="subtopic-chip" onClick=${() => props.onEntityDialog("subtopic", topic.id, sub)} title="Edit subtopic">${sub.name}<${Icon} name="edit" size=${11}/></button>`) : html `<span className="entity-meta">No subtopics</span>`}</div></div><button className="btn btn-ghost btn-icon btn-small" title="Add subtopic" onClick=${() => props.onEntityDialog("subtopic", topic.id)}><${Icon} name="plus" size=${14}/></button><button className="btn btn-ghost btn-icon btn-small" title="Rename topic" onClick=${() => props.onEntityDialog("topic", null, topic)}><${Icon} name="edit" size=${14}/></button></div>`;
    })}</div></section>

      <section className="settings-card"><div className="settings-card-header"><div className="settings-card-title">Ball in Court</div><div className="settings-card-desc">People, companies, teams, or roles that can own the next action.</div></div><div className="entity-toolbar"><span>${actorRows.length} active BIC actors</span><button className="btn btn-primary btn-small" onClick=${() => props.onEntityDialog("actor")}><${Icon} name="plus" size=${14}/>Add BIC</button></div><div className="entity-list">${actorRows.map(actor => html `<div className="entity-row" key=${actor.id}><span className="actor-avatar" style=${{ background: actor.color }}>${initials(actor.name)}</span><div className="entity-name"><div>${actor.name}</div><div className="entity-meta">${actor.organization || "No organization"}${actor.id === data.settings.myActorId ? " · This is me" : ""}</div></div>${actor.id !== data.settings.myActorId ? html `<button className="btn btn-ghost btn-small" onClick=${() => props.onSetting("myActorId", actor.id)}>Set as me</button>` : null}<button className="btn btn-ghost btn-icon btn-small" title="Edit" onClick=${() => props.onEntityDialog("actor", null, actor)}><${Icon} name="edit" size=${14}/></button></div>`)}</div></section>

      <section className="settings-card"><div className="settings-card-header"><div className="settings-card-title">Statuses</div><div className="settings-card-desc">Active statuses are available in filters and the optional Status-column Board. The terminal status sends tasks to Archive.</div></div><div className="entity-toolbar"><span>${statusRows.length} statuses</span><button className="btn btn-primary btn-small" onClick=${() => props.onEntityDialog("status")}><${Icon} name="plus" size=${14}/>Add Status</button></div><div className="entity-list">${statusRows.map(status => html `<div className="entity-row" key=${status.id}><span className="topic-dot" style=${{ background: status.color }}></span><div className="entity-name"><div>${status.name}</div><div className="entity-meta">${status.terminal ? "Terminal · stored in Archive" : "Active workflow status"}</div></div><button className="btn btn-ghost btn-icon btn-small" title="Edit" onClick=${() => props.onEntityDialog("status", null, status)}><${Icon} name="edit" size=${14}/></button></div>`)}</div></section>

      <section className="settings-card"><div className="settings-card-header"><div className="settings-card-title">Card Types</div><div className="settings-card-desc">Reusable classification independent of Topic and Subtopic.</div></div><div className="entity-toolbar"><span>${typeRows.length} active types</span><button className="btn btn-primary btn-small" onClick=${() => props.onEntityDialog("type")}><${Icon} name="plus" size=${14}/>Add Type</button></div><div className="entity-list">${typeRows.map(type => html `<div className="entity-row" key=${type.id}><span className="topic-dot" style=${{ background: type.color }}></span><div className="entity-name">${type.name}</div><button className="btn btn-ghost btn-icon btn-small" title="Edit" onClick=${() => props.onEntityDialog("type", null, type)}><${Icon} name="edit" size=${14}/></button></div>`)}</div></section>

      ${(() => {
        const hidden = [
            ...data.topics.filter(t => t.archived).map(item => ({ kind: "topic", label: "Topic", item })),
            ...data.subtopics.filter(t => t.archived).map(item => ({ kind: "subtopic", label: "Subtopic", item })),
            ...data.cardTypes.filter(t => t.archived).map(item => ({ kind: "type", label: "Card Type", item })),
            ...data.actors.filter(a => a.archived).map(item => ({ kind: "actor", label: "BIC actor", item }))
        ];
        if (!hidden.length)
            return null;
        return html `<section className="settings-card"><div className="settings-card-header"><div className="settings-card-title">Hidden items</div><div className="settings-card-desc">Still referenced by existing tasks, so they cannot be deleted. They stay out of menus and columns until restored.</div></div><div className="entity-list">${hidden.map(entry => html `<div className="entity-row" key=${entry.item.id}><span className="topic-dot" style=${{ background: entry.item.color }}></span><div className="entity-name"><div>${entry.item.name}</div><div className="entity-meta">${entry.label}</div></div><button className="btn btn-secondary btn-small" onClick=${() => props.onRestoreEntity(entry.kind, entry.item)}><${Icon} name="undo" size=${14}/>Restore</button></div>`)}</div></section>`;
    })()}

      <section className="settings-card"><div className="settings-card-header"><div className="settings-card-title">About and installation</div><div className="settings-card-desc">Running_Task stores its production data locally and makes no network requests.</div></div><div className="setting-row"><div className="setting-copy"><div className="setting-label">Application version</div><div className="setting-help">Workspace schema ${data.meta.schemaVersion}</div></div><strong>${APP_VERSION}</strong></div><div className="setting-row"><div className="setting-copy"><div className="setting-label">Storage mode</div><div className="setting-help">${((_a = props.storageInfo) === null || _a === void 0 ? void 0 : _a.mode) || "Local storage information is loading."}</div></div><strong>${props.desktop ? "SQLite desktop" : "Browser preview"}</strong></div><div className="setting-row"><div className="setting-copy"><div className="setting-label">Windows installation target</div><div className="setting-help">The prebuilt setup is configured for the current Windows user and does not request Administrator rights. Company application-control rules may still require IT approval.</div></div><strong>Current user</strong></div><div className="setting-row"><div className="setting-copy"><div className="setting-label">Portable build</div><div className="setting-help">The GitHub workflow also creates a no-install ZIP. Keep its folder in a permanent location before enabling automatic startup.</div></div><strong>Supported</strong></div></section>
    </div></div></div>`;
}
class CreateTaskModal extends Component {
    constructor(props) {
        var _a;
        super(props);
        this.submit = (e) => {
            e.preventDefault();
            if (!this.state.title.trim())
                return;
            this.props.onCreate(Object.assign({}, this.state));
        };
        this.setField = (name, value) => this.setState({ [name]: value });
        const data = props.data;
        const firstTopic = props.defaultTopicId || ((_a = sortRank(data.topics.filter(t => !t.archived))[0]) === null || _a === void 0 ? void 0 : _a.id) || "";
        const defaultStatus = props.defaultStatusId || firstActiveStatusId(data);
        const defaultDate = props.defaultDate || "";
        this.state = { title: "", reference: "", description: "", topicId: firstTopic, subtopicId: "", cardTypeId: "type-action", statusId: defaultStatus, priority: "Normal", targetDate: defaultDate, fallbackBicId: data.settings.myActorId, nextTitle: "", nextDueDate: defaultDate, nextBicId: data.settings.myActorId };
    }
    render() {
        const data = this.props.data;
        const subtopics = sortRank(data.subtopics.filter(s => !s.archived && s.topicId === this.state.topicId));
        return html `<div className="modal-backdrop" onMouseDown=${(e) => { if (e.target === e.currentTarget)
            this.props.onClose(); }}><form className="modal" onSubmit=${this.submit}>
      <div className="modal-header"><div className="modal-title">Create Task</div><button type="button" className="btn btn-ghost btn-icon" onClick=${this.props.onClose} aria-label="Close"><${Icon} name="x" size=${18}/></button></div>
      <div className="modal-body"><div className="form-grid">
        <div className="field full"><label>Task title *</label><input autoFocus className="input title-input" value=${this.state.title} onInput=${(e) => this.setField("title", e.target.value)} placeholder="What are you tracking?" /></div>
        <div className="field"><label>Reference</label><input className="input" value=${this.state.reference} onInput=${(e) => this.setField("reference", e.target.value)} placeholder="RFI-0102, PCO-0044…" /></div>
        <div className="field"><label>Card type</label><select className="select" value=${this.state.cardTypeId} onChange=${(e) => this.setField("cardTypeId", e.target.value)}>${sortRank(data.cardTypes.filter(t => !t.archived)).map(t => html `<option value=${t.id} key=${t.id}>${t.name}</option>`)}</select></div>
        <div className="field full"><label>Short description</label><textarea className="textarea" value=${this.state.description} onInput=${(e) => this.setField("description", e.target.value)} placeholder="A brief summary that is visible on the card." /></div>
        <div className="field"><label>Topic</label><select className="select" value=${this.state.topicId} onChange=${(e) => this.setState({ topicId: e.target.value, subtopicId: "" })}>${sortRank(data.topics.filter(t => !t.archived)).map(t => html `<option value=${t.id} key=${t.id}>${t.name}</option>`)}</select></div>
        <div className="field"><label>Subtopic</label><select className="select" value=${this.state.subtopicId} onChange=${(e) => this.setField("subtopicId", e.target.value)}><option value="">No subtopic</option>${subtopics.map(s => html `<option value=${s.id} key=${s.id}>${s.name}</option>`)}</select></div>
        <div className="field"><label>Status</label><select className="select" value=${this.state.statusId} onChange=${(e) => this.setField("statusId", e.target.value)}>${sortRank(data.statuses.filter(s => !s.terminal)).map(s => html `<option value=${s.id} key=${s.id}>${s.name}</option>`)}</select></div>
        <div className="field"><label>Priority</label><select className="select" value=${this.state.priority} onChange=${(e) => this.setField("priority", e.target.value)}>${["None", "Low", "Normal", "High", "Critical"].map(p => html `<option value=${p} key=${p}>${p}</option>`)}</select></div>
        <div className="field"><label>Overall target date</label><input className="input" type="date" value=${this.state.targetDate} onChange=${(e) => this.setField("targetDate", e.target.value)} /></div>
        <div className="field"><label>Fallback BIC</label><select className="select" value=${this.state.fallbackBicId} onChange=${(e) => this.setField("fallbackBicId", e.target.value)}><option value="">Unassigned</option>${sortRank(data.actors.filter(a => !a.archived)).map(a => html `<option value=${a.id} key=${a.id}>${a.name}</option>`)}</select></div>
        <div className="field full"><label>First checklist step (optional)</label><div className="inline-next"><input className="input" value=${this.state.nextTitle} onInput=${(e) => this.setField("nextTitle", e.target.value)} placeholder="Define the next action" /><input className="input" type="date" value=${this.state.nextDueDate} onChange=${(e) => this.setField("nextDueDate", e.target.value)} /><select className="select" value=${this.state.nextBicId} onChange=${(e) => this.setField("nextBicId", e.target.value)}><option value="">No BIC</option>${sortRank(data.actors.filter(a => !a.archived)).map(a => html `<option value=${a.id} key=${a.id}>${a.name}</option>`)}</select></div></div>
      </div></div>
      <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick=${this.props.onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled=${!this.state.title.trim()}><${Icon} name="plus" size=${16}/>Create Task</button></div>
    </form></div>`;
    }
}
class EntityDialog extends Component {
    constructor(props) {
        super(props);
        this.submit = (e) => { e.preventDefault(); if (this.state.name.trim())
            this.props.onSave(this.state); };
        const item = props.item || {};
        this.state = { name: item.name || "", color: item.color || "#0c66e4", organization: item.organization || "", waiting: !!item.waiting };
    }
    render() {
        const labels = { topic: "Topic", subtopic: "Subtopic", actor: "BIC Actor", type: "Card Type", status: "Status" };
        const label = labels[this.props.kind] || "Item";
        return html `<div className="modal-backdrop" onMouseDown=${(e) => { if (e.target === e.currentTarget)
            this.props.onClose(); }}><form className="modal small" onSubmit=${this.submit}><div className="modal-header"><div className="modal-title">${this.props.item ? `Edit ${label}` : `Add ${label}`}</div><button type="button" className="btn btn-ghost btn-icon" onClick=${this.props.onClose}><${Icon} name="x" size=${18}/></button></div><div className="modal-body"><div className="form-grid"><div className="field full"><label>Name *</label><input autoFocus className="input" value=${this.state.name} onInput=${(e) => this.setState({ name: e.target.value })} /></div>${this.props.kind === "actor" ? html `<div className="field full"><label>Organization or role</label><input className="input" value=${this.state.organization} onInput=${(e) => this.setState({ organization: e.target.value })} /></div>` : null}<div className="field full"><label>Color</label><div style=${{ display: "flex", gap: "8px", alignItems: "center" }}><input type="color" value=${this.state.color} onChange=${(e) => this.setState({ color: e.target.value })} style=${{ width: "54px", height: "37px", border: "1px solid var(--border)", borderRadius: "7px", background: "var(--surface)" }} /><input className="input" value=${this.state.color} onInput=${(e) => this.setState({ color: e.target.value })} /></div></div>${this.props.kind === "status" ? html `<div className="field full"><label>Queue behavior</label><div className="setting-row" style=${{ padding: 0, border: "none" }}><div className="setting-copy"><div className="setting-help">Tasks in this status count as waiting on someone else, even when you hold the Ball in Court.</div></div><button type="button" className=${`switch ${this.state.waiting ? "on" : ""}`} onClick=${() => this.setState({ waiting: !this.state.waiting })} aria-label="Toggle waiting status"></button></div></div>` : null}</div></div><div className="modal-footer">${this.props.item && this.props.onRemove ? html `<button type="button" className="btn btn-danger btn-small" onClick=${() => this.props.onRemove(this.props.kind, this.props.item)}><${Icon} name="trash" size=${14}/>Delete</button>` : null}<div className="filter-spacer"></div><button type="button" className="btn btn-secondary" onClick=${this.props.onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled=${!this.state.name.trim()}>Save</button></div></form></div>`;
    }
}
function FilterPopover(props) {
    const data = props.data;
    const f = props.filters;
    return html `<div className="filter-popover"><div className="filter-popover-title"><${Icon} name="filter" size=${17}/>Filter active tasks</div><div className="filter-grid">
    <div className="field"><label>Status</label><select className="select" value=${f.statusId} onChange=${(e) => props.onFilter("statusId", e.target.value)}><option value="">Any active status</option>${sortRank(data.statuses.filter(s => !s.terminal)).map(s => html `<option value=${s.id} key=${s.id}>${s.name}</option>`)}</select></div>
    <div className="field"><label>Ball in Court</label><select className="select" value=${f.bicId} onChange=${(e) => props.onFilter("bicId", e.target.value)}><option value="">Anybody</option>${sortRank(data.actors.filter(a => !a.archived)).map(a => html `<option value=${a.id} key=${a.id}>${a.name}</option>`)}</select></div>
    <div className="field"><label>Next date</label><select className="select" value=${f.due} onChange=${(e) => props.onFilter("due", e.target.value)}><option value="all">Any date</option><option value="overdue">Overdue</option><option value="today">Today</option><option value="7days">Next 7 days</option><option value="30days">Next 30 days</option><option value="nodate">No date</option></select></div>
    <div className="field"><label>Priority</label><select className="select" value=${f.priority} onChange=${(e) => props.onFilter("priority", e.target.value)}><option value="">Any priority</option>${["Low", "Normal", "High", "Critical"].map(p => html `<option value=${p} key=${p}>${p}</option>`)}</select></div>
  </div><div className="filter-popover-actions"><button className="btn btn-ghost btn-small" onClick=${props.onClear}>Clear</button><button className="btn btn-secondary btn-small" onClick=${props.onSaveView}><${Icon} name="save" size=${14}/>Save view</button></div></div>`;
}
/**
 * In-app replacement for window.confirm / window.prompt.
 *
 * WebView2 script dialogs are not guaranteed to be available under Tauri. When
 * they are suppressed, confirm() silently returns false and prompt() returns
 * null, which would quietly swallow a destructive action or a saved view.
 */
class PromptModal extends Component {
    constructor(props) {
        super(props);
        this.submit = (event) => {
            event.preventDefault();
            if (this.props.input && !this.state.value.trim())
                return;
            this.props.onConfirm(this.props.input ? this.state.value.trim() : undefined);
        };
        this.state = { value: props.defaultValue || "" };
    }
    render() {
        const danger = !!this.props.danger;
        return html `<div className="modal-backdrop" onMouseDown=${(e) => { if (e.target === e.currentTarget)
            this.props.onCancel(); }}>
      <form className="modal small" onSubmit=${this.submit}>
        <div className="modal-header"><div className="modal-title">${this.props.title}</div>
          <button type="button" className="btn btn-ghost btn-icon" onClick=${this.props.onCancel} aria-label="Cancel"><${Icon} name="x" size=${18}/></button>
        </div>
        <div className="modal-body">
          <div className="setting-help" style=${{ fontSize: "13px", lineHeight: 1.5 }}>${this.props.body}</div>
          ${this.props.input ? html `<div className="field full" style=${{ marginTop: "12px" }}><label>${this.props.inputLabel || "Name"}</label>
            <input autoFocus className="input" value=${this.state.value} onInput=${(e) => this.setState({ value: e.target.value })} /></div>` : null}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick=${this.props.onCancel}>Cancel</button>
          <button type="submit" className=${`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled=${this.props.input && !this.state.value.trim()}>${this.props.confirmLabel || "Confirm"}</button>
        </div>
      </form>
    </div>`;
    }
}
function ImportWorkspaceModal(props) {
    const candidate = props.candidate;
    const summary = candidate.summary;
    return html `<div className="modal-backdrop"><div className="modal import-modal">
    <div className="modal-header"><div className="modal-title">Review workspace import</div><button className="btn btn-ghost btn-icon" onClick=${props.onClose} aria-label="Close import"><${Icon} name="x" size=${18}/></button></div>
    <div className="modal-body">
      <div className="import-file"><${Icon} name="fileText" size=${22}/><div><div className="setting-label">${candidate.fileName}</div><div className="setting-help">Validated Running_Task JSON workspace</div></div></div>
      <div className="import-summary-grid">
        <div className="import-summary"><strong>${summary.topics}</strong><span>Topics</span></div>
        <div className="import-summary"><strong>${summary.cards}</strong><span>Cards</span></div>
        <div className="import-summary"><strong>${summary.checklistItems}</strong><span>Checklist items</span></div>
        <div className="import-summary"><strong>${summary.archivedCards}</strong><span>Archived Cards</span></div>
      </div>
      ${candidate.warnings.length ? html `<div className="import-warning"><${Icon} name="alert" size=${17}/><div>${candidate.warnings.map((warning) => html `<div key=${warning}>${warning}</div>`)}</div></div>` : null}
      <div className="import-replace-note"><strong>This replaces the full current workspace.</strong><span>A safety backup is created first. Existing data can then be restored from Archive and Backups.</span></div>
    </div>
    <div className="modal-footer"><button className="btn btn-secondary" onClick=${props.onClose} disabled=${props.busy}>Cancel</button><button className="btn btn-primary" onClick=${props.onConfirm} disabled=${props.busy}><${Icon} name="upload" size=${16}/>${props.busy ? "Importing..." : "Back Up and Import"}</button></div>
  </div></div>`;
}
function checklistDepthMap(items) {
    const map = new Map();
    const byId = new Map(items.map(i => [i.id, i]));
    const depth = (item, seen) => {
        if (!item.parentId || seen.has(item.id))
            return 0;
        const parent = byId.get(item.parentId);
        if (!parent)
            return 0;
        seen.add(item.id);
        return Math.min(3, 1 + depth(parent, seen));
    };
    items.forEach(i => map.set(i.id, depth(i, new Set())));
    return map;
}
function CardDrawer(props) {
    const data = props.data;
    const card = props.card;
    const items = checklistFor(data, card.id);
    const depths = checklistDepthMap(items);
    const topicSubs = sortRank(data.subtopics.filter(s => !s.archived && s.topicId === card.topicId));
    const next = nextItemFor(data, card);
    const nextDate = nextDateFor(data, card);
    const bic = nextBicFor(data, card);
    const progress = progressFor(data, card);
    const update = (field, value) => props.onUpdateCard(card.id, field, value);
    return html `<div className="drawer-backdrop" onMouseDown=${(e) => { if (e.target === e.currentTarget)
        props.onClose(); }}><aside className="drawer">
    <div className="drawer-header"><button className="btn btn-ghost btn-icon" onClick=${props.onClose}><${Icon} name="x" size=${19}/></button><div className="drawer-header-title">${card.reference ? `${card.reference} — ` : ""}${card.title}</div><button className="btn btn-secondary btn-small" onClick=${() => props.onDuplicate(card.id)}><${Icon} name="copy" size=${14}/>Duplicate</button></div>
    <div className="drawer-content">
      <div className="field"><label>Title</label><input className="input title-input" value=${card.title} onInput=${(e) => update("title", e.target.value)} /></div>
      <div className="form-grid" style=${{ marginTop: "12px" }}>
        <div className="field"><label>Reference</label><input className="input" value=${card.reference} onInput=${(e) => update("reference", e.target.value)} placeholder="Optional" /></div>
        <div className="field"><label>Status</label><select className="select" value=${card.statusId} onChange=${(e) => props.onStatus(card.id, e.target.value)}>${sortRank(data.statuses).map(s => html `<option value=${s.id} key=${s.id}>${s.name}</option>`)}</select></div>
        <div className="field full"><label>Short description</label><textarea className="textarea" value=${card.description} onInput=${(e) => update("description", e.target.value)} /></div>
        <div className="field"><label>Topic</label><select className="select" value=${card.topicId} onChange=${(e) => props.onMoveTopic(card.id, e.target.value)}>${sortRank(data.topics.filter(t => !t.archived)).map(t => html `<option value=${t.id} key=${t.id}>${t.name}</option>`)}</select></div>
        <div className="field"><label>Subtopic</label><select className="select" value=${card.subtopicId || ""} onChange=${(e) => update("subtopicId", e.target.value || null)}><option value="">No subtopic</option>${topicSubs.map(s => html `<option value=${s.id} key=${s.id}>${s.name}</option>`)}</select></div>
        <div className="field"><label>Card type</label><select className="select" value=${card.cardTypeId || ""} onChange=${(e) => update("cardTypeId", e.target.value || null)}><option value="">No type</option>${sortRank(data.cardTypes.filter(t => !t.archived)).map(t => html `<option value=${t.id} key=${t.id}>${t.name}</option>`)}</select></div>
        <div className="field"><label>Priority</label><select className="select" value=${card.priority} onChange=${(e) => update("priority", e.target.value)}>${["None", "Low", "Normal", "High", "Critical"].map(p => html `<option value=${p} key=${p}>${p}</option>`)}</select></div>
        <div className="field"><label>Overall target date</label><input className="input" type="date" value=${card.targetDate || ""} onChange=${(e) => update("targetDate", e.target.value || null)} /></div>
        <div className="field"><label>Fallback BIC</label><select className="select" value=${card.fallbackBicId || ""} onChange=${(e) => update("fallbackBicId", e.target.value || null)}><option value="">Unassigned</option>${sortRank(data.actors.filter(a => !a.archived)).map(a => html `<option value=${a.id} key=${a.id}>${a.name}</option>`)}</select></div>
      </div>
      <div className="section-title"><${Icon} name="sparkle" size=${15}/>Derived next action</div>
      <div className="card-next" style=${{ marginTop: 0 }}><div style=${{ display: "flex", alignItems: "center", gap: "9px" }}><div style=${{ flex: 1 }}><div className="card-next-label">Next action</div><div className="card-next-title" style=${{ fontSize: "13px" }}>${(next === null || next === void 0 ? void 0 : next.title) || "No open checklist item"}</div></div><${DueChip} date=${nextDate}/><${ActorPill} actor=${bic}/></div><div className="progress-wrap" style=${{ marginTop: "9px" }}><div className="progress-track"><div className="progress-fill" style=${{ width: `${progress.percent}%` }}></div></div><span className="progress-label">${progress.done} of ${progress.total} complete</span></div></div>
      <div className="section-title"><${Icon} name="list" size=${15}/>Checklist</div>
      <div className="checklist-toolbar"><span className="setting-help">The earliest incomplete date becomes the Card date.</span><button className="btn btn-primary btn-small" onClick=${() => props.onAddItem(card.id)}><${Icon} name="plus" size=${14}/>Add item</button></div>
      ${items.length ? html `<div>${items.map((item, index) => html `<div key=${item.id} className=${`checklist-row ${item.completed ? "completed" : ""}`} style=${{ paddingLeft: `${5 + (depths.get(item.id) || 0) * 18}px` }}>
        <input type="checkbox" checked=${item.completed} onChange=${() => props.onToggleItem(item.id)} style=${{ accentColor: "var(--success)" }} />
        <input className="input check-title" value=${item.title} onInput=${(e) => props.onUpdateItem(item.id, "title", e.target.value)} />
        <input className="input" type="date" value=${item.dueDate || ""} onChange=${(e) => props.onUpdateItem(item.id, "dueDate", e.target.value || null)} />
        <select className="select" value=${item.bicId || ""} onChange=${(e) => props.onUpdateItem(item.id, "bicId", e.target.value || null)}><option value="">No BIC</option>${sortRank(data.actors.filter(a => !a.archived)).map(a => html `<option value=${a.id} key=${a.id}>${a.name}</option>`)}</select>
        <div className="check-controls"><button className="btn btn-ghost btn-icon" title="Outdent" disabled=${!item.parentId} onClick=${() => props.onOutdentItem(item.id)}><${Icon} name="arrowLeft" size=${13}/></button><button className="btn btn-ghost btn-icon" title="Indent under prior item" disabled=${index === 0} onClick=${() => props.onIndentItem(item.id)}><${Icon} name="arrowRight" size=${13}/></button><button className="btn btn-ghost btn-icon" title="Delete" onClick=${() => props.onDeleteItem(item.id)}><${Icon} name="trash" size=${13}/></button></div>
      </div>`)}</div>` : html `<div className="check-empty">No checklist yet. Add the next step, a due date, and a Ball in Court.</div>`}
      <div className="section-title"><${Icon} name="list" size=${15}/>Notes</div><textarea className="textarea" style=${{ minHeight: "130px" }} value=${card.notes} onInput=${(e) => update("notes", e.target.value)} placeholder="Longer notes, meeting details, context, or decisions…" />
      <div className="section-title"><${Icon} name="clock" size=${15}/>Local record</div><div className="activity-note">Created ${formatTimestamp(card.createdAt)} · Last changed ${formatTimestamp(card.updatedAt)}. A detailed activity log will be added in a later milestone.</div>
    </div>
    <div className="drawer-footer">${card.isArchived
        ? html `<div className="archive-actions"><span className="entity-meta">${card.archiveReason === "completed" ? "Completed" : "Archived"}${card.completedAt ? ` · ${formatTimestamp(card.completedAt)}` : ""}</span></div><div className="archive-actions"><button className="btn btn-secondary" onClick=${props.onClose}>Close</button><button className="btn btn-primary" onClick=${() => props.onRestoreCard(card.id)}><${Icon} name="undo" size=${16}/>Restore to active</button></div>`
        : html `<div className="archive-actions"><button className="btn btn-danger btn-small" onClick=${() => props.onArchive(card.id)}><${Icon} name="archive" size=${14}/>Archive</button></div><div className="archive-actions"><button className="btn btn-secondary" onClick=${props.onClose}>Close</button><button className="btn btn-success" onClick=${() => props.onDone(card.id)}><${Icon} name="check" size=${16}/>Mark Done</button></div>`}</div>
  </aside></div>`;
}
function RecoveryScreen(props) {
    var _a;
    return html `<div className="recovery-page">
    <section className="recovery-card" role="alert">
      <div className="recovery-icon"><${Icon} name="alert" size=${28}/></div>
      <div>
        <div className="eyebrow">LOCAL DATA RECOVERY</div>
        <h1>Running_Task did not open your workspace.</h1>
        <p>The application stopped before loading or saving any replacement data. Your existing database has not been overwritten.</p>
      </div>
      <div className="recovery-detail"><strong>What happened</strong><span>${props.message}</span></div>
      ${((_a = props.storageInfo) === null || _a === void 0 ? void 0 : _a.dataPath) ? html `<div className="recovery-detail"><strong>Database location</strong><code>${props.storageInfo.dataPath}</code></div>` : null}
      <div className="recovery-actions">
        <button className="btn btn-primary" onClick=${props.onRetry}><${Icon} name="rotate" size=${16}/>Retry opening workspace</button>
        ${props.desktop ? html `<button className="btn btn-secondary" onClick=${props.onOpenFolder}><${Icon} name="folder" size=${16}/>Open data folder</button>` : null}
      </div>
      <p className="recovery-help">When Retry continues to fail, keep the database file in place and restore from a verified backup or contact support before making changes.</p>
    </section>
  </div>`;
}
class RunningTaskApp extends Component {
    constructor() {
        super(...arguments);
        this.provider = new DataProvider();
        this.saveQueue = new SerializedSaveQueue((data) => this.provider.save(data));
        this.saveTimer = null;
        this.toastTimer = null;
        this.closeUnlisten = null;
        this.allowDesktopClose = false;
        this.mounted = false;
        this.suppressNextAutosave = false;
        this.lastUndoKey = null;
        this.lastUndoAt = 0;
        this.state = {
            ready: false, data: null, loadError: null, route: "dashboard", selectedTopicId: null, scope: "", search: "",
            filters: { statusId: "", bicId: "", due: "all", priority: "" }, filtersOpen: false,
            createOpen: false, createDefaults: {}, drawerCardId: null, calendarMonth: currentMonthKey(), expanded: new Set(),
            draggingId: null, dragOverId: null, backups: [], storageInfo: null, backupBusy: false,
            importCandidate: null, importBusy: false, entityDialog: null, prompt: null, toast: null, saveState: "saved", undoStack: []
        };
        this.loadWorkspace = async () => {
            this.setState({ ready: false, loadError: null });
            try {
                const data = await this.provider.load();
                const storageInfo = await this.provider.storageInfo();
                // A workspace that came back from disk is already persisted. Only a
                // freshly synthesized starter workspace still needs its first save.
                this.suppressNextAutosave = this.provider.loadedExistingWorkspace;
                this.applyTheme(data.settings.theme);
                this.setState({ data, storageInfo, ready: true, loadError: null, saveState: "saved" });
                if (this.provider.desktop && data.settings.autostart) {
                    try {
                        const enabled = await this.provider.getAutostart();
                        if (!enabled)
                            await this.provider.setAutostart(true);
                    }
                    catch (error) {
                        console.warn("Autostart registration was not available.", error);
                    }
                }
            }
            catch (error) {
                console.error(error);
                let storageInfo = null;
                try {
                    storageInfo = await this.provider.storageInfo();
                }
                catch (_storageError) { /* keep recovery screen available */ }
                // Desktop load errors fail closed: never construct starter data, because a
                // later autosave could otherwise replace a damaged or temporarily locked database.
                if (this.provider.desktop) {
                    this.setState({ data: null, storageInfo, ready: true, loadError: (error === null || error === void 0 ? void 0 : error.message) || String(error), saveState: "error" });
                }
                else {
                    const data = defaultData();
                    this.applyTheme(data.settings.theme);
                    this.setState({ data, storageInfo, ready: true, loadError: null, saveState: "saved", toast: { message: `Preview storage could not be opened: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, type: "error" } });
                }
            }
        };
        /**
         * Owns the desktop close decision end to end.
         *
         * Registering this listener makes Tauri suppress the native close, so the
         * window can only shut down if we finish the job ourselves. preventDefault is
         * therefore unconditional: without it Tauri's own wrapper calls
         * `window.destroy()`, a core:window command the app's capability does not
         * grant, and the rejection would leave the window stuck open.
         */
        this.setupDesktopCloseGuard = async () => {
            var _a;
            if (!this.provider.desktop)
                return;
            const windowApi = (_a = tauriWindow.__TAURI__) === null || _a === void 0 ? void 0 : _a.window;
            if (!(windowApi === null || windowApi === void 0 ? void 0 : windowApi.getCurrentWindow))
                return;
            try {
                const appWindow = windowApi.getCurrentWindow();
                this.closeUnlisten = await appWindow.onCloseRequested(async (event) => {
                    event.preventDefault();
                    if (!this.allowDesktopClose && this.saveQueue.hasWork()) {
                        const saved = await this.flushPendingSave(false);
                        // Leave the window open so the failure and its Retry stay reachable.
                        if (!saved)
                            return;
                    }
                    this.allowDesktopClose = true;
                    await this.closeDesktopWindow(appWindow);
                });
            }
            catch (error) {
                console.warn("Running_Task could not register its close-save guard.", error);
            }
        };
        this.closeDesktopWindow = async (appWindow) => {
            try {
                await tauriInvoke("close_main_window");
                return;
            }
            catch (error) {
                console.warn("Running_Task could not close through the backend command.", error);
            }
            try {
                await appWindow.destroy();
            }
            catch (error) {
                console.error("Running_Task could not close its window.", error);
                this.showToast("Running_Task could not close its window. Your work is saved; end the process from Task Manager.", "error");
            }
        };
        this.onBeforeUnload = (event) => {
            if (!this.saveQueue.hasWork())
                return;
            void this.flushPendingSave(true);
            event.preventDefault();
            event.returnValue = "";
        };
        this.onKeyDown = (event) => {
            var _a, _b;
            if (event.key === "Escape") {
                if (this.state.prompt)
                    this.cancelPrompt();
                else if (this.state.filtersOpen)
                    this.setState({ filtersOpen: false });
                else if (this.state.importCandidate)
                    this.setState({ importCandidate: null });
                else if (this.state.entityDialog)
                    this.setState({ entityDialog: null });
                else if (this.state.createOpen)
                    this.setState({ createOpen: false });
                else if (this.state.drawerCardId)
                    this.setState({ drawerCardId: null });
                return;
            }
            if (isTypingTarget(event.target))
                return;
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
                event.preventDefault();
                this.undoLastChange();
                return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                (_a = document.getElementById("global-search")) === null || _a === void 0 ? void 0 : _a.focus();
                return;
            }
            if (event.key === "/") {
                event.preventDefault();
                (_b = document.getElementById("global-search")) === null || _b === void 0 ? void 0 : _b.focus();
                return;
            }
            const overlayOpen = this.state.createOpen || this.state.drawerCardId || this.state.entityDialog || this.state.importCandidate || this.state.prompt;
            if (!overlayOpen && event.key.toLowerCase() === "n") {
                event.preventDefault();
                this.openCreate();
            }
        };
        this.flushPendingSave = async (silent = false) => {
            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
                this.saveTimer = null;
            }
            if (!this.saveQueue.hasWork()) {
                if (this.mounted && this.state.saveState !== "saved")
                    this.setState({ saveState: "saved" });
                return true;
            }
            if (this.mounted && this.state.saveState !== "saving")
                this.setState({ saveState: "saving" });
            try {
                await this.saveQueue.flush();
                if (this.mounted)
                    this.setState({ saveState: "saved" });
                return true;
            }
            catch (error) {
                console.error(error);
                if (this.mounted)
                    this.setState({ saveState: "error" });
                if (!silent)
                    this.showToast(`Local save failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}. Your latest changes remain queued; select Retry.`, "error");
                return false;
            }
        };
        this.retrySave = async () => { await this.flushPendingSave(false); };
        this.cancelPrompt = () => this.setState({ prompt: null });
        this.undoLastChange = () => {
            const stack = this.state.undoStack;
            if (!stack.length)
                return;
            this.lastUndoKey = null;
            const entry = stack[stack.length - 1];
            this.setState({ data: deepClone(entry.data), undoStack: stack.slice(0, -1), drawerCardId: null });
            this.showToast(`Undid: ${entry.label.replace(/\.$/, "")}.`);
        };
        this.navigate = (route, topicId = null, scope = "") => {
            this.setState({ route, selectedTopicId: topicId, scope, filtersOpen: false });
        };
        this.applySavedView = (view) => {
            this.setState({ route: view.route, selectedTopicId: view.selectedTopicId, scope: view.scope, filters: deepClone(view.filters), filtersOpen: false });
        };
        this.setFilter = (key, value) => this.setState({ filters: Object.assign({}, this.state.filters, { [key]: value }) });
        this.clearFilters = () => this.setState({ filters: { statusId: "", bicId: "", due: "all", priority: "" }, scope: "", selectedTopicId: null });
        this.openCreate = (defaults = {}) => {
            const topicId = defaults.topicId || this.state.selectedTopicId || undefined;
            this.setState({ createOpen: true, createDefaults: { topicId, statusId: defaults.statusId, date: defaults.date } });
        };
        this.createTask = (form) => {
            const stamp = nowIso();
            const cardId = uid("card");
            this.updateData(data => {
                const maxRank = Math.max(0, ...data.cards.filter(c => c.topicId === form.topicId).map(c => c.rank));
                const card = {
                    id: cardId, topicId: form.topicId, subtopicId: form.subtopicId || null, cardTypeId: form.cardTypeId || null,
                    statusId: form.statusId || firstActiveStatusId(data), reference: form.reference.trim(), title: form.title.trim(), description: form.description.trim(), notes: "",
                    priority: form.priority, targetDate: form.targetDate || null, fallbackBicId: form.fallbackBicId || null, tags: [], rank: maxRank + 10,
                    isArchived: false, archiveReason: null, lastActiveStatusId: null, completedAt: null, createdAt: stamp, updatedAt: stamp
                };
                data.cards.push(card);
                if (form.nextTitle.trim())
                    data.checklistItems.push({ id: uid("item"), cardId, parentId: null, title: form.nextTitle.trim(), notes: "", dueDate: form.nextDueDate || null, bicId: form.nextBicId || null, completed: false, rank: 10, completedAt: null });
            }, "Task created locally.");
            this.setState({ createOpen: false, drawerCardId: cardId });
        };
        this.updateCard = (cardId, field, value) => this.updateData(data => { const card = data.cards.find(c => c.id === cardId); if (card) {
            card[field] = value;
            card.updatedAt = nowIso();
        } }, undefined, `card:${cardId}:${String(field)}`);
        this.moveCardTopic = (cardId, topicId) => this.updateData(data => { const card = data.cards.find(c => c.id === cardId); if (!card)
            return; card.topicId = topicId; if (card.subtopicId && !data.subtopics.some(s => s.id === card.subtopicId && s.topicId === topicId))
            card.subtopicId = null; card.updatedAt = nowIso(); });
        this.setCardStatus = (cardId, statusId) => {
            const data = this.state.data;
            if (!data)
                return;
            const status = statusById(data, statusId);
            if (status === null || status === void 0 ? void 0 : status.terminal) {
                this.markDone(cardId);
                return;
            }
            this.updateData(draft => { const card = draft.cards.find(c => c.id === cardId); if (card) {
                card.statusId = statusId;
                card.updatedAt = nowIso();
            } });
        };
        this.archiveCard = (cardId) => {
            this.updateData(data => { const card = data.cards.find(c => c.id === cardId); if (card) {
                card.lastActiveStatusId = card.statusId;
                card.isArchived = true;
                card.archiveReason = "manual";
                card.updatedAt = nowIso();
            } }, "Task moved to Archive.");
            this.setState({ drawerCardId: null });
        };
        this.markDone = (cardId) => {
            this.updateData(data => { var _a; const card = data.cards.find(c => c.id === cardId); if (card) {
                card.lastActiveStatusId = card.statusId;
                card.statusId = ((_a = data.statuses.find(s => s.terminal)) === null || _a === void 0 ? void 0 : _a.id) || "status-done";
                card.isArchived = true;
                card.archiveReason = "completed";
                card.completedAt = nowIso();
                card.updatedAt = nowIso();
            } }, "Task completed and stored in Archive.");
            this.setState({ drawerCardId: null });
        };
        this.restoreCard = (cardId) => this.updateData(data => { const card = data.cards.find(c => c.id === cardId); if (card) {
            const valid = data.statuses.some(s => s.id === card.lastActiveStatusId && !s.terminal);
            card.statusId = valid ? String(card.lastActiveStatusId) : firstActiveStatusId(data);
            card.isArchived = false;
            card.archiveReason = null;
            card.completedAt = null;
            card.updatedAt = nowIso();
        } }, "Task restored to the active workspace.");
        this.deleteCard = async (cardId) => {
            const confirmed = await this.askConfirm({
                title: "Delete this task permanently?",
                body: "The task and its checklist are removed from the current workspace. This cannot be undone except by restoring a backup.",
                confirmLabel: "Delete permanently",
                danger: true
            });
            if (confirmed === null)
                return;
            this.updateData(data => { data.cards = data.cards.filter(c => c.id !== cardId); data.checklistItems = data.checklistItems.filter(i => i.cardId !== cardId); }, "Task permanently deleted.");
        };
        this.duplicateCard = (cardId) => {
            let newId = "";
            this.updateData(data => { var _a; const original = data.cards.find(c => c.id === cardId); if (!original)
                return; newId = uid("card"); const copy = deepClone(original); copy.id = newId; copy.title = `${copy.title} — Copy`; copy.reference = ""; copy.isArchived = false; copy.archiveReason = null; copy.completedAt = null; copy.statusId = copy.lastActiveStatusId || (((_a = statusById(data, copy.statusId)) === null || _a === void 0 ? void 0 : _a.terminal) ? "status-todo" : copy.statusId); copy.createdAt = nowIso(); copy.updatedAt = nowIso(); copy.rank += 1; data.cards.push(copy); const idMap = new Map(); checklistFor(data, cardId).forEach(item => idMap.set(item.id, uid("item"))); checklistFor(data, cardId).forEach(item => { const cloned = deepClone(item); cloned.id = idMap.get(item.id); cloned.cardId = newId; cloned.parentId = item.parentId ? (idMap.get(item.parentId) || null) : null; cloned.completed = false; cloned.completedAt = null; data.checklistItems.push(cloned); }); }, "Task duplicated.");
            if (newId)
                this.setState({ drawerCardId: newId });
        };
        this.toggleItem = (itemId) => this.updateData(data => { const item = data.checklistItems.find(i => i.id === itemId); if (!item)
            return; item.completed = !item.completed; item.completedAt = item.completed ? nowIso() : null; const card = data.cards.find(c => c.id === item.cardId); if (card)
            card.updatedAt = nowIso(); });
        this.updateItem = (itemId, field, value) => this.updateData(data => { const item = data.checklistItems.find(i => i.id === itemId); if (item) {
            item[field] = value;
            const card = data.cards.find(c => c.id === item.cardId);
            if (card)
                card.updatedAt = nowIso();
        } }, undefined, `item:${itemId}:${String(field)}`);
        this.addItem = (cardId) => this.updateData(data => { const max = Math.max(0, ...data.checklistItems.filter(i => i.cardId === cardId).map(i => i.rank)); data.checklistItems.push({ id: uid("item"), cardId, parentId: null, title: "New checklist item", notes: "", dueDate: null, bicId: data.settings.myActorId, completed: false, rank: max + 10, completedAt: null }); const card = data.cards.find(c => c.id === cardId); if (card)
            card.updatedAt = nowIso(); });
        this.deleteItem = (itemId) => this.updateData(data => { const item = data.checklistItems.find(i => i.id === itemId); if (!item)
            return; data.checklistItems.filter(i => i.parentId === itemId).forEach(i => i.parentId = null); data.checklistItems = data.checklistItems.filter(i => i.id !== itemId); const card = data.cards.find(c => c.id === item.cardId); if (card)
            card.updatedAt = nowIso(); });
        this.indentItem = (itemId) => this.updateData(data => { const item = data.checklistItems.find(i => i.id === itemId); if (!item)
            return; const siblings = checklistFor(data, item.cardId); const index = siblings.findIndex(i => i.id === itemId); if (index > 0)
            item.parentId = siblings[index - 1].id; });
        this.outdentItem = (itemId) => this.updateData(data => { const item = data.checklistItems.find(i => i.id === itemId); if (item)
            item.parentId = null; });
        this.toggleExpand = (cardId) => { const expanded = new Set(this.state.expanded); expanded.has(cardId) ? expanded.delete(cardId) : expanded.add(cardId); this.setState({ expanded }); };
        this.expandAll = (cards) => { const allExpanded = cards.length > 0 && cards.every(c => this.state.expanded.has(c.id)); this.setState({ expanded: allExpanded ? new Set() : new Set(cards.map(c => c.id)) }); };
        this.onDragStart = (event, cardId) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", cardId); this.setState({ draggingId: cardId }); };
        this.onDragEnd = () => this.setState({ draggingId: null, dragOverId: null });
        this.onDragOver = (event, id) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; if (this.state.dragOverId !== id)
            this.setState({ dragOverId: id }); };
        this.onDrop = (event, columnId, kind) => {
            event.preventDefault();
            const cardId = event.dataTransfer.getData("text/plain") || this.state.draggingId;
            if (!cardId)
                return;
            if (kind === "topic")
                this.moveCardTopic(cardId, columnId);
            else
                this.setCardStatus(cardId, columnId);
            this.setState({ draggingId: null, dragOverId: null });
        };
        this.setSetting = (key, value) => this.updateData(data => { data.settings[key] = value; }, undefined, `setting:${String(key)}`);
        this.setAutostart = async (enabled) => {
            try {
                if (this.provider.desktop)
                    await this.provider.setAutostart(enabled);
                this.setSetting("autostart", enabled);
                this.showToast(enabled ? "Running_Task will launch with your computer." : "Automatic startup disabled.");
            }
            catch (error) {
                this.showToast(`Could not change startup setting: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "error");
            }
        };
        this.openEntityDialog = (kind, parentId = null, item) => this.setState({ entityDialog: { kind, parentId, item } });
        this.removeEntity = async (kind, item) => {
            const data = this.state.data;
            if (!data)
                return;
            const { blocking, archivable } = this.entityUsage(data, kind, item.id);
            const label = kind === "type" ? "Card Type" : kind === "actor" ? "BIC actor" : kind;
            if (blocking.length) {
                const detail = blocking.join(", ");
                if (!archivable) {
                    this.showToast(`"${item.name}" is still used by ${detail}. Reassign those first.`, "error");
                    return;
                }
                const hide = await this.askConfirm({
                    title: `"${item.name}" is still in use`,
                    body: `It is referenced by ${detail}, so it cannot be deleted. It can be hidden instead: existing records keep it, but it stops appearing in menus and columns.`,
                    confirmLabel: "Hide it"
                });
                if (hide === null)
                    return;
                this.updateData(draft => { const record = this.collectionFor(draft, kind).find(r => r.id === item.id); if (record)
                    record.archived = true; }, `${item.name} hidden.`);
                this.setState({ entityDialog: null });
                return;
            }
            const confirmed = await this.askConfirm({
                title: `Delete this ${label}?`,
                body: `"${item.name}" is not referenced by any task, so it can be removed cleanly.`,
                confirmLabel: "Delete",
                danger: true
            });
            if (confirmed === null)
                return;
            this.updateData(draft => {
                const collection = this.collectionFor(draft, kind);
                const index = collection.findIndex(r => r.id === item.id);
                if (index >= 0)
                    collection.splice(index, 1);
                if (kind === "topic")
                    draft.subtopics = draft.subtopics.filter(sub => sub.topicId !== item.id);
            }, `${item.name} deleted.`);
            this.setState({ entityDialog: null });
        };
        this.restoreEntity = (kind, item) => {
            this.updateData(draft => { const record = this.collectionFor(draft, kind).find(r => r.id === item.id); if (record)
                record.archived = false; }, `${item.name} restored.`);
        };
        this.saveEntity = (values) => {
            const dialog = this.state.entityDialog;
            if (!dialog)
                return;
            this.updateData(data => {
                if (dialog.item) {
                    const collection = dialog.kind === "topic" ? data.topics : dialog.kind === "actor" ? data.actors : dialog.kind === "type" ? data.cardTypes : dialog.kind === "status" ? data.statuses : data.subtopics;
                    const existing = collection.find(i => i.id === dialog.item.id);
                    if (existing) {
                        existing.name = values.name.trim();
                        existing.color = values.color;
                        if (dialog.kind === "actor")
                            existing.organization = values.organization.trim();
                        if (dialog.kind === "status")
                            existing.waiting = !!values.waiting;
                    }
                }
                else if (dialog.kind === "topic") {
                    data.topics.push({ id: uid("topic"), name: values.name.trim(), color: values.color, icon: "layers", rank: Math.max(0, ...data.topics.map(t => t.rank)) + 10, archived: false });
                }
                else if (dialog.kind === "subtopic") {
                    data.subtopics.push({ id: uid("subtopic"), topicId: String(dialog.parentId), name: values.name.trim(), color: values.color, rank: Math.max(0, ...data.subtopics.filter(s => s.topicId === dialog.parentId).map(s => s.rank)) + 10, archived: false });
                }
                else if (dialog.kind === "actor") {
                    data.actors.push({ id: uid("actor"), name: values.name.trim(), organization: values.organization.trim(), color: values.color, rank: Math.max(0, ...data.actors.map(a => a.rank)) + 10, archived: false });
                }
                else if (dialog.kind === "type") {
                    data.cardTypes.push({ id: uid("type"), name: values.name.trim(), color: values.color, icon: "tag", rank: Math.max(0, ...data.cardTypes.map(t => t.rank)) + 10, archived: false });
                }
                else if (dialog.kind === "status") {
                    data.statuses.push({ id: uid("status"), name: values.name.trim(), color: values.color, rank: Math.max(0, ...data.statuses.map(status => status.rank)) + 10, terminal: false, waiting: !!values.waiting });
                }
            }, `${dialog.kind.charAt(0).toUpperCase() + dialog.kind.slice(1)} saved.`);
            this.setState({ entityDialog: null });
        };
        this.saveView = async () => {
            const name = await this.askConfirm({ title: "Save this view", body: "The current route, Topic, queue, and filters are stored in the sidebar.", confirmLabel: "Save view", input: true, inputLabel: "View name" });
            if (!name)
                return;
            this.updateData(data => data.savedViews.push({ id: uid("view"), name: name.trim(), route: this.state.route === "dashboard" || this.state.route === "archive" || this.state.route === "settings" ? "list" : this.state.route, selectedTopicId: this.state.selectedTopicId, scope: this.state.scope, filters: deepClone(this.state.filters) }), "View saved to the sidebar.");
            this.setState({ filtersOpen: false });
        };
        this.refreshBackups = async () => {
            try {
                const [backups, storageInfo] = await Promise.all([this.provider.listBackups(), this.provider.storageInfo()]);
                this.setState({ backups, storageInfo });
            }
            catch (error) {
                this.showToast(`Could not read backups: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "error");
            }
        };
        this.createBackup = async () => {
            if (!this.state.data || this.state.backupBusy)
                return;
            this.setState({ backupBusy: true });
            try {
                if (!await this.flushPendingSave(false))
                    throw new Error("The latest workspace changes could not be saved.");
                const backup = await this.provider.createBackup(this.state.data);
                await this.refreshBackups();
                this.showToast(`Backup created: ${backup.name}`);
            }
            catch (error) {
                this.showToast(`Backup failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "error");
            }
            finally {
                this.setState({ backupBusy: false });
            }
        };
        this.restoreBackup = async (id) => {
            const confirmed = await this.askConfirm({ title: "Restore this backup?", body: "The current workspace is backed up first, then fully replaced by the selected backup.", confirmLabel: "Back up and restore" });
            if (confirmed === null)
                return;
            this.setState({ backupBusy: true });
            try {
                if (!await this.flushPendingSave(false))
                    throw new Error("The latest workspace changes could not be saved before restore.");
                const previous = this.state.data ? deepClone(this.state.data) : null;
                const data = await this.provider.restoreBackup(id);
                this.suppressNextAutosave = true;
                this.setState({ data, drawerCardId: null, expanded: new Set(), undoStack: this.pushUndo(previous, "Restore backup"), saveState: "saved" });
                await this.refreshBackups();
                this.showToast("Backup restored successfully.");
            }
            catch (error) {
                this.showToast(`Restore failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "error");
            }
            finally {
                this.setState({ backupBusy: false });
            }
        };
        this.deleteBackup = async (id) => {
            const confirmed = await this.askConfirm({ title: "Delete this backup?", body: "The backup file is removed from the local backup folder.", confirmLabel: "Delete backup", danger: true });
            if (confirmed === null)
                return;
            try {
                await this.provider.deleteBackup(id);
                await this.refreshBackups();
                this.showToast("Backup deleted.");
            }
            catch (error) {
                this.showToast(`Could not delete backup: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "error");
            }
        };
        this.exportJson = async () => {
            if (!this.state.data)
                return;
            try {
                if (!await this.flushPendingSave(false))
                    throw new Error("The latest workspace changes could not be saved.");
                const path = await this.provider.exportJson(this.state.data);
                this.showToast(`JSON export created: ${path}`);
            }
            catch (error) {
                this.showToast(`Export failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "error");
            }
        };
        this.exportCsv = async () => {
            if (!this.state.data)
                return;
            try {
                if (!await this.flushPendingSave(false))
                    throw new Error("The latest workspace changes could not be saved.");
                const path = await this.provider.exportCsv(this.state.data);
                this.showToast(`CSV export created: ${path}`);
            }
            catch (error) {
                this.showToast(`CSV export failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "error");
            }
        };
        this.exportMarkdown = async () => {
            if (!this.state.data)
                return;
            try {
                if (!await this.flushPendingSave(false))
                    throw new Error("The latest workspace changes could not be saved.");
                const path = await this.provider.exportMarkdown(this.state.data);
                this.showToast(`Markdown export created: ${path}`);
            }
            catch (error) {
                this.showToast(`Markdown export failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "error");
            }
        };
        this.prepareImportFile = async (file) => {
            this.setState({ importBusy: true });
            try {
                if (file.size > 50 * 1024 * 1024)
                    throw new Error("The selected file is larger than the 50 MB import safety limit.");
                const raw = JSON.parse(await file.text());
                const prepared = prepareImportedWorkspace(raw);
                this.setState({ importCandidate: { fileName: file.name, ...prepared } });
            }
            catch (error) {
                this.showToast(`Import could not be prepared: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "error");
            }
            finally {
                this.setState({ importBusy: false });
            }
        };
        this.confirmImport = async () => {
            if (!this.state.data || !this.state.importCandidate || this.state.importBusy)
                return;
            this.setState({ importBusy: true });
            try {
                if (!await this.flushPendingSave(false))
                    throw new Error("The latest workspace changes could not be saved before import.");
                const previous = deepClone(this.state.data);
                await this.provider.createBackup(previous);
                const imported = deepClone(this.state.importCandidate.data);
                await this.provider.save(imported);
                this.applyTheme(imported.settings.theme);
                this.suppressNextAutosave = true;
                this.setState({ data: imported, importCandidate: null, drawerCardId: null, expanded: new Set(), selectedTopicId: null, scope: "", route: "dashboard", undoStack: this.pushUndo(previous, "Import workspace"), saveState: "saved" });
                await this.refreshBackups();
                this.showToast("Workspace imported. The previous workspace is available as a safety backup.");
            }
            catch (error) {
                this.showToast(`Import failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "error");
            }
            finally {
                this.setState({ importBusy: false });
            }
        };
    }
    async componentDidMount() {
        this.mounted = true;
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("beforeunload", this.onBeforeUnload);
        await this.setupDesktopCloseGuard();
        await this.loadWorkspace();
    }
    componentWillUnmount() {
        this.mounted = false;
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("beforeunload", this.onBeforeUnload);
        if (this.closeUnlisten)
            this.closeUnlisten();
        if (this.saveTimer)
            clearTimeout(this.saveTimer);
        if (this.toastTimer)
            clearTimeout(this.toastTimer);
    }
    componentDidUpdate(_prevProps, prevState) {
        var _a;
        if (this.state.data && prevState.data !== this.state.data) {
            if (this.suppressNextAutosave)
                this.suppressNextAutosave = false;
            else
                this.scheduleSave();
        }
        if (this.state.data && ((_a = prevState.data) === null || _a === void 0 ? void 0 : _a.settings.theme) !== this.state.data.settings.theme)
            this.applyTheme(this.state.data.settings.theme);
        if (prevState.route !== this.state.route && this.state.route === "archive")
            this.refreshBackups();
    }
    applyTheme(theme) {
        let resolved = theme;
        if (theme === "system")
            resolved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", resolved);
    }
    scheduleSave() {
        if (!this.state.data || this.state.loadError)
            return;
        if (this.saveTimer)
            clearTimeout(this.saveTimer);
        // state.data is replaced, never mutated in place, so the queue can hold the
        // reference directly. See updateData for the invariant this depends on.
        this.saveQueue.enqueue(this.state.data);
        if (this.state.saveState !== "saving")
            this.setState({ saveState: "saving" });
        this.saveTimer = setTimeout(() => { void this.flushPendingSave(false); }, 280);
    }
    askConfirm(options) {
        return new Promise(resolve => {
            this.setState({
                prompt: Object.assign({}, options, {
                    onConfirm: (value) => { this.setState({ prompt: null }); resolve(options.input ? (value || "") : undefined); }
                })
            });
            this.cancelPrompt = () => { this.setState({ prompt: null }); resolve(null); };
        });
    }
    showToast(message, type = "success") {
        if (this.toastTimer)
            clearTimeout(this.toastTimer);
        this.setState({ toast: { message, type } });
        this.toastTimer = setTimeout(() => this.setState({ toast: null }), 3600);
    }
    /**
     * Applies one change to an immutable copy of the workspace.
     *
     * Invariant: `state.data` is only ever replaced, never mutated in place. That
     * lets the previous object serve directly as the undo snapshot and as the
     * queued save payload, so an edit costs one deep clone instead of three.
     *
     * `undoKey` coalesces a run of related edits. Without it, typing a single
     * character into Notes pushed a fresh snapshot and discarded the ability to
     * undo the structural change before it.
     */
    updateData(mutator, message, undoKey) {
        if (!this.state.data)
            return;
        const previous = this.state.data;
        const draft = deepClone(previous);
        mutator(draft);
        draft.meta.updatedAt = nowIso();
        draft.meta.appVersion = APP_VERSION;
        const now = Date.now();
        const coalesce = !!undoKey && undoKey === this.lastUndoKey && now - this.lastUndoAt < UNDO_COALESCE_MS && this.state.undoStack.length > 0;
        this.lastUndoKey = undoKey || null;
        this.lastUndoAt = now;
        // A coalesced keystroke joins the step already on the stack, so a typing
        // run costs one undo step instead of one per character.
        this.setState({ data: draft, undoStack: coalesce ? this.state.undoStack : this.pushUndo(previous, message || "Last change") });
        if (message)
            this.showToast(message);
    }
    /**
     * Returns a new stack with `data` pushed, bounded to UNDO_DEPTH.
     *
     * Entries hold previously live workspace objects rather than fresh clones,
     * which is safe because state.data is never mutated in place. The depth cap
     * bounds how much workspace history stays resident.
     */
    pushUndo(data, label) {
        return this.state.undoStack.concat([{ data, label }]).slice(-UNDO_DEPTH);
    }
    activeFilterCount() {
        const f = this.state.filters;
        return Number(!!f.statusId) + Number(!!f.bicId) + Number(f.due !== "all") + Number(!!f.priority) + Number(!!this.state.scope) + Number(!!this.state.selectedTopicId);
    }
    filteredCards() {
        const data = this.state.data;
        if (!data)
            return [];
        const q = normalizeText(this.state.search);
        return data.cards.filter(card => !isDoneCard(data, card)).filter(card => {
            if (this.state.selectedTopicId && card.topicId !== this.state.selectedTopicId)
                return false;
            const date = nextDateFor(data, card);
            const offset = dayOffset(date);
            const bic = nextBicFor(data, card);
            if (this.state.scope === "today" && offset !== 0)
                return false;
            if (this.state.scope === "overdue" && !(offset !== null && offset < 0))
                return false;
            if (this.state.scope === "my-ball" && (bic === null || bic === void 0 ? void 0 : bic.id) !== data.settings.myActorId)
                return false;
            if (this.state.scope === "waiting" && !isWaitingCard(data, card))
                return false;
            if (this.state.scope === "no-date" && !!date)
                return false;
            const f = this.state.filters;
            if (f.statusId && card.statusId !== f.statusId)
                return false;
            if (f.bicId && (bic === null || bic === void 0 ? void 0 : bic.id) !== f.bicId)
                return false;
            if (f.priority && card.priority !== f.priority)
                return false;
            if (f.due === "overdue" && !(offset !== null && offset < 0))
                return false;
            if (f.due === "today" && offset !== 0)
                return false;
            if (f.due === "7days" && !(offset !== null && offset >= 0 && offset <= 7))
                return false;
            if (f.due === "30days" && !(offset !== null && offset >= 0 && offset <= 30))
                return false;
            if (f.due === "nodate" && !!date)
                return false;
            if (q) {
                const topic = topicById(data, card.topicId);
                const sub = subtopicById(data, card.subtopicId);
                const type = typeById(data, card.cardTypeId);
                const itemText = checklistFor(data, card.id).map(i => { var _a; return `${i.title} ${((_a = actorById(data, i.bicId)) === null || _a === void 0 ? void 0 : _a.name) || ""}`; }).join(" ");
                const haystack = normalizeText(`${card.title} ${card.reference} ${card.description} ${card.notes} ${card.tags.join(" ")} ${(topic === null || topic === void 0 ? void 0 : topic.name) || ""} ${(sub === null || sub === void 0 ? void 0 : sub.name) || ""} ${(type === null || type === void 0 ? void 0 : type.name) || ""} ${(bic === null || bic === void 0 ? void 0 : bic.name) || ""} ${itemText}`);
                if (!haystack.includes(q))
                    return false;
            }
            return true;
        });
    }
    listTitle() {
        var _a;
        if (this.state.scope === "today")
            return "Due Today";
        if (this.state.scope === "overdue")
            return "Overdue";
        if (this.state.scope === "my-ball")
            return "My Ball";
        if (this.state.scope === "waiting")
            return "Waiting On Others";
        if (this.state.scope === "no-date")
            return "Tasks Without Dates";
        if (this.state.selectedTopicId && this.state.data)
            return ((_a = topicById(this.state.data, this.state.selectedTopicId)) === null || _a === void 0 ? void 0 : _a.name) || "Task List";
        return "Task List";
    }
    /**
     * Counts what a configuration entity is still holding, so removal can be
     * refused with a specific reason instead of silently orphaning cards.
     */
    entityUsage(data, kind, id) {
        const blocking = [];
        if (kind === "topic") {
            const cards = data.cards.filter(c => c.topicId === id).length;
            const subs = data.subtopics.filter(sub => sub.topicId === id).length;
            if (cards)
                blocking.push(`${cards} task${cards === 1 ? "" : "s"}`);
            if (subs)
                blocking.push(`${subs} subtopic${subs === 1 ? "" : "s"}`);
            if (data.topics.filter(t => !t.archived).length <= 1)
                blocking.push("the only active Topic");
        }
        else if (kind === "subtopic") {
            const cards = data.cards.filter(c => c.subtopicId === id).length;
            if (cards)
                blocking.push(`${cards} task${cards === 1 ? "" : "s"}`);
        }
        else if (kind === "type") {
            const cards = data.cards.filter(c => c.cardTypeId === id).length;
            if (cards)
                blocking.push(`${cards} task${cards === 1 ? "" : "s"}`);
        }
        else if (kind === "actor") {
            const cards = data.cards.filter(c => c.fallbackBicId === id).length;
            const items = data.checklistItems.filter(i => i.bicId === id).length;
            if (cards)
                blocking.push(`${cards} fallback assignment${cards === 1 ? "" : "s"}`);
            if (items)
                blocking.push(`${items} checklist item${items === 1 ? "" : "s"}`);
            if (data.settings.myActorId === id)
                blocking.push("your own Me actor");
        }
        else if (kind === "status") {
            const cards = data.cards.filter(c => c.statusId === id).length;
            const status = statusById(data, id);
            if (cards)
                blocking.push(`${cards} task${cards === 1 ? "" : "s"}`);
            if ((status === null || status === void 0 ? void 0 : status.terminal) && data.statuses.filter(st => st.terminal).length <= 1)
                blocking.push("the only terminal status");
            if (!(status === null || status === void 0 ? void 0 : status.terminal) && data.statuses.filter(st => !st.terminal).length <= 1)
                blocking.push("the only active status");
        }
        return { blocking, archivable: kind !== "status" };
    }
    collectionFor(data, kind) {
        return kind === "topic" ? data.topics : kind === "actor" ? data.actors : kind === "type" ? data.cardTypes : kind === "status" ? data.statuses : data.subtopics;
    }
    renderMain(data, cards) {
        const common = {
            data, cards, selectedTopicId: this.state.selectedTopicId, scope: this.state.scope, filters: this.state.filters,
            onOpen: (id) => this.setState({ drawerCardId: id }), onCreate: () => this.openCreate(),
            onToggleExpand: this.toggleExpand, onToggleItem: this.toggleItem,
            onClearTopic: () => this.setState({ selectedTopicId: null }), onClearScope: () => this.setState({ scope: "" }),
            onFilter: this.setFilter, onClearFilters: this.clearFilters
        };
        if (this.state.route === "dashboard")
            return html `<${DashboardView} ...${common} cards=${data.cards.filter(c => !isDoneCard(data, c))} onNavigate=${this.navigate}/>`;
        if (this.state.route === "board") {
            const allExpanded = cards.length > 0 && cards.every(c => this.state.expanded.has(c.id));
            return html `<${BoardView} ...${common} expanded=${this.state.expanded} allExpanded=${allExpanded} onExpandAll=${() => this.expandAll(cards)} onAxis=${(axis) => this.setSetting("boardAxis", axis)} onAddTopic=${() => this.openEntityDialog("topic")} onQuickCreate=${(col) => this.openCreate(col.kind === "topic" ? { topicId: col.id } : { statusId: col.id })} draggingId=${this.state.draggingId} dragOverId=${this.state.dragOverId} onDragStart=${this.onDragStart} onDragEnd=${this.onDragEnd} onDragOver=${this.onDragOver} onDragLeave=${() => this.setState({ dragOverId: null })} onDrop=${this.onDrop}/>`;
        }
        if (this.state.route === "list") {
            const allExpanded = cards.length > 0 && cards.every(c => this.state.expanded.has(c.id));
            return html `<${ListView} ...${common} title=${this.listTitle()} expanded=${this.state.expanded} allExpanded=${allExpanded} onExpandAll=${() => this.expandAll(cards)}/>`;
        }
        if (this.state.route === "calendar")
            return html `<${CalendarView} ...${common} month=${this.state.calendarMonth} onMonth=${(calendarMonth) => this.setState({ calendarMonth })} onCreateDate=${(date) => this.openCreate({ date })} onNavigate=${this.navigate}/>`;
        if (this.state.route === "flow")
            return html `<${FlowView} ...${common}/>`;
        if (this.state.route === "archive")
            return html `<${ArchiveView} data=${data} backups=${this.state.backups} storageInfo=${this.state.storageInfo} desktop=${this.provider.desktop} backupBusy=${this.state.backupBusy || this.state.importBusy} onRefresh=${this.refreshBackups} onBackup=${this.createBackup} onExportJson=${this.exportJson} onExportCsv=${this.exportCsv} onExportMarkdown=${this.exportMarkdown} onImportFile=${this.prepareImportFile} onOpenFolder=${() => this.provider.openDataFolder()} onRestoreCard=${this.restoreCard} onDeleteCard=${this.deleteCard} onRestoreBackup=${this.restoreBackup} onDeleteBackup=${this.deleteBackup}/>`;
        return html `<${SettingsView} data=${data} desktop=${this.provider.desktop} storageInfo=${this.state.storageInfo} onSetting=${this.setSetting} onAutostart=${this.setAutostart} onEntityDialog=${this.openEntityDialog} onRestoreEntity=${this.restoreEntity}/>`;
    }
    render() {
        if (!this.state.ready)
            return html `<div className="loading"><div><div className="spinner"></div>Opening your local workspace…</div></div>`;
        if (this.state.loadError || !this.state.data)
            return html `<${RecoveryScreen} message=${this.state.loadError || "The workspace did not return any data."} storageInfo=${this.state.storageInfo} desktop=${this.provider.desktop} onRetry=${this.loadWorkspace} onOpenFolder=${() => this.provider.openDataFolder()}/>`;
        const data = this.state.data;
        const cards = this.filteredCards();
        const drawerCard = this.state.drawerCardId ? data.cards.find(c => c.id === this.state.drawerCardId) : undefined;
        return html `<div className=${`app density-${data.settings.density}`}>
      <${Topbar} route=${this.state.route} search=${this.state.search} onSearch=${(search) => this.setState({ search })} onRoute=${(route) => this.navigate(route, this.state.selectedTopicId, this.state.scope)} onCreate=${() => this.openCreate()} onToggleFilters=${() => this.setState({ filtersOpen: !this.state.filtersOpen })} filtersOpen=${this.state.filtersOpen} activeFilterCount=${this.activeFilterCount()} saveState=${this.state.saveState} desktop=${this.provider.desktop} undoAvailable=${this.state.undoStack.length > 0} onUndo=${this.undoLastChange} onRetrySave=${this.retrySave}/>
      <div className="app-shell"><${Sidebar} data=${data} route=${this.state.route} selectedTopicId=${this.state.selectedTopicId} scope=${this.state.scope} onNavigate=${this.navigate} onSavedView=${this.applySavedView} onAddTopic=${() => this.openEntityDialog("topic")}/><main className="main">${this.renderMain(data, cards)}</main></div>
      ${this.state.filtersOpen ? html `<${FilterPopover} data=${data} filters=${this.state.filters} onFilter=${this.setFilter} onClear=${() => this.setState({ filters: { statusId: "", bicId: "", due: "all", priority: "" } })} onSaveView=${this.saveView}/>` : null}
      ${this.state.createOpen ? html `<${CreateTaskModal} data=${data} defaultTopicId=${this.state.createDefaults.topicId} defaultStatusId=${this.state.createDefaults.statusId} defaultDate=${this.state.createDefaults.date} onClose=${() => this.setState({ createOpen: false })} onCreate=${this.createTask}/>` : null}
      ${this.state.importCandidate ? html `<${ImportWorkspaceModal} candidate=${this.state.importCandidate} busy=${this.state.importBusy} onClose=${() => this.setState({ importCandidate: null })} onConfirm=${this.confirmImport}/>` : null}
      ${this.state.prompt ? html `<${PromptModal} ...${this.state.prompt} onCancel=${() => this.cancelPrompt()}/>` : null}
      ${this.state.entityDialog ? html `<${EntityDialog} kind=${this.state.entityDialog.kind} item=${this.state.entityDialog.item} onClose=${() => this.setState({ entityDialog: null })} onSave=${this.saveEntity} onRemove=${this.removeEntity}/>` : null}
      ${drawerCard ? html `<${CardDrawer} data=${data} card=${drawerCard} onClose=${() => this.setState({ drawerCardId: null })} onUpdateCard=${this.updateCard} onMoveTopic=${this.moveCardTopic} onStatus=${this.setCardStatus} onArchive=${this.archiveCard} onDone=${this.markDone} onDuplicate=${this.duplicateCard} onToggleItem=${this.toggleItem} onUpdateItem=${this.updateItem} onAddItem=${this.addItem} onDeleteItem=${this.deleteItem} onIndentItem=${this.indentItem} onOutdentItem=${this.outdentItem} onRestoreCard=${(id) => { this.restoreCard(id); this.setState({ drawerCardId: null }); }}/>` : null}
      ${this.state.toast ? html `<div className=${`toast ${this.state.toast.type}`}><${Icon} name=${this.state.toast.type === "success" ? "check" : "alert"} size=${18}/><span>${this.state.toast.message}</span></div>` : null}
    </div>`;
    }
}
/**
 * Keeps a render fault recoverable instead of blanking the window.
 *
 * The workspace itself is already safe: saves are queued and committed by the
 * backend, so a crash here loses presentation state, not data.
 */
class AppErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        this.state = { error: null };
    }
    // The vendored React is 16.0, which predates getDerivedStateFromError (16.6).
    // componentDidCatch plus setState is the pattern this version supports.
    componentDidCatch(error, info) {
        console.error("Running_Task interface error", error, info);
        this.setState({ error });
    }
    render() {
        var _a;
        if (!this.state.error)
            return this.props.children;
        const detail = ((_a = this.state.error) === null || _a === void 0 ? void 0 : _a.message) || String(this.state.error);
        return html `<${RecoveryScreen}
      message=${`The interface stopped rendering: ${detail}`}
      storageInfo=${null}
      desktop=${hasTauri()}
      onRetry=${() => window.location.reload()}
      onOpenFolder=${() => { if (hasTauri())
            void tauriInvoke("open_data_folder"); }}
    />`;
    }
}
ReactDOM.render(html `<${AppErrorBoundary}><${RunningTaskApp}/><//>`, document.getElementById("root"));
//# sourceMappingURL=app.js.map