<p align="center">
  <img src="aperio-logo-v2.png" alt="Aperio logo" width="120" />
</p>

<h1 align="center">Aperio</h1>

<p align="center">
  <strong>A local-first API client for developers who want speed, privacy, and OpenAPI-native workflows.</strong>
</p>

<p align="center">
  Built with <a href="https://v2.tauri.app/">Tauri v2</a>, <a href="https://react.dev/">React</a>, and <a href="https://www.rust-lang.org/">Rust</a> — small binaries, low memory use, no cloud account required.
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#cli-usage">CLI</a> ·
  <a href="#production-builds">Production Builds</a> ·
  <a href="#testing">Testing</a> ·
  <a href="#releases">Releases</a>
</p>

---

## Features

- **Local-first & Git-friendly** — No mandatory cloud sign-in. Request history, environments, and encrypted tokens live in a local SQLite database under your app data directory. OpenAPI specs remain plain files you can version in Git.
- **Swagger-native workspaces** — Import `.yaml` / `.json` OpenAPI documents as first-class **project workspaces** with collapsible endpoint trees, not flat collections.
- **Encrypted token vault** — Per-workspace API tokens are stored with **AES-GCM**; the master key is held in the OS keychain (macOS Keychain, Windows Credential Manager).
- **Powerful cURL import** — Paste cURL from Chrome DevTools, Postman, or the terminal; a Rust parser fills method, URL, headers, and body (including multi-line and common flags).
- **Code snippet export** — One-click copy as **cURL** or **wget**, or generate **Go** (`net/http`) and **Rust** (`reqwest`) snippets in a tabbed modal.
- **Environments** — Named variable sets (e.g. Local, Staging) with `{{variable}}` substitution in URL, headers, and body before send; placeholders are highlighted in the builder.
- **Developer UX** — Three-column dark UI (sidebar · builder · response), DE/EN i18n, JSON response tree, request history restore, workspace backup/restore, and Playwright E2E coverage in CI.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) **20+**
- [Rust](https://rustup.rs/) **1.88+**
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS (WebKit/GTK on Linux, Xcode CLT on macOS, MSVC/WebView2 on Windows)

### Clone and run in development

```bash
git clone https://github.com/YOUR_ORG/aperio.git
cd aperio

npm install
npm run tauri dev
```

The app opens with the Vite dev server on `http://localhost:1420` and hot-reload for the React UI.

## CLI usage

Aperio accepts an optional OpenAPI path on startup. The Rust core validates and parses the file, then opens the matching workspace in the UI.

**During development:**

```bash
npm run tauri dev -- ./path/to/openapi.yaml
```

**After installing a release build** (binary name matches your bundle; typical examples):

```bash
# macOS (inside the .app bundle)
open -a Aperio --args ./api.yaml

# Linux / Windows (when `aperio` is on your PATH)
aperio ./api.yaml
```

Supported formats: OpenAPI **3.x** as **YAML** or **JSON**.

## Production builds

Frontend assets are built with `npm run build`; Tauri bundles native installers via `npm run tauri build`.

### macOS

```bash
npm install
npm run tauri build
# or
chmod +x build-mac.sh && ./build-mac.sh
```

Artifacts (example):

- `src-tauri/target/release/bundle/dmg/Aperio_0.1.0_aarch64.dmg`
- `src-tauri/target/release/bundle/macos/Aperio.app`

On Apple Silicon, add the Intel target for a universal or x64 build:

```bash
rustup target add x86_64-apple-darwin
npm run tauri build -- --target x86_64-apple-darwin
```

### Windows

```powershell
npm install
npm run tauri build
```

Artifacts (example):

- `src-tauri\target\release\bundle\nsis\Aperio_0.1.0_x64-setup.exe`
- `src-tauri\target\release\bundle\msi\Aperio_0.1.0_x64_en-US.msi`

Requires [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually preinstalled on Windows 11).

### Linux

```bash
npm install
npm run tauri build
```

Install system deps first (Debian/Ubuntu example):

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

Artifacts (example):

- `src-tauri/target/release/bundle/appimage/Aperio_0.1.0_amd64.AppImage`
- `src-tauri/target/release/bundle/deb/aperio_0.1.0_amd64.deb`

## Testing

```bash
# Unit tests (Vitest + React Testing Library)
npm test

# E2E (Playwright, headless; Vite + Tauri IPC mocks)
npx playwright install chromium   # first run only
npm run test:e2e

# Rust tests (HTTP wiremock, SQLite, cURL parser, OpenAPI)
cd src-tauri && cargo test
```

CI runs the same suites on every push and pull request to `main` (see `.github/workflows/ci.yml`).

## Releases

Tagged versions are built and published automatically:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The [Release workflow](.github/workflows/release.yml) produces platform installers and attaches them to the GitHub Release:

| Platform | Typical artifacts |
|----------|-------------------|
| macOS | `.dmg` (Apple Silicon + Intel matrix builds) |
| Windows | `.msi` / setup `.exe` |
| Linux | `.AppImage`, `.deb` |

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Architecture & docs

| Document | Description |
|----------|-------------|
| [VISION.md](VISION.md) | Product vision, design tokens, CI palette |
| [CONTEXT.md](CONTEXT.md) | Tech stack, IPC, environments, testing strategy |
| [SPRINTS.md](SPRINTS.md) | Implementation milestones (Sprints 1–12, complete) |

## Tech stack

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript, Tailwind CSS 4, i18next |
| Shell | Tauri v2 |
| Core | Rust (`reqwest`, `rusqlite`, `openapiv3`, AES-GCM, `keyring`) |
| E2E | Playwright |

## License

License terms are defined in this repository. If no `LICENSE` file is present, all rights reserved unless stated otherwise by the maintainers.
