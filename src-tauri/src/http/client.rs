use reqwest::Client;

/// Default User-Agent for all outbound HTTP requests (required by GitHub raw/API URLs).
const USER_AGENT: &str =
    "AperioAPIClient/1.0.0 (https://github.com/codeisconquer/Aperio)";

pub fn build_http_client() -> Result<Client, String> {
    Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))
}
