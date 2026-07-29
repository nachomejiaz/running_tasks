use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fmt::Write,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_autostart::{ManagerExt, MacosLauncher};

const SCHEMA_VERSION: i64 = 1;

#[derive(Debug)]
struct LocalState {
    data_dir: PathBuf,
    db_path: PathBuf,
    backups_dir: PathBuf,
    exports_dir: PathBuf,
    database_ready: Mutex<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MetaInfo {
    schema_version: i64,
    app_version: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Topic {
    id: String,
    name: String,
    color: String,
    icon: String,
    rank: i64,
    archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Subtopic {
    id: String,
    topic_id: String,
    name: String,
    color: String,
    rank: i64,
    archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CardType {
    id: String,
    name: String,
    color: String,
    icon: String,
    rank: i64,
    archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StatusRecord {
    id: String,
    name: String,
    color: String,
    rank: i64,
    terminal: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Actor {
    id: String,
    name: String,
    organization: String,
    color: String,
    rank: i64,
    archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Card {
    id: String,
    topic_id: String,
    subtopic_id: Option<String>,
    card_type_id: Option<String>,
    status_id: String,
    reference: String,
    title: String,
    description: String,
    notes: String,
    priority: String,
    target_date: Option<String>,
    fallback_bic_id: Option<String>,
    tags: Vec<String>,
    rank: i64,
    is_archived: bool,
    archive_reason: Option<String>,
    last_active_status_id: Option<String>,
    completed_at: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChecklistItem {
    id: String,
    card_id: String,
    parent_id: Option<String>,
    title: String,
    notes: String,
    due_date: Option<String>,
    bic_id: Option<String>,
    completed: bool,
    rank: i64,
    completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Filters {
    status_id: String,
    bic_id: String,
    due: String,
    priority: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SavedView {
    id: String,
    name: String,
    route: String,
    selected_topic_id: Option<String>,
    scope: String,
    filters: Filters,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    board_axis: String,
    theme: String,
    density: String,
    autostart: bool,
    my_actor_id: String,
    show_descriptions: bool,
    backup_retention: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppData {
    meta: MetaInfo,
    settings: Settings,
    topics: Vec<Topic>,
    subtopics: Vec<Subtopic>,
    card_types: Vec<CardType>,
    statuses: Vec<StatusRecord>,
    actors: Vec<Actor>,
    cards: Vec<Card>,
    checklist_items: Vec<ChecklistItem>,
    saved_views: Vec<SavedView>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupInfo {
    id: String,
    name: String,
    path: String,
    created_at: String,
    size_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageInfo {
    data_path: String,
    backup_path: String,
    mode: String,
}

fn string_error(error: impl std::fmt::Display) -> String {
    error.to_string()
}

fn open_connection(path: &Path) -> Result<Connection, String> {
    let connection = Connection::open(path).map_err(string_error)?;
    connection
        .execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA busy_timeout = 5000;",
        )
        .map_err(string_error)?;
    Ok(connection)
}

fn initialize_database(path: &Path) -> Result<(), String> {
    let connection = open_connection(path)?;
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                board_axis TEXT NOT NULL,
                theme TEXT NOT NULL,
                density TEXT NOT NULL,
                autostart INTEGER NOT NULL,
                my_actor_id TEXT NOT NULL,
                show_descriptions INTEGER NOT NULL,
                backup_retention INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                icon TEXT NOT NULL,
                rank INTEGER NOT NULL,
                archived INTEGER NOT NULL DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS subtopics (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL REFERENCES topics(id),
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                rank INTEGER NOT NULL,
                archived INTEGER NOT NULL DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS card_types (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                icon TEXT NOT NULL,
                rank INTEGER NOT NULL,
                archived INTEGER NOT NULL DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS statuses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                rank INTEGER NOT NULL,
                terminal INTEGER NOT NULL DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS actors (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                organization TEXT NOT NULL DEFAULT '',
                color TEXT NOT NULL,
                rank INTEGER NOT NULL,
                archived INTEGER NOT NULL DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL REFERENCES topics(id),
                subtopic_id TEXT REFERENCES subtopics(id),
                card_type_id TEXT REFERENCES card_types(id),
                status_id TEXT NOT NULL REFERENCES statuses(id),
                reference TEXT NOT NULL DEFAULT '',
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                priority TEXT NOT NULL DEFAULT 'Normal',
                target_date TEXT,
                fallback_bic_id TEXT REFERENCES actors(id),
                tags_json TEXT NOT NULL DEFAULT '[]',
                rank INTEGER NOT NULL,
                is_archived INTEGER NOT NULL DEFAULT 0,
                archive_reason TEXT,
                last_active_status_id TEXT,
                completed_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS checklist_items (
                id TEXT PRIMARY KEY,
                card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
                parent_id TEXT REFERENCES checklist_items(id) ON DELETE SET NULL,
                title TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                due_date TEXT,
                bic_id TEXT REFERENCES actors(id),
                completed INTEGER NOT NULL DEFAULT 0,
                rank INTEGER NOT NULL,
                completed_at TEXT
             );
             CREATE TABLE IF NOT EXISTS saved_views (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                route TEXT NOT NULL,
                selected_topic_id TEXT,
                scope TEXT NOT NULL DEFAULT '',
                filters_json TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_cards_topic ON cards(topic_id);
             CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status_id);
             CREATE INDEX IF NOT EXISTS idx_cards_archive ON cards(is_archived);
             CREATE INDEX IF NOT EXISTS idx_checklist_card ON checklist_items(card_id);
             CREATE INDEX IF NOT EXISTS idx_checklist_due ON checklist_items(due_date);
             CREATE INDEX IF NOT EXISTS idx_checklist_bic ON checklist_items(bic_id);",
        )
        .map_err(string_error)?;
    Ok(())
}

fn put_meta(transaction: &Transaction<'_>, key: &str, value: &str) -> Result<(), String> {
    transaction
        .execute(
            "INSERT INTO app_meta(key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )
        .map_err(string_error)?;
    Ok(())
}

fn validate_data(data: &AppData) -> Result<(), String> {
    if data.topics.is_empty() {
        return Err("At least one Topic is required.".to_string());
    }
    if !data.statuses.iter().any(|status| status.terminal) {
        return Err("At least one terminal status (Done) is required.".to_string());
    }

    let topic_ids: HashSet<&str> = data.topics.iter().map(|record| record.id.as_str()).collect();
    let type_ids: HashSet<&str> = data.card_types.iter().map(|record| record.id.as_str()).collect();
    let status_ids: HashSet<&str> = data.statuses.iter().map(|record| record.id.as_str()).collect();
    let actor_ids: HashSet<&str> = data.actors.iter().map(|record| record.id.as_str()).collect();
    let card_ids: HashSet<&str> = data.cards.iter().map(|record| record.id.as_str()).collect();
    let subtopic_topics: HashMap<&str, &str> = data
        .subtopics
        .iter()
        .map(|record| (record.id.as_str(), record.topic_id.as_str()))
        .collect();
    let checklist_by_id: HashMap<&str, &ChecklistItem> = data
        .checklist_items
        .iter()
        .map(|record| (record.id.as_str(), record))
        .collect();

    for subtopic in &data.subtopics {
        if !topic_ids.contains(subtopic.topic_id.as_str()) {
            return Err(format!("Subtopic '{}' references a missing Topic.", subtopic.name));
        }
    }

    for card in &data.cards {
        if !topic_ids.contains(card.topic_id.as_str()) {
            return Err(format!("Task '{}' references a missing Topic.", card.title));
        }
        if !status_ids.contains(card.status_id.as_str()) {
            return Err(format!("Task '{}' references a missing Status.", card.title));
        }
        if let Some(subtopic_id) = card.subtopic_id.as_deref() {
            match subtopic_topics.get(subtopic_id) {
                Some(topic_id) if *topic_id == card.topic_id.as_str() => {}
                Some(_) => return Err(format!("Task '{}' has a Subtopic from another Topic.", card.title)),
                None => return Err(format!("Task '{}' references a missing Subtopic.", card.title)),
            }
        }
        if let Some(card_type_id) = card.card_type_id.as_deref() {
            if !type_ids.contains(card_type_id) {
                return Err(format!("Task '{}' references a missing Card Type.", card.title));
            }
        }
        if let Some(actor_id) = card.fallback_bic_id.as_deref() {
            if !actor_ids.contains(actor_id) {
                return Err(format!("Task '{}' references a missing fallback BIC.", card.title));
            }
        }
    }

    for item in &data.checklist_items {
        if !card_ids.contains(item.card_id.as_str()) {
            return Err(format!("Checklist item '{}' references a missing Task.", item.title));
        }
        if let Some(actor_id) = item.bic_id.as_deref() {
            if !actor_ids.contains(actor_id) {
                return Err(format!("Checklist item '{}' references a missing BIC.", item.title));
            }
        }
        if let Some(parent_id) = item.parent_id.as_deref() {
            if parent_id == item.id.as_str() {
                return Err(format!("Checklist item '{}' cannot be its own parent.", item.title));
            }
            match checklist_by_id.get(parent_id) {
                Some(parent) if parent.card_id == item.card_id => {}
                Some(_) => return Err(format!("Checklist item '{}' has a parent from another Task.", item.title)),
                None => return Err(format!("Checklist item '{}' references a missing parent item.", item.title)),
            }

            let mut visited = HashSet::new();
            let mut cursor = Some(parent_id);
            while let Some(current_id) = cursor {
                if !visited.insert(current_id) || current_id == item.id {
                    return Err(format!("Checklist hierarchy for '{}' contains a cycle.", item.title));
                }
                cursor = checklist_by_id.get(current_id).and_then(|parent| parent.parent_id.as_deref());
            }
        }
    }

    Ok(())
}

fn save_data(path: &Path, data: &AppData) -> Result<(), String> {
    validate_data(data)?;
    let mut connection = open_connection(path)?;
    let transaction = connection.transaction().map_err(string_error)?;

    transaction
        .execute_batch(
            "DELETE FROM checklist_items;
             DELETE FROM cards;
             DELETE FROM saved_views;
             DELETE FROM subtopics;
             DELETE FROM topics;
             DELETE FROM card_types;
             DELETE FROM statuses;
             DELETE FROM actors;
             DELETE FROM settings;
             DELETE FROM app_meta;",
        )
        .map_err(string_error)?;

    put_meta(&transaction, "schemaVersion", &data.meta.schema_version.to_string())?;
    put_meta(&transaction, "appVersion", &data.meta.app_version)?;
    put_meta(&transaction, "createdAt", &data.meta.created_at)?;
    put_meta(&transaction, "updatedAt", &data.meta.updated_at)?;

    transaction
        .execute(
            "INSERT INTO settings(id, board_axis, theme, density, autostart, my_actor_id, show_descriptions, backup_retention)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                data.settings.board_axis,
                data.settings.theme,
                data.settings.density,
                data.settings.autostart as i64,
                data.settings.my_actor_id,
                data.settings.show_descriptions as i64,
                data.settings.backup_retention
            ],
        )
        .map_err(string_error)?;

    for record in &data.topics {
        transaction
            .execute(
                "INSERT INTO topics(id, name, color, icon, rank, archived) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![record.id, record.name, record.color, record.icon, record.rank, record.archived as i64],
            )
            .map_err(string_error)?;
    }
    for record in &data.subtopics {
        transaction
            .execute(
                "INSERT INTO subtopics(id, topic_id, name, color, rank, archived) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![record.id, record.topic_id, record.name, record.color, record.rank, record.archived as i64],
            )
            .map_err(string_error)?;
    }
    for record in &data.card_types {
        transaction
            .execute(
                "INSERT INTO card_types(id, name, color, icon, rank, archived) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![record.id, record.name, record.color, record.icon, record.rank, record.archived as i64],
            )
            .map_err(string_error)?;
    }
    for record in &data.statuses {
        transaction
            .execute(
                "INSERT INTO statuses(id, name, color, rank, terminal) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![record.id, record.name, record.color, record.rank, record.terminal as i64],
            )
            .map_err(string_error)?;
    }
    for record in &data.actors {
        transaction
            .execute(
                "INSERT INTO actors(id, name, organization, color, rank, archived) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![record.id, record.name, record.organization, record.color, record.rank, record.archived as i64],
            )
            .map_err(string_error)?;
    }
    for record in &data.cards {
        let tags_json = serde_json::to_string(&record.tags).map_err(string_error)?;
        transaction
            .execute(
                "INSERT INTO cards(
                    id, topic_id, subtopic_id, card_type_id, status_id, reference, title, description, notes,
                    priority, target_date, fallback_bic_id, tags_json, rank, is_archived, archive_reason,
                    last_active_status_id, completed_at, created_at, updated_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
                params![
                    record.id,
                    record.topic_id,
                    record.subtopic_id,
                    record.card_type_id,
                    record.status_id,
                    record.reference,
                    record.title,
                    record.description,
                    record.notes,
                    record.priority,
                    record.target_date,
                    record.fallback_bic_id,
                    tags_json,
                    record.rank,
                    record.is_archived as i64,
                    record.archive_reason,
                    record.last_active_status_id,
                    record.completed_at,
                    record.created_at,
                    record.updated_at
                ],
            )
            .map_err(string_error)?;
    }
    // Insert checklist rows without parent links first so imported or reordered data
    // cannot violate the self-referencing foreign key merely because of row order.
    for record in &data.checklist_items {
        transaction
            .execute(
                "INSERT INTO checklist_items(id, card_id, parent_id, title, notes, due_date, bic_id, completed, rank, completed_at)
                 VALUES (?1, ?2, NULL, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    &record.id,
                    &record.card_id,
                    &record.title,
                    &record.notes,
                    record.due_date.as_deref(),
                    record.bic_id.as_deref(),
                    record.completed as i64,
                    record.rank,
                    record.completed_at.as_deref()
                ],
            )
            .map_err(string_error)?;
    }
    for record in &data.checklist_items {
        if let Some(parent_id) = record.parent_id.as_deref() {
            transaction
                .execute(
                    "UPDATE checklist_items SET parent_id = ?1 WHERE id = ?2",
                    params![parent_id, &record.id],
                )
                .map_err(string_error)?;
        }
    }
    for record in &data.saved_views {
        let filters_json = serde_json::to_string(&record.filters).map_err(string_error)?;
        transaction
            .execute(
                "INSERT INTO saved_views(id, name, route, selected_topic_id, scope, filters_json)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![record.id, record.name, record.route, record.selected_topic_id, record.scope, filters_json],
            )
            .map_err(string_error)?;
    }

    transaction.commit().map_err(string_error)?;
    Ok(())
}

fn read_meta(connection: &Connection, key: &str) -> Result<Option<String>, String> {
    connection
        .query_row("SELECT value FROM app_meta WHERE key = ?1", params![key], |row| row.get(0))
        .optional()
        .map_err(string_error)
}

fn load_data(path: &Path) -> Result<Option<AppData>, String> {
    let connection = open_connection(path)?;
    let schema_value = read_meta(&connection, "schemaVersion")?;
    let Some(schema_text) = schema_value else {
        return Ok(None);
    };
    let stored_schema = schema_text
        .parse::<i64>()
        .map_err(|_| format!("The workspace schema version '{}' is invalid.", schema_text))?;
    if stored_schema > SCHEMA_VERSION {
        return Err(format!(
            "This workspace uses schema version {stored_schema}, but this Running_Task build supports schema version {SCHEMA_VERSION}. Install a newer Running_Task build before opening it."
        ));
    }
    if stored_schema < SCHEMA_VERSION {
        return Err(format!(
            "This workspace uses schema version {stored_schema}, but no verified migration to schema version {SCHEMA_VERSION} is available in this build."
        ));
    }

    let settings = connection
        .query_row(
            "SELECT board_axis, theme, density, autostart, my_actor_id, show_descriptions, backup_retention FROM settings WHERE id = 1",
            [],
            |row| {
                Ok(Settings {
                    board_axis: row.get(0)?,
                    theme: row.get(1)?,
                    density: row.get(2)?,
                    autostart: row.get::<_, i64>(3)? != 0,
                    my_actor_id: row.get(4)?,
                    show_descriptions: row.get::<_, i64>(5)? != 0,
                    backup_retention: row.get(6)?,
                })
            },
        )
        .map_err(string_error)?;

    let topics = {
        let mut statement = connection
            .prepare("SELECT id, name, color, icon, rank, archived FROM topics ORDER BY rank")
            .map_err(string_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(Topic {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    icon: row.get(3)?,
                    rank: row.get(4)?,
                    archived: row.get::<_, i64>(5)? != 0,
                })
            })
            .map_err(string_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(string_error)?
    };

    let subtopics = {
        let mut statement = connection
            .prepare("SELECT id, topic_id, name, color, rank, archived FROM subtopics ORDER BY rank")
            .map_err(string_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(Subtopic {
                    id: row.get(0)?,
                    topic_id: row.get(1)?,
                    name: row.get(2)?,
                    color: row.get(3)?,
                    rank: row.get(4)?,
                    archived: row.get::<_, i64>(5)? != 0,
                })
            })
            .map_err(string_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(string_error)?
    };

    let card_types = {
        let mut statement = connection
            .prepare("SELECT id, name, color, icon, rank, archived FROM card_types ORDER BY rank")
            .map_err(string_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(CardType {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    icon: row.get(3)?,
                    rank: row.get(4)?,
                    archived: row.get::<_, i64>(5)? != 0,
                })
            })
            .map_err(string_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(string_error)?
    };

    let statuses = {
        let mut statement = connection
            .prepare("SELECT id, name, color, rank, terminal FROM statuses ORDER BY rank")
            .map_err(string_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(StatusRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    rank: row.get(3)?,
                    terminal: row.get::<_, i64>(4)? != 0,
                })
            })
            .map_err(string_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(string_error)?
    };

    let actors = {
        let mut statement = connection
            .prepare("SELECT id, name, organization, color, rank, archived FROM actors ORDER BY rank")
            .map_err(string_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(Actor {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    organization: row.get(2)?,
                    color: row.get(3)?,
                    rank: row.get(4)?,
                    archived: row.get::<_, i64>(5)? != 0,
                })
            })
            .map_err(string_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(string_error)?
    };

    let cards = {
        let mut statement = connection
            .prepare(
                "SELECT id, topic_id, subtopic_id, card_type_id, status_id, reference, title, description, notes,
                        priority, target_date, fallback_bic_id, tags_json, rank, is_archived, archive_reason,
                        last_active_status_id, completed_at, created_at, updated_at
                 FROM cards ORDER BY rank",
            )
            .map_err(string_error)?;
        let rows = statement
            .query_map([], |row| {
                let tags_json: String = row.get(12)?;
                Ok(Card {
                    id: row.get(0)?,
                    topic_id: row.get(1)?,
                    subtopic_id: row.get(2)?,
                    card_type_id: row.get(3)?,
                    status_id: row.get(4)?,
                    reference: row.get(5)?,
                    title: row.get(6)?,
                    description: row.get(7)?,
                    notes: row.get(8)?,
                    priority: row.get(9)?,
                    target_date: row.get(10)?,
                    fallback_bic_id: row.get(11)?,
                    tags: serde_json::from_str(&tags_json).unwrap_or_default(),
                    rank: row.get(13)?,
                    is_archived: row.get::<_, i64>(14)? != 0,
                    archive_reason: row.get(15)?,
                    last_active_status_id: row.get(16)?,
                    completed_at: row.get(17)?,
                    created_at: row.get(18)?,
                    updated_at: row.get(19)?,
                })
            })
            .map_err(string_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(string_error)?
    };

    let checklist_items = {
        let mut statement = connection
            .prepare("SELECT id, card_id, parent_id, title, notes, due_date, bic_id, completed, rank, completed_at FROM checklist_items ORDER BY rank")
            .map_err(string_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(ChecklistItem {
                    id: row.get(0)?,
                    card_id: row.get(1)?,
                    parent_id: row.get(2)?,
                    title: row.get(3)?,
                    notes: row.get(4)?,
                    due_date: row.get(5)?,
                    bic_id: row.get(6)?,
                    completed: row.get::<_, i64>(7)? != 0,
                    rank: row.get(8)?,
                    completed_at: row.get(9)?,
                })
            })
            .map_err(string_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(string_error)?
    };

    let saved_views = {
        let mut statement = connection
            .prepare("SELECT id, name, route, selected_topic_id, scope, filters_json FROM saved_views ORDER BY name")
            .map_err(string_error)?;
        let rows = statement
            .query_map([], |row| {
                let filters_json: String = row.get(5)?;
                Ok(SavedView {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    route: row.get(2)?,
                    selected_topic_id: row.get(3)?,
                    scope: row.get(4)?,
                    filters: serde_json::from_str(&filters_json).unwrap_or(Filters {
                        status_id: String::new(),
                        bic_id: String::new(),
                        due: "all".to_string(),
                        priority: String::new(),
                    }),
                })
            })
            .map_err(string_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(string_error)?
    };

    let meta = MetaInfo {
        schema_version: stored_schema,
        app_version: read_meta(&connection, "appVersion")?.unwrap_or_else(|| env!("CARGO_PKG_VERSION").to_string()),
        created_at: read_meta(&connection, "createdAt")?.unwrap_or_else(|| Utc::now().to_rfc3339()),
        updated_at: read_meta(&connection, "updatedAt")?.unwrap_or_else(|| Utc::now().to_rfc3339()),
    };

    let data = AppData {
        meta,
        settings,
        topics,
        subtopics,
        card_types,
        statuses,
        actors,
        cards,
        checklist_items,
        saved_views,
    };
    validate_data(&data)?;
    Ok(Some(data))
}

fn mark_database_unready(state: &LocalState) {
    if let Ok(mut ready) = state.database_ready.lock() { *ready = false; }
}

#[tauri::command]
fn get_app_data(state: State<'_, LocalState>) -> Result<Option<AppData>, String> {
    ensure_database_ready(&state)?;
    match load_data(&state.db_path) {
        Ok(data) => Ok(data),
        Err(error) => { mark_database_unready(&state); Err(error) }
    }
}

#[tauri::command]
fn save_app_data(state: State<'_, LocalState>, data: AppData) -> Result<(), String> {
    ensure_database_ready(&state)?;
    if let Err(error) = save_data(&state.db_path, &data) {
        mark_database_unready(&state);
        return Err(error);
    }
    if let Err(error) = maybe_create_daily_backup(&state, data.settings.backup_retention) {
        // A backup problem must never make a successfully committed task edit appear lost.
        eprintln!("Running_Task automatic backup warning: {error}");
    }
    Ok(())
}

fn backup_file_info(path: &Path) -> Result<BackupInfo, String> {
    let metadata = fs::metadata(path).map_err(string_error)?;
    let created = metadata.modified().unwrap_or(UNIX_EPOCH);
    let created_at: DateTime<Utc> = created.into();
    let name = path.file_name().and_then(|v| v.to_str()).unwrap_or("backup.sqlite").to_string();
    Ok(BackupInfo {
        id: name.clone(),
        name,
        path: path.to_string_lossy().to_string(),
        created_at: created_at.to_rfc3339(),
        size_bytes: metadata.len(),
    })
}

fn create_backup_internal(state: &LocalState, prefix: &str) -> Result<BackupInfo, String> {
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S_%3f");
    let filename = format!("{}_{}.sqlite", prefix, timestamp);
    let target = state.backups_dir.join(filename);
    let connection = open_connection(&state.db_path)?;
    connection.execute_batch("PRAGMA wal_checkpoint(FULL);").map_err(string_error)?;
    connection
        .execute("VACUUM INTO ?1", params![target.to_string_lossy().to_string()])
        .map_err(string_error)?;
    backup_file_info(&target)
}


fn automatic_backup_paths(state: &LocalState) -> Result<Vec<PathBuf>, String> {
    let mut paths = Vec::new();
    for entry in fs::read_dir(&state.backups_dir).map_err(string_error)? {
        let path = entry.map_err(string_error)?.path();
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else { continue; };
        if name.starts_with("Auto_") && name.to_ascii_lowercase().ends_with(".sqlite") {
            paths.push(path);
        }
    }
    paths.sort_by(|left, right| {
        let left_modified = fs::metadata(left).and_then(|metadata| metadata.modified()).unwrap_or(UNIX_EPOCH);
        let right_modified = fs::metadata(right).and_then(|metadata| metadata.modified()).unwrap_or(UNIX_EPOCH);
        right_modified.cmp(&left_modified)
    });
    Ok(paths)
}

fn prune_automatic_backups(state: &LocalState, retention: i64) -> Result<(), String> {
    let keep = retention.clamp(1, 365) as usize;
    let paths = automatic_backup_paths(state)?;
    for path in paths.into_iter().skip(keep) {
        fs::remove_file(path).map_err(string_error)?;
    }
    Ok(())
}

fn maybe_create_daily_backup(state: &LocalState, retention: i64) -> Result<(), String> {
    let today_prefix = format!("Auto_{}_", Utc::now().format("%Y%m%d"));
    let already_created_today = automatic_backup_paths(state)?.iter().any(|path| {
        path.file_name()
            .and_then(|value| value.to_str())
            .is_some_and(|name| name.starts_with(&today_prefix))
    });
    if !already_created_today {
        create_backup_internal(state, "Auto")?;
    }
    prune_automatic_backups(state, retention)
}

#[tauri::command]
fn create_backup(state: State<'_, LocalState>) -> Result<BackupInfo, String> {
    create_backup_internal(&state, "Running_Task")
}

#[tauri::command]
fn list_backups(state: State<'_, LocalState>) -> Result<Vec<BackupInfo>, String> {
    let mut backups = Vec::new();
    for entry in fs::read_dir(&state.backups_dir).map_err(string_error)? {
        let path = entry.map_err(string_error)?.path();
        if path.extension().and_then(|v| v.to_str()).is_some_and(|v| v.eq_ignore_ascii_case("sqlite")) {
            backups.push(backup_file_info(&path)?);
        }
    }
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}

fn safe_backup_path(state: &LocalState, backup_id: &str) -> Result<PathBuf, String> {
    let supplied = Path::new(backup_id);
    let filename = supplied.file_name().and_then(|value| value.to_str()).ok_or_else(|| "Invalid backup name.".to_string())?;
    if filename != backup_id || !filename.to_ascii_lowercase().ends_with(".sqlite") {
        return Err("Invalid backup name.".to_string());
    }
    let path = state.backups_dir.join(filename);
    if !path.is_file() {
        return Err("Backup file not found.".to_string());
    }
    Ok(path)
}

fn verify_database(path: &Path) -> Result<(), String> {
    let connection = Connection::open(path).map_err(string_error)?;
    let result: String = connection.query_row("PRAGMA quick_check(1)", [], |row| row.get(0)).map_err(string_error)?;
    if result.eq_ignore_ascii_case("ok") { Ok(()) } else { Err(format!("SQLite integrity check failed: {result}")) }
}


/// Verifies schema compatibility and takes a one-time safety snapshot before
/// an existing workspace is opened by a different application version.
fn preflight_existing_schema(path: &Path) -> Result<(), String> {
    let connection = Connection::open(path).map_err(string_error)?;
    let has_meta: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'app_meta')",
            [],
            |row| row.get(0),
        )
        .map_err(string_error)?;
    if !has_meta { return Ok(()); }
    let Some(schema_text) = read_meta(&connection, "schemaVersion")? else { return Ok(()); };
    let stored_schema = schema_text
        .parse::<i64>()
        .map_err(|_| format!("The workspace schema version '{}' is invalid.", schema_text))?;
    if stored_schema != SCHEMA_VERSION {
        return Err(if stored_schema > SCHEMA_VERSION {
            format!("The database schema ({stored_schema}) is newer than this application supports ({SCHEMA_VERSION}).")
        } else {
            format!("The database schema ({stored_schema}) requires a verified migration before it can be opened by schema {SCHEMA_VERSION}.")
        });
    }
    Ok(())
}

fn prepare_database_for_current_app(state: &LocalState) -> Result<(), String> {
    verify_database(&state.db_path)?;
    let connection = open_connection(&state.db_path)?;
    let Some(schema_text) = read_meta(&connection, "schemaVersion")? else {
        return Ok(());
    };
    let stored_schema = schema_text
        .parse::<i64>()
        .map_err(|_| format!("The workspace schema version '{}' is invalid.", schema_text))?;
    if stored_schema > SCHEMA_VERSION {
        return Err(format!(
            "The database schema ({stored_schema}) is newer than this application supports ({SCHEMA_VERSION})."
        ));
    }
    if stored_schema < SCHEMA_VERSION {
        return Err(format!(
            "The database schema ({stored_schema}) requires a verified migration before it can be opened by schema {SCHEMA_VERSION}."
        ));
    }

    let previous_version = read_meta(&connection, "appVersion")?;
    let current_version = env!("CARGO_PKG_VERSION");
    drop(connection);

    if previous_version.as_deref() != Some(current_version) {
        create_backup_internal(state, "Before_Upgrade")?;
        let connection = open_connection(&state.db_path)?;
        connection
            .execute(
                "INSERT INTO app_meta(key, value) VALUES ('appVersion', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![current_version],
            )
            .map_err(string_error)?;
    }
    Ok(())
}

fn ensure_database_ready(state: &LocalState) -> Result<(), String> {
    let mut ready = state.database_ready.lock().map_err(|_| "Database readiness lock was poisoned.".to_string())?;
    if *ready { return Ok(()); }
    if state.db_path.exists() && fs::metadata(&state.db_path).map(|meta| meta.len() > 0).unwrap_or(false) {
        verify_database(&state.db_path)?;
        preflight_existing_schema(&state.db_path)?;
    }
    initialize_database(&state.db_path)?;
    prepare_database_for_current_app(state)?;
    *ready = true;
    Ok(())
}

#[tauri::command]
fn restore_backup(state: State<'_, LocalState>, backup_id: String) -> Result<(), String> {
    let source = safe_backup_path(&state, &backup_id)?;
    verify_database(&source)?;
    let _safety_backup = create_backup_internal(&state, "Before_Restore")?;
    mark_database_unready(&state);

    let temporary = state.data_dir.join("running-task.restore.tmp");
    if temporary.exists() { fs::remove_file(&temporary).map_err(string_error)?; }
    fs::copy(&source, &temporary).map_err(string_error)?;
    verify_database(&temporary)?;

    let wal = PathBuf::from(format!("{}-wal", state.db_path.to_string_lossy()));
    let shm = PathBuf::from(format!("{}-shm", state.db_path.to_string_lossy()));
    if wal.exists() { let _ = fs::remove_file(wal); }
    if shm.exists() { let _ = fs::remove_file(shm); }
    if state.db_path.exists() { fs::remove_file(&state.db_path).map_err(string_error)?; }
    fs::rename(&temporary, &state.db_path).map_err(string_error)?;
    ensure_database_ready(&state)?;
    Ok(())
}

#[tauri::command]
fn delete_backup(state: State<'_, LocalState>, backup_id: String) -> Result<(), String> {
    let path = safe_backup_path(&state, &backup_id)?;
    fs::remove_file(path).map_err(string_error)
}

#[tauri::command]
fn export_json(state: State<'_, LocalState>) -> Result<String, String> {
    let data = load_data(&state.db_path)?.ok_or_else(|| "There is no workspace data to export yet.".to_string())?;
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S_%3f");
    let path = state.exports_dir.join(format!("Running_Task_Export_{timestamp}.json"));
    let json = serde_json::to_string_pretty(&data).map_err(string_error)?;
    fs::write(&path, json.as_bytes()).map_err(string_error)?;
    Ok(path.to_string_lossy().to_string())
}

fn csv_escape(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\r') || value.contains('\n') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn csv_line(values: &[String]) -> String {
    values.iter().map(|value| csv_escape(value)).collect::<Vec<_>>().join(",")
}

fn next_item_for<'a>(data: &'a AppData, card: &Card) -> Option<&'a ChecklistItem> {
    let mut open: Vec<&ChecklistItem> = data
        .checklist_items
        .iter()
        .filter(|item| item.card_id == card.id && !item.completed)
        .collect();
    open.sort_by(|left, right| match (&left.due_date, &right.due_date) {
        (Some(left_date), Some(right_date)) => left_date.cmp(right_date).then(left.rank.cmp(&right.rank)),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => left.rank.cmp(&right.rank),
    });
    open.first().copied()
}

fn actor_name<'a>(data: &'a AppData, actor_id: Option<&str>) -> &'a str {
    let Some(actor_id) = actor_id else { return ""; };
    data.actors
        .iter()
        .find(|actor| actor.id == actor_id)
        .map(|actor| actor.name.as_str())
        .unwrap_or("")
}

fn card_next_date<'a>(data: &'a AppData, card: &'a Card) -> Option<&'a str> {
    next_item_for(data, card)
        .and_then(|item| item.due_date.as_deref())
        .or(card.target_date.as_deref())
}

fn card_next_bic<'a>(data: &'a AppData, card: &'a Card) -> &'a str {
    let item_bic = next_item_for(data, card).and_then(|item| item.bic_id.as_deref());
    actor_name(data, item_bic.or(card.fallback_bic_id.as_deref()))
}

fn markdown_text(value: &str) -> String {
    value.replace('\r', " ").replace('\n', " ").trim().to_string()
}

fn checklist_depth(data: &AppData, item: &ChecklistItem) -> usize {
    let by_id: HashMap<&str, &ChecklistItem> = data
        .checklist_items
        .iter()
        .filter(|candidate| candidate.card_id == item.card_id)
        .map(|candidate| (candidate.id.as_str(), candidate))
        .collect();
    let mut depth = 0usize;
    let mut cursor = item.parent_id.as_deref();
    let mut visited = HashSet::new();
    while let Some(parent_id) = cursor {
        if !visited.insert(parent_id) { break; }
        let Some(parent) = by_id.get(parent_id) else { break; };
        depth = (depth + 1).min(3);
        cursor = parent.parent_id.as_deref();
    }
    depth
}

#[tauri::command]
fn export_csv(state: State<'_, LocalState>) -> Result<String, String> {
    let data = load_data(&state.db_path)?.ok_or_else(|| "There is no workspace data to export yet.".to_string())?;
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S_%3f");
    let path = state.exports_dir.join(format!("Running_Task_Export_{timestamp}.csv"));
    let mut output = String::new();
    let headers = vec![
        "Topic", "Subtopic", "Card Type", "Status", "Reference", "Card Title", "Card Description", "Priority",
        "Target Date", "Next Date", "Current BIC", "Tags", "Archive State", "Completed At", "Checklist Item",
        "Checklist Parent", "Checklist Due Date", "Checklist BIC", "Checklist Complete", "Checklist Notes",
    ].into_iter().map(str::to_string).collect::<Vec<_>>();
    let _ = writeln!(&mut output, "{}", csv_line(&headers));

    let mut cards = data.cards.iter().collect::<Vec<_>>();
    cards.sort_by(|left, right| left.rank.cmp(&right.rank).then(left.title.cmp(&right.title)));
    for card in cards {
        let topic = data.topics.iter().find(|item| item.id == card.topic_id).map(|item| item.name.as_str()).unwrap_or("");
        let subtopic = card.subtopic_id.as_deref().and_then(|id| data.subtopics.iter().find(|item| item.id == id)).map(|item| item.name.as_str()).unwrap_or("");
        let card_type = card.card_type_id.as_deref().and_then(|id| data.card_types.iter().find(|item| item.id == id)).map(|item| item.name.as_str()).unwrap_or("");
        let status = data.statuses.iter().find(|item| item.id == card.status_id).map(|item| item.name.as_str()).unwrap_or("");
        let archive_state = if card.is_archived { card.archive_reason.as_deref().unwrap_or("archived") } else { "active" };
        let base = vec![
            topic.to_string(), subtopic.to_string(), card_type.to_string(), status.to_string(), card.reference.clone(),
            card.title.clone(), card.description.clone(), card.priority.clone(), card.target_date.clone().unwrap_or_default(),
            card_next_date(&data, card).unwrap_or("").to_string(), card_next_bic(&data, card).to_string(), card.tags.join("; "),
            archive_state.to_string(), card.completed_at.clone().unwrap_or_default(),
        ];
        let mut items = data.checklist_items.iter().filter(|item| item.card_id == card.id).collect::<Vec<_>>();
        items.sort_by_key(|item| item.rank);
        if items.is_empty() {
            let mut row = base.clone();
            row.extend(vec![String::new(); 6]);
            let _ = writeln!(&mut output, "{}", csv_line(&row));
            continue;
        }
        let by_id: HashMap<&str, &ChecklistItem> = items.iter().map(|item| (item.id.as_str(), *item)).collect();
        for item in items {
            let parent = item.parent_id.as_deref().and_then(|id| by_id.get(id)).map(|parent| parent.title.as_str()).unwrap_or("");
            let mut row = base.clone();
            row.extend([
                item.title.clone(), parent.to_string(), item.due_date.clone().unwrap_or_default(),
                actor_name(&data, item.bic_id.as_deref()).to_string(), if item.completed { "Yes" } else { "No" }.to_string(), item.notes.clone(),
            ]);
            let _ = writeln!(&mut output, "{}", csv_line(&row));
        }
    }
    fs::write(&path, output.as_bytes()).map_err(string_error)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn export_markdown(state: State<'_, LocalState>) -> Result<String, String> {
    let data = load_data(&state.db_path)?.ok_or_else(|| "There is no workspace data to export yet.".to_string())?;
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S_%3f");
    let path = state.exports_dir.join(format!("Running_Task_Export_{timestamp}.md"));
    let mut output = String::new();
    let _ = writeln!(&mut output, "# Running_Task workspace export\n");
    let _ = writeln!(&mut output, "Exported: {}", Utc::now().to_rfc3339());
    let _ = writeln!(&mut output, "Version: {}\n", data.meta.app_version);

    let mut topics = data.topics.iter().collect::<Vec<_>>();
    topics.sort_by_key(|topic| topic.rank);
    for topic in topics {
        let _ = writeln!(&mut output, "## {}\n", markdown_text(&topic.name));
        let mut cards = data.cards.iter().filter(|card| card.topic_id == topic.id).collect::<Vec<_>>();
        cards.sort_by(|left, right| left.rank.cmp(&right.rank).then(left.title.cmp(&right.title)));
        if cards.is_empty() {
            let _ = writeln!(&mut output, "_No tasks._\n");
            continue;
        }
        for card in cards {
            let prefix = if card.is_archived { "[Archived] " } else { "" };
            let reference = if card.reference.is_empty() { String::new() } else { format!("{} - ", markdown_text(&card.reference)) };
            let _ = writeln!(&mut output, "### {}{}{}", prefix, reference, markdown_text(&card.title));
            let status = data.statuses.iter().find(|item| item.id == card.status_id).map(|item| item.name.as_str()).unwrap_or("Unknown");
            let _ = writeln!(&mut output, "- Status: {}", markdown_text(status));
            if let Some(subtopic) = card.subtopic_id.as_deref().and_then(|id| data.subtopics.iter().find(|item| item.id == id)) {
                let _ = writeln!(&mut output, "- Subtopic: {}", markdown_text(&subtopic.name));
            }
            if let Some(card_type) = card.card_type_id.as_deref().and_then(|id| data.card_types.iter().find(|item| item.id == id)) {
                let _ = writeln!(&mut output, "- Card type: {}", markdown_text(&card_type.name));
            }
            let _ = writeln!(&mut output, "- Priority: {}", card.priority);
            let _ = writeln!(&mut output, "- Next date: {}", card_next_date(&data, card).unwrap_or("No date"));
            let next_bic = card_next_bic(&data, card);
            let _ = writeln!(&mut output, "- Ball in Court: {}", if next_bic.is_empty() { "Unassigned" } else { next_bic });
            if !card.description.trim().is_empty() { let _ = writeln!(&mut output, "\n{}", markdown_text(&card.description)); }
            let mut items = data.checklist_items.iter().filter(|item| item.card_id == card.id).collect::<Vec<_>>();
            items.sort_by_key(|item| item.rank);
            if !items.is_empty() {
                let _ = writeln!(&mut output, "\nChecklist:");
                for item in items {
                    let indent = "  ".repeat(checklist_depth(&data, item));
                    let bic = actor_name(&data, item.bic_id.as_deref());
                    let _ = writeln!(&mut output, "{}- [{}] {} ({} | {})", indent, if item.completed { "x" } else { " " }, markdown_text(&item.title), item.due_date.as_deref().unwrap_or("No date"), if bic.is_empty() { "No BIC" } else { bic });
                }
            }
            if !card.notes.trim().is_empty() { let _ = writeln!(&mut output, "\nNotes: {}", markdown_text(&card.notes)); }
            let _ = writeln!(&mut output);
        }
    }
    fs::write(&path, output.as_bytes()).map_err(string_error)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_storage_info(state: State<'_, LocalState>) -> StorageInfo {
    StorageInfo {
        data_path: state.db_path.to_string_lossy().to_string(),
        backup_path: state.backups_dir.to_string_lossy().to_string(),
        mode: "Local SQLite desktop database".to_string(),
    }
}

#[tauri::command]
fn open_data_folder(state: State<'_, LocalState>) -> Result<(), String> {
    let path = state.data_dir.to_string_lossy().to_string();
    #[cfg(target_os = "windows")]
    let result = Command::new("explorer.exe").arg(&path).spawn();
    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(&path).spawn();
    #[cfg(all(unix, not(target_os = "macos")))]
    let result = Command::new("xdg-open").arg(&path).spawn();
    result.map(|_| ()).map_err(string_error)
}

#[tauri::command]
fn set_autostart(app: AppHandle, enabled: bool) -> Result<bool, String> {
    let manager = app.autolaunch();
    if enabled { manager.enable().map_err(string_error)?; } else { manager.disable().map_err(string_error)?; }
    manager.is_enabled().map_err(string_error)
}

#[tauri::command]
fn get_autostart(app: AppHandle) -> Result<bool, String> {
    app.autolaunch().is_enabled().map_err(string_error)
}

fn autostart_preference(path: &Path) -> bool {
    let Ok(connection) = Connection::open(path) else { return true; };
    connection.query_row("SELECT autostart FROM settings WHERE id = 1", [], |row| row.get::<_, i64>(0)).optional().ok().flatten().map(|value| value != 0).unwrap_or(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Keep this first: only one desktop process may write the local
        // workspace. A second launch focuses the existing window instead.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .setup(|app| {
            let data_dir = app.path().app_local_data_dir().map_err(|error| Box::<dyn std::error::Error>::from(error))?;
            let backups_dir = data_dir.join("backups");
            let exports_dir = data_dir.join("exports");
            fs::create_dir_all(&backups_dir)?;
            fs::create_dir_all(&exports_dir)?;
            let db_path = data_dir.join("running-task.sqlite");

            // Keep the window available even when the database cannot be opened.
            // get_app_data repeats the same checks and returns the error to the
            // fail-closed recovery screen, where the user can retry or open the
            // local data folder without any replacement workspace being saved.
            let local_state = LocalState { data_dir, db_path, backups_dir, exports_dir, database_ready: Mutex::new(false) };
            if let Err(error) = ensure_database_ready(&local_state) {
                eprintln!("Running_Task database recovery required: {error}");
            }

            let enable_autostart = autostart_preference(&local_state.db_path);
            let manager = app.autolaunch();
            let autostart_result = if enable_autostart { manager.enable() } else { manager.disable() };
            if let Err(error) = autostart_result {
                eprintln!("Running_Task could not update autostart registration: {error}");
            }

            app.manage(local_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data,
            save_app_data,
            create_backup,
            list_backups,
            restore_backup,
            delete_backup,
            export_json,
            export_csv,
            export_markdown,
            get_storage_info,
            open_data_folder,
            set_autostart,
            get_autostart
        ])
        .run(tauri::generate_context!())
        .expect("error while running Running_Task");
}
