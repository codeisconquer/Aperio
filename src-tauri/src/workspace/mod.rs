use std::time::Duration;

use rusqlite::Connection;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::database::DbPool;

fn run_backup(from: &Connection, to: &mut Connection) -> Result<(), String> {
    let backup = rusqlite::backup::Backup::new(from, to)
        .map_err(|e| format!("Failed to initialize database backup: {e}"))?;
    backup
        .run_to_completion(5, Duration::from_millis(10), None)
        .map_err(|e| format!("Database backup failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn export_workspace(app: AppHandle, pool: tauri::State<'_, DbPool>) -> Result<(), String> {
    let picked = app
        .dialog()
        .file()
        .set_title("Export workspace")
        .set_file_name("aperio_backup.db")
        .add_filter("SQLite database", &["db"])
        .blocking_save_file();

    let destination = picked.ok_or_else(|| "Export cancelled".to_string())?;
    let destination = destination
        .into_path()
        .map_err(|e| format!("Invalid export path: {e}"))?;

    let source = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;
    let mut dest_conn = Connection::open(&destination)
        .map_err(|e| format!("Failed to create export database: {e}"))?;

    run_backup(&source, &mut dest_conn)?;
    Ok(())
}

#[tauri::command]
pub fn import_workspace(app: AppHandle, pool: tauri::State<'_, DbPool>) -> Result<(), String> {
    let picked = app
        .dialog()
        .file()
        .set_title("Import workspace")
        .add_filter("SQLite database", &["db"])
        .blocking_pick_file();

    let source_path = picked.ok_or_else(|| "Import cancelled".to_string())?;
    let source_path = source_path
        .into_path()
        .map_err(|e| format!("Invalid import path: {e}"))?;

    if !source_path.exists() {
        return Err("Import file does not exist".into());
    }

    let import_conn = Connection::open(&source_path)
        .map_err(|e| format!("Failed to open import database: {e}"))?;

    let has_history: bool = import_conn
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'history'")
        .and_then(|mut stmt| stmt.exists([]))
        .unwrap_or(false);
    if !has_history {
        return Err("Selected file is not a valid Aperio workspace database".into());
    }

    let mut live = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    run_backup(&import_conn, &mut live)?;
    let _ = &app;
    Ok(())
}
