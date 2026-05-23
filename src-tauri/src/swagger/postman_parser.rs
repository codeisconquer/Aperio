use serde::Deserialize;
use serde_json::Value;
use uuid::Uuid;

use super::{extract_path_params, push_unique, SwaggerEndpoint, SwaggerProject};

#[derive(Debug, Deserialize)]
struct PostmanCollection {
    info: PostmanInfo,
    #[serde(default)]
    item: Vec<PostmanItem>,
    #[serde(default)]
    variable: Vec<PostmanVariable>,
}

#[derive(Debug, Deserialize)]
struct PostmanInfo {
    name: String,
    #[serde(default, rename = "_postman_id")]
    postman_id: Option<String>,
    #[serde(default)]
    schema: Option<String>,
    #[serde(default)]
    version: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PostmanItem {
    name: String,
    #[serde(default)]
    item: Vec<PostmanItem>,
    request: Option<PostmanRequest>,
}

#[derive(Debug, Deserialize)]
struct PostmanRequest {
    method: String,
    #[serde(default)]
    header: Vec<PostmanHeader>,
    #[serde(default)]
    body: Option<PostmanBody>,
    url: PostmanUrl,
}

#[derive(Debug, Deserialize)]
struct PostmanHeader {
    key: String,
    #[serde(default)]
    value: String,
    #[serde(default)]
    disabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct PostmanBody {
    mode: Option<String>,
    #[serde(default)]
    raw: Option<String>,
    #[serde(default)]
    urlencoded: Vec<PostmanKeyValue>,
}

#[derive(Debug, Deserialize)]
struct PostmanKeyValue {
    key: String,
    #[serde(default)]
    value: String,
    #[serde(default)]
    disabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum PostmanUrl {
    Text(String),
    Object(PostmanUrlObject),
}

#[derive(Debug, Deserialize)]
struct PostmanUrlObject {
    #[serde(default)]
    raw: Option<String>,
    #[serde(default)]
    host: Vec<String>,
    #[serde(default)]
    path: Vec<String>,
    #[serde(default)]
    query: Vec<PostmanQueryParam>,
}

#[derive(Debug, Deserialize)]
struct PostmanQueryParam {
    key: String,
    #[serde(default)]
    disabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct PostmanVariable {
    key: String,
    #[serde(default)]
    value: String,
}

pub fn parse_postman_content(content: &str) -> Result<SwaggerProject, String> {
    let collection: PostmanCollection = serde_json::from_str(content)
        .map_err(|e| format!("Invalid Postman Collection JSON: {e}"))?;

    if !is_postman_collection(&collection) {
        return Err("Not a Postman Collection v2.1 document".into());
    }

    let base_url = collection
        .variable
        .iter()
        .find(|var| {
            var.key.eq_ignore_ascii_case("baseUrl")
                || var.key.eq_ignore_ascii_case("base_url")
        })
        .map(|var| var.value.trim().to_string())
        .filter(|url| !url.is_empty());

    let mut endpoints = Vec::new();
    walk_items(&collection.item, Vec::new(), &mut endpoints);

    if endpoints.is_empty() {
        return Err("No HTTP requests found in Postman collection".into());
    }

    Ok(SwaggerProject {
        id: Uuid::new_v4().to_string(),
        title: collection.info.name,
        version: collection
            .info
            .version
            .unwrap_or_else(|| "2.1.0".to_string()),
        base_url,
        endpoints,
    })
}

fn is_postman_collection(collection: &PostmanCollection) -> bool {
    collection.info.postman_id.is_some()
        || collection
            .info
            .schema
            .as_deref()
            .is_some_and(|schema| schema.contains("postman.com/json/collection"))
}

fn walk_items(items: &[PostmanItem], folder_path: Vec<String>, endpoints: &mut Vec<SwaggerEndpoint>) {
    for item in items {
        let mut path = folder_path.clone();
        path.push(item.name.clone());

        if let Some(request) = &item.request {
            if let Some(endpoint) = request_to_endpoint(&path, request) {
                push_endpoint(endpoints, endpoint);
            }
        }

        if !item.item.is_empty() {
            walk_items(&item.item, path, endpoints);
        }
    }
}

fn request_to_endpoint(folder_path: &[String], request: &PostmanRequest) -> Option<SwaggerEndpoint> {
    let method = request.method.trim().to_ascii_uppercase();
    if method.is_empty() {
        return None;
    }

    let (path, query_params) = resolve_url_path(&request.url)?;
    let request_name = folder_path.last()?.clone();
    let folder_summary = if folder_path.len() > 1 {
        folder_path[..folder_path.len() - 1].join(" / ")
    } else {
        String::new()
    };

    let summary = if folder_summary.is_empty() {
        request_name
    } else {
        format!("{folder_summary} / {request_name}")
    };

    Some(SwaggerEndpoint {
        method,
        path: path.clone(),
        summary: Some(summary),
        description: None,
        default_body: extract_body(request),
        default_headers: format_headers(&request.header),
        path_params: extract_path_params(&path),
        query_params,
    })
}

fn resolve_url_path(url: &PostmanUrl) -> Option<(String, Vec<String>)> {
    match url {
        PostmanUrl::Text(raw) => parse_raw_url(raw),
        PostmanUrl::Object(object) => {
            if let Some(raw) = object.raw.as_deref().filter(|value| !value.is_empty()) {
                return parse_raw_url(raw);
            }

            if object.path.is_empty() && !object.host.is_empty() {
                let synthetic = format!("https://{}/", object.host.join("."));
                return parse_raw_url(&synthetic);
            }

            let path = build_path_from_segments(&object.path);
            let query_params = object
                .query
                .iter()
                .filter(|param| !param.disabled.unwrap_or(false))
                .map(|param| param.key.clone())
                .collect::<Vec<_>>();

            let mut deduped = Vec::new();
            for name in query_params {
                push_unique(&mut deduped, name);
            }

            Some((path, deduped))
        }
    }
}

fn build_path_from_segments(segments: &[String]) -> String {
    if segments.is_empty() {
        return "/".to_string();
    }

    let parts: Vec<String> = segments
        .iter()
        .map(|segment| {
            let trimmed = segment.trim();
            if trimmed.starts_with(':') {
                format!("{{{}}}", &trimmed[1..])
            } else {
                trimmed.to_string()
            }
        })
        .collect();

    format!("/{}", parts.join("/"))
}

fn parse_raw_url(raw: &str) -> Option<(String, Vec<String>)> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    let without_fragment = trimmed.split('#').next().unwrap_or(trimmed);
    let path_and_query = without_fragment
        .split("://")
        .nth(1)
        .unwrap_or(without_fragment);
    let path_and_query = path_and_query.split('/').collect::<Vec<_>>();
    if path_and_query.is_empty() {
        return Some(("/".to_string(), Vec::new()));
    }

