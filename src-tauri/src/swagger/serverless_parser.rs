use serde_yaml::Value;
use uuid::Uuid;

use super::{extract_path_params, SwaggerEndpoint, SwaggerProject};

const HTTP_EVENT_KEYS: &[&str] = &["http", "httpApi"];

pub fn parse_serverless_content(content: &str) -> Result<SwaggerProject, String> {
    let doc: Value =
        serde_yaml::from_str(content).map_err(|e| format!("Invalid serverless YAML: {e}"))?;

    if !doc.get("functions").is_some() {
        return Err("Not a serverless.yml: missing top-level 'functions' block".into());
    }

    let title = doc
        .get("service")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .unwrap_or("Serverless API")
        .to_string();

    let version = doc
        .get("frameworkVersion")
        .or_else(|| doc.get("provider").and_then(|p| p.get("version")))
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| "1.0.0".to_string());

    let base_url = extract_base_url(&doc);

    let mut endpoints = Vec::new();
    if let Some(functions) = doc.get("functions").and_then(Value::as_mapping) {
        for (function_name, function_def) in functions {
            let Some(name) = function_name.as_str() else {
                continue;
            };
            collect_function_endpoints(name, function_def, &mut endpoints);
        }
    }

    if endpoints.is_empty() {
        return Err("No HTTP or HTTP API events found in serverless functions".into());
    }

    Ok(SwaggerProject {
        id: Uuid::new_v4().to_string(),
        title,
        version,
        base_url,
        endpoints,
    })
}

fn extract_base_url(doc: &Value) -> Option<String> {
    doc.get("provider")
        .and_then(|provider| {
            provider
                .get("environment")
                .and_then(|env| env.get("API_URL").or_else(|| env.get("BASE_URL")))
                .or_else(|| provider.get("endpoint"))
        })
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|url| !url.is_empty())
        .map(str::to_string)
}

fn collect_function_endpoints(function_name: &str, function_def: &Value, endpoints: &mut Vec<SwaggerEndpoint>) {
    let Some(events) = function_def.get("events").and_then(Value::as_sequence) else {
        return;
    };

    for event in events {
        collect_event_endpoints(function_name, event, endpoints);
    }
}

fn collect_event_endpoints(function_name: &str, event: &Value, endpoints: &mut Vec<SwaggerEndpoint>) {
    let Some(mapping) = event.as_mapping() else {
        return;
    };

    for (key, config) in mapping {
        let Some(event_type) = key.as_str() else {
            continue;
        };
        if !HTTP_EVENT_KEYS
            .iter()
            .any(|allowed| event_type.eq_ignore_ascii_case(allowed))
        {
            continue;
        }

        if let Some(endpoint) = http_config_to_endpoint(function_name, config) {
            push_endpoint(endpoints, endpoint);
        }
    }
}

fn http_config_to_endpoint(function_name: &str, config: &Value) -> Option<SwaggerEndpoint> {
    let path = config
        .get("path")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())?;

    let method = config
        .get("method")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("get");

    let path = normalize_path(path);
    let method_upper = method.to_ascii_uppercase();

    Some(SwaggerEndpoint {
        method: method_upper,
        path: path.clone(),
        summary: Some(function_name.to_string()),
        description: None,
        default_body: None,
        default_headers: None,
        path_params: extract_path_params(&path),
        query_params: Vec::new(),
    })
}

fn normalize_path(path: &str) -> String {
    if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{path}")
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

#[cfg(test)]
mod tests {
    use super::*;

    const STANDARD_SERVERLESS: &str = r#"
service: users-api
frameworkVersion: '3'
provider:
  name: aws
  runtime: nodejs18.x
  stage: dev
  region: us-east-1
functions:
  listUsers:
    handler: src/handlers.list
    events:
      - http:
          path: users
          method: get
  createUser:
    handler: src/handlers.create
    events:
      - httpApi:
          path: /users
          method: post
  getUser:
    handler: src/handlers.get
    events:
      - http:
          path: users/{id}
          method: get
  ignoredJob:
    handler: src/handlers.job
    events:
      - schedule: rate(1 hour)
"#;

    #[test]
    fn parses_standard_serverless_yml() {
        let project = parse_serverless_content(STANDARD_SERVERLESS).expect("parse serverless");

        assert_eq!(project.title, "users-api");
        assert_eq!(project.version, "3");
        assert_eq!(project.endpoints.len(), 3);

        let list = project
            .endpoints
            .iter()
            .find(|e| e.summary.as_deref() == Some("listUsers"))
            .expect("listUsers");
        assert_eq!(list.method, "GET");
        assert_eq!(list.path, "/users");

        let create = project
            .endpoints
            .iter()
            .find(|e| e.summary.as_deref() == Some("createUser"))
            .expect("createUser");
        assert_eq!(create.method, "POST");
        assert_eq!(create.path, "/users");

        let get = project
            .endpoints
            .iter()
            .find(|e| e.summary.as_deref() == Some("getUser"))
            .expect("getUser");
        assert_eq!(get.path, "/users/{id}");
        assert_eq!(get.path_params, vec!["id"]);
    }

    #[test]
    fn rejects_yaml_without_functions() {
        let err = parse_serverless_content("service: x\nprovider:\n  name: aws").unwrap_err();
        assert!(err.contains("functions"));
    }
}
