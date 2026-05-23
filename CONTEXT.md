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