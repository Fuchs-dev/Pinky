# Pinky – Code Style Guidelines (CODESTYLE.md)

> **Stand:** 2026-02-23  
> **Ziel:** Lesbarer, konsistenter und sicherer Code, der im Team schnell wartbar ist und DSGVO-konform betrieben werden kann. Keine "magischen" Abstraktionen.

---

## 1. Grundprinzipien

- **Consistency > Personal Preference:** Bestehende Konventionen haben Vorrang vor persönlichem Stil.
- **Lesbarkeit vor Cleverness:** Klarheit vor Abstraktion. Code wird häufiger gelesen als geschrieben.
- **Explicit > Implicit:** Explizit statt „magisch“ – Namen, Typen und Verantwortlichkeiten klar ausformulieren.
- **Eine Datei = Eine Verantwortung:** Kleine, zusammensetzbare Einheiten (Units, Widgets, Komponenten) mit klarem Fokus.
- **Security & Privacy by Default:** Keine personenbezogenen Daten in Logs. Datenzugriff immer tenant-sicher (siehe Multi-Tenant Regeln).
- **Server-Authoritative:** Kritische Geschäftslogik und Berechtigungsentscheidungen liegen immer serverseitig (Supabase + RLS/Functions), niemals im Client.
- **Einfacheit:** Der Code soll maximal simpel sein, damit auch unerfahrenen Entwickler das Projekt verstehen und erweitern können.

---

## 2. Projekt- & Repository-Struktur

Code wird nach **fachlichen Features organisiert (Feature-first)**, nicht nach technischen Layern. Keine „utils“-Sammelordner ohne klaren, fokussierten Zweck.

### 2.1 Monorepo-Aufbau (Empfehlung)
```text
/apps
  /mobile                # Flutter App (Mitglieder)
  /admin-web             # Next.js Admin UI (Organisatoren)
/packages
  /shared                # Shared Types, Zod-Schemas, Design Tokens (TS)
  /api-client            # API-Client Wrappers (TS, optional)
/supabase
  /migrations            # SQL Migrationen (YYYYMMDDHHmm_<name>.sql)
  /functions             # Supabase Edge Functions (TS, kebab-case Verzeichnis)
/docs                    # ARCHITECTURE.md, CODESTYLE.md, PROJECT.md, etc.
```

### 2.2 Namenskonventionen

- **Ordner:** `kebab-case` (z. B. `admin-web`, `task-matching`)
- **Dateien:**
  - TypeScript/React (Backend/Web): `kebab-case.ts` / `kebab-case.tsx`
  - Dart/Flutter (Mobile): `snake_case.dart`
- **TypeScript & Dart Identifier:**
  - Klassen, Typen, Interfaces, Widgets: `PascalCase`
  - Funktionen, Variablen, Instanzen: `camelCase`
  - Konstanten (`const`): `SCREAMING_SNAKE_CASE` oder `camelCase` (je nach lokalem Linting, präferiert `camelCase` für einfache Laufzeitkonstanten in TypeScript).

---

## 3. Formatting, Linting & Typisierung

### 3.1 TypeScript (Web & Backend)

- **Formatter & Linter:** Prettier & ESLint (strict) mit `tsconfig: { strict: true }`
- **Kein `any`!** Typisiere API-Grenzen immer streng.
- **Zod als Source of Truth:** Validierung eingehender Daten erfolgt über `zod` an der Systemgrenze (Controller, Endpunkte).
  ```ts
  // GOAL
  export const createTaskSchema = z.object({ title: z.string().min(3) });
  // NO
  function createTask(data: any) {}
  ```
- **Error Handling:** Keine String-Throws. Verwende einheitliche, typisierte Error-Klassen.
  ```ts
  throw new ForbiddenError("User is not allowed"); // GOAL
  throw "not allowed"; // NO
  ```

### 3.2 Flutter/Dart (Mobile)

- **Formatter & Linter:** `dart format` ist Pflicht; `flutter analyze` darf im CI null Fehler auswerfen (nutze strict Lints wie z.B. `very_good_analysis`).
- **Sicherheit & Typen:** Null-Safety konsequent nutzen. Keine unnötigen `dynamic` Casts.
- **Konstanten:** Verwende `const` Deklarationen überall, wo es für Widgets oder Laufzeitkonstanten möglich/empfohlen ist.
- **Logs:** Kein `print()` in Produktion; strukturierten Logger (z. B. `logger` package) verwenden.

