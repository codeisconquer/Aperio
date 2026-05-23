# Technischer Kontext & Architektur

Dieses Dokument beschreibt die technische Architektur von Aperio für Entwickler und KI-Agenten.

## Tech-Stack

- **Frontend:** React (Vite) + TypeScript, Tailwind CSS 4, Lucide Icons, i18next (DE/EN)
- **Desktop-Shell:** Tauri v2
- **Lokaler Speicher:** SQLite via `rusqlite` + `r2d2` Connection Pool (`aperio.db` im App-Data-Verzeichnis)
- **Kryptographie:** AES-256-GCM (`aes-gcm`); Master-Key im OS-Keyring (`keyring` → macOS Keychain / Windows Credential Manager)
- **HTTP:** `reqwest` (async, `rustls-tls`), einheitlicher User-Agent `AperioAPIClient/1.0.0`
- **Spec-Parser:** `openapiv3`, `serde_yaml`, eigene Module `serverless_parser`, `postman_parser`

## System-Architektur

Das React-Frontend ist eine UI-Schicht. Netzwerk, Dateisystem, Krypto und DB laufen in Rust und werden per Tauri-Commands angesprochen.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                      │
│  Sidebar (Historie · Projekträume) | Builder | Response        │
└────────────────────────────┬────────────────────────────────────┘
                             │ Tauri IPC (invoke)
┌────────────────────────────▼────────────────────────────────────┐
│                      BACKEND (Rust Core)                        │
│  http::send_request      → reqwest + history (spawn_blocking)   │
│  swagger::import_*       → OpenAPI | Serverless | Postman       │
│  vault / crypto          → AES-GCM + keyring                    │
│  database / environments → SQLite                               │
│  workspace               → rusqlite backup (export/import .db)  │
│  curl_import / export    → Parser & Snippet-Generatoren         │
└─────────────────────────────────────────────────────────────────┘
```

Visuelle Abläufe: **[docs/diagrams/](docs/diagrams/)** (PlantUML).

## Workspace-Import (einheitliches Datenmodell)

Alle Formate werden zu `SwaggerProject` / `SwaggerEndpoint` normalisiert (JSON über IPC):

```rust
pub struct SwaggerProject {
    pub id: String,
    pub title: String,
    pub version: String,
    pub base_url: Option<String>,
    pub endpoints: Vec<SwaggerEndpoint>,
}

pub struct SwaggerEndpoint {
    pub method: String,
    pub path: String,
    pub summary: Option<String>,
    pub description: Option<String>,
    pub default_body: Option<String>,      // OpenAPI / Postman
    pub default_headers: Option<String>, // Postman
    pub path_params: Vec<String>,
    pub query_params: Vec<String>,
}
```

**Erkennung** (`detect_import_format` in `src-tauri/src/swagger/mod.rs`):

| Format | Signale |
|--------|---------|
| Postman | JSON + `info.schema` enthält `postman.com/json/collection` |
| Serverless | Dateiname `serverless.yml` oder YAML mit `service` + `functions` |
| OpenAPI | `openapi` / `swagger` Key oder Fallback für `.json`/`.yaml` |

**Commands:** `import_swagger_file`, `import_swagger_from_url`, CLI `parse_project_path` → Event `cli-import`.

## HTTP & Historie

- `send_request`: parst Header-JSON, optional Bearer aus `secure_tokens`, `reqwest`-Call, Rückgabe `HttpResponse`.
- Nach erfolgreichem Request: `log_history_async` → `tokio::spawn_blocking` → `INSERT INTO history`.
- `get_history`: letzte 50 Einträge für die Sidebar.

Siehe `docs/diagrams/request_flow.puml`.

## Token-Tresor

- Startup: `crypto::ensure_master_key()` lädt/erzeugt 32-Byte-Key im Keyring.
- `save_secure_token`: `encrypt(token)` → Base64(nonce ‖ ciphertext) in `secure_tokens`.
- `send_request` mit `project_id`: `get_decrypted_token` → `Authorization: Bearer …`.

Siehe `docs/diagrams/secure_token_vault.puml`.

## Datenhygiene & Löschen

| Daten | Speicherort | Entfernen |
|-------|-------------|-----------|
| Importierte Projekträume | React State (Session) | App neu starten |
| Request-Historie | SQLite `history` | Workspace-Import überschreibt DB |
| API-Token | SQLite `secure_tokens` | Vault-Modal → Remove |
| Umgebungen | SQLite `environments` | Environment-Modal → Delete |
| Builder-Zeilen | UI-State | Trash-Icon in KeyValueTable |

**Workspace-Backup:** `export_workspace` / `import_workspace` kopieren die gesamte `aperio.db` via `rusqlite::backup` (Historie, Tokens, Environments).

## Umgebungen (Environments)

- Tabelle `environments` mit JSON-Variablen.
- Commands: `get_environments`, `save_environment_cmd`, `delete_environment_cmd`.
- Frontend ersetzt `{{name}}` vor `send_request`; aktive ID in `localStorage`.

## cURL- & Code-Export

- `parse_curl_command` → Builder befüllen.
- `export_request_commands_cmd` → cURL, wget, Go, Rust.

## Test-Strategie

- **Rust:** `cargo test` — HTTP (wiremock), SQLite, Swagger/Serverless/Postman, cURL, Vault.
- **Frontend:** Vitest + RTL.
- **E2E:** Playwright + `e2e/tauri-mock.ts` (headless, kein natives WebView nötig).
- **CI:** `.github/workflows/ci.yml` (PRs), `release.yml` (Tags `v*`).

## Wichtige Pfade

| Pfad | Inhalt |
|------|--------|
| `src-tauri/src/swagger/` | Import-Router, OpenAPI, `serverless_parser.rs`, `postman_parser.rs` |
| `src-tauri/src/http/` | Request-Ausführung, cURL |
| `src-tauri/src/vault/` | Token-Persistenz |
| `src-tauri/src/workspace/` | DB-Backup Export/Import |
| `src/components/sidebar/` | Projekträume, Import-Modal |
| `docs/diagrams/*.puml` | Architektur-Sequenz-/Aktivitätsdiagramme |
