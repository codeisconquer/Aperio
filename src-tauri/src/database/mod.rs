use std::path::PathBuf;

use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

pub type DbPool = Pool<SqliteConnectionManager>;

#[derive(Debug, Clone, Serialize)]
pub struct HistoryEntry {
    pub id: String,
    pub timestamp: String,
    pub method: String,
    pub url: String,
    pub headers: String,
    pub body: String,
    pub status_code: u16,
    pub duration_ms: u128,
}

pub struct HistoryInsert {
    pub method: String,
    pub url: String,
    pub headers: String,
    pub body: String,
    pub status_code: u16,
    pub duration_ms: u128,
}

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    status_code INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS secure_tokens (
    environment_id TEXT PRIMARY KEY,
    encrypted_token TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    variables TEXT NOT NULL DEFAULT '{}',
    project_id TEXT
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"#;

fn migrate_schema(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare("PRAGMA table_info(environments)")
        .map_err(|e| format!("Failed to inspect environments schema: {e}"))?;

    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Failed to read environments schema: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read environments schema: {e}"))?;

    if !columns.iter().any(|name| name == "project_id") {
        conn.execute("ALTER TABLE environments ADD COLUMN project_id TEXT", [])
            .map_err(|e| format!("Failed to migrate environments schema: {e}"))?;
    }

    migrate_secure_tokens(conn)?;

    Ok(())
}

fn migrate_secure_tokens(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare("PRAGMA table_info(secure_tokens)")
        .map_err(|e| format!("Failed to inspect secure_tokens schema: {e}"))?;

    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Failed to read secure_tokens schema: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read secure_tokens schema: {e}"))?;

    if columns.is_empty() || columns.iter().any(|name| name == "environment_id") {
        return Ok(());
    }

    if !columns.iter().any(|name| name == "project_id") {
        return Ok(());
    }

    conn.execute_batch(
        "CREATE TABLE secure_tokens_migrated (
            environment_id TEXT PRIMARY KEY,
            encrypted_token TEXT NOT NULL
        );
        INSERT INTO secure_tokens_migrated (environment_id, encrypted_token)
        SELECT e.id, st.encrypted_token
        FROM secure_tokens st
        INNER JOIN environments e ON e.project_id = st.project_id;
        DROP TABLE secure_tokens;
        ALTER TABLE secure_tokens_migrated RENAME TO secure_tokens;",
    )
    .map_err(|e| format!("Failed to migrate secure_tokens schema: {e}"))?;

    Ok(())
}

pub fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(SCHEMA)
        .map_err(|e| format!("Failed to initialize database schema: {e}"))?;
    migrate_schema(conn)
}

pub fn database_file_name() -> &'static str {
    if cfg!(debug_assertions) {
        "aperio-dev.db"
    } else {
        "aperio.db"
    }
}

pub fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data directory: {e}"))?;
    Ok(dir.join(database_file_name()))
}

pub fn init_db(app: &AppHandle) -> Result<DbPool, String> {
    let path = db_path(app)?;

    if cfg!(debug_assertions) {
        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| {
                format!("Failed to reset dev database at {}: {e}", path.display())
            })?;
        }
        eprintln!(
            "Dev mode: using fresh database at {}",
            path.display()
        );
    }

    let manager = SqliteConnectionManager::file(&path);
    let pool = Pool::new(manager).map_err(|e| format!("Failed to create database pool: {e}"))?;

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to open database connection: {e}"))?;
    init_schema(&conn)?;

    Ok(pool)
}

pub fn insert_history(pool: &DbPool, entry: HistoryInsert) -> Result<(), String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO history (id, method, url, headers, body, status_code, duration_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            entry.method,
            entry.url,
            entry.headers,
            entry.body,
            entry.status_code,
            entry.duration_ms as i64,
        ],
    )
    .map_err(|e| format!("Failed to insert history entry: {e}"))?;

    Ok(())
}

