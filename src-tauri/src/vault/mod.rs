use rusqlite::params;
use serde::Deserialize;
use tauri::State;

use crate::crypto;
use crate::database::DbPool;

#[derive(Debug, Deserialize)]
pub struct SaveSecureTokenPayload {
    pub environment_id: String,
    pub token: String,
}

fn persist_secure_token(pool: &DbPool, environment_id: &str, token: &str) -> Result<(), String> {
    let environment_id = environment_id.trim();
    if environment_id.is_empty() {
        return Err("Environment id is required".into());
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
        "INSERT INTO secure_tokens (environment_id, encrypted_token)
         VALUES (?1, ?2)
         ON CONFLICT(environment_id) DO UPDATE SET encrypted_token = excluded.encrypted_token",
        params![environment_id, encrypted],
    )
    .map_err(|e| format!("Failed to save secure token: {e}"))?;

    Ok(())
}

pub fn delete_secure_token(pool: &DbPool, environment_id: &str) -> Result<(), String> {
    let environment_id = environment_id.trim();
    if environment_id.is_empty() {
        return Err("Environment id is required".into());
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.execute(
        "DELETE FROM secure_tokens WHERE environment_id = ?1",
        params![environment_id],
    )
    .map_err(|e| format!("Failed to delete secure token: {e}"))?;

    Ok(())
}

pub fn has_secure_token(pool: &DbPool, environment_id: &str) -> Result<bool, String> {
    let environment_id = environment_id.trim();
    if environment_id.is_empty() {
        return Ok(false);
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM secure_tokens WHERE environment_id = ?1",
            params![environment_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check secure token: {e}"))?;

    Ok(count > 0)
}

pub fn list_secure_token_environments(pool: &DbPool) -> Result<Vec<String>, String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let mut stmt = conn
        .prepare("SELECT environment_id FROM secure_tokens ORDER BY environment_id ASC")
        .map_err(|e| format!("Failed to prepare secure token query: {e}"))?;

    let rows = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Failed to query secure tokens: {e}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read secure token rows: {e}"))
}

pub fn get_decrypted_token(pool: &DbPool, environment_id: &str) -> Result<Option<String>, String> {
    let environment_id = environment_id.trim();
    if environment_id.is_empty() {
        return Ok(None);
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let encrypted: Option<String> = conn
        .query_row(
            "SELECT encrypted_token FROM secure_tokens WHERE environment_id = ?1",
            params![environment_id],
            |row| row.get(0),
        )
        .ok();

    match encrypted {
        Some(value) => Ok(Some(crypto::decrypt(&value)?)),
        None => Ok(None),
    }
}

pub fn copy_secure_token(
    pool: &DbPool,
    from_environment_id: &str,
    to_environment_id: &str,
) -> Result<(), String> {
    let Some(token) = get_decrypted_token(pool, from_environment_id)? else {
        return Ok(());
    };
    persist_secure_token(pool, to_environment_id, &token)
}

#[tauri::command]
pub fn save_secure_token(
    pool: State<'_, DbPool>,
    payload: SaveSecureTokenPayload,
) -> Result<(), String> {
    persist_secure_token(&pool, &payload.environment_id, &payload.token)
}

#[tauri::command]
pub fn delete_secure_token_cmd(
    pool: State<'_, DbPool>,
    environment_id: String,
) -> Result<(), String> {
    delete_secure_token(&pool, &environment_id)
}

#[tauri::command]
pub fn has_secure_token_cmd(
    pool: State<'_, DbPool>,
    environment_id: String,
) -> Result<bool, String> {
    has_secure_token(&pool, &environment_id)
}

#[tauri::command]
pub fn list_secure_token_environments_cmd(pool: State<'_, DbPool>) -> Result<Vec<String>, String> {
    list_secure_token_environments(&pool)
}

#[tauri::command]
pub fn copy_secure_token_cmd(
    pool: State<'_, DbPool>,
    from_environment_id: String,
    to_environment_id: String,
) -> Result<(), String> {
    copy_secure_token(&pool, &from_environment_id, &to_environment_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database;
    use crate::environments::{save_environment, SaveEnvironmentPayload};
    use r2d2::Pool;
    use r2d2_sqlite::SqliteConnectionManager;
    use tempfile::TempDir;

    struct TestPool {
        _dir: TempDir,
        pool: Pool<SqliteConnectionManager>,
    }

    fn test_pool() -> TestPool {
        let dir = TempDir::new().expect("tempdir");
        let path = dir.path().join("test.db");
        let manager = SqliteConnectionManager::file(&path);
        let pool = Pool::new(manager).expect("pool");
        let conn = pool.get().expect("conn");
        database::init_schema(&conn).expect("schema");
        TestPool { _dir: dir, pool }
    }

    #[test]
    fn saves_token_per_environment() {
        let test = test_pool();
        let pool = &test.pool;
        let env = save_environment(
            pool,
            SaveEnvironmentPayload {
                id: Some("env-prod".into()),
                name: "PROD".into(),
                variables: "{}".into(),
                project_id: Some("project-1".into()),
            },
        )
        .expect("env");

        persist_secure_token(pool, &env.id, "secret-token").expect("save");
        assert!(has_secure_token(pool, &env.id).expect("has"));
        assert_eq!(
            get_decrypted_token(pool, &env.id).expect("get"),
            Some("secret-token".into())
        );
    }

    #[test]
    fn copies_token_between_environments() {
        let test = test_pool();
        let pool = &test.pool;
        save_environment(
            pool,
            SaveEnvironmentPayload {
                id: Some("env-a".into()),
                name: "A".into(),
                variables: "{}".into(),
                project_id: Some("project-1".into()),
            },
        )
        .expect("env");
        save_environment(
            pool,
            SaveEnvironmentPayload {
                id: Some("env-b".into()),
                name: "B".into(),
                variables: "{}".into(),
                project_id: Some("project-1".into()),
            },
        )
        .expect("env");

        persist_secure_token(pool, "env-a", "copy-me").expect("save");
        copy_secure_token(pool, "env-a", "env-b").expect("copy");
        assert_eq!(
            get_decrypted_token(pool, "env-b").expect("get"),
            Some("copy-me".into())
        );
    }
}
