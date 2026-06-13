# Release v0.2.3

## Summary (GitHub Release body)

**Aperio v0.2.3** — Local-first API workspace (Tauri + React).

Highlights since v0.2.2:

- **Per-environment tokens** — API tokens are stored per environment (encrypted), not per project; the active environment’s token is sent as Bearer on requests.
- **Import wizard & editor** — Configure API token when setting up the default environment or editing any environment.
- **Request builder** — Environment selector above the URL when multiple environments exist.
- **Persistence** — Imported projects are saved in SQLite and survive app updates; active-environment preferences live in the database.
- **Dev mode** — `tauri dev` starts with a clean `aperio-dev.db`; installed builds keep `aperio.db`.

Full details: [CHANGELOG.md](../CHANGELOG.md).

### Downloads

| Platform | Artifacts |
|----------|-----------|
| macOS (Apple Silicon) | `.dmg`, `Aperio_0.2.3_macos-aarch64.app.tar.gz` |
| macOS (Intel) | `.dmg`, `Aperio_0.2.3_macos-x64.app.tar.gz` |
| Windows | `.msi` / setup `.exe` |
| Linux | `.AppImage`, `.deb` |

### macOS Gatekeeper

Prefer **`.app.tar.gz`** over `.dmg`. If macOS reports the app as damaged:

```bash
xattr -cr /Applications/Aperio.app
```

### Upgrade note

Projects imported **before v0.2.3** were session-only and are not migrated automatically. Re-import once after upgrading; from v0.2.3 onward, projects persist across updates.
