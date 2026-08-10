//! Behavioural tests for the persistence, migration, and backup layer.
//!
//! These cover the code paths that can lose or corrupt a workspace. The
//! JavaScript suites cannot reach any of this: they read `lib.rs` as text.

use super::*;
use std::sync::atomic::{AtomicU64, Ordering};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn temp_dir(label: &str) -> PathBuf {
    let unique = COUNTER.fetch_add(1, Ordering::SeqCst);
    let path = std::env::temp_dir().join(format!(
        "running_task_test_{}_{}_{}",
        label,
        std::process::id(),
        unique
    ));
    let _ = fs::remove_dir_all(&path);
    fs::create_dir_all(&path).expect("test directory");
    path
}

fn local_state(label: &str) -> LocalState {
    let data_dir = temp_dir(label);
    let backups_dir = data_dir.join("backups");
    let exports_dir = data_dir.join("exports");
    fs::create_dir_all(&backups_dir).unwrap();
    fs::create_dir_all(&exports_dir).unwrap();
    LocalState {
        db_path: data_dir.join("running-task.sqlite"),
        data_dir,
        backups_dir,
        exports_dir,
        database_ready: Mutex::new(false),
    }
}

fn status(id: &str, name: &str, terminal: bool, waiting: bool) -> StatusRecord {
    StatusRecord {
        id: id.into(),
        name: name.into(),
        color: "#000000".into(),
        rank: 10,
        terminal,
        waiting,
    }
}

fn topic(id: &str) -> Topic {
    Topic {
        id: id.into(),
        name: id.into(),
        color: "#000000".into(),
        icon: "layers".into(),
        rank: 10,
        archived: false,
    }
}

fn card(id: &str, topic_id: &str, status_id: &str) -> Card {
    Card {
        id: id.into(),
        topic_id: topic_id.into(),
        subtopic_id: None,
        card_type_id: None,
        status_id: status_id.into(),
        reference: String::new(),
        title: id.into(),
        description: String::new(),
        notes: String::new(),
        priority: "Normal".into(),
        target_date: None,
        fallback_bic_id: None,
        tags: vec!["alpha".into()],
        rank: 10,
        is_archived: false,
        archive_reason: None,
        last_active_status_id: None,
        completed_at: None,
        created_at: "2026-01-01T00:00:00Z".into(),
        updated_at: "2026-01-01T00:00:00Z".into(),
    }
}

fn item(id: &str, card_id: &str, parent: Option<&str>) -> ChecklistItem {
    ChecklistItem {
        id: id.into(),
        card_id: card_id.into(),
        parent_id: parent.map(str::to_string),
        title: id.into(),
        notes: String::new(),
        due_date: None,
        bic_id: None,
        completed: false,
        rank: 10,
        completed_at: None,
    }
}

fn base_data() -> AppData {
    AppData {
        meta: MetaInfo {
            schema_version: SCHEMA_VERSION,
            app_version: "test".into(),
            created_at: "c".into(),
            updated_at: "u".into(),
        },
        settings: Settings {
            board_axis: "topic".into(),
            theme: "dark".into(),
            density: "comfortable".into(),
            autostart: true,
            my_actor_id: "actor-me".into(),
            show_descriptions: true,
            backup_retention: 14,
        },
        topics: vec![topic("topic-a")],
        subtopics: vec![],
        card_types: vec![],
        statuses: vec![
            status("status-todo", "To Do", false, false),
            status("status-done", "Done", true, false),
        ],
        actors: vec![],
        cards: vec![card("card-a", "topic-a", "status-todo")],
        checklist_items: vec![],
        saved_views: vec![],
    }
}

