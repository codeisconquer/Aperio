mod client;
mod code_snippets;
mod curl_export;
mod curl_import;

pub use client::build_http_client;

use std::collections::HashMap;
use std::str::FromStr;
use std::time::Instant;

use reqwest::Client;
use reqwest::Method;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::database::{log_history_async, DbPool, HistoryInsert};
use crate::vault;

pub use curl_export::{export_request_commands, ExportCommands, ExportRequestPayload};
pub use curl_import::{parse_curl, ParsedCurlRequest};

#[tauri::command]
pub fn parse_curl_command(curl_string: String) -> Result<ParsedCurlRequest, String> {
    parse_curl(&curl_string)
}

#[tauri::command]
pub fn export_request_commands_cmd(
    payload: ExportRequestPayload,
) -> Result<ExportCommands, String> {
    export_request_commands(&payload)
}

#[derive(Debug, Clone, Deserialize)]
pub struct SendRequestPayload {
    pub method: String,
    pub url: String,
    pub headers: String,
    pub body: String,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct HttpResponse {
    pub status: u16,
    pub body: String,
    pub headers: HashMap<String, String>,
    pub duration_ms: u128,
}

pub fn parse_headers(raw: &str) -> Result<HashMap<String, String>, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(HashMap::new());
    }

    let parsed: HashMap<String, serde_json::Value> =
        serde_json::from_str(trimmed).map_err(|e| format!("Invalid headers JSON: {e}"))?;

    Ok(parsed
        .into_iter()
        .map(|(key, value)| {
            let header_value = match value {
                serde_json::Value::String(s) => s,
                other => other.to_string(),
            };
            (key, header_value)
        })
        .collect())
}

pub fn apply_project_auth(
    pool: &DbPool,
    project_id: Option<&str>,
    headers: &mut HashMap<String, String>,
) -> Result<(), String> {
    let Some(project_id) = project_id else {
        return Ok(());
    };

    if let Some(token) = vault::get_decrypted_token(pool, project_id)? {
        let has_authorization = headers
            .keys()
            .any(|name| name.eq_ignore_ascii_case("authorization"));
        if !has_authorization {
            headers.insert("Authorization".to_string(), format!("Bearer {token}"));
        }
    }

    Ok(())
}

pub async fn execute_http_request(
    client: &Client,
    method_str: &str,
    url_str: &str,
    headers: HashMap<String, String>,
    body_str: &str,
) -> Result<HttpResponse, String> {
    let method = Method::from_str(method_str.trim())
        .map_err(|_| format!("Unsupported HTTP method: {method_str}"))?;

    if url_str.trim().is_empty() {
        return Err("URL is required".into());
    }

    let mut request = client.request(method, url_str.trim());

    for (name, value) in headers {
        request = request.header(name, value);
    }

    if !body_str.trim().is_empty() {
        request = request.body(body_str.to_string());
    }

    let started = Instant::now();
    let response = request
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = response.status().as_u16();
    let response_headers = response
        .headers()
        .iter()
        .map(|(name, value)| {
            (
                name.to_string(),
                value.to_str().unwrap_or("").to_string(),
            )
        })
        .collect();

    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {e}"))?;

    Ok(HttpResponse {
        status,
        body,
        headers: response_headers,
        duration_ms: started.elapsed().as_millis(),
    })
}

#[tauri::command]
pub async fn send_request(
    pool: State<'_, DbPool>,
    payload: SendRequestPayload,
) -> Result<HttpResponse, String> {
    let method_str = payload.method.trim().to_string();
    let url_str = payload.url.trim().to_string();
    let headers_str = payload.headers.clone();
    let body_str = payload.body.clone();

    let mut headers = parse_headers(&headers_str)?;
    apply_project_auth(&pool, payload.project_id.as_deref(), &mut headers)?;

    let client = build_http_client()?;
    let http_response =
        execute_http_request(&client, &method_str, &url_str, headers, &body_str).await?;

    log_history_async(
        pool.inner().clone(),
        HistoryInsert {
            method: method_str,
            url: url_str,
            headers: headers_str,
            body: body_str,
            status_code: http_response.status,
            duration_ms: http_response.duration_ms,
        },
    );

    Ok(http_response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[test]
    fn parse_headers_accepts_json_object() {
        let headers = parse_headers(r#"{"X-Test": "value"}"#).expect("headers");
        assert_eq!(headers.get("X-Test").map(String::as_str), Some("value"));
    }

    #[test]
    fn parse_headers_rejects_invalid_json() {
        assert!(parse_headers("{invalid").is_err());
    }

    #[tokio::test]
    async fn execute_http_request_uses_mock_server() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/ping"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "ok": true
            })))
            .mount(&server)
            .await;

        let client = build_http_client().expect("http client");
        let response = execute_http_request(
            &client,
            "GET",
            &format!("{}/ping", server.uri()),
            HashMap::new(),
            "",
        )
        .await
        .expect("response");

        assert_eq!(response.status, 200);
        assert!(response.body.contains("\"ok\":true") || response.body.contains("\"ok\": true"));
    }
}
