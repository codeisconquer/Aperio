# Changelog

All notable changes to Aperio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.2.2] - 2026-06-13 — Import wizard, themes & UX

### Added

- **Import wizard** — Multi-step overlay when importing a workspace: source → overview → configure default environment (`base_url` and variables) before finishing.
- **Variable tooltips** — Hover over `{{base_url}}` and other placeholders in URL, headers, and body to see the configured value from the active environment.
- **New request** — Sidebar button to start an empty ad-hoc request (manual entry or cURL import) without selecting a project endpoint.
- **Dark & light mode** — Theme toggle (moon/sun icons) in the sidebar footer; preference stored in `localStorage`.
- **App logo** — Sidebar header shows the Aperio logo instead of a generic icon.

### Changed

- **Contrast & readability** — Semantic theme tokens (`muted`, `subtle`, `panel`, `border`) replace low-contrast gray-on-navy text; improved legibility in both dark and light mode.
- **Project import** — `OpenApiImportModal` replaced by `WorkspaceImportWizard`; user-configured environment is applied on finish.

## [v0.2.1] - 2026-05-24 — URL field layout

### Fixed

- **Request URL field** — Input spans the full width of the bordered URL container (no nested narrow box).

## [v0.2.0] - 2026-05-24 — URL Preview, Export & Polish

### Added

- **URL preview toggle** — Switch next to the URL field between placeholders (`{{base_url}}/path`) and resolved values from environment and path variables.
- **Export snippets** — Python (`requests`) and Node.js (`fetch`) moved into the code-snippets modal alongside Go and Rust.
- **Template URLs for all OpenAPI servers** — Absolute `servers` URLs (e.g. `http://localhost:5510`) are stored as `{{base_url}}/path` so environments can switch hosts (Frontend vs. Backend).

### Changed

- **Bundle identifier** — `de.viebrocksoftware.aperio` (macOS app data and keychain paths).
- **Export** — cURL/wget quick copy and snippet export use resolved URLs (no remaining `{{placeholders}}`).
- **OpenAPI import** — Endpoints always use `{{base_url}}` when a server URL is defined; default environment still seeds `base_url`.

### Fixed

- **Request body editor** — JSON body text stays inside the input field (overlay alignment).
- **Clipboard copy** — Tauri clipboard permissions and clearer error placement in export UI.
- **Path params** — `{{base_url}}` is no longer mistaken for `{base_url}` path parameters.
- **Environment editor** — Edit/create environments inline in project settings (no hidden second modal).

## [v0.1.7] - 2026-05-25 — Base URL via Environments & Settings UX

### Added

- **OpenAPI base URL in environments** — On import, a default environment (e.g. „Standard“) is created with `base_url` from the OpenAPI `servers` section.
- **Smart endpoint URLs** — Relative server prefixes (`/api/v1`) use `{{base_url}}/path`; absolute servers (`https://…`) become complete URLs in the builder. Ad-hoc full URLs in the request field still work.
- **Inline environment editor** — Edit or create environments inside project settings; no second overlay behind the settings dialog.

### Changed

- Base URL is managed via environment variables instead of a separate field in project settings.
- Environment hints mention `base_url` and host configuration (e.g. `http://localhost:8080/api/v1`).

### Fixed

- Environment delete from the project settings list now persists to SQLite.
- URL validation accepts template URLs such as `{{base_url}}/connections`.

## [v0.1.6] - 2026-05-24 — Project Settings, Environments & UX

### Added

- **Project settings (gear menu)** — Per workspace: manage environments, auth token, copy workspace, remove workspace.
- **Project-scoped environments** — Variables belong to the active project; matching keys prefill path parameters (e.g. `username` → `{username}`).
- **Path-param highlighting** — Unresolved `{param}` in the URL shown in amber, resolved in green; `{{env}}` placeholders stay accent-colored.
- **History management** — Delete individual entries or clear the full request history from the sidebar.
- **URL validation** — Clear error messages and red field styling for empty or invalid URLs before send.

### Changed

- Auth token is configured in project settings instead of a separate lock icon in the workspace list.
- Environment selector only applies when a project workspace is active.

## [v0.1.5] - 2026-05-24 — Path Variables, Code Export & macOS Install

### Added

- **Path variables** — Sidebar endpoints with `{param}` templates show a dedicated „Pfad-Variablen“ section; values are substituted into the URL before send.
- **Code export** — Copy request as **Python (`requests`)** or **Node.js (`fetch`)** from the Export dropdown (alongside cURL/wget).
- **macOS distribution** — GitHub Release workflow uploads **`.app.tar.gz`** bundles next to `.dmg`; README Gatekeeper guide with `xattr -cr`; Homebrew cask template in `scripts/homebrew/aperio.rb`.
- **i18n** — Full localization audit; synced `de.json` / `en.json` (120 keys each); JSON tree labels and clipboard errors translated.
- **Developer tooling** — `npm run typecheck` script.

### Fixed

- **OpenAPI body skeletons** — `default_body` generation for POST/PUT/PATCH now handles schemas without explicit `type: object` (`SchemaKind::Any`), nested objects, and `allOf` merges; pretty-printed JSON in the builder.

### Changed

- Export menu uses resolved URLs (path params applied) for generated snippets.
- Release notes on GitHub link to macOS Gatekeeper documentation.

## [v0.1.4] - 2026-05-23 — Workspace Hub & Postman Import

### Added

- **Multi-format import** — OpenAPI 3.x, Serverless Framework (`serverless.yml`), and **Postman Collection v2.1** (`.json`) with Rust auto-detection.
- **Postman parser** — Recursive folders, methods, URLs, headers, raw bodies, and query parameters via `postman_parser.rs`.
- **Serverless parser** — HTTP / HTTP API events from `functions:` via `serverless_parser.rs`.
- **OpenAPI enhancements** — JSON body skeletons (`default_body`), `path_params`, and `query_params` on endpoints.
- **Frontend** — „Projektraum importieren“, unified sidebar workspaces, `endpointToRequestDraft` for Postman pre-fill in the builder.
- **Architecture docs** — PlantUML diagrams in `docs/diagrams/` (request flow, import process, token vault).

### Changed

- Import file dialog lists OpenAPI, Serverless, and Postman Collection (*.json) filters explicitly.
- README and `SPRINTS.md` updated for Sprints 1–19.

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

[Unreleased]: https://github.com/codeisconquer/Aperio/compare/v0.2.2...HEAD
[v0.2.2]: https://github.com/codeisconquer/Aperio/releases/tag/v0.2.2
[v0.2.1]: https://github.com/codeisconquer/Aperio/compare/v0.2.1...v0.2.2
[v0.2.0]: https://github.com/codeisconquer/Aperio/compare/v0.1.7...v0.2.0
[v0.1.7]: https://github.com/codeisconquer/Aperio/releases/tag/v0.1.7
[v0.1.6]: https://github.com/codeisconquer/Aperio/releases/tag/v0.1.6
[v0.1.5]: https://github.com/codeisconquer/Aperio/releases/tag/v0.1.5
[v0.1.4]: https://github.com/codeisconquer/Aperio/releases/tag/v0.1.4
[v0.1.0]: https://github.com/codeisconquer/Aperio/releases/tag/v0.1.0
