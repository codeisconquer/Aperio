# Sprint-Backlog — Aperio MVP

All twelve sprints are **complete**, covered by automated tests (Vitest, `cargo test`, Playwright E2E), and validated in CI. This document records the delivery history for the initial public release **v0.1.0**.

**Status:** ✅ MVP ready for GitHub release

---

## Sprint 1: Das Fundament (Tauri + React + Tailwind)

- [x] Initialisiere eine neue Tauri-App mit React und TypeScript (`npm create tauri-app@latest`). — **Getestet**
- [x] Integriere Tailwind CSS und die Farbpalette aus `VISION.md`. — **Getestet**
- [x] Drei-Spalten-Grundlayout (Sidebar | Builder | Response). — **Getestet (E2E)**
- [x] i18n (DE/EN) via `i18next`. — **Getestet**

## Sprint 2: Core HTTP-Engine & IPC

- [x] Tauri-Command `send_request` mit `reqwest`. — **Getestet (Rust + E2E)**
- [x] Send-Button im Frontend angebunden. — **Getestet**
- [x] Antwort im Response-Viewer (Status, Dauer, Body). — **Getestet**

## Sprint 3: SQLite Historie

- [x] Tabelle `history` und automatisches Logging. — **Getestet (Rust)**
- [x] Command `get_history` (letzte 50 Einträge). — **Getestet**
- [x] Historie in der Sidebar mit Restore. — **Getestet**

## Sprint 4: Swagger/OpenAPI-Projekträume

- [x] `openapiv3` und `import_swagger_file`. — **Getestet (Rust)**
- [x] Projekträume in der Sidebar. — **Getestet**

## Sprint 5: Verschlüsselter Token-Tresor

- [x] `keyring` + AES-GCM, Tabelle `secure_tokens`. — **Getestet (Rust)**
- [x] Commands zum Speichern/Laden von Tokens. — **Getestet**
- [x] Schloss-Icon und Vault-Modal pro Projekt. — **Getestet**

## Sprint 6: CLI-Integration & Workspace-Export

- [x] `tauri-plugin-cli` und `cli-import`-Event. — **Getestet**
- [x] `export_workspace` / `import_workspace`. — **Getestet (Rust)**
- [x] Export/Import in den UI-Einstellungen. — **Getestet**

## Sprint 7: Testabdeckung

- [x] Vitest + RTL (`LanguageSwitcher`, `RequestBuilder`). — **Getestet (CI)**
- [x] Rust-Tests (HTTP, SQLite, Swagger, cURL). — **Getestet (CI)**
- [x] Wiremock-HTTP-Mocks. — **Getestet**

## Sprint 8: Build-Skripte & CI/CD

- [x] `build-mac.sh` für lokale macOS-Builds. — **Getestet**
- [x] `.github/workflows/release.yml` (Tag → Multi-Platform-Release). — **Getestet (Konfiguration)**
- [x] README Build-Anleitung für macOS, Windows, Linux. — **Getestet**
- [x] `.github/workflows/ci.yml` für PRs. — **Getestet (CI)**

## Sprint 9: cURL/Code-Werkzeuge

- [x] Rust-Parser `parse_curl_command` + Unit-Tests. — **Getestet**
- [x] cURL-Import-Modal im Builder. — **Getestet (E2E)**
- [x] Export cURL/wget + Go/Rust-Snippets. — **Getestet**

## Sprint 10: UI/UX Polish

- [x] Response-Body kopieren mit Feedback. — **Getestet**
- [x] Collapsible JSON Tree. — **Getestet**
- [x] Header/Query-Tabellen mit Inline-Löschen. — **Getestet**
- [x] Sidebar-Transitions. — **Getestet**

## Sprint 11: Environments

- [x] SQLite-Tabelle `environments`. — **Getestet (Rust)**
- [x] Umgebungs-Dropdown und Key-Value-Modal. — **Getestet**
- [x] `{{variable}}`-Substitution vor `send_request`. — **Getestet (Unit)**
- [x] Cyan-Hervorhebung im Builder. — **Getestet**

## Sprint 12: E2E Automation

- [x] Playwright-Setup (Vite + Tauri-IPC-Mock, headless). — **Getestet**
- [x] E2E: Layout, cURL-Import, Senden, Status 200. — **Getestet (CI)**
- [x] `npm run test:e2e` und CI-Integration. — **Getestet**

---

## Release checklist (v0.1.0)

- [x] Feature-complete MVP (Sprints 1–12)
- [x] `npm run build`, `npm test`, `npm run test:e2e`, `cargo test`
- [x] `README.md`, `CHANGELOG.md`, Release-Workflow dokumentiert
- [ ] Git-Tag `v0.1.0` pushen → GitHub Release-Artefakte
