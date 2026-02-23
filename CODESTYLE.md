# Code Style Guidelines

> Projekt: Pinky  
> Stand: 2026-02-23  
> Ziel: Lesbarer, konsistenter und sicherer Code, der in einem Team schnell wartbar ist und DSGVO-konform betrieben werden kann.

---

## 1. Grundprinzipien

- **Consistency > Personal Preference**  
  Bestehende Konventionen haben Vorrang vor persönlichem Stil.
- **Small, composable units**  
  Kleine Funktionen, Widgets und Komponenten mit klarer Verantwortung.
- **Explicit > Implicit**  
  Namen, Typen und Verantwortlichkeiten klar ausformulieren.
- **Security & privacy by default**  
  Keine personenbezogenen Daten in Logs. Datenzugriff immer tenant-sicher.
- **Server-authoritative**  
  Kritische Geschäftslogik und Berechtigungsentscheidungen liegen immer serverseitig (Supabase + RLS/Functions), nicht im Client.

---

## 2. Repository-Struktur

### 2.1 Monorepo (Empfehlung)

```text
/apps
  /mobile                # Flutter App (Mitglieder)
  /admin-web             # Next.js Admin UI (Organisatoren)
/packages
  /shared                # Shared Types, utils, design tokens (TS)
  /api-client            # Typed API client (TS, optional)
/supabase
  /migrations            # SQL Migrationen
  /functions             # Supabase Edge Functions (TS)
/docs
CODESTYLE.md
ARCHITECTURE.md
SECURITY.md
```

### 2.2 Naming

- Ordner: `kebab-case` (z. B. `admin-web`)
- Dateien:
  - Flutter: `snake_case.dart`
  - TS/React: `kebab-case.ts` oder `kebab-case.tsx`
  - SQL Migrationen: `YYYYMMDDHHmm_<name>.sql`
- Klassen/Typen/Interfaces: `PascalCase`
- Funktionen/Variablen: `camelCase`
- Konstanten: `SCREAMING_SNAKE_CASE`
- Supabase Functions: `kebab-case` Verzeichnisname

---

## 3. Formatting & Linting (verbindlich)

### 3.1 Flutter / Dart

- `dart format` ist **Pflicht**
- `flutter analyze` darf im CI **keine Errors** haben
- Lints: `flutter_lints` (MVP) oder `very_good_analysis` (strenger)

**Regeln**
- Keine `print()` in Produktion (nur strukturierter Logger)
- Keine unnötigen `dynamic`
- Null-Safety konsequent nutzen
- `const` wo möglich
- Businesslogik nicht im Widget

### 3.2 TypeScript / Next.js / Edge Functions

- Formatter: **Prettier**
- Linter: **ESLint** (strict)
- `tsconfig`: `strict: true`

**Regeln**
- Kein `any` (nur mit begründeter Ausnahme + Kommentar)
- Komponenten möglichst pure; Side-effects in Hooks/Services
- Keine Businesslogik in UI-Komponenten
- Runtime-Validierung an externen Grenzen (z. B. mit `zod`)

### 3.3 SQL / Supabase

- SQL formatieren und kommentieren (Intention + Sicherheitsannahmen)
- Jede Schemaänderung über Migrationen
- RLS-Policies zusammen mit Tabellenänderungen versionieren

---

## 4. Architektur-Konventionen

### 4.1 Flutter (Clean-ish)

Empfohlene Layer:
- `features/<feature>/presentation` (Widgets, Screens)
- `features/<feature>/application` (UseCases, State)
- `features/<feature>/domain` (Entities, Interfaces)
- `features/<feature>/infrastructure` (API, Repos, DTOs)

**State Management**
- Primär: `Riverpod`
- Kein Mischbetrieb mit mehreren State-Lösungen ohne RFC/Team-Entscheid

### 4.2 Web (Next.js)

- `app/` Router (Next 13+)
- `components/` nur UI
- `features/` domänenspezifisch (`tasks`, `orgs`, `users`)
- `lib/` (`clients`, `utils`, `guards`)
- `services/` API-Aufrufe und Domänenservices

### 4.3 Edge Functions (Supabase)

- Je Function ein klarer Zweck (`task-matching`, `notifications`, `exports-csv`, `webhooks`)
- Gemeinsame Hilfen in Shared-Modulen statt Copy/Paste
- Idempotenz bei Webhooks und Exports sicherstellen

---

## 5. Datenzugriff & Multi-Tenant Regeln (KRITISCH)

- Jede relevante Tabelle enthält `org_id` (oder `tenant_id`)
- Zugriff ist **immer** über Membership und Rolle abgesichert
- `org_id` vom Client **niemals blind vertrauen**
- Keine quer-tenant Queries

**Do**
- `org_id` aus Session/JWT Claims ableiten
- RLS als erste Verteidigungslinie nutzen
- Service/Funktion prüft zusätzlich Domänenregeln

**Don’t**
- Direktes Vertrauen in Client-Filter (`where org_id = <client_input>`)
- Admin-Bypass ohne Audit und explizite Berechtigung

---

## 6. Auth, Secrets, DSGVO

- Auth über Supabase Auth (Email + Magic Link; später OAuth/Passkeys)
- Secrets nur über Environment Variablen / Supabase Secrets
- Keine Secrets im Repository, in Logs oder in Tickets
- Datenminimierung: nur notwendige personenbezogene Daten speichern
- Lösch- und Exportprozesse für Nutzerdaten berücksichtigen (DSGVO)

---

## 7. Logging, Errors, Monitoring

- Keine PII in Logs (E-Mail, Telefon, Name, Adresse)
- Fehler haben:
  - klare Message
  - stabilen Fehlercode (`TASK_CREATE_FAILED`)
  - Kontext ohne PII
- Sentry in:
  - Admin Web
  - Flutter App
  - Edge Functions
- Releases/Environment-Tags konsistent setzen

---

## 8. Testing (Minimum)

### Flutter
- Unit: UseCases/Services
- Widget Tests: kritische Screens (Login, Task Feed)

### Web
- Unit: utils/services
- Component Tests (optional) für kritische UI

### Supabase / Backend
- SQL/RLS Tests für Tenant-Isolation
- Function-Tests für:
  - Task-Matching
  - Notifications
  - CSV Exporte
  - Webhook-Verifikation

### CI
- Pflichtchecks: Lint + Typecheck + Tests
- Keine Merges bei roten Pflichtchecks

---

## 9. Git Workflow

- Branches: `feat/...`, `fix/...`, `chore/...`, `docs/...`
- PR-Pflicht (außer klar definierter Hotfix-Prozess)
- PR enthält:
  - Beschreibung
  - Testhinweise
  - Screenshots bei UI-Änderungen

**Commit Messages (Konvention)**
- `feat: ...`
- `fix: ...`
- `chore: ...`
- `docs: ...`

---

## 10. Code Review Checkliste

- [ ] Tenant-Isolation sicher?
- [ ] Keine PII in Logs?
- [ ] Naming konsistent?
- [ ] Keine Businesslogik in UI?
- [ ] RLS + Policies berücksichtigt?
- [ ] Tests/Checks laufen?
- [ ] Keine unnötige Komplexität?

---

## 11. Definition of Done

- Feature funktioniert (Happy Path + Fehlerfälle)
- Lint/Format/Typecheck grün
- Tenant-sicher (RLS + Codepfad geprüft)
- Logging/Monitoring integriert (ohne PII)
- Dokumentation aktualisiert (`CODESTYLE.md`, `ARCHITECTURE.md`, ggf. `SECURITY.md`)
