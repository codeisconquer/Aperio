# Sprint-Backlog für den Projektstart

Arbeite die Sprints sequenziell ab. Erstelle nach jedem Sprint einen funktionierenden Zwischenstand.

## Sprint 1: Das Fundament (Tauri + React + Tailwind)
- [ ] Initialisiere eine neue Tauri-App mit React und TypeScript (`npm create tauri-app@latest`).
- [ ] Integriere Tailwind CSS in das React-Projekt und setze die Farbpalette aus `VISION.md` im `tailwind.config.js` auf.
- [ ] Implementiere das Drei-Spalten-Grundlayout (Sidebar links, Request-Builder Mitte, Response-Viewer rechts).
- [ ] Richte ein einfaches i18n-System (z. B. via `i18next` oder einen React-Context) für Mehrsprachigkeit (DE/EN) ein.

## Sprint 2: Core HTTP-Engine & IPC
- [ ] Erstelle den ersten Tauri-Command `send_request` in Rust. Dieser nimmt Methode, URL, Headers und Body entgegen und nutzt `reqwest`, um den Ruf abzusetzen.
- [ ] Verknüpfe den "Send"-Button im React-Frontend über `invoke('send_request')` mit dem Backend.
- [ ] Stelle die Antwort (Statuscode, Zeitdauer und formatierter JSON-Body) im Response-Viewer dar.

## Sprint 3: SQLite Historie (Unaufgefordertes Speichern)
- [ ] Binde SQLite in das Rust-Backend ein und erstelle eine Tabelle `history` (id, timestamp, method, url, status_code, duration).
- [ ] Erweitere den `send_request`-Befehl so, dass jeder ausgeführte Request automatisch im Hintergrund in der DB geloggt wird.
- [ ] Erstelle einen Command `get_history`, um die letzten 50 Einträge zu laden.
- [ ] Baue die Historie-Sektion in der React-Sidebar auf. Ein Klick auf einen Eintrag stellt den Zustand im Request-Builder wieder her.

## Sprint 4: Swagger/OpenAPI-Projekträume
- [ ] Füge das Crate `openapiv3` im Rust-Backend hinzu.
- [ ] Erstelle einen Command `import_swagger_file`, der über Tauris nativen File-Dialog eine `.yml` oder `.json` Datei einliest.
- [ ] Extrahiere die Pfade und HTTP-Methoden und sende sie strukturiert ans Frontend.
- [ ] Stelle importierte Swagger-Dateien als eigenständige "Projekträume" (Ordnerstruktur) in der Sidebar dar, getrennt von Einzel-Requests.

## Sprint 5: Verschlüsselter Token-Tresor
- [ ] Implementiere das `keyring`-Crate in Rust, um beim ersten App-Start einen sicheren, zufälligen AES-Schlüssel im OS-Manger zu hinterlegen.
- [ ] Erstelle eine SQLite-Tabelle `secure_tokens` (project_id, encrypted_token).
- [ ] Erstelle Commands zum verschlüsselten Speichern (`save_secure_token`) und Entschlüsseln bei Request-Ausführung.
- [ ] Baue ein Schloss-Icon neben den Swagger-Projekten im UI ein, um dort die Tokens für das jeweilige Projekt zu verwalten.