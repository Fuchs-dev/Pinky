# Pinky – Architektur

> **Stand:** 2026-02-23  
> **Fokus:** Skalierbare, wartbare und DSGVO-taugliche Plattform für Vereine und ehrenamtliche Organisationen.

---

## 1. Überblick & Zielbild

Pinky besteht aus drei Hauptkomponenten (Clients vs. zentrale Plattform):

1. **Mobile App (Flutter)** für Mitglieder (Micro-Tasks finden, übernehmen, Status ändern, Queue-Intent).
2. **Admin Web (Next.js)** für Organisatoren (Projekte planen, Micro-Tasks erstellen/zuteilen, Mitgliederverwaltung, Übersicht).
3. **Zentrale Backend-Plattform** für Datenhaltung, Authentication, Serverlogik und Hintergrundjobs (Zuteilungslogik, KI-Splitting, Benachrichtigungen).

**Leitprinzip:** Clients (Mobile & Web) sind dünn, alle Policies (Sicherheit, DSGVO) und Kern-Business-Logik liegen **zentral serverseitig**. Web und Mobile erfinden keine eigene Business-Logik.

---

## 2. Tech-Stack (Empfohlen)

### 2.1 Backend-Plattform & Datenschicht
*Der Stack setzt auf Supabase als Accelerator, kombiniert mit eigenen Backend-Layern für komplexe Logik (Edge Functions/Node.js).*
- **Datenbank:** PostgreSQL (managed, relational)
- **Plattform:** Supabase (Postgres + Auth + Storage + RLS)
- **Serverlogik:** Node.js + TypeScript (als dediziertes Backend) oder Supabase Edge Functions. Letzteres ist bevorzugt für Webhooks und Exporte.
- **Validierung:** Zod (strenge Input-Validierung)
- **DB Layer/ORM:** Prisma (falls Node.js-Backend gewählt wird) ansonsten direkte Supabase Clients.

### 2.2 Mobile App (Mitglieder)
- **Framework:** Flutter (Dart)
- **Architektur:** Feature-first Struktur
- **State Management:** Riverpod (oder ähnlich)
- **Routing:** `go_router`
- **Networking:** HTTP Client (z. B. `dio`)
- **UI:** Material 3 mit eigenen Design-Tokens via Theme Extensions
- **Security:** Tokens via Secure Storage speichern

### 2.3 Admin Web (Organisatoren)
- **Framework:** Next.js (React) + TypeScript
- **UI-Styling:** Tailwind CSS + shadcn/ui (*Alternative: MUI für schnellen Enterprise-Start*)
- **API Calls:** `fetch` / `axios` (einheitlich halten)
- **Security:** Keine Business-Logik, dient nur als UI + Validierung für UX

### 2.4 Notifications, Ops & Hintergrundjobs
- **Push-Nachrichten:** Firebase Cloud Messaging (FCM)
- **Transaktions-E-Mails:** Postmark oder SendGrid
- **Error Tracking:** Sentry (Web + Flutter + Edge Functions)
- **CI/CD:** GitHub Actions (Lint, Typecheck, Tests, Build, Deployment, Migrations)
- **Worker/Jobs:** Node-Prozess / Job-Queue für Task-Matching, Notifications, KI-Splitting.

---

## 3. Systemkontext & Datenfluss

```text
       [Mobile App (Flutter)]
                 |
                 | HTTPS / Supabase Auth Token
                 v
[Zentrales Backend: API / Supabase + Postgres] -> [Storage] (Anhänge)
                 ^                           \
                 |                            -> [Worker / Edge Functions]
       [Admin Web (Next.js)]                       Dienste: Matching, Notifications (FCM/Mail), CSV-Exporte
```

**Zentrale Workflow-Schritte:**
- Zustand und Zugriff werden komplett im Backend geprüft (via RLS oder serverseitigen Prüfungen).
- Push-Nachrichten werden über FCM orchestriert.
- KI-Splitting läuft isoliert in Background-Jobs oder separaten Staging-Umgebungen und wird vor Datenpersistenz durch Organisatoren bestätigt.

---

## 4. Verantwortlichkeiten (Klar abgegrenzt)

### 4.1 Backend (Supabase + Node.js/Edge Functions)
Ist die **einzige Quelle der Wahrheit**. Verantwortlich für:
- Authentifizierung (Login, Session-Handling, Sign-up).
- Rollen & Berechtigungen (RBAC, Mandantentrennung).
- Datenmodelle und Konsistenzsicherung.
- Micro-Task-Kernlogik (Erstellen, Splitten, Zuweisen, Zustandsmaschine).
- Audit / Activity-Log (Wer hat was, wann modifiziert?).
- Orchestrierung von Hintergrundjobs (Queue-Benachrichtigungen, Vorschläge, autom. Zuteilungen).

