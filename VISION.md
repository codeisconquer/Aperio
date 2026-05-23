# Aperio - Local-First API Client

Aperio (lateinisch für "öffnen", "sichtbar machen") ist ein minimalistischer, extrem schneller und entwicklerfreundlicher API-Client. Das Tool dient zum schnellen Testen von HTTP-Verbindungen, dem Ausführen manueller API-Calls und der nativen Strukturierung von Workflows anhand von Swagger/OpenAPI-Spezifikationen.

## Projektziele & Kernphilosophie
1. **Local-First & Git-friendly:** Keine Cloud-Zwangsanmeldung. Alle Kollektionen und Konfigurationen liegen als Klartextdateien im Dateisystem, damit sie problemlos in Git versioniert werden können.
2. **Sicherheit ab Werk:** Sensible Daten wie Passwörter und API-Tokens werden niemals im Klartext gespeichert, sondern verschlüsselt in einer lokalen SQLite-Datenbank abgelegt.
3. **Swagger-Native:** Swagger/OpenAPI-Dateien sind keine reinen Import-Formate, die flachgeklopft werden, sondern verhalten sich wie eigenständige, dynamische Projekträume.
4. **Schlank & Performant:** Dank Tauri und Rust hat die App eine minimale Bundle-Größe (wenige MB) und verbraucht kaum Arbeitsspeicher (im Gegensatz zu Electron-Alternativen).

## Corporate Identity (CI) & Design-Richtlinien
Aperio ist eine "Dark-First"-Anwendung. Das UI ist minimalistisch, übersichtlich und fokussiert.

### Farbpalette (Tailwind Theme)
- **Haupt-Hintergrund:** `#0B0F19` (Tiefes, augenschonendes Nachtblau)
- **Sidebar & Karten:** `#161F30` (Visuelle Abhebung für Navigationselemente)
- **Primärer Akzent (Buttons, Active):** `#00D2FF` (Leuchtendes Cyan für Interaktionen/Senden)
- **Success (GET / 200 OK):** `#10B981` (Smaragdgrün)
- **Warning/Auth (POST / Tresor):** `#F59E0B` (Warmes Bernstein-Gelb)
- **Text Hauptfarbe:** `#F3F4F6` (Klares Off-White)

### Logo-Metapher
Das Logo verbindet die geschweiften Entwickler-Klammern `{ }` mit dem Konzept des Öffnens. Visuell dargestellt als ein stilisiertes, geöffnetes Schlosssymbol, dessen Bügel die Form einer geschweiften Klammer besitzt.
