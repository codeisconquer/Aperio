use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::database::DbPool;
use crate::vault;

#[derive(Debug, Clone, Serialize)]
pub struct Environment {
    pub id: String,
    pub name: String,
    pub variables: String,
    pub project_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveEnvironmentPayload {
    pub id: Option<String>,
    pub name: String,
    pub variables: String,
    pub project_id: Option<String>,
}

fn validate_variables_json(variables: &str) -> Result<(), String> {
    let trimmed = variables.trim();
    if trimmed.is_empty() {
        return Ok(());
    }

    let parsed: serde_json::Value =
        serde_json::from_str(trimmed).map_err(|e| format!("Invalid variables JSON: {e}"))?;

    if !parsed.is_object() {
        return Err("Variables must be a JSON object".into());
    }

    Ok(())
}

fn normalize_project_id(project_id: Option<String>) -> Result<Option<String>, String> {
    match project_id {
        Some(value) if value.trim().is_empty() => Ok(None),
        Some(value) => Ok(Some(value.trim().to_string())),
        None => Ok(None),
    }
}

pub fn fetch_environments(pool: &DbPool) -> Result<Vec<Environment>, String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, variables, project_id FROM environments ORDER BY name ASC",
        )
        .map_err(|e| format!("Failed to prepare environments query: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Environment {
                id: row.get(0)?,
                name: row.get(1)?,
                variables: row.get(2)?,
                project_id: row.get(3)?,
            })
        })
        .map_err(|e| format!("Failed to query environments: {e}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read environment rows: {e}"))
}

pub fn save_environment(pool: &DbPool, payload: SaveEnvironmentPayload) -> Result<Environment, String> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err("Environment name is required".into());
    }

    validate_variables_json(&payload.variables)?;

    let project_id = normalize_project_id(payload.project_id)?;
    if project_id.is_none() {
        return Err("Environment must belong to a project".into());
    }

    let variables = if payload.variables.trim().is_empty() {
        "{}".to_string()
    } else {
        payload.variables.trim().to_string()
    };

    let id = payload
        .id
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.execute(
        "INSERT INTO environments (id, name, variables, project_id)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            variables = excluded.variables,
            project_id = excluded.project_id",
        params![id, name, variables, project_id],
    )
    .map_err(|e| format!("Failed to save environment: {e}"))?;

    Ok(Environment {
        id,
        name: name.to_string(),
        variables,
        project_id,
    })
}

pub fn delete_environment(pool: &DbPool, id: &str) -> Result<(), String> {
    let id = id.trim();
    if id.is_empty() {
        return Err("Environment id is required".into());
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.execute("DELETE FROM environments WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete environment: {e}"))?;

    vault::delete_secure_token(pool, id)?;

    Ok(())
}

#[tauri::command]
pub fn get_environments(pool: State<'_, DbPool>) -> Result<Vec<Environment>, String> {
    fetch_environments(&pool)
}

#[tauri::command]
pub fn save_environment_cmd(
    pool: State<'_, DbPool>,
    payload: SaveEnvironmentPayload,
) -> Result<Environment, String> {
    save_environment(&pool, payload)
}

#[tauri::command]
pub fn delete_environment_cmd(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    delete_environment(&pool, &id)
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
    fn saves_and_lists_environments() {
        let test = test_pool();
        let pool = &test.pool;
        let saved = save_environment(
            pool,
            SaveEnvironmentPayload {
                id: None,
                name: "Local".into(),
                variables: r#"{"base_url":"http://localhost:3000"}"#.into(),
                project_id: Some("project-1".into()),
            },
        )
        .expect("save");

        let list = fetch_environments(pool).expect("list");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, saved.id);
        assert_eq!(list[0].name, "Local");
        assert_eq!(list[0].project_id.as_deref(), Some("project-1"));
    }

    #[test]
    fn rejects_invalid_variables_json() {
        let test = test_pool();
        let pool = &test.pool;
        let err = save_environment(
            pool,
            SaveEnvironmentPayload {
                id: None,
                name: "Bad".into(),
                variables: "[]".into(),
                project_id: Some("project-1".into()),
            },
        )
        .expect_err("invalid");
        assert!(err.contains("JSON object"));
    }

    #[test]
    fn requires_project_id() {
        let test = test_pool();
        let pool = &test.pool;
        let err = save_environment(
            pool,
            SaveEnvironmentPayload {
                id: None,
                name: "Orphan".into(),
                variables: "{}".into(),
                project_id: None,
            },
        )
        .expect_err("missing project");
        assert!(err.contains("project"));
    }
}
