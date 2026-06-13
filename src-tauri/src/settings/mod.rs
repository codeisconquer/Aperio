use rusqlite::params;
use tauri::State;

use crate::database::DbPool;

pub fn get_setting(pool: &DbPool, key: &str) -> Result<Option<String>, String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("Setting key is required".into());
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.query_row(
        "SELECT value FROM app_settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .map(Some)
    .or_else(|err| {
        if err == rusqlite::Error::QueryReturnedNoRows {
            Ok(None)
        } else {
            Err(format!("Failed to read app setting: {err}"))
        }
    })
}

pub fn set_setting(pool: &DbPool, key: &str, value: &str) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("Setting key is required".into());
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.execute(
        "INSERT INTO app_settings (key, value)
         VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| format!("Failed to save app setting: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn get_app_setting_cmd(pool: State<'_, DbPool>, key: String) -> Result<Option<String>, String> {
    get_setting(&pool, &key)
}

#[tauri::command]
pub fn set_app_setting_cmd(
    pool: State<'_, DbPool>,
    key: String,
    value: String,
) -> Result<(), String> {
    set_setting(&pool, &key, &value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database;
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
    fn stores_and_reads_settings() {
        let test = test_pool();
        let pool = &test.pool;

        assert_eq!(get_setting(pool, "theme").expect("get"), None);
        set_setting(pool, "theme", "dark").expect("set");
        assert_eq!(
            get_setting(pool, "theme").expect("get").as_deref(),
            Some("dark")
        );
    }
}
