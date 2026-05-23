use serde::{Deserialize, Serialize};

use super::parse_headers;

#[derive(Debug, Clone, Deserialize)]
pub struct ExportRequestPayload {
    pub method: String,
    pub url: String,
    pub headers: String,
    pub body: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ExportCommands {
    pub curl: String,
    pub wget: String,
    pub go: String,
    pub rust: String,
}

/// Escapes a string for safe use inside POSIX single-quoted shell arguments.
pub fn shell_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

pub fn generate_curl(payload: &ExportRequestPayload) -> Result<String, String> {
    let url = payload.url.trim();
    if url.is_empty() {
        return Err("URL is required".into());
    }

    let method = payload.method.trim().to_uppercase();
    let headers = parse_headers(&payload.headers)?;
    let body = payload.body.trim();

    let mut lines = vec![format!("curl {}", shell_single_quote(url))];

    if method != "GET" {
        lines.push(format!("  -X {}", method));
    }

    let mut header_pairs: Vec<_> = headers.into_iter().collect();
    header_pairs.sort_by(|a, b| a.0.to_ascii_lowercase().cmp(&b.0.to_ascii_lowercase()));

    for (name, value) in header_pairs {
        let header = format!("{name}: {value}");
        lines.push(format!("  -H {}", shell_single_quote(&header)));
    }

    if !body.is_empty() {
        lines.push(format!("  --data-raw {}", shell_single_quote(body)));
    }

    Ok(lines.join(" \\\n"))
}

pub fn generate_wget(payload: &ExportRequestPayload) -> Result<String, String> {
    let url = payload.url.trim();
    if url.is_empty() {
        return Err("URL is required".into());
    }

    let method = payload.method.trim().to_uppercase();
    let headers = parse_headers(&payload.headers)?;
    let body = payload.body.trim();

    let mut lines = vec!["wget".to_string()];

    if method != "GET" {
        lines.push(format!("  --method={}", method));
    }

    let mut header_pairs: Vec<_> = headers.into_iter().collect();
    header_pairs.sort_by(|a, b| a.0.to_ascii_lowercase().cmp(&b.0.to_ascii_lowercase()));

    for (name, value) in header_pairs {
        let header = format!("{name}: {value}");
        lines.push(format!("  --header={}", shell_single_quote(&header)));
    }

    if !body.is_empty() {
        lines.push(format!("  --body-data={}", shell_single_quote(body)));
    }

    lines.push(format!("  {}", shell_single_quote(url)));

    Ok(lines.join(" \\\n"))
}

pub fn export_request_commands(payload: &ExportRequestPayload) -> Result<ExportCommands, String> {
    Ok(ExportCommands {
        curl: generate_curl(payload)?,
        wget: generate_wget(payload)?,
        go: super::code_snippets::generate_go(payload)?,
        rust: super::code_snippets::generate_rust_reqwest(payload)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_post_payload() -> ExportRequestPayload {
        ExportRequestPayload {
            method: "POST".into(),
            url: "https://api.example.com/items".into(),
            headers: r#"{"Content-Type":"application/json","Accept":"application/json"}"#
                .into(),
            body: r#"{"name":"O'Brien"}"#.into(),
        }
    }

    #[test]
    fn shell_single_quote_escapes_apostrophes() {
        assert_eq!(shell_single_quote("it's"), "'it'\\''s'");
    }

    #[test]
    fn generates_simple_get_curl() {
        let cmd = generate_curl(&ExportRequestPayload {
            method: "GET".into(),
            url: "https://api.example.com/health".into(),
            headers: String::new(),
            body: String::new(),
        })
        .expect("curl");

        assert_eq!(cmd, "curl 'https://api.example.com/health'");
        assert!(!cmd.contains("-X"));
    }

    #[test]
    fn generates_post_curl_with_escaped_body() {
        let cmd = generate_curl(&sample_post_payload()).expect("curl");

        assert!(cmd.starts_with("curl 'https://api.example.com/items'"));
        assert!(cmd.contains("  -X POST"));
        assert!(cmd.contains("  -H 'Accept: application/json'"));
        assert!(cmd.contains("  -H 'Content-Type: application/json'"));
        assert!(cmd.contains("  --data-raw '{\"name\":\"O'\\''Brien\"}'"));
    }

    #[test]
    fn generates_post_wget_with_escaped_body() {
        let cmd = generate_wget(&sample_post_payload()).expect("wget");

        assert!(cmd.starts_with("wget"));
        assert!(cmd.contains("  --method=POST"));
        assert!(cmd.contains("  --header='Content-Type: application/json'"));
        assert!(cmd.contains("  --body-data='{\"name\":\"O'\\''Brien\"}'"));
        assert!(cmd.contains("  'https://api.example.com/items'"));
    }

    #[test]
    fn roundtrip_curl_import_export() {
        let original = ExportRequestPayload {
            method: "POST".into(),
            url: "https://api.example.com/items".into(),
            headers: r#"{"Content-Type":"application/json"}"#.into(),
            body: r#"{"name":"Aperio"}"#.into(),
        };
        let curl = generate_curl(&original).expect("export");
        let parsed = super::super::curl_import::parse_curl(&curl).expect("import");

        assert_eq!(parsed.method, "POST");
        assert_eq!(parsed.url, original.url);
        assert_eq!(
            parsed.headers.get("Content-Type").map(String::as_str),
            Some("application/json")
        );
        assert_eq!(parsed.body.as_deref(), Some(original.body.as_str()));
    }

    #[test]
    fn rejects_missing_url() {
        let err = generate_curl(&ExportRequestPayload {
            method: "GET".into(),
            url: "  ".into(),
            headers: String::new(),
            body: String::new(),
        })
        .unwrap_err();
        assert!(err.contains("URL"));
    }
}
