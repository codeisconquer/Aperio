use std::fs;
use std::path::{Path, PathBuf};

use openapiv3::{
    MediaType, OpenAPI, Operation, Parameter, ReferenceOr, RequestBody, Schema, SchemaKind, Type,
};
use serde::Serialize;
use serde_json::{json, Map, Value};

use crate::http::build_http_client;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct SwaggerEndpoint {
    pub method: String,
    pub path: String,
    pub summary: Option<String>,
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_body: Option<String>,
    pub path_params: Vec<String>,
    pub query_params: Vec<String>,
}

const MAX_SCHEMA_DEPTH: usize = 4;
const BODY_METHODS: &[&str] = &["POST", "PUT", "PATCH"];

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

fn method_supports_default_body(method: &str) -> bool {
    BODY_METHODS.contains(&method.to_ascii_uppercase().as_str())
}

fn resolve_component_name<'a>(reference: &'a str, prefix: &str) -> Option<&'a str> {
    reference.strip_prefix(prefix)
}

fn resolve_request_body<'a>(
    spec: &'a OpenAPI,
    request_body: &'a ReferenceOr<RequestBody>,
) -> Option<&'a RequestBody> {
    match request_body {
        ReferenceOr::Item(body) => Some(body),
        ReferenceOr::Reference { reference } => {
            let name = resolve_component_name(reference, "#/components/requestBodies/")?;
            spec.components
                .as_ref()?
                .request_bodies
                .get(name)?
                .as_item()
        }
    }
}

fn resolve_schema<'a>(spec: &'a OpenAPI, schema: &'a ReferenceOr<Schema>) -> Option<&'a Schema> {
    match schema {
        ReferenceOr::Item(item) => Some(item),
        ReferenceOr::Reference { reference } => {
            let name = resolve_component_name(reference, "#/components/schemas/")?;
            spec.components.as_ref()?.schemas.get(name)?.as_item()
        }
    }
}

fn resolve_boxed_schema<'a>(
    spec: &'a OpenAPI,
    schema: &'a ReferenceOr<Box<Schema>>,
) -> Option<&'a Schema> {
    match schema {
        ReferenceOr::Item(item) => Some(item.as_ref()),
        ReferenceOr::Reference { reference } => {
            let name = resolve_component_name(reference, "#/components/schemas/")?;
            spec.components.as_ref()?.schemas.get(name)?.as_item()
        }
    }
}

fn find_json_media_type(request_body: &RequestBody) -> Option<&MediaType> {
    if let Some(media) = request_body.content.get("application/json") {
        return Some(media);
    }

    request_body
        .content
        .iter()
        .find(|(key, _)| key.contains("json"))
        .map(|(_, media)| media)
}

fn schema_example_value(schema: &Schema) -> Option<Value> {
    schema.schema_data.example.clone().or_else(|| {
        if let SchemaKind::Type(Type::String(string)) = &schema.schema_kind {
            string
                .enumeration
                .first()
                .and_then(|value| value.as_ref().map(|text| json!(text)))
        } else if let SchemaKind::Type(Type::Integer(integer)) = &schema.schema_kind {
            integer
                .enumeration
                .first()
                .and_then(|value| value.map(|number| json!(number)))
        } else if let SchemaKind::Type(Type::Number(number)) = &schema.schema_kind {
            number
                .enumeration
                .first()
                .and_then(|value| value.map(|number| json!(number)))
        } else if let SchemaKind::Type(Type::Boolean(boolean)) = &schema.schema_kind {
            boolean
                .enumeration
                .first()
                .and_then(|value| value.map(|flag| json!(flag)))
        } else {
            None
        }
    })
}

