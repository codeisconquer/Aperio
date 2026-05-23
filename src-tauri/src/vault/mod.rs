use rusqlite::params;
use serde::Deserialize;
use tauri::State;

use crate::crypto;
use crate::database::DbPool;

#[derive(Debug, Deserialize)]
pub struct SaveSecureTokenPayload {
    pub project_id: String,
    pub token: String,
}

fn persist_secure_token(pool: &DbPool, project_id: &str, token: &str) -> Result<(), String> {
    let project_id = project_id.trim();
    if project_id.is_empty() {
        return Err("Project id is required".into());
    }

    let token = token.trim();
    if token.is_empty() {
        return Err("Token must not be empty".into());
    }

    let encrypted = crypto::encrypt(token)?;
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.execute(
        "INSERT INTO secure_tokens (project_id, encrypted_token)
         VALUES (?1, ?2)
         ON CONFLICT(project_id) DO UPDATE SET encrypted_token = excluded.encrypted_token",
        params![project_id, encrypted],
    )
    .map_err(|e| format!("Failed to save secure token: {e}"))?;

    Ok(())
}

pub fn delete_secure_token(pool: &DbPool, project_id: &str) -> Result<(), String> {
    let project_id = project_id.trim();
    if project_id.is_empty() {
        return Err("Project id is required".into());
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.execute(
        "DELETE FROM secure_tokens WHERE project_id = ?1",
        params![project_id],
    )
    .map_err(|e| format!("Failed to delete secure token: {e}"))?;

    Ok(())
}

pub fn has_secure_token(pool: &DbPool, project_id: &str) -> Result<bool, String> {
    let project_id = project_id.trim();
    if project_id.is_empty() {
        return Ok(false);
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM secure_tokens WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check secure token: {e}"))?;

    Ok(count > 0)
}

pub fn list_secure_token_projects(pool: &DbPool) -> Result<Vec<String>, String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let mut stmt = conn
        .prepare("SELECT project_id FROM secure_tokens ORDER BY project_id ASC")
        .map_err(|e| format!("Failed to prepare secure token query: {e}"))?;

    let rows = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Failed to query secure tokens: {e}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read secure token rows: {e}"))
}

pub fn get_decrypted_token(pool: &DbPool, project_id: &str) -> Result<Option<String>, String> {
    let project_id = project_id.trim();
    if project_id.is_empty() {
        return Ok(None);
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let encrypted: Option<String> = conn
        .query_row(
            "SELECT encrypted_token FROM secure_tokens WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .ok();

    match encrypted {
        Some(value) => Ok(Some(crypto::decrypt(&value)?)),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn save_secure_token(
    pool: State<'_, DbPool>,
    payload: SaveSecureTokenPayload,
) -> Result<(), String> {
    persist_secure_token(&pool, &payload.project_id, &payload.token)
}

#[tauri::command]
pub fn delete_secure_token_cmd(
    pool: State<'_, DbPool>,
    project_id: String,
) -> Result<(), String> {
    delete_secure_token(&pool, &project_id)
}

#[tauri::command]
pub fn has_secure_token_cmd(pool: State<'_, DbPool>, project_id: String) -> Result<bool, String> {
    has_secure_token(&pool, &project_id)
}

#[tauri::command]
pub fn list_secure_token_projects_cmd(pool: State<'_, DbPool>) -> Result<Vec<String>, String> {
    list_secure_token_projects(&pool)
}
