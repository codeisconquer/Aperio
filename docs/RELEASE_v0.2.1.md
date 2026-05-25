# Release v0.2.1

## Summary (GitHub Release body)

**Aperio v0.2.1** — Local-first API workspace (Tauri + React).

Highlights since v0.1.5:

- **URL preview** — Toggle between `{{base_url}}/path` templates and resolved URLs.
- **Environments** — `base_url` from OpenAPI `servers`; inline env editor in project settings.
- **Export** — Resolved cURL/wget; Python/Node/Go/Rust in snippets modal; Tauri clipboard fixes.
- **Bundle ID** — `de.viebrocksoftware.aperio`
- **Fixes** — Body editor alignment, path-param vs `{{base_url}}`, full-width URL input (v0.2.1).

Full details: [CHANGELOG.md](../CHANGELOG.md).

### Downloads

| Platform | Artifacts |
|----------|-----------|
| macOS (Apple Silicon) | `.dmg`, `Aperio_0.2.1_macos-aarch64.app.tar.gz` |
| macOS (Intel) | `.dmg`, `Aperio_0.2.1_macos-x64.app.tar.gz` |
| Windows | `.msi` / setup `.exe` |
| Linux | `.AppImage`, `.deb` |

### macOS Gatekeeper

Prefer **`.app.tar.gz`** over `.dmg`. If macOS reports the app as damaged:

```bash
xattr -cr /Applications/Aperio.app
```

See [README — macOS Installation Note](../README.md#-macos-installation-note-gatekeeper).

---

## Pre-flight checklist

- [ ] `npm test` and `npm run typecheck` pass
- [ ] `cd src-tauri && cargo test` pass (optional but recommended)
- [ ] Version aligned: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `scripts/homebrew/aperio.rb`
- [ ] `CHANGELOG.md` updated for v0.2.1
- [ ] All release changes committed on `main`

## Publish

```bash
# From repo root, on main with a clean commit for the release
git tag v0.2.1
git push origin main
git push origin v0.2.1
```

Pushing tag `v0.2.1` triggers [.github/workflows/release.yml](../.github/workflows/release.yml). CI builds per platform and uploads assets to the GitHub Release.

## After CI completes

1. Open https://github.com/codeisconquer/Aperio/releases/tag/v0.2.1 and paste the **Summary** section above if the workflow body is too minimal.
2. **Homebrew tap** (optional): update `scripts/homebrew/aperio.rb` SHA256 values:

   ```bash
   curl -L -o aperio-aarch64.app.tar.gz \
     "https://github.com/codeisconquer/Aperio/releases/download/v0.2.1/Aperio_0.2.1_macos-aarch64.app.tar.gz"
   shasum -a 256 aperio-aarch64.app.tar.gz

   curl -L -o aperio-x64.app.tar.gz \
     "https://github.com/codeisconquer/Aperio/releases/download/v0.2.1/Aperio_0.2.1_macos-x64.app.tar.gz"
   shasum -a 256 aperio-x64.app.tar.gz
   ```

3. Copy updated cask to your tap repo (`Casks/aperio.rb`).

## Local smoke build (optional)

```bash
npm ci
npm run tauri build
# Artifacts: src-tauri/target/release/bundle/
```