#[test]
fn validate_rejects_structurally_broken_workspaces() {
    let mut empty = base_data();
    empty.topics.clear();
    assert!(validate_data(&empty).unwrap_err().contains("Topic is required"));

    let mut no_terminal = base_data();
    no_terminal.statuses.retain(|s| !s.terminal);
    assert!(validate_data(&no_terminal).unwrap_err().contains("terminal status"));

    let mut missing_topic = base_data();
    missing_topic.cards[0].topic_id = "nope".into();
    assert!(validate_data(&missing_topic).unwrap_err().contains("missing Topic"));

    let mut missing_status = base_data();
    missing_status.cards[0].status_id = "nope".into();
    assert!(validate_data(&missing_status).unwrap_err().contains("missing Status"));

    let mut cross_topic = base_data();
    cross_topic.topics.push(topic("topic-b"));
    cross_topic.subtopics.push(Subtopic {
        id: "sub-b".into(),
        topic_id: "topic-b".into(),
        name: "b".into(),
        color: "#000000".into(),
        rank: 10,
        archived: false,
    });
    cross_topic.cards[0].subtopic_id = Some("sub-b".into());
    assert!(validate_data(&cross_topic).unwrap_err().contains("another Topic"));

    let mut orphan_item = base_data();
    orphan_item.checklist_items.push(item("i-1", "card-missing", None));
    assert!(validate_data(&orphan_item).unwrap_err().contains("missing Task"));

    let mut self_parent = base_data();
    self_parent.checklist_items.push(item("i-1", "card-a", Some("i-1")));
    assert!(validate_data(&self_parent).unwrap_err().contains("own parent"));

    let mut cycle = base_data();
    cycle.checklist_items.push(item("i-1", "card-a", Some("i-2")));
    cycle.checklist_items.push(item("i-2", "card-a", Some("i-1")));
    assert!(validate_data(&cycle).unwrap_err().contains("cycle"));

    assert!(validate_data(&base_data()).is_ok());
}

#[test]
fn save_and_load_round_trip_preserves_the_workspace() {
    let dir = temp_dir("round_trip");
    let db = dir.join("running-task.sqlite");
    initialize_database(&db).unwrap();

    let mut data = base_data();
    data.statuses[0].waiting = true;
    data.checklist_items.push(item("i-parent", "card-a", None));
    data.checklist_items.push(item("i-child", "card-a", Some("i-parent")));
    save_data(&db, &data).unwrap();

    let loaded = load_data(&db).unwrap().expect("workspace");
    assert_eq!(loaded.cards.len(), 1);
    assert_eq!(loaded.cards[0].tags, vec!["alpha".to_string()]);
    assert_eq!(loaded.checklist_items.len(), 2);
    let child = loaded
        .checklist_items
        .iter()
        .find(|i| i.id == "i-child")
        .unwrap();
    assert_eq!(
        child.parent_id.as_deref(),
        Some("i-parent"),
        "nested checklist parent link was lost"
    );
    assert!(
        loaded
            .statuses
            .iter()
            .find(|s| s.id == "status-todo")
            .unwrap()
            .waiting
    );
    assert_eq!(loaded.meta.schema_version, SCHEMA_VERSION);
}

#[test]
fn saving_a_child_before_its_parent_still_links_the_hierarchy() {
    let dir = temp_dir("order");
    let db = dir.join("running-task.sqlite");
    initialize_database(&db).unwrap();

    let mut data = base_data();
    // Child first: the deferred parent-link pass must tolerate this order,
    // which arbitrary imported JSON can produce.
    data.checklist_items.push(item("i-child", "card-a", Some("i-parent")));
    data.checklist_items.push(item("i-parent", "card-a", None));
    save_data(&db, &data).unwrap();

    let loaded = load_data(&db).unwrap().unwrap();
    let child = loaded
        .checklist_items
        .iter()
        .find(|i| i.id == "i-child")
        .unwrap();
    assert_eq!(child.parent_id.as_deref(), Some("i-parent"));
}

#[test]
fn a_rejected_save_leaves_the_previous_workspace_intact() {
    let dir = temp_dir("reject");
    let db = dir.join("running-task.sqlite");
    initialize_database(&db).unwrap();
    save_data(&db, &base_data()).unwrap();

    let mut broken = base_data();
    broken.cards[0].title = "should not persist".into();
    broken.cards[0].status_id = "missing-status".into();
    assert!(save_data(&db, &broken).is_err());

    let loaded = load_data(&db).unwrap().unwrap();
    assert_eq!(
        loaded.cards[0].title, "card-a",
        "a failed save must not modify stored data"
    );
}

