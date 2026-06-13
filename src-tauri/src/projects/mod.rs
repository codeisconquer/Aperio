use rusqlite::params;
use tauri::State;

use crate::database::DbPool;
use crate::environments;
use crate::swagger::SwaggerProject;

pub fn fetch_projects(pool: &DbPool) -> Result<Vec<SwaggerProject>, String> {
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let mut stmt = conn
        .prepare(
            "SELECT payload FROM projects ORDER BY datetime(created_at) DESC, rowid DESC",
        )
        .map_err(|e| format!("Failed to prepare projects query: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            let payload: String = row.get(0)?;
            Ok(payload)
        })
        .map_err(|e| format!("Failed to query projects: {e}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read project rows: {e}"))?
        .into_iter()
        .map(|payload| {
            serde_json::from_str(&payload)
                .map_err(|e| format!("Failed to deserialize project: {e}"))
        })
        .collect()
}

pub fn save_project(pool: &DbPool, project: &SwaggerProject) -> Result<(), String> {
    let id = project.id.trim();
    if id.is_empty() {
        return Err("Project id is required".into());
    }

    let payload = serde_json::to_string(project)
        .map_err(|e| format!("Failed to serialize project: {e}"))?;

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.execute(
        "INSERT INTO projects (id, payload, created_at)
         VALUES (?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
        params![id, payload],
    )
    .map_err(|e| format!("Failed to save project: {e}"))?;

    Ok(())
}

pub fn delete_project(pool: &DbPool, id: &str) -> Result<(), String> {
    let id = id.trim();
    if id.is_empty() {
        return Err("Project id is required".into());
    }

    let envs: Vec<_> = environments::fetch_environments(pool)?
        .into_iter()
        .filter(|env| env.project_id.as_deref() == Some(id))
        .collect();

    for env in envs {
        environments::delete_environment(pool, &env.id)?;
    }

    let conn = pool
        .get()
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete project: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn get_projects_cmd(pool: State<'_, DbPool>) -> Result<Vec<SwaggerProject>, String> {
    fetch_projects(&pool)
}

#[tauri::command]
pub fn save_project_cmd(pool: State<'_, DbPool>, project: SwaggerProject) -> Result<(), String> {
    save_project(&pool, &project)
}

#[tauri::command]
pub fn delete_project_cmd(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    delete_project(&pool, &id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database;
    use crate::environments::{save_environment, SaveEnvironmentPayload};
    use crate::swagger::SwaggerEndpoint;
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

    fn sample_project(id: &str) -> SwaggerProject {
        SwaggerProject {
            id: id.into(),
            title: "Test API".into(),
            version: "1.0.0".into(),
            base_url: Some("https://api.example.com".into()),
            uses_bearer_auth: true,
            endpoints: vec![SwaggerEndpoint {
                method: "GET".into(),
                path: "/health".into(),
                summary: Some("Health".into()),
                description: None,
                default_body: None,
                default_headers: None,
                path_params: vec![],
                query_params: vec![],
            }],
        }
    }

    #[test]
    fn saves_and_lists_projects() {
        let test = test_pool();
        let pool = &test.pool;
        let project = sample_project("project-1");

        save_project(pool, &project).expect("save");
        let list = fetch_projects(pool).expect("fetch");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, "project-1");
        assert_eq!(list[0].endpoints.len(), 1);
    }

    #[test]
    fn deletes_project_and_related_environments() {
        let test = test_pool();
        let pool = &test.pool;
        save_project(pool, &sample_project("project-1")).expect("save");
        save_environment(
            pool,
            SaveEnvironmentPayload {
                id: Some("env-1".into()),
                name: "Default".into(),
                variables: "{}".into(),
                project_id: Some("project-1".into()),
            },
        )
        .expect("env");

        delete_project(pool, "project-1").expect("delete");

        assert!(fetch_projects(pool).expect("fetch").is_empty());
        assert!(environments::fetch_environments(pool).expect("envs").is_empty());
    }
}
