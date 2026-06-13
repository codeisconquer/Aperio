mod postman_parser;
mod serverless_parser;

use std::fs;
use std::path::{Path, PathBuf};

use openapiv3::{
    APIKeyLocation, MediaType, OpenAPI, Operation, Parameter, ReferenceOr, RequestBody, Schema,
    SchemaKind, SecurityScheme, Type,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

use crate::http::build_http_client;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwaggerEndpoint {
    pub method: String,
    pub path: String,
    pub summary: Option<String>,
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_body: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_headers: Option<String>,
    pub path_params: Vec<String>,
    pub query_params: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ImportFormat {
    OpenApi,
    Serverless,
    Postman,
}

const MAX_SCHEMA_DEPTH: usize = 4;
const BODY_METHODS: &[&str] = &["POST", "PUT", "PATCH"];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwaggerProject {
    pub id: String,
    pub title: String,
    pub version: String,
    pub base_url: Option<String>,
    #[serde(default)]
    pub uses_bearer_auth: bool,
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
        .ok_or_else(|| {
            "File must have extension .json, .yml, .yaml, or be named serverless.yml".to_string()
        })
}

fn is_serverless_filename(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| {
            name.eq_ignore_ascii_case("serverless.yml")
                || name.eq_ignore_ascii_case("serverless.yaml")
        })
        .unwrap_or(false)
}

fn yaml_has_serverless_shape(content: &str) -> bool {
    let Ok(value) = serde_yaml::from_str::<serde_yaml::Value>(content) else {
        return false;
    };

    value.get("functions").is_some() && value.get("service").is_some()
}

fn detect_import_format(path: Option<&Path>, content: &str) -> ImportFormat {
    if path.is_some_and(is_serverless_filename) {
        return ImportFormat::Serverless;
    }

    let trimmed = content.trim_start();

    if trimmed.starts_with('{') {
        if postman_parser::is_postman_json(content) {
            return ImportFormat::Postman;
        }
        if serde_json::from_str::<Value>(content)
            .ok()
            .is_some_and(|value| value.get("openapi").is_some() || value.get("swagger").is_some())
        {
            return ImportFormat::OpenApi;
        }
    }

    if trimmed.starts_with("openapi:")
        || trimmed.starts_with("swagger:")
        || (trimmed.starts_with('{') == false && yaml_has_openapi_shape(content))
    {
        return ImportFormat::OpenApi;
    }

    if yaml_has_serverless_shape(content) {
        return ImportFormat::Serverless;
    }

    if let Some(path) = path {
        if let Ok(ext) = extension_from_path(path) {
            return match ext.as_str() {
                "json" if postman_parser::is_postman_json(content) => ImportFormat::Postman,
                "json" => ImportFormat::OpenApi,
                "yml" | "yaml" if yaml_has_serverless_shape(content) => ImportFormat::Serverless,
                "yml" | "yaml" => ImportFormat::OpenApi,
                _ => ImportFormat::OpenApi,
            };
        }
    }

    ImportFormat::OpenApi
}

fn yaml_has_openapi_shape(content: &str) -> bool {
    let Ok(value) = serde_yaml::from_str::<serde_yaml::Value>(content) else {
        return content.contains("openapi:") || content.contains("swagger:");
    };

    value.get("openapi").is_some() || value.get("swagger").is_some()
}

pub fn parse_project_content(content: &str, path: Option<&Path>) -> Result<SwaggerProject, String> {
    match detect_import_format(path, content) {
        ImportFormat::OpenApi => {
            let extension = path
                .and_then(|file| extension_from_path(file).ok())
                .or_else(|| sniff_openapi_extension(content))
                .unwrap_or_else(|| "yaml".to_string());
            parse_openapi_project(content, &extension)
        }
        ImportFormat::Serverless => serverless_parser::parse_serverless_content(content),
        ImportFormat::Postman => postman_parser::parse_postman_content(content),
    }
}

fn sniff_openapi_extension(content: &str) -> Option<String> {
    let trimmed = content.trim_start();
    if trimmed.starts_with('{') || trimmed.starts_with('[') {
        Some("json".into())
    } else {
        Some("yaml".into())
    }
}

fn parse_openapi_project(content: &str, extension: &str) -> Result<SwaggerProject, String> {
    let spec = parse_openapi_content(content, extension)?;
    build_project(spec)
}

pub fn parse_project_path(path: &Path) -> Result<SwaggerProject, String> {
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read import file: {e}"))?;
    parse_project_content(&content, Some(path))
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

fn properties_to_json_map<'a>(
    spec: &OpenAPI,
    properties: impl Iterator<Item = (&'a String, &'a ReferenceOr<Box<Schema>>)>,
    depth: usize,
) -> Map<String, Value> {
    let mut map = Map::new();
    for (name, property) in properties {
        let value = property_to_json_value(spec, property, depth);
        map.insert(name.clone(), value);
    }
    map
}

fn property_to_json_value(
    spec: &OpenAPI,
    property: &ReferenceOr<Box<Schema>>,
    depth: usize,
) -> Value {
    resolve_boxed_schema(spec, property)
        .and_then(|resolved| schema_to_json_value(spec, resolved, depth + 1))
        .unwrap_or_else(|| json!(""))
}

fn schema_to_json_value(spec: &OpenAPI, schema: &Schema, depth: usize) -> Option<Value> {
    if depth > MAX_SCHEMA_DEPTH {
        return None;
    }

    if let Some(example) = schema_example_value(schema) {
        return Some(example);
    }

    match &schema.schema_kind {
        SchemaKind::Type(Type::Object(object)) => Some(Value::Object(properties_to_json_map(
            spec,
            object.properties.iter(),
            depth,
        ))),
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
        SchemaKind::AllOf { all_of } => merge_all_of_variants(spec, all_of, depth),
        SchemaKind::Any(any) => schema_any_to_json_value(spec, any, depth),
        SchemaKind::Not { .. } => None,
    }
}

fn merge_all_of_variants(
    spec: &OpenAPI,
    all_of: &[ReferenceOr<Schema>],
    depth: usize,
) -> Option<Value> {
    let mut map = Map::new();
    for variant in all_of {
        let Some(resolved) = resolve_schema(spec, variant) else {
            continue;
        };
        let Some(Value::Object(properties)) = schema_to_json_value(spec, resolved, depth + 1) else {
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

fn schema_any_to_json_value(
    spec: &OpenAPI,
    any: &openapiv3::AnySchema,
    depth: usize,
) -> Option<Value> {
    if !any.all_of.is_empty() {
        return merge_all_of_variants(spec, &any.all_of, depth);
    }
    if !any.one_of.is_empty() {
        return any
            .one_of
            .first()
            .and_then(|variant| resolve_schema(spec, variant))
            .and_then(|variant| schema_to_json_value(spec, variant, depth + 1));
    }
    if !any.any_of.is_empty() {
        return any
            .any_of
            .first()
            .and_then(|variant| resolve_schema(spec, variant))
            .and_then(|variant| schema_to_json_value(spec, variant, depth + 1));
    }
    if !any.properties.is_empty() {
        return Some(Value::Object(properties_to_json_map(
            spec,
            any.properties.iter(),
            depth,
        )));
    }
    if let Some(items) = &any.items {
        let item = resolve_boxed_schema(spec, items)
            .and_then(|resolved| schema_to_json_value(spec, resolved, depth + 1))
            .unwrap_or(Value::Null);
        return Some(json!([item]));
    }

    match any.typ.as_deref() {
        Some("object") => Some(json!({})),
        Some("string") => Some(json!("")),
        Some("integer") => Some(json!(0)),
        Some("number") => Some(json!(0)),
        Some("boolean") => Some(json!(false)),
        Some("array") => Some(json!([])),
        _ => None,
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

pub(crate) fn push_unique(names: &mut Vec<String>, name: String) {
    if !names.iter().any(|existing| existing == &name) {
        names.push(name);
    }
}

pub(crate) fn extract_path_params(path: &str) -> Vec<String> {
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

fn normalize_openapi_server_url(url: &str) -> String {
    url.trim().trim_end_matches('/').to_string()
}

fn resolve_security_scheme<'a>(spec: &'a OpenAPI, name: &str) -> Option<&'a SecurityScheme> {
    let components = spec.components.as_ref()?;
    match components.security_schemes.get(name)? {
        ReferenceOr::Item(scheme) => Some(scheme),
        ReferenceOr::Reference { .. } => None,
    }
}

fn security_scheme_uses_bearer_token(scheme: &SecurityScheme) -> bool {
    match scheme {
        SecurityScheme::HTTP { scheme, .. } => scheme.eq_ignore_ascii_case("bearer"),
        SecurityScheme::OAuth2 { .. } | SecurityScheme::OpenIDConnect { .. } => true,
        SecurityScheme::APIKey { location, name, .. } => {
            matches!(location, APIKeyLocation::Header)
                && name.eq_ignore_ascii_case("authorization")
        }
    }
}

fn collect_security_scheme_names(spec: &OpenAPI) -> Vec<String> {
    let mut names = Vec::new();

    if let Some(requirements) = &spec.security {
        for requirement in requirements {
            names.extend(requirement.keys().cloned());
        }
    }

    for (_path, _method, operation) in spec.operations() {
        if let Some(requirements) = &operation.security {
            for requirement in requirements {
                names.extend(requirement.keys().cloned());
            }
        }
    }

    names
}

fn openapi_uses_bearer_auth(spec: &OpenAPI) -> bool {
    if collect_security_scheme_names(spec).iter().any(|name| {
        resolve_security_scheme(spec, name).is_some_and(security_scheme_uses_bearer_token)
    }) {
        return true;
    }

    spec.components.as_ref().is_some_and(|components| {
        components.security_schemes.values().any(|scheme_ref| {
            matches!(
                scheme_ref,
                ReferenceOr::Item(scheme) if security_scheme_uses_bearer_token(scheme)
            )
        })
    })
}

fn build_project(spec: OpenAPI) -> Result<SwaggerProject, String> {
    let title = spec.info.title.clone();
    let version = spec.info.version.clone();
    let base_url = spec
        .servers
        .first()
        .map(|server| normalize_openapi_server_url(&server.url))
        .filter(|url| !url.is_empty());
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
                default_headers: None,
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
        uses_bearer_auth: openapi_uses_bearer_auth(&spec),
        endpoints,
    })
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

fn resolve_import_from_url(
    url: &str,
    content_type: Option<&str>,
    content: &str,
) -> Result<SwaggerProject, String> {
    let path_hint = PathBuf::from(
        url.split('?')
            .next()
            .unwrap_or(url)
            .split('#')
            .next()
            .unwrap_or(url),
    );

    if path_hint.file_name().is_some_and(|name| {
        name.to_str()
            .is_some_and(|file| file.eq_ignore_ascii_case("serverless.yml") || file.eq_ignore_ascii_case("serverless.yaml"))
    }) {
        return serverless_parser::parse_serverless_content(content);
    }

    if postman_parser::is_postman_json(content) {
        return postman_parser::parse_postman_content(content);
    }

    if yaml_has_serverless_shape(content) {
        return serverless_parser::parse_serverless_content(content);
    }

    let extension = extension_from_url(url)
        .or_else(|| {
            content_type.and_then(extension_from_content_type)
        })
        .or_else(|| extension_from_content_sniff(content))
        .ok_or_else(|| {
            "Could not detect API spec format. Use OpenAPI, serverless.yml, or Postman Collection JSON."
                .to_string()
        })?;

    parse_openapi_project(content, &extension)
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

    resolve_import_from_url(trimmed, content_type.as_deref(), &body)
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
        .add_filter("OpenAPI (.json, .yaml, .yml)", &["json", "yml", "yaml"])
        .add_filter("Serverless Config (serverless.yml)", &["yml", "yaml"])
        .add_filter("Postman Collection (*.json)", &["json"])
        .add_filter("All supported formats", &["json", "yml", "yaml"])
        .set_title("Import workspace")
        .blocking_pick_file();

    let path = picked.ok_or_else(|| "Import cancelled".to_string())?;
    let path = path
        .into_path()
        .map_err(|e| format!("Invalid file path: {e}"))?;

    parse_project_path(&path)
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
    fn generates_default_body_for_empty_nested_object() {
        const YAML: &str = r#"
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    put:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                firstname:
                  type: string
                metadata:
                  type: object
      responses:
        "200":
          description: OK
"#;

        let project = parse_openapi_project(YAML, "yaml").expect("parse yaml");
        let put = project.endpoints.first().expect("put endpoint");
        let body = put.default_body.as_deref().expect("default body");
        let parsed: Value = serde_json::from_str(body).expect("valid json body");
        assert_eq!(parsed["firstname"], json!(""));
        assert_eq!(parsed["metadata"], json!({}));
        assert!(body.contains('\n'), "body should be pretty-printed");
    }

    #[test]
    fn generates_default_body_when_object_type_is_omitted() {
        const YAML: &str = r#"
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              properties:
                firstname:
                  type: string
                lastname:
                  type: string
      responses:
        "201":
          description: Created
"#;

        let project = parse_openapi_project(YAML, "yaml").expect("parse yaml");
        let post = project.endpoints.first().expect("post endpoint");
        let body = post.default_body.as_deref().expect("default body");
        let parsed: Value = serde_json::from_str(body).expect("valid json body");
        assert_eq!(parsed["firstname"], json!(""));
        assert_eq!(parsed["lastname"], json!(""));
    }

    #[test]
    fn generates_default_body_for_all_of_schema_merge() {
        const YAML: &str = r#"
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
components:
  schemas:
    Person:
      type: object
      properties:
        firstname:
          type: string
    User:
      allOf:
        - $ref: '#/components/schemas/Person'
        - type: object
          properties:
            lastname:
              type: string
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      responses:
        "201":
          description: Created
"#;

        let project = parse_openapi_project(YAML, "yaml").expect("parse yaml");
        let post = project.endpoints.first().expect("post endpoint");
        let body = post.default_body.as_deref().expect("default body");
        let parsed: Value = serde_json::from_str(body).expect("valid json body");
        assert_eq!(parsed["firstname"], json!(""));
        assert_eq!(parsed["lastname"], json!(""));
    }

    #[test]
    fn generates_default_body_for_ref_schema_with_firstname_lastname() {
        const YAML: &str = r#"
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUser'
      responses:
        "201":
          description: Created
components:
  schemas:
    CreateUser:
      type: object
      required:
        - firstname
        - lastname
      properties:
        firstname:
          type: string
        lastname:
          type: string
"#;

        let project = parse_openapi_project(YAML, "yaml").expect("parse yaml");
        let post = project
            .endpoints
            .iter()
            .find(|endpoint| endpoint.method == "POST")
            .expect("post endpoint");

        let body = post.default_body.as_deref().expect("default body");
        let parsed: Value = serde_json::from_str(body).expect("valid json body");
        assert_eq!(parsed["firstname"], json!(""));
        assert_eq!(parsed["lastname"], json!(""));
        assert!(body.contains('\n'), "body should be pretty-printed");
    }

    #[test]
    fn generates_default_body_for_nested_object_properties() {
        const YAML: &str = r#"
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    put:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                firstname:
                  type: string
                address:
                  type: object
                  properties:
                    street:
                      type: string
                    city:
                      type: string
      responses:
        "200":
          description: OK
"#;

        let project = parse_openapi_project(YAML, "yaml").expect("parse yaml");
        let put = project.endpoints.first().expect("put endpoint");
        let body = put.default_body.as_deref().expect("default body");
        let parsed: Value = serde_json::from_str(body).expect("valid json body");
        assert_eq!(parsed["firstname"], json!(""));
        assert!(parsed["address"].is_object());
        assert_eq!(parsed["address"]["street"], json!(""));
        assert_eq!(parsed["address"]["city"], json!(""));
    }

    #[test]
    fn generates_default_body_for_post_with_json_schema() {
        let project = parse_openapi_project(POST_WITH_BODY_YAML, "yaml").expect("parse yaml");
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

        let project = parse_openapi_project(YAML, "yaml").expect("parse yaml");
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

        let project = parse_openapi_project(YAML, "yaml").expect("parse yaml");
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
    fn parses_relative_openapi_server_as_base_url() {
        const YAML: &str = r#"
openapi: 3.0.3
info:
  title: Airflow API (Stable)
  version: 2.7.2
servers:
  - url: /api/v1
paths:
  /connections:
    post:
      summary: Create a connection
      responses:
        "200":
          description: OK
"#;

        let project = parse_openapi_project(YAML, "yaml").expect("parse yaml");
        assert_eq!(project.base_url.as_deref(), Some("/api/v1"));
        let post = project
            .endpoints
            .iter()
            .find(|endpoint| endpoint.method == "POST")
            .expect("post endpoint");
        assert_eq!(post.path, "/connections");
    }

    #[test]
    fn parses_minimal_yaml() {
        let project = parse_openapi_project(MINIMAL_YAML, "yaml").expect("parse yaml");
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

    #[test]
    fn detects_serverless_by_filename() {
        const YAML: &str = r#"
service: demo
functions:
  ping:
    handler: ping.main
    events:
      - http:
          path: ping
          method: get
"#;
        let path = Path::new("/tmp/serverless.yml");
        let project = parse_project_content(YAML, Some(path)).expect("serverless import");
        assert_eq!(project.title, "demo");
        assert_eq!(project.endpoints[0].path, "/ping");
    }

    #[test]
    fn routes_postman_json_by_schema() {
        const JSON: &str = r#"{
  "info": {
    "name": "Quick",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [{
    "name": "Ping",
    "request": {
      "method": "GET",
      "url": "https://api.example.com/ping"
    }
  }]
}"#;
        let project = parse_project_content(JSON, None).expect("postman import");
        assert_eq!(project.title, "Quick");
        assert_eq!(project.endpoints[0].path, "/ping");
    }
}