#[test]
fn migration_upgrades_a_schema_1_workspace_and_backfills_waiting() {
    let dir = temp_dir("migrate");
    let db = dir.join("running-task.sqlite");

    // A schema-1 database: statuses without the waiting column.
    let connection = open_connection(&db).unwrap();
    connection
        .execute_batch(
            "CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
             CREATE TABLE statuses (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL,
                rank INTEGER NOT NULL, terminal INTEGER NOT NULL DEFAULT 0);
             INSERT INTO app_meta(key, value) VALUES ('schemaVersion', '1');
             INSERT INTO statuses(id, name, color, rank, terminal) VALUES
                ('status-waiting', 'Waiting', '#000000', 30, 0),
                ('status-todo', 'To Do', '#000000', 10, 0);",
        )
        .unwrap();
    drop(connection);

    run_migrations(&db, 1).unwrap();

    let connection = open_connection(&db).unwrap();
    assert_eq!(
        stored_schema_version(&connection).unwrap(),
        Some(SCHEMA_VERSION)
    );
    let waiting: i64 = connection
        .query_row(
            "SELECT waiting FROM statuses WHERE id = 'status-waiting'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(waiting, 1, "the Waiting status should be flagged");
    let todo: i64 = connection
        .query_row(
            "SELECT waiting FROM statuses WHERE id = 'status-todo'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(todo, 0);
    drop(connection);

    // Re-entry must be harmless rather than failing on a duplicate column.
    run_migrations(&db, 1).unwrap();
}

#[test]
fn backup_identifiers_cannot_escape_the_backup_directory() {
    let state = local_state("traversal");
    fs::write(
        state.backups_dir.join("Auto_20260101_000000_000.sqlite"),
        b"x",
    )
    .unwrap();
    fs::write(state.data_dir.join("running-task.sqlite"), b"x").unwrap();

    for hostile in [
        "../running-task.sqlite",
        "..\\running-task.sqlite",
        "/etc/passwd",
        "sub/Auto_x.sqlite",
        "Auto_x.txt",
    ] {
        assert!(
            safe_backup_path(&state, hostile).is_err(),
            "{hostile} should be rejected"
        );
    }
    assert!(safe_backup_path(&state, "Auto_20260101_000000_000.sqlite").is_ok());
    assert!(safe_backup_path(&state, "Auto_missing.sqlite").is_err());
}

#[test]
fn automatic_backup_pruning_keeps_only_the_configured_count() {
    let state = local_state("prune");
    for index in 0..8 {
        fs::write(
            state
                .backups_dir
                .join(format!("Auto_2026010{index}_000000_000.sqlite")),
            b"x",
        )
        .unwrap();
    }
    fs::write(state.backups_dir.join("Running_Task_manual.sqlite"), b"x").unwrap();
    fs::write(state.backups_dir.join("Before_Restore_safety.sqlite"), b"x").unwrap();

    prune_automatic_backups(&state, 3).unwrap();

    assert_eq!(automatic_backup_paths(&state).unwrap().len(), 3);
    assert!(
        state.backups_dir.join("Running_Task_manual.sqlite").exists(),
        "manual backups must never be pruned"
    );
    assert!(
        state
            .backups_dir
            .join("Before_Restore_safety.sqlite")
            .exists(),
        "safety backups must never be pruned"
    );
}

#[test]
fn csv_export_escapes_separators_and_quotes() {
    assert_eq!(csv_escape("plain"), "plain");
    assert_eq!(csv_escape("a,b"), "\"a,b\"");
    assert_eq!(csv_escape("say \"hi\""), "\"say \"\"hi\"\"\"");
    assert_eq!(csv_escape("line\nbreak"), "\"line\nbreak\"");
}
