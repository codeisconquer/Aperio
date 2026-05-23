use std::fs;
use std::path::{Path, PathBuf};

use openapiv3::OpenAPI;
use reqwest::Client;
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

fn extension_from_url(url: &str) -> Option<String> {
    let path = url
        .split('?')
        .next()
        .unwrap_or(url)
        .split('#')
        .next()
        .unwrap_or(url);

    PathBuf::from(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .filter(|ext| matches!(ext.as_str(), "json" | "yml" | "yaml"))
}

fn extension_from_content_type(content_type: &str) -> Option<String> {
    let lower = content_type.to_ascii_lowercase();
    if lower.contains("json") {
        return Some("json".into());
    }
    if lower.contains("yaml") || lower.contains("yml") {
        return Some("yaml".into());
    }
    None
}

fn extension_from_content_sniff(content: &str) -> Option<String> {
    let trimmed = content.trim_start();
    if trimmed.starts_with('{') || trimmed.starts_with('[') {
        return Some("json".into());
    }
    if trimmed.starts_with("openapi:")
        || trimmed.starts_with("swagger:")
        || trimmed.contains('\n')
    {
        return Some("yaml".into());
    }
    None
}

fn resolve_openapi_extension(
    url: &str,
    content_type: Option<&str>,
    content: &str,
) -> Result<String, String> {
    if let Some(ext) = extension_from_url(url) {
        return Ok(ext);
    }

    if let Some(content_type) = content_type {
        if let Some(ext) = extension_from_content_type(content_type) {
            return Ok(ext);
        }
    }

    extension_from_content_sniff(content).ok_or_else(|| {
        "Could not detect OpenAPI format. Use a .json or .yaml URL, or serve a valid Content-Type."
            .into()
    })
}

pub async fn fetch_and_parse_swagger_url(url: &str) -> Result<SwaggerProject, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("URL must not be empty".into());
    }

    let client = Client::new();
    let response = client
        .get(trimmed)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch OpenAPI URL: {e}"))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!(
            "OpenAPI URL returned HTTP {} ({})",
            status.as_u16(),
            status.canonical_reason().unwrap_or("error")
        ));
    }

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);

    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read OpenAPI response body: {e}"))?;

    if body.trim().is_empty() {
        return Err("OpenAPI URL returned an empty response body".into());
    }

    let extension =
        resolve_openapi_extension(trimmed, content_type.as_deref(), &body)?;
    parse_swagger_content(&body, &extension)
}

#[tauri::command]
pub async fn import_swagger_from_url(url: String) -> Result<SwaggerProject, String> {
    fetch_and_parse_swagger_url(&url).await
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

    #[test]
    fn resolves_extension_from_url_path() {
        assert_eq!(
            extension_from_url("https://api.example.com/openapi.json").as_deref(),
            Some("json")
        );
        assert_eq!(
            extension_from_url("https://api.example.com/spec.yaml?v=1").as_deref(),
            Some("yaml")
        );
    }

    #[test]
    fn resolves_extension_from_content_type() {
        assert_eq!(
            extension_from_content_type("application/json; charset=utf-8").as_deref(),
            Some("json")
        );
        assert_eq!(
            extension_from_content_type("application/yaml").as_deref(),
            Some("yaml")
        );
    }

    #[tokio::test]
    #[ignore = "hits the public Petstore API; run with --ignored"]
    async fn fetches_petstore_swagger_url() {
        let project = fetch_and_parse_swagger_url(
            "https://petstore3.swagger.io/api/v3/openapi.json",
        )
        .await
        .expect("petstore import");

        assert!(!project.title.is_empty());
        assert!(!project.endpoints.is_empty());
    }

    #[test]
    fn resolves_extension_from_content_sniff() {
        assert_eq!(
            extension_from_content_sniff(r#"{"openapi":"3.0.0"}"#).as_deref(),
            Some("json")
        );
        assert_eq!(
            extension_from_content_sniff("openapi: 3.0.0\ninfo:\n  title: X").as_deref(),
            Some("yaml")
        );
    }
}
