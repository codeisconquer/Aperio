use std::collections::HashMap;

use super::curl_export::ExportRequestPayload;
use super::parse_headers;

fn sorted_headers(headers: HashMap<String, String>) -> Vec<(String, String)> {
    let mut pairs: Vec<_> = headers.into_iter().collect();
    pairs.sort_by(|a, b| a.0.to_ascii_lowercase().cmp(&b.0.to_ascii_lowercase()));
    pairs
}

/// JSON-encoded string literal safe for Go and Rust source.
fn quoted_literal(value: &str) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "\"\"".to_string())
}

pub fn generate_go(payload: &ExportRequestPayload) -> Result<String, String> {
    let url = payload.url.trim();
    if url.is_empty() {
        return Err("URL is required".into());
    }

    let method = payload.method.trim().to_uppercase();
    let headers = parse_headers(&payload.headers)?;
    let body = payload.body.trim();
    let header_pairs = sorted_headers(headers);

    let mut lines = vec![
        "package main".to_string(),
        String::new(),
        "import (".to_string(),
        "\t\"bytes\"".to_string(),
        "\t\"fmt\"".to_string(),
        "\t\"io\"".to_string(),
        "\t\"net/http\"".to_string(),
        ")".to_string(),
        String::new(),
        "func main() {".to_string(),
        format!("\turl := {}", quoted_literal(url)),
    ];

    if body.is_empty() {
        lines.push(format!(
            "\treq, err := http.NewRequest({}, url, nil)",
            quoted_literal(&method)
        ));
    } else {
        lines.push(format!("\tbody := []byte({})", quoted_literal(body)));
        lines.push(format!(
            "\treq, err := http.NewRequest({}, url, bytes.NewBuffer(body))",
            quoted_literal(&method)
        ));
    }

    lines.push("\tif err != nil {".to_string());
    lines.push("\t\tpanic(err)".to_string());
    lines.push("\t}".to_string());

    if header_pairs.is_empty() {
        lines.push(String::new());
    } else {
        lines.push(String::new());
        for (name, value) in header_pairs {
            lines.push(format!(
                "\treq.Header.Set({}, {})",
                quoted_literal(&name),
                quoted_literal(&value)
            ));
        }
    }

    lines.extend([
        String::new(),
        "\tclient := &http.Client{}".to_string(),
        "\tresp, err := client.Do(req)".to_string(),
        "\tif err != nil {".to_string(),
        "\t\tpanic(err)".to_string(),
        "\t}".to_string(),
        "\tdefer resp.Body.Close()".to_string(),
        String::new(),
        "\tresponseBody, err := io.ReadAll(resp.Body)".to_string(),
        "\tif err != nil {".to_string(),
        "\t\tpanic(err)".to_string(),
        "\t}".to_string(),
        String::new(),
        "\tfmt.Println(resp.Status)".to_string(),
        "\tfmt.Println(string(responseBody))".to_string(),
        "}".to_string(),
    ]);

    Ok(lines.join("\n"))
}

pub fn generate_rust_reqwest(payload: &ExportRequestPayload) -> Result<String, String> {
    let url = payload.url.trim();
    if url.is_empty() {
        return Err("URL is required".into());
    }

    let method = payload.method.trim().to_uppercase();
    let headers = parse_headers(&payload.headers)?;
    let body = payload.body.trim();
    let header_pairs = sorted_headers(headers);

    let mut lines = vec![
        "use reqwest::Client;".to_string(),
        String::new(),
        "#[tokio::main]".to_string(),
        "async fn main() -> Result<(), reqwest::Error> {".to_string(),
        "\tlet client = Client::new();".to_string(),
    ];

    let request_line = match method.as_str() {
        "GET" => format!("\tlet mut request = client.get({});", quoted_literal(url)),
        "POST" => format!("\tlet mut request = client.post({});", quoted_literal(url)),
        "PUT" => format!("\tlet mut request = client.put({});", quoted_literal(url)),
        "PATCH" => format!("\tlet mut request = client.patch({});", quoted_literal(url)),
        "DELETE" => format!("\tlet mut request = client.delete({});", quoted_literal(url)),
        "HEAD" => format!("\tlet mut request = client.head({});", quoted_literal(url)),
        _ => format!(
            "\tlet mut request = client.request(reqwest::Method::from_bytes({}.as_bytes()).expect(\"valid HTTP method\"), {});",
            quoted_literal(&method),
            quoted_literal(url)
        ),
    };
    lines.push(request_line);

    for (name, value) in header_pairs {
        lines.push(format!(
            "\trequest = request.header({}, {});",
            quoted_literal(&name),
            quoted_literal(&value)
        ));
    }

    if !body.is_empty() {
        lines.push(format!("\trequest = request.body({});", quoted_literal(body)));
    }

    lines.extend([
        String::new(),
        "\tlet response = request.send().await?;".to_string(),
        String::new(),
        "\tprintln!(\"{}\", response.status());".to_string(),
        "\tprintln!(\"{}\", response.text().await?);".to_string(),
        String::new(),
        "\tOk(())".to_string(),
        "}".to_string(),
    ]);

    Ok(lines.join("\n"))
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
            body: r#"{"name":"Aperio"}"#.into(),
        }
    }

    #[test]
    fn generates_go_post_snippet() {
        let code = generate_go(&sample_post_payload()).expect("go");
        assert!(code.contains("package main"));
        assert!(code.contains("http.NewRequest(\"POST\""));
        assert!(code.contains("req.Header.Set(\"Content-Type\""));
        assert!(code.contains("bytes.NewBuffer(body)"));
        assert!(code.contains("client.Do(req)"));
    }

    #[test]
    fn generates_rust_reqwest_post_snippet() {
        let code = generate_rust_reqwest(&sample_post_payload()).expect("rust");
        assert!(code.contains("#[tokio::main]"));
        assert!(code.contains("client.post("));
        assert!(code.contains(".header(\"Content-Type\""));
        assert!(code.contains(".body("));
        assert!(code.contains("request.send().await?"));
    }

    #[test]
    fn generates_go_get_without_body() {
        let code = generate_go(&ExportRequestPayload {
            method: "GET".into(),
            url: "https://api.example.com/health".into(),
            headers: String::new(),
            body: String::new(),
        })
        .expect("go");

        assert!(code.contains("http.NewRequest(\"GET\", url, nil)"));
        assert!(!code.contains("bytes.NewBuffer"));
    }
}
