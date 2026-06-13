# Release v0.2.2

## Summary (GitHub Release body)

**Aperio v0.2.2** — Local-first API workspace (Tauri + React).

Highlights since v0.2.1:

- **Import wizard** — Configure environments (`base_url`, variables) during workspace import.
- **Variable tooltips** — Hover `{{base_url}}` to see the active environment value.
- **New request** — Start ad-hoc requests from the sidebar anytime.
- **Dark & light mode** — Theme toggle in the sidebar footer.
- **UI** — App logo in sidebar; improved contrast in both themes.

Full details: [CHANGELOG.md](../CHANGELOG.md).

### Downloads

| Platform | Artifacts |
|----------|-----------|
| macOS (Apple Silicon) | `.dmg`, `Aperio_0.2.2_macos-aarch64.app.tar.gz` |
| macOS (Intel) | `.dmg`, `Aperio_0.2.2_macos-x64.app.tar.gz` |
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
- [ ] `CHANGELOG.md` updated for v0.2.2
- [ ] All release changes committed on `main`

## Publish

```bash
# From repo root, on main with a clean commit for the release
git tag v0.2.2
git push origin main
git push origin v0.2.2
```

Pushing tag `v0.2.2` triggers [.github/workflows/release.yml](../.github/workflows/release.yml). CI builds per platform and uploads assets to the GitHub Release.

## After CI completes

1. Open https://github.com/codeisconquer/Aperio/releases/tag/v0.2.2 and paste the **Summary** section above if the workflow body is too minimal.
2. **Homebrew tap** (optional): update `scripts/homebrew/aperio.rb` SHA256 values:

   ```bash
   curl -L -o aperio-aarch64.app.tar.gz \
     "https://github.com/codeisconquer/Aperio/releases/download/v0.2.2/Aperio_0.2.2_macos-aarch64.app.tar.gz"
   shasum -a 256 aperio-aarch64.app.tar.gz

   curl -L -o aperio-x64.app.tar.gz \
     "https://github.com/codeisconquer/Aperio/releases/download/v0.2.2/Aperio_0.2.2_macos-x64.app.tar.gz"
   shasum -a 256 aperio-x64.app.tar.gz
   ```

3. Copy updated cask to your tap repo (`Casks/aperio.rb`).

## Local smoke build (optional)

```bash
npm ci
npm run tauri build
# Artifacts: src-tauri/target/release/bundle/
```