### 4.2 Admin Web (Next.js)
Ist das **Steuerungswerkzeug der Organisatoren**. Verantwortlich für:
- UI für die Vereins-Organisatoren.
- Anlagen von Aufgaben/Projekten und Micro-Tasks.
- KI-Splitting von großen Aufgaben anstoßen (und Vorschläge sichten).
- Mitglieder- und Rollenverwaltung.
- Dashboard, Fortschrittsüberwachung, Reports und CSV-Exporte anstoßen.

### 4.3 Mobile App (Flutter)
Ist das **Werkzeug der Ehrenamtlichen/Beteiligten**. Verantwortlich für:
- Micro-Task Feed anzeigen und Filtern nach Relevanz.
- Details einsehen.
- Aufgabenzyklus bedienen (Übernehmen, Abschließen, Blockieren).
- Warteschlangen-Beitritt (Queue-Intent bekunden) für MicroTasks.
- Reines Handling von Push-Notifications und Deep Links.
- Eigene Übersicht („Meine Tasks“).

---

## 5. Domänen- und Mandantenmodell

### 5.1 Kernentitäten
- `organizations`: Die jeweiligen Vereine / Mandanten.
- `memberships`: Verknüpfung von `users` mit `organizations` inklusive relevanter Rolle.
- `tasks`: Übergeordnete Aufgaben ("Event organisieren").
- `micro_tasks`: Kleine, heruntergebrochene Schritte ("Getränke abholen").
- `assignments`: Verknüpfungen von Micro-Tasks zu Mitgliedern.
- `notifications` & `attachments`.

### 5.2 Mandantenregeln (Strikt)
- **Jede** mandantenrelevante Tabelle trägt eine `org_id` (oder `tenant_id`).
- Zugriff ist **nur** dann erlaubt, wenn eine gültige `membership` zur ermittelten `org_id` existiert.
- Die `org_id` wird zwingend aus dem serverseitig geprüften Auth-Kontext (Token/Session) abgeleitet – **niemals aus blindem Client-Input**.
- **Cross-tenant Zugriff ist als Standard streng untersagt.**

---

## 6. Security & Privacy by Design

- **Daten gehören zur Organisation:** Alle nutzergenerierten Inhalte sind streng einer Organisation zugeordnet.
- **Row-Level-Security (RLS):** Ist Pflicht für alle produktiven Tabellen in Supabase/PostgreSQL.
- **Prinzip der geringsten Privilegien:** Service-Keys und Tokens erhalten nur jene Befugnisse, die absolut notwendig sind.
- **Keine Secrets ins Repo:** Alle Umgebungs-Keys wandern in sichere Secret Stores (`.env` lokal, bzw. Production/Platform Environments).
- **Keine PII in Logs:** Logs oder Error-Tracker dürfen niemals Personally Identifiable Information (E-Mail, Klarnamen etc.) leaken.
- **DSGVO:** Datenminimierung und Zweckbindung ab Tag 1. Lösch- und Exportfähigkeit ("CSV-Export") von Accounts ist Kernfunktionalität.

---

## 7. Umgebungen & Deployment

Wir nutzen ein Monorepo, damit Backend, Web, Mobile und Dokumentation (inkl. Architektur, Styleguides) konsistent bleiben.

**Empfohlene Umgebungen:**
- **local/dev**: Lokale Entwicklung für die Devs.
- **staging**: Testumgebung für Integrations-/Abnahmetests mit synthetischen Testdaten. (In dieser Umgebung darf die KI testweise arbeiten).
- **production**: Produktiver Echtbetrieb. Hier gelten höchste Schutzstandards. Strikte Trennung von Staging/Dev. (KI-gestützte Datenverarbeitung für Produktionsdaten muss transparent und bestätigt laufen).

**CI/CD Pipeline Mindestumfang:**
1. Lint + Format Check
2. Typecheck (Web, App, Functions)
3. Automatische Tests (Unit/Integration)
4. Build
5. Schema Migrations Check
6. Deployment (ggf. automatisiert auf Staging, manuell auf Prod)

---

## 8. Skalierungsstrategie

- **Phase 1 (MVP/Beta):** Supabase als schnelle Basis, Node.js Jobs/Edge Functions für Kernprozesse, einfacher Push (FCM), simple WebUI und Flutter-Features. `local` + `staging` Umgebungen primär im Fokus der Entwickler vor Beta-Rollout.
- **Phase 2 (Wachstum):** Ausbau des Background-Queuings / Worker-Load-Balancing, robustere FTS (Postgres Fulltext Search), Rate Limiting an Gateway/API.
- **Phase 3 (Reife):** Finetuning, dediziertes Monitoring (Grafana/Datadog optional neben Sentry), Mandanten-Performance-Kalkulation, fortgeschrittene Audit-Prozesse.

---

> **ADR (Entscheidungsprinzipien):** Datenschutz und Mandantensicherheit haben Vorrang vor allem anderen. Die zweitwichtigste Direktive ist betriebliche Einfachheit (`KISS`), um die Entwicklungsgeschwindigkeit für das MVP/Beta hochzuhalten. Skalierung erfolgt schrittweise durch klare Modulgrenzen.