---

## 4. Architektur-Details & Layering

### 4.1 Backend (Node.js/Edge Functions)
**Controller / API Handler:**
- Nimmt Requests entgegen.
- Validiert Input (via Zod).
- Ruft Service auf.
- Keine eigene Business-Logik!
**Services (Business-Logik):**
- Enthält die eigentlichen Regeln und Abläufe.
- Führt DB-Queries (z. B. via Prisma oder Supabase-Client) aus.
- Setzt Domänenregeln (z. B. Tenant-Prüfungen) durch.

### 4.2 Web (Next.js)
- UI ist "dumm". Sie ruft lediglich Services oder API-Endpunkte auf und stellt Zustand dar.
- Validierung geschieht im Frontend nur für UX Forms (z.B. React Hook Form + Zod), die echte Validation bleibt serverseitig.

### 4.3 Flutter (Mobile App)
- **Feature-first Layering:** `features/<feature>/presentation|application|domain|infrastructure`
- **State Management:** Riverpod (oder äquivalent). Zustand und Logik leben in `StateNotifier`/`ControllerProvider`, niemals direkt im `Widget`.
- **Widgets:** Nur für UI. Keine Businesslogik in `onPressed` abseits von Controller-Dispatch.
  ```dart
  // GOAL
  onPressed: () => ref.read(microTaskControllerProvider.notifier).assign(id)
  ```

---

## 5. Datenzugriff & Tenant-Sicherheit (KRITISCH)

- **Mandanten-Isolation (`org_id` / `tenant_id`):** Jede mandantenrelevante Tabelle hat dieses Feld.
- **Kein blindes Vertrauen:** Greife niemals auf Filter zu, die vom Client stammen (`where org_id = input.org_id`). Extrahiere die `org_id` immer aus dem sicheren Auth-Kontext (Session, JWT).
- **Sicherungsschichten:** Das Backend und RLS (Row Level Security) setzen diese Regeln doppelt durch.
- **Keine Quer-Abfragen:** Zugriff über mehrere Workspaces / Tenants ist im Standard-Betrieb strikt untersagt.

---

## 6. Auth, Secrets & DSGVO

- **Secrets:** Nur über Environment Variables (`.env`) & native Secret-Stores der Plattform (Vercel/Supabase). Sie dürfen nicht im Code, Build oder Logs erscheinen.
- **DSGVO & Logs:** Absolut keine Personally Identifiable Information (PII wie Namen, E-Mails, Adressen) in System-Logs (Sentry, Console).
- Fehler erhalten stattdessen sichere Kontext-IDs und standardisierte Codes (z.B. `ErrorCode.TASK_CREATE_FAILED`).

---

## 7. Testing & CI/CD

**Minimum-Anforderungen an Automatisierung (GitHub Actions / GitLab CI):**
- Pflichtchecks pro PR: Linting (grün), Typecheck (grün), Unit-Tests (grün). Keine Force-Merges über kaputte Checks.
**Flutter:**
- Unit Tests für UseCases/State-Logik (Controller). Smoke/Widget-Tests für kritische Pfade (Login, Task-List).
**Backend & Web:**
- Unit Tests für Services (Testen der eigentlichen Business-Logik ist Pflicht!). Keine Tests für Trivialitäten (Getter/Setter). Tests weisen nach, dass Statusübergänge stimmen (`expect(task.status).toBe("ASSIGNED")`).
- RLS / DB Tests für SQL (Isolationspfade).

---

## 8. Definition of Done & Code Reviews

**Code-Review Checkliste:**
- [ ] Zieht die KI/der Mensch persönliche Geltung der Konsistenz vor? (Muss abgelehnt werden!)
- [ ] Tenant-Isolation serverseitig garantiert? RLS-Policies berücksichtigt?
- [ ] Keine Businesslogik in UI/Controllern platziert?
- [ ] Naming konsistent, TS strict, Lints grün?
- [ ] Keine PII-Lecks in Consolen-Prints oder Fehlerwerfungen?

*Diese Regeln sind verbindlich für alle Developer, ob Mensch oder KI-Assistent (Copilot/Codex).*
