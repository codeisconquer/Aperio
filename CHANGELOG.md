# Changelog

All notable changes to Aperio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.0] - 2026-05-23 — Initial MVP Release

First public MVP: a fast, local-first desktop API client with OpenAPI workspaces, secure tokens, and pro-grade request tooling.

### Added

- **Desktop shell** — Tauri v2 + React + TypeScript with a dark-first three-column layout (sidebar, request builder, response viewer) and German/English UI.
- **HTTP engine** — Rust `reqwest` backend with status, duration, formatted JSON body, and collapsible JSON tree in the response viewer.
- **Request history** — Automatic SQLite logging of sent requests; sidebar history with one-click restore.
- **OpenAPI workspaces** — Import Swagger/OpenAPI YAML or JSON as named project workspaces with endpoint navigation and per-project Bearer token injection.
- **Token vault** — AES-GCM encrypted tokens in SQLite; master key in the OS keychain (macOS Keychain / Windows Credential Manager).
- **CLI** — Open a spec at launch: `aperio ./api.yaml` (via Tauri CLI plugin and `cli-import` event).
- **Workspace backup** — Export/import of the local `aperio.db` from the settings panel.
- **cURL import** — Rust parser for DevTools-style cURL; modal import into the request builder.
- **Export toolkit** — Copy as cURL/wget; generate Go (`net/http`) and Rust (`reqwest`) snippets with a tabbed export modal.
- **Environments** — Named variable sets with `{{name}}` substitution in URL, headers, and body; cyan placeholder highlighting in the builder.
- **UI polish** — Key/value tables for headers and query params, response body copy, animated sidebar sections, environment selector in the sidebar.
- **Quality** — Vitest component tests, Rust unit/integration tests (wiremock, SQLite, OpenAPI, cURL), Playwright E2E in CI.
- **Release automation** — GitHub Actions builds for macOS (`.dmg`), Windows (`.msi`/`.exe`), and Linux (`.AppImage`/`.deb`) on version tags.

### Security

- API tokens are never stored in plaintext; encryption uses AES-GCM with a keychain-backed master key.

[Unreleased]: https://github.com/YOUR_ORG/aperio/compare/v0.1.0...HEAD
[v0.1.0]: https://github.com/YOUR_ORG/aperio/releases/tag/v0.1.0
