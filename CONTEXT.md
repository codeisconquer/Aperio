# Technischer Kontext & Architektur

Dieses Dokument beschreibt die technische Architektur von Aperio für den KI-Entwicklungs-Agenten.

## Tech-Stack
- **Frontend-Framework:** React (Vite-Setup) mit TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Desktop-Shell:** Tauri v2 (Rust-Basis)
- **Lokaler Speicher:** SQLite (über Rust `rusqlite` oder Tauri-Plugin-SQL)
- **Kryptographie:** Rust-seitige Verschlüsselung via `aes-gcm` oder `chacha20poly1305`. Der Master-Key wird über das Rust-Crate `keyring` sicher im OS-Tresor (Windows Credential Manager / macOS Keychain) abgelegt.
- **HTTP-Client:** Rust-seitiges Absenden der Requests via `reqwest`.

## System-Architektur & IPC-Schnittstelle
Das React-Frontend ist eine reine, zustandslose UI-Schicht. Jede kritische Logik (Netzwerkverkehr, Filesystem-IO, Krypto, DB) wird an das Rust-Backend via Tauri-Commands delegiert.

┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React + Vite)                   │
│  - Drei-Spalten-Layout (Sidebar | Builder | Response)          │
│  - i18n Internationalisierung (DE/EN)                           │
└────────────────────────────────┬────────────────────────────────┘
│
Tauri IPC (Commands)
│
┌────────────────────────────────▼────────────────────────────────┐
│                       BACKEND (Rust Core)                       │
│  - send_request: Führt HTTP-Calls asynchron via reqwest aus   │
│  - sqlite: Verwaltet die lokale Historie                     │
│  - crypto: Ver- und entschlüsselt Tokens transparent          │
│  - openapiv3: Parsed Swagger-YAMLs in UI-Strukturen           │
│  - curl_import / curl_export: cURL-Import & Multi-Format-Export │
└─────────────────────────────────────────────────────────────────┘


## Datenstrukturen (Rust <-> TS)
Die Kommunikation erfolgt über serialisiertes JSON. Wichtigste Core-Strukturen:

```rust
pub struct HttpResponse {
    status: u16,
    body: String,
    headers: HashMap<String, String>,
    duration_ms: u128,
}

pub struct HistoryEntry {
    id: String,
    timestamp: String,
    method: String,
    url: String,
    status: u16,
}
```

## CLI-Schnittstelle
Aperio nutzt das offizielle Tauri-CLI-Plugin. Beim Starten über das Terminal mit einem Dateipfad (z. B. `aperio ./api.yaml`) wird die Datei im Rust-Core validiert, geparst und per Tauri-Event (`cli-import`) an das React-Frontend übergeben, welches den Swagger-Projektraum automatisch öffnet.

## Umgebungen (Environments)
- SQLite-Tabelle `environments` speichert benannte Variablen-Sets als JSON-Objekt.
- Tauri-Commands: `get_environments`, `save_environment_cmd`, `delete_environment_cmd`.
- Vor dem Senden ersetzt das Frontend Platzhalter `{{variable_name}}` in URL, Headern und Body durch Werte der aktiven Umgebung.
- Die aktive Umgebung wird in `localStorage` gemerkt; der Builder hebt Platzhalter visuell hervor.

## cURL- & Code-Export
Der Request-Builder unterstützt den bidirektionalen Austausch mit der Shell und anderen Stacks:

- **Import:** `parse_curl_command` parst cURL-Strings (inkl. Chrome DevTools) und befüllt Methode, URL, Header und Body.
- **Export:** `export_request_commands_cmd` erzeugt parallel:
  - Shell: **cURL**, **wget** (POSIX-escaped, terminaltauglich)
  - Code: **Go** (`net/http`) und **Rust** (`reqwest`, async/`tokio`)
- Die UI bietet Schnellkopie für cURL/wget sowie ein Tab-Modal für alle vier Export-Formate.

## Test-Strategie
- **Backend:** Native Rust Unit-Tests + `wiremock` für HTTP-Simulationen.
- **Frontend:** Vitest + React Testing Library für Komponenten-Tests.
- **E2E:** Playwright gegen den Vite-Dev-Server (`http://localhost:1420`) mit Tauri-IPC-Mock (`e2e/tauri-mock.ts`) für stabile headless-Läufe in CI; natives Desktop-WebDriver optional über `tauri-driver` (Linux/Windows).
- **CI/CD:** GitHub Actions automatisiert Unit-, E2E- und Rust-Tests bei jedem Pull Request.