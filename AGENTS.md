Wir führen eine neue Datei `AGENTS.md` im Projekt-Root ein. Diese Datei dient als exklusives "Onboarding-Handbuch" für AI-Coding-Agents (wie dich selbst), damit künftige Erweiterungen an Aperio absolut fehlerfrei, konsistent und im korrekten Architektur-Stil durchgeführt werden.

Deine Aufgabe:
Erstelle die Datei `AGENTS.md` mit folgender Struktur und klaren, unmissverständlichen Direktiven für KIs:

1. **System Overview & Persona:**
   - Erkläre, dass Aperio eine Local-First Tauri v2 App (Rust Backend + React/TS Frontend) ist.
   - Der Agent soll sich als präziser, systemnaher Full-Stack-Entwickler verhalten.
2. **Tech Stack & Constraints (Wichtig für LLMs):**
   - **Frontend:** React, TypeScript, Tailwind CSS, Vite, Lucide React (Keine schweren UI-Bibliotheken ohne Absprache).
   - **Backend:** Rust, Tauri v2 (Achtung: v2 APIs nutzen, nicht v1!), `reqwest` mit `rustls`, `rusqlite` für die lokale `aperio.db` in `app_data_dir()`, `keyring` für Krypto.
3. **Architectural Rules (Die Leitplanken):**
   - **Async vs. Blocking:** HTTP-Anfragen laufen asynchron. DB-Inserts/Schreibvorgänge nach einem Request MÜSSEN via `tokio::task::spawn_blocking` vom Haupt-Thread entkoppelt werden, um die UI-Antwortzeit nicht zu verzögern.
   - **State Management:** Tauri-State (`State<'_, DbPool>`) für Backend-Injektionen nutzen. Frontend nutzt flache React-States in `AppLayout` oder dedizierte Context-Provider (kein Redux o.ä.).
   - **Error Handling:** Keine unvorbereiteten `panic!` oder `.unwrap()` im Rust-Produktionscode. Fehler müssen als `Result<T, String>` sauber an die Tauri IPC-Bridge übergeben werden, damit das Frontend i18n-Fehlermeldungen anzeigen kann.
4. **How to Test & Build:**
   - Liste die exakten Befehle auf, die der Agent ausführen muss, um seine eigenen Änderungen zu verifizieren (`npm test`, `cd src-tauri && cargo test`, `npm run tauri dev`).
5. **Instruction Override:**
   - Füge eine finale Klausel hinzu: *"Bevor du Code schreibst oder refaktorierst, lies zwingend diese `AGENTS.md` sowie die `CONTEXT.md`. Halte dich strikt an die Dateistrukturen und verändere funktionierende Krypto- oder Parser-Logiken nur, wenn explizit dazu aufgefordert."*

Aktualisiere nach dem Erstellen der Datei auch die `README.md`, um in einer kurzen Zeile auf die `AGENTS.md` für AI-Contributoren hinzuweisen.