    let path_start = path_and_query
        .iter()
        .position(|segment| segment.contains('.'))
        .map(|index| index + 1)
        .unwrap_or(0);

    let remainder = path_and_query[path_start..].join("/");
    let (path_part, query_part) = match remainder.split_once('?') {
        Some((path, query)) => (path.to_string(), Some(query.to_string())),
        None => (remainder, None),
    };

    let path = if path_part.is_empty() {
        "/".to_string()
    } else {
        normalize_postman_path(&path_part)
    };

    let mut query_params = Vec::new();
    if let Some(query) = query_part.as_deref() {
        for pair in query.split('&') {
            let name = pair.split('=').next().unwrap_or(pair).trim();
            if !name.is_empty() {
                push_unique(&mut query_params, name.to_string());
            }
        }
    }

    Some((path, query_params))
}

fn normalize_postman_path(path: &str) -> String {
    let with_colons = path
        .split('/')
        .map(|segment| {
            if segment.starts_with(':') {
                format!("{{{}}}", &segment[1..])
            } else {
                segment.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("/");

    if with_colons.starts_with('/') {
        with_colons
    } else {
        format!("/{with_colons}")
    }
}

fn format_headers(headers: &[PostmanHeader]) -> Option<String> {
    let lines: Vec<String> = headers
        .iter()
        .filter(|header| !header.disabled.unwrap_or(false))
        .filter(|header| !header.key.trim().is_empty())
        .map(|header| format!("{}: {}", header.key.trim(), header.value.trim()))
        .collect();

    if lines.is_empty() {
        None
    } else {
        Some(lines.join("\n"))
    }
}

fn extract_body(request: &PostmanRequest) -> Option<String> {
    let body = request.body.as_ref()?;

    match body.mode.as_deref()? {
        "raw" => body.raw.clone().filter(|raw| !raw.trim().is_empty()),
        "urlencoded" => {
            let pairs: Vec<String> = body
                .urlencoded
                .iter()
                .filter(|entry| !entry.disabled.unwrap_or(false))
                .map(|entry| format!("{}={}", entry.key, entry.value))
                .collect();
            if pairs.is_empty() {
                None
            } else {
                Some(pairs.join("&"))
            }
        }
        _ => None,
    }
}

fn push_endpoint(endpoints: &mut Vec<SwaggerEndpoint>, endpoint: SwaggerEndpoint) {
    let key = (endpoint.method.clone(), endpoint.path.clone());
    if endpoints
        .iter()
        .any(|existing| (existing.method.clone(), existing.path.clone()) == key)
    {
        return;
    }
    endpoints.push(endpoint);
}

pub fn is_postman_json(content: &str) -> bool {
    let Ok(value) = serde_json::from_str::<Value>(content) else {
        return false;
    };

    let Some(info) = value.get("info") else {
        return false;
    };

    if info.get("_postman_id").is_some() {
        return true;
    }

    info.get("schema")
        .and_then(Value::as_str)
        .is_some_and(|schema| schema.contains("postman.com/json/collection"))
}

#[cfg(test)]
mod tests {
    use super::*;

    const MINIMAL_COLLECTION: &str = r#"{
  "info": {
    "name": "Demo API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Users",
      "item": [
        {
          "name": "List users",
          "request": {
            "method": "GET",
            "header": [{ "key": "Accept", "value": "application/json" }],
            "url": {
              "raw": "https://api.example.com/users?limit=10",
              "host": ["api", "example", "com"],
              "path": ["users"],
              "query": [{ "key": "limit" }]
            }
          }
        },
        {
          "name": "Create user",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Ada\"\n}"
            },
            "url": "https://api.example.com/users"
          }
        }
      ]
    }
  ]
}"#;