fn schema_to_json_value(spec: &OpenAPI, schema: &Schema, depth: usize) -> Option<Value> {
    if depth > MAX_SCHEMA_DEPTH {
        return None;
    }

    if let Some(example) = schema_example_value(schema) {
        return Some(example);
    }

    match &schema.schema_kind {
        SchemaKind::Type(Type::Object(object)) => {
            let mut map = Map::new();
            for (name, property) in &object.properties {
                let resolved = resolve_boxed_schema(spec, property)?;
                let value = schema_to_json_value(spec, resolved, depth + 1)
                    .unwrap_or(Value::Null);
                map.insert(name.clone(), value);
            }
            Some(Value::Object(map))
        }
        SchemaKind::Type(Type::String(_)) => Some(json!("")),
        SchemaKind::Type(Type::Integer(_)) => Some(json!(0)),
        SchemaKind::Type(Type::Number(_)) => Some(json!(0)),
        SchemaKind::Type(Type::Boolean(_)) => Some(json!(false)),
        SchemaKind::Type(Type::Array(array)) => {
            let item = array
                .items
                .as_ref()
                .and_then(|items| resolve_boxed_schema(spec, items))
                .and_then(|items| schema_to_json_value(spec, items, depth + 1))
                .unwrap_or(Value::Null);
            Some(json!([item]))
        }
        SchemaKind::OneOf { one_of } => one_of
            .first()
            .and_then(|variant| resolve_schema(spec, variant))
            .and_then(|variant| schema_to_json_value(spec, variant, depth + 1)),
        SchemaKind::AnyOf { any_of } => any_of
            .first()
            .and_then(|variant| resolve_schema(spec, variant))
            .and_then(|variant| schema_to_json_value(spec, variant, depth + 1)),
        SchemaKind::AllOf { all_of } => {
            let mut map = Map::new();
            for variant in all_of {
                let Some(resolved) = resolve_schema(spec, variant) else {
                    continue;
                };
                let Some(Value::Object(properties)) =
                    schema_to_json_value(spec, resolved, depth + 1)
                else {
                    continue;
                };
                map.extend(properties);
            }
            if map.is_empty() {
                None
            } else {
                Some(Value::Object(map))
            }
        }
        SchemaKind::Not { .. } | SchemaKind::Any(_) => None,
    }
}

fn schema_ref_to_json_value(
    spec: &OpenAPI,
    schema: &ReferenceOr<Schema>,
    depth: usize,
) -> Option<Value> {
    let resolved = resolve_schema(spec, schema)?;
    schema_to_json_value(spec, resolved, depth)
}

fn push_unique(names: &mut Vec<String>, name: String) {
    if !names.iter().any(|existing| existing == &name) {
        names.push(name);
    }
}

fn extract_path_params(path: &str) -> Vec<String> {
    let mut params = Vec::new();
    let mut rest = path;
    while let Some(start) = rest.find('{') {
        rest = &rest[start + 1..];
        let Some(end) = rest.find('}') else {
            break;
        };
        let name = rest[..end].trim();
        if !name.is_empty() {
            push_unique(&mut params, name.to_string());
        }
        rest = &rest[end + 1..];
    }
    params
}

fn resolve_parameter<'a>(
    spec: &'a OpenAPI,
    parameter: &'a ReferenceOr<Parameter>,
) -> Option<&'a Parameter> {
    match parameter {
        ReferenceOr::Item(item) => Some(item),
        ReferenceOr::Reference { reference } => {
            let name = resolve_component_name(reference, "#/components/parameters/")?;
            spec.components.as_ref()?.parameters.get(name)?.as_item()
        }
    }
}

fn extract_query_params(spec: &OpenAPI, operation: &Operation) -> Vec<String> {
    let mut names = Vec::new();
    for parameter_ref in &operation.parameters {
        let Some(parameter) = resolve_parameter(spec, parameter_ref) else {
            continue;
        };
        if let Parameter::Query {
            parameter_data, ..
        } = parameter
        {
            push_unique(&mut names, parameter_data.name.clone());
        }
    }
    names
}

fn generate_default_body(spec: &OpenAPI, operation: &Operation) -> Option<String> {
    let request_body_ref = operation.request_body.as_ref()?;
    let request_body = resolve_request_body(spec, request_body_ref)?;
    let media_type = find_json_media_type(request_body)?;

    if let Some(example) = &media_type.example {
        return serde_json::to_string_pretty(example).ok();
    }

    let schema_ref = media_type.schema.as_ref()?;
    let value = schema_ref_to_json_value(spec, schema_ref, 0)?;
    serde_json::to_string_pretty(&value).ok()
}

