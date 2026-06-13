# Release v0.2.4

## Summary (GitHub Release body)

**Aperio v0.2.4** — Local-first API workspace (Tauri + React).

Highlights since v0.2.3:

- **Settings overlay** — Gear icon next to the app name opens workspace export/import, language, and theme in one modal.
- **More sidebar space** — History and project list no longer compete with footer controls.

Full details: [CHANGELOG.md](../CHANGELOG.md).

### Downloads

| Platform | Artifacts |
|----------|-----------|
| macOS (Apple Silicon) | `.dmg`, `Aperio_0.2.4_macos-aarch64.app.tar.gz` |
| macOS (Intel) | `.dmg`, `Aperio_0.2.4_macos-x64.app.tar.gz` |
| Windows | `.msi` / setup `.exe` |
| Linux | `.AppImage`, `.deb` |

### macOS Gatekeeper

Prefer **`.app.tar.gz`** over `.dmg`. If macOS reports the app as damaged:

```bash
xattr -cr /Applications/Aperio.app
```
