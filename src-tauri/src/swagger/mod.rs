use std::fs;
use std::path::Path;

use openapiv3::OpenAPI;
use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct SwaggerEndpoint {
    pub method: String,
    pub path: String,
    pub summary: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SwaggerProject {
    pub id: String,
    pub title: String,
    pub version: String,
    pub base_url: Option<String>,
    pub endpoints: Vec<SwaggerEndpoint>,
}

pub fn parse_openapi_content(content: &str, extension: &str) -> Result<OpenAPI, String> {
    match extension {
        "json" => serde_json::from_str(content).map_err(|e| format!("Invalid OpenAPI JSON: {e}")),
        "yml" | "yaml" => {
            serde_yaml::from_str(content).map_err(|e| format!("Invalid OpenAPI YAML: {e}"))
        }
        other => Err(format!("Unsupported file type: .{other}")),
    }
}

fn extension_from_path(path: &Path) -> Result<String, String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .ok_or_else(|| "OpenAPI file must have .json, .yml, or .yaml extension".to_string())
}

fn build_project(spec: OpenAPI) -> Result<SwaggerProject, String> {
    let title = spec.info.title.clone();
    let version = spec.info.version.clone();
    let base_url = spec.servers.first().map(|server| server.url.clone());
    let endpoints: Vec<SwaggerEndpoint> = spec
        .operations()
        .map(|(path, method, operation)| SwaggerEndpoint {
            method: method.to_string().to_uppercase(),
            path: path.to_string(),
            summary: operation.summary.clone(),
            description: operation.description.clone(),
        })
        .collect();

    if endpoints.is_empty() {
        return Err("No HTTP operations found in OpenAPI document".into());
    }

    Ok(SwaggerProject {
        id: Uuid::new_v4().to_string(),
        title,
        version,
        base_url,
        endpoints,
    })
}

pub fn parse_swagger_content(content: &str, extension: &str) -> Result<SwaggerProject, String> {
    let spec = parse_openapi_content(content, extension)?;
    build_project(spec)
}

pub fn parse_swagger_path(path: &Path) -> Result<SwaggerProject, String> {
    let extension = extension_from_path(path)?;
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read OpenAPI file: {e}"))?;
    parse_swagger_content(&content, &extension)
}

#[tauri::command]
pub async fn import_swagger_file(app: AppHandle) -> Result<SwaggerProject, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("OpenAPI", &["json", "yml", "yaml"])
        .set_title("Import OpenAPI / Swagger")
        .blocking_pick_file();

    let path = picked.ok_or_else(|| "Import cancelled".to_string())?;
    let path = path
        .into_path()
        .map_err(|e| format!("Invalid file path: {e}"))?;

    parse_swagger_path(&path)
}

#[cfg(test)]
mod tests {
    use super::*;

    const MINIMAL_YAML: &str = r#"
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
servers:
  - url: https://api.example.com
paths:
  /health:
    get:
      summary: Health check
      responses:
        "200":
          description: OK
"#;

    #[test]
    fn parses_minimal_yaml() {
        let project = parse_swagger_content(MINIMAL_YAML, "yaml").expect("parse yaml");
        assert_eq!(project.title, "Test API");
        assert_eq!(project.version, "1.0.0");
        assert_eq!(project.base_url.as_deref(), Some("https://api.example.com"));
        assert_eq!(project.endpoints.len(), 1);
        assert_eq!(project.endpoints[0].method, "GET");
        assert_eq!(project.endpoints[0].path, "/health");
        assert_eq!(project.endpoints[0].summary.as_deref(), Some("Health check"));
    }
}