fn build_project(spec: OpenAPI) -> Result<SwaggerProject, String> {
    let title = spec.info.title.clone();
    let version = spec.info.version.clone();
    let base_url = spec.servers.first().map(|server| server.url.clone());
    let endpoints: Vec<SwaggerEndpoint> = spec
        .operations()
        .map(|(path, method, operation)| {
            let method_upper = method.to_string().to_uppercase();
            let default_body = if method_supports_default_body(&method_upper) {
                generate_default_body(&spec, operation)
            } else {
                None
            };

            SwaggerEndpoint {
                method: method_upper,
                path: path.to_string(),
                summary: operation.summary.clone(),
                description: operation.description.clone(),
                default_body,
                path_params: extract_path_params(path),
                query_params: extract_query_params(&spec, operation),
            }
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

    let client = build_http_client()?;
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

    const POST_WITH_BODY_YAML: &str = r#"
openapi: 3.0.0
info:
  title: Body API
  version: 1.0.0
paths:
  /items:
    post:
      summary: Create item
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                  example: Hello
                message:
                  type: string
                userid:
                  type: integer
      responses:
        "201":
          description: Created
  /items/{id}:
    get:
      summary: Get item
      responses:
        "200":
          description: OK
"#;

    #[test]
    fn generates_default_body_for_post_with_json_schema() {
        let project = parse_swagger_content(POST_WITH_BODY_YAML, "yaml").expect("parse yaml");
        let post = project
            .endpoints
            .iter()
            .find(|endpoint| endpoint.method == "POST" && endpoint.path == "/items")
            .expect("post endpoint");

        let body = post.default_body.as_deref().expect("default body");
        let parsed: Value = serde_json::from_str(body).expect("json body");
        assert_eq!(parsed["title"], json!("Hello"));
        assert_eq!(parsed["message"], json!(""));
        assert_eq!(parsed["userid"], json!(0));

        let get = project
            .endpoints
            .iter()
            .find(|endpoint| endpoint.method == "GET")
            .expect("get endpoint");
        assert!(get.default_body.is_none());
    }

    #[test]
    fn resolves_request_body_component_ref() {
        const YAML: &str = r#"
openapi: 3.0.0
info:
  title: Ref Body API
  version: 1.0.0
components:
  requestBodies:
    ItemBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              name:
                type: string
paths:
  /items:
    patch:
      summary: Patch item
      requestBody:
        $ref: '#/components/requestBodies/ItemBody'
      responses:
        "200":
          description: OK
"#;

        let project = parse_swagger_content(YAML, "yaml").expect("parse yaml");
        let patch = project.endpoints.first().expect("patch");
        assert_eq!(patch.method, "PATCH");
        let body: Value =
            serde_json::from_str(patch.default_body.as_ref().expect("body")).expect("json");
        assert_eq!(body["name"], json!(""));
    }

    #[test]
    fn extracts_path_and_query_params() {
        const YAML: &str = r#"
openapi: 3.0.0
info:
  title: Params API
  version: 1.0.0
components:
  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
paths:
  /agents/repos/{owner}/{repo}/tasks:
    get:
      summary: List tasks
      parameters:
        - name: status
          in: query
          schema:
            type: string
        - name: owner
          in: path
          required: true
          schema:
            type: string
        - $ref: '#/components/parameters/PageParam'
        - name: status
          in: query
          schema:
            type: string
      responses:
        "200":
          description: OK
"#;

        let project = parse_swagger_content(YAML, "yaml").expect("parse yaml");
        let endpoint = project.endpoints.first().expect("endpoint");
        assert_eq!(endpoint.method, "GET");
        assert_eq!(endpoint.path, "/agents/repos/{owner}/{repo}/tasks");
        assert_eq!(endpoint.path_params, vec!["owner", "repo"]);
        assert_eq!(endpoint.query_params, vec!["status", "page"]);
    }

    #[test]
    fn deduplicates_path_params_in_template() {
        assert_eq!(
            extract_path_params("/items/{id}/related/{id}"),
            vec!["id"]
        );
    }

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
