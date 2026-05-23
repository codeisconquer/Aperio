use std::collections::HashMap;

use serde::Serialize;

/// Parsed representation of a cURL command suitable for the request builder.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ParsedCurlRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
}

/// Parses a cURL command string (including Chrome DevTools exports) into request fields.
pub fn parse_curl(curl_string: &str) -> Result<ParsedCurlRequest, String> {
    let normalized = normalize_curl_input(curl_string)?;
    let tokens = tokenize(&normalized);
    if tokens.is_empty() {
        return Err("Empty cURL command".into());
    }

    let mut method: Option<String> = None;
    let mut url: Option<String> = None;
    let mut headers = HashMap::new();
    let mut body: Option<String> = None;

    let mut i = 0;
    while i < tokens.len() {
        match tokens[i].as_str() {
            "-X" | "--request" => {
                i += 1;
                method = Some(next_token(&tokens, &mut i)?);
            }
            "-H" | "--header" => {
                i += 1;
                insert_header(&next_token(&tokens, &mut i)?, &mut headers)?;
            }
            "-d" | "--data" | "--data-raw" | "--data-binary" | "--data-urlencode" => {
                i += 1;
                body = Some(next_token(&tokens, &mut i)?);
            }
            "--url" => {
                i += 1;
                url = Some(next_token(&tokens, &mut i)?);
            }
            "-I" | "--head" => {
                method = Some("HEAD".into());
                i += 1;
            }
            "-G" | "--get" => {
                method = Some("GET".into());
                i += 1;
            }
            "-u" | "--user" => {
                i += 1;
                let credentials = next_token(&tokens, &mut i)?;
                let encoded = base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD,
                    credentials.as_bytes(),
                );
                headers.insert("Authorization".into(), format!("Basic {encoded}"));
            }
            flag if flag.starts_with('-') => {
                i += skip_optional_flag_value(&tokens, i);
            }
            token if is_url(token) => {
                if url.is_none() {
                    url = Some(token.to_string());
                }
                i += 1;
            }
            _ => {
                i += 1;
            }
        }
    }

    let url = url.ok_or_else(|| "URL not found in cURL command".to_string())?;
    let method = method.unwrap_or_else(|| {
        if body.is_some() {
            "POST".to_string()
        } else {
            "GET".to_string()
        }
    });

    Ok(ParsedCurlRequest {
        method: method.to_uppercase(),
        url,
        headers,
        body,
    })
}

fn normalize_curl_input(input: &str) -> Result<String, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("cURL command is empty".into());
    }

    let without_continuations = remove_line_continuations(trimmed);
    let mut s = without_continuations.trim().to_string();

    if let Some(rest) = s.strip_prefix("curl ") {
        s = rest.to_string();
    } else if let Some(rest) = s.strip_prefix("curl\t") {
        s = rest.to_string();
    } else if s == "curl" {
        return Err("cURL command is empty".into());
    }

    Ok(preprocess_glued_flags(&s))
}

fn remove_line_continuations(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        if chars[i] == '\\' {
            if i + 1 < chars.len() && chars[i + 1] == '\n' {
                i += 2;
                continue;
            }
            if i + 2 < chars.len() && chars[i + 1] == '\r' && chars[i + 2] == '\n' {
                i += 3;
                continue;
            }
        }
        out.push(chars[i]);
        i += 1;
    }

    out
}

/// Inserts spaces between short flags and glued values, e.g. `-XPOST` -> `-X POST`.
fn preprocess_glued_flags(input: &str) -> String {
    let mut out = String::with_capacity(input.len() + 16);
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        if chars[i] == '-' && i + 1 < chars.len() {
            let start = i;
            i += 1;
            while i < chars.len() && chars[i].is_ascii_alphanumeric() {
                i += 1;
            }
            let flag: String = chars[start..i].iter().collect();

            if flag.starts_with("-X")
                && flag.len() > 2
                && !flag.starts_with("--")
                && flag[2..].chars().all(|c| c.is_ascii_alphanumeric())
            {
                out.push_str("-X ");
                out.push_str(&flag[2..]);
                continue;
            }

            if is_known_flag_with_value(&flag) && i < chars.len() && !chars[i].is_whitespace() {
                out.push_str(&flag);
                out.push(' ');
                continue;
            }

            out.push_str(&flag);
            continue;
        }

        out.push(chars[i]);
        i += 1;
    }

    out
}