    #[test]
    fn parses_postman_collection_v2_1() {
        let project = parse_postman_content(MINIMAL_COLLECTION).expect("parse postman");

        assert_eq!(project.title, "Demo API");
        assert_eq!(project.endpoints.len(), 2);

        let list = project
            .endpoints
            .iter()
            .find(|e| e.method == "GET")
            .expect("list");
        assert_eq!(list.path, "/users");
        assert_eq!(list.query_params, vec!["limit"]);
        assert_eq!(
            list.summary.as_deref(),
            Some("Users / List users")
        );
        assert_eq!(
            list.default_headers.as_deref(),
            Some("Accept: application/json")
        );

        let create = project
            .endpoints
            .iter()
            .find(|e| e.method == "POST")
            .expect("create");
        assert!(create.default_body.as_ref().unwrap().contains("Ada"));
        assert_eq!(
            create.default_headers.as_deref(),
            Some("Content-Type: application/json")
        );
    }

    #[test]
    fn detects_postman_json() {
        assert!(is_postman_json(MINIMAL_COLLECTION));
        assert!(!is_postman_json(r#"{"openapi":"3.0.0"}"#));
    }

    #[test]
    fn detects_postman_by_postman_id() {
        const JSON: &str = r#"{
  "info": {
    "_postman_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "name": "ID Collection"
  },
  "item": [{
    "name": "Ping",
    "request": {
      "method": "GET",
      "url": "https://api.example.com/ping"
    }
  }]
}"#;

        assert!(is_postman_json(JSON));
        let project = parse_postman_content(JSON).expect("parse by _postman_id");
        assert_eq!(project.title, "ID Collection");
        assert_eq!(project.endpoints[0].path, "/ping");
    }

    #[test]
    fn ignores_body_when_mode_is_not_raw() {
        const JSON: &str = r#"{
  "info": {
    "name": "Body modes",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [{
    "name": "Form",
    "request": {
      "method": "POST",
      "body": { "mode": "formdata", "raw": "ignored" },
      "url": "https://api.example.com/form"
    }
  }]
}"#;

        let project = parse_postman_content(JSON).expect("parse");
        assert!(project.endpoints[0].default_body.is_none());
    }
}