pub fn fetch_history(pool: &DbPool, limit: usize) -> Result<Vec<HistoryEntry>, String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, timestamp, method, url, headers, body, status_code, duration_ms
             FROM history
             ORDER BY timestamp DESC
             LIMIT ?1",
        )
        .map_err(|e| format!("Failed to prepare history query: {e}"))?;

    let rows = stmt
        .query_map([limit as i64], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                method: row.get(2)?,
                url: row.get(3)?,
                headers: row.get(4)?,
                body: row.get(5)?,
                status_code: row.get::<_, i64>(6)? as u16,
                duration_ms: row.get::<_, i64>(7)? as u128,
            })
        })
        .map_err(|e| format!("Failed to query history: {e}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read history rows: {e}"))
}

pub fn delete_history_entry(pool: &DbPool, id: &str) -> Result<(), String> {
    let id = id.trim();
    if id.is_empty() {
        return Err("History entry id is required".into());
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.execute("DELETE FROM history WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete history entry: {e}"))?;

    Ok(())
}

pub fn clear_history(pool: &DbPool) -> Result<(), String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.execute("DELETE FROM history", [])
        .map_err(|e| format!("Failed to clear history: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn get_history(pool: tauri::State<'_, DbPool>) -> Result<Vec<HistoryEntry>, String> {
    fetch_history(&pool, 50)
}

#[tauri::command]
pub fn delete_history_entry_cmd(pool: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    delete_history_entry(&pool, &id)
}

#[tauri::command]
pub fn clear_history_cmd(pool: tauri::State<'_, DbPool>) -> Result<(), String> {
    clear_history(&pool)
}

pub fn log_history_async(pool: DbPool, entry: HistoryInsert) {
    tokio::task::spawn_blocking(move || {
        if let Err(err) = insert_history(&pool, entry) {
            eprintln!("Failed to log request history: {err}");
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use r2d2_sqlite::SqliteConnectionManager;
    use tempfile::TempDir;

    struct TestDb {
        _dir: TempDir,
        pool: DbPool,
    }

    fn test_pool() -> TestDb {
        let dir = TempDir::new().expect("tempdir");
        let path = dir.path().join("test.db");
        let manager = SqliteConnectionManager::file(&path);
        let pool = Pool::new(manager).expect("pool");
        let conn = pool.get().expect("conn");
        init_schema(&conn).expect("schema");
        TestDb { _dir: dir, pool }
    }

    #[test]
    fn debug_build_uses_dev_database_filename() {
        assert_eq!(database_file_name(), "aperio-dev.db");
    }

    #[test]
    fn inserts_and_fetches_history() {
        let test_db = test_pool();
        let pool = &test_db.pool;
        insert_history(
            pool,
            HistoryInsert {
                method: "GET".into(),
                url: "https://example.com".into(),
                headers: "{}".into(),
                body: "".into(),
                status_code: 200,
                duration_ms: 42,
            },
        )
        .expect("insert");

        let entries = fetch_history(pool, 10).expect("fetch");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].method, "GET");
        assert_eq!(entries[0].status_code, 200);
        assert_eq!(entries[0].duration_ms, 42);
    }

    #[test]
    fn deletes_single_history_entry() {
        let test_db = test_pool();
        let pool = &test_db.pool;
        insert_history(
            pool,
            HistoryInsert {
                method: "GET".into(),
                url: "https://example.com/a".into(),
                headers: "{}".into(),
                body: "".into(),
                status_code: 200,
                duration_ms: 10,
            },
        )
        .expect("insert");
        insert_history(
            pool,
            HistoryInsert {
                method: "POST".into(),
                url: "https://example.com/b".into(),
                headers: "{}".into(),
                body: "".into(),
                status_code: 201,
                duration_ms: 20,
            },
        )
        .expect("insert");

        let entries = fetch_history(pool, 10).expect("fetch");
        assert_eq!(entries.len(), 2);

        delete_history_entry(pool, &entries[0].id).expect("delete");
        let remaining = fetch_history(pool, 10).expect("fetch");
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].method, "POST");
    }

    #[test]
    fn clears_all_history() {
        let test_db = test_pool();
        let pool = &test_db.pool;
        insert_history(
            pool,
            HistoryInsert {
                method: "GET".into(),
                url: "https://example.com".into(),
                headers: "{}".into(),
                body: "".into(),
                status_code: 200,
                duration_ms: 42,
            },
        )
        .expect("insert");

        clear_history(pool).expect("clear");
        let entries = fetch_history(pool, 10).expect("fetch");
        assert!(entries.is_empty());
    }
}