fn is_known_flag_with_value(flag: &str) -> bool {
    matches!(
        flag,
        "-X" | "-H" | "-d" | "-u" | "--request"
            | "--header"
            | "--data"
            | "--data-raw"
            | "--data-binary"
            | "--data-urlencode"
            | "--url"
            | "--user"
    )
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum QuoteMode {
    None,
    Single,
    Double,
}

fn tokenize(input: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut quote = QuoteMode::None;
    let mut chars = input.chars().peekable();

    while let Some(c) = chars.next() {
        match quote {
            QuoteMode::None => {
                if c.is_whitespace() {
                    if !current.is_empty() {
                        tokens.push(std::mem::take(&mut current));
                    }
                } else if c == '"' {
                    quote = QuoteMode::Double;
                } else if c == '\'' {
                    quote = QuoteMode::Single;
                } else {
                    current.push(c);
                }
            }
            QuoteMode::Double => {
                if c == '\\' {
                    if let Some(next) = chars.next() {
                        current.push(next);
                    }
                } else if c == '"' {
                    quote = QuoteMode::None;
                } else {
                    current.push(c);
                }
            }
            QuoteMode::Single => {
                if c == '\'' {
                    quote = QuoteMode::None;
                } else {
                    current.push(c);
                }
            }
        }
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    tokens
}

fn next_token(tokens: &[String], index: &mut usize) -> Result<String, String> {
    let value = tokens
        .get(*index)
        .ok_or_else(|| format!("Missing value for flag at position {}", *index))?;
    *index += 1;
    Ok(value.clone())
}

fn insert_header(raw: &str, headers: &mut HashMap<String, String>) -> Result<(), String> {
    let Some((name, value)) = raw.split_once(':') else {
        return Err(format!("Invalid header format: {raw}"));
    };
    headers.insert(name.trim().to_string(), value.trim().to_string());
    Ok(())
}

fn is_url(token: &str) -> bool {
    let lower = token.to_ascii_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

/// Skips one token when the flag commonly accepts a value; otherwise only the flag.
fn skip_optional_flag_value(tokens: &[String], index: usize) -> usize {
    let Some(next) = tokens.get(index + 1) else {
        return 1;
    };

    if next.starts_with('-') || is_url(next) {
        return 1;
    }

    2
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_simple_get() {
        let parsed = parse_curl("curl https://api.example.com/health").expect("parse");
        assert_eq!(parsed.method, "GET");
        assert_eq!(parsed.url, "https://api.example.com/health");
        assert!(parsed.headers.is_empty());
        assert!(parsed.body.is_none());
    }

    #[test]
    fn parses_get_with_headers() {
        let parsed = parse_curl(
            r#"curl -H "Accept: application/json" -H "X-Api-Key: secret" https://api.example.com/items"#,
        )
        .expect("parse");

        assert_eq!(parsed.method, "GET");
        assert_eq!(parsed.url, "https://api.example.com/items");
        assert_eq!(
            parsed.headers.get("Accept").map(String::as_str),
            Some("application/json")
        );
        assert_eq!(
            parsed.headers.get("X-Api-Key").map(String::as_str),
            Some("secret")
        );
    }

    #[test]
    fn parses_post_with_json_body() {
        let parsed = parse_curl(
            r#"curl -X POST https://api.example.com/items -H "Content-Type: application/json" -d '{"name":"Aperio"}'"#,
        )
        .expect("parse");

        assert_eq!(parsed.method, "POST");
        assert_eq!(parsed.url, "https://api.example.com/items");
        assert_eq!(
            parsed.headers.get("Content-Type").map(String::as_str),
            Some("application/json")
        );
        assert_eq!(parsed.body.as_deref(), Some(r#"{"name":"Aperio"}"#));
    }

    #[test]
    fn infers_post_from_data_flag() {
        let parsed =
            parse_curl(r#"curl https://api.example.com/items -d "payload=test""#).expect("parse");

        assert_eq!(parsed.method, "POST");
        assert_eq!(parsed.body.as_deref(), Some("payload=test"));
    }

    #[test]
    fn parses_data_raw_flag() {
        let parsed = parse_curl(
            r#"curl 'https://api.example.com/items' --data-raw '{"enabled":true}'"#,
        )
        .expect("parse");

        assert_eq!(parsed.method, "POST");
        assert_eq!(parsed.body.as_deref(), Some(r#"{"enabled":true}"#));
    }

    #[test]
    fn parses_line_continuations() {
        let parsed = parse_curl(
            r"curl https://api.example.com/items \
  -H 'Accept: application/json' \
  -d 'ok'",
        )
        .expect("parse");

        assert_eq!(parsed.method, "POST");
        assert_eq!(parsed.url, "https://api.example.com/items");
        assert_eq!(
            parsed.headers.get("Accept").map(String::as_str),
            Some("application/json")
        );
        assert_eq!(parsed.body.as_deref(), Some("ok"));
    }

    #[test]
    fn parses_chrome_devtools_multiline() {
        let parsed = parse_curl(
            "curl 'https://api.example.com/v1/users' \\\n  -H 'accept: application/json' \\\n  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' \\\n  -H 'content-type: application/json' \\\n  --data-raw '{\"email\":\"dev@example.com\"}'",
        )
        .expect("parse");

        assert_eq!(parsed.method, "POST");
        assert_eq!(parsed.url, "https://api.example.com/v1/users");
        assert_eq!(
            parsed.headers.get("accept").map(String::as_str),
            Some("application/json")
        );
        assert!(parsed.headers.contains_key("authorization"));
        assert_eq!(
            parsed.headers.get("content-type").map(String::as_str),
            Some("application/json")
        );
        assert_eq!(
            parsed.body.as_deref(),
            Some(r#"{"email":"dev@example.com"}"#)
        );
    }

    #[test]
    fn parses_explicit_put_method() {
        let parsed = parse_curl(
            r#"curl --request PUT 'https://api.example.com/items/42' --data-raw '{"done":true}'"#,
        )
        .expect("parse");

        assert_eq!(parsed.method, "PUT");
        assert_eq!(parsed.url, "https://api.example.com/items/42");
        assert_eq!(parsed.body.as_deref(), Some(r#"{"done":true}"#));
    }

    #[test]
    fn parses_glued_method_flag() {
        let parsed = parse_curl("curl -XDELETE https://api.example.com/items/1").expect("parse");
        assert_eq!(parsed.method, "DELETE");
        assert_eq!(parsed.url, "https://api.example.com/items/1");
    }

    #[test]
    fn parses_head_request() {
        let parsed = parse_curl("curl -I https://api.example.com/status").expect("parse");
        assert_eq!(parsed.method, "HEAD");
        assert_eq!(parsed.url, "https://api.example.com/status");
    }

    #[test]
    fn parses_url_flag() {
        let parsed = parse_curl("curl --url https://api.example.com/ping -X GET").expect("parse");
        assert_eq!(parsed.method, "GET");
        assert_eq!(parsed.url, "https://api.example.com/ping");
    }

    #[test]
    fn parses_basic_auth_user_flag() {
        let parsed =
            parse_curl(r#"curl -u 'alice:secret' https://api.example.com/secure"#).expect("parse");

        assert_eq!(parsed.url, "https://api.example.com/secure");
        let auth = parsed.headers.get("Authorization").expect("auth header");
        assert!(auth.starts_with("Basic "));
        assert_ne!(auth, "Basic ");
    }

    #[test]
    fn rejects_missing_url() {
        let err = parse_curl("curl -H 'Accept: application/json'").unwrap_err();
        assert!(err.contains("URL not found"));
    }

    #[test]
    fn rejects_empty_command() {
        assert!(parse_curl("   ").is_err());
    }
}
