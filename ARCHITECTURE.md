# Pinky – Architektur

> Stand: 2026-02-23  
> Fokus: Skalierbare, wartbare und DSGVO-taugliche Plattform für Vereine und ehrenamtliche Organisationen.

---

## 1. Zielbild

Pinky besteht aus zwei primären Clients und einer zentralen Daten- und Logikplattform:

1. **Mobile App (Flutter)** für Mitglieder
2. **Admin Web (Next.js + TypeScript)** für Organisatoren
3. **Supabase-basierte Backend-Plattform** für Daten, Auth, Storage und Serverlogik

Leitprinzip: **Clients sind dünn, Policies und Kernlogik liegen zentral und serverseitig.**

---

## 2. Tech-Stack (empfohlen)

### 2.1 Frontend

- **Mobile App:** Flutter (Dart)
- **Admin Web:** Next.js (React) + TypeScript

### 2.2 UI

- **Flutter:** Material 3 + eigene Design-Tokens via Theme Extensions
- **Web:** Tailwind + shadcn/ui  
  _Alternative:_ MUI, wenn ein schneller Enterprise-UI-Start gewünscht ist

### 2.3 Backend / Datenschicht

- **Datenbank:** PostgreSQL (managed)
- **Plattform:** Supabase (Postgres + Auth + Storage + RLS)
- **Serverlogik:** Supabase Edge Functions (TypeScript), insbesondere für:
  - Task-Matching
  - Benachrichtigungen
  - CSV-Exporte
  - Webhooks

### 2.4 Auth / Security

- **Auth:** Supabase Auth (Email + Magic Link; später Passkeys/OAuth)
- **Mandantentrennung:** RLS + `org_id`/`tenant_id` in allen relevanten Tabellen
- **Secrets:** Environment Variables + Supabase Secrets

### 2.5 Notifications / Messaging

- **Push:** Firebase Cloud Messaging (FCM)
- **Transaktionale E-Mails:** Postmark oder SendGrid (optional für später)

### 2.6 Observability / Ops

- **Error Tracking:** Sentry (Web + Flutter + Edge Functions)
- **Analytics (privacy-friendly):** Plausible (optional)
- **CI/CD:** GitHub Actions
- **Hosting (Web):** Vercel (oder Cloudflare Pages)
- **DB Schema Changes:** Supabase SQL Migrations

### 2.7 Files / Media

- **Storage:** Supabase Storage (z. B. Anhänge, Vereinsbilder)
- **CDN:** Über Supabase/Vercel automatisch

### 2.8 Später bei Wachstum (optional)

- Background Jobs / Queues (Scheduled/Trigger Functions oder Worker)
- Search: Postgres FTS, später Meilisearch/Typesense
- Rate Limiting: Cloudflare/Vercel + API Gateway Regeln

---

## 3. Systemkontext & Datenfluss

```text
[Mobile App (Flutter)]
         |
         | HTTPS (Supabase Auth Token)
         v
[Supabase: Postgres + RLS + Auth + Storage]
         ^
         |
[Admin Web (Next.js)]

Edge Functions (TypeScript) greifen kontrolliert auf Postgres/Storage zu
für Matching, Notifications, Exporte und Webhook-Verarbeitung.

Push-Nachrichten laufen über FCM.
```

Wichtig:
- Jeder Datenzugriff muss tenant-konform sein.
- RLS schützt auf Datenbankebene.
- Edge Functions erzwingen zusätzliche Domänenregeln.

---

## 4. Domänen- und Mandantenmodell

### 4.1 Kernentitäten (konzeptionell)

- `organizations` (Mandanten)
- `memberships` (User ↔ Organization + Rolle)
- `tasks`
- `micro_tasks`
- `assignments`
- `notifications`
- `attachments`

### 4.2 Mandantenregeln

- Jede mandantenrelevante Tabelle trägt `org_id`
- Zugriff nur, wenn Membership zur `org_id` existiert
- `org_id` wird aus Auth-Kontext abgeleitet (nicht aus blindem Client-Input)
- Cross-tenant Zugriff ist standardmäßig verboten

---

## 5. Verantwortlichkeiten

### 5.1 Mobile App (Flutter)

- Task-Feed, Task-Details, Übernahme/Abschluss
- Anzeige persönlicher Aufgaben
- Push-Handling
- Keine Durchsetzung von Sicherheitsregeln (nur UX-Validierung)

### 5.2 Admin Web (Next.js)

- Aufgaben/Micro-Tasks anlegen und verwalten
- Mitglieder- und Rollenverwaltung
- Fortschritts- und Organisationsübersicht
- CSV-Export anstoßen

### 5.3 Supabase + Edge Functions

- Authentifizierung und Session-Handling
- Autorisierung via RLS + serverseitiger Logik
- Matching-Logik
- Benachrichtigungsversand-Orchestrierung
- Webhook-Eingang und Verarbeitung

---

## 6. Security & Privacy by Design

- RLS ist Pflicht für alle produktiven Tabellen
- Least-Privilege für Service-Keys und Tokens
- Secrets ausschließlich über Secret Stores
- Keine PII in Logs oder Fehlermeldungen
- Datenminimierung und Zweckbindung
- Lösch-/Exportfähigkeit personenbezogener Daten berücksichtigen

---

## 7. Deployment- und Umgebungsmodell

Empfohlene Umgebungen:

- **local/dev** – lokale Entwicklung
- **staging** – Integrations- und Abnahmetests
- **production** – produktiver Betrieb

Regeln:
- Strikte Trennung der Umgebungen
- Migrations laufen geordnet pro Umgebung
- Feature-Rollouts bevorzugt schrittweise

---

## 8. CI/CD und Qualitätssicherung

GitHub Actions Pipeline (Mindestumfang):

1. Lint + Format Check
2. Typecheck (Web + Functions)
3. Tests (unit/integration)
4. Build
5. Deployment (staging/prod)

Zusätzlich:
- Migration Checks für SQL
- Optional: Policy-Tests (RLS-Sicherheitsnetz)
- Release-Tags an Sentry melden

---

## 9. Skalierungsstrategie (schrittweise)

**Phase 1 (MVP/Beta)**
- Supabase als zentrale Plattform
- Edge Functions für Kernprozesse
- Einfache Push-Pipeline über FCM

**Phase 2 (Wachstum)**
- Background Scheduling/Queueing ausbauen
- Suchfunktion über Postgres FTS verbessern
- Rate Limiting an Kanten und API aktivieren

**Phase 3 (Reifebetrieb)**
- Ausgereiftes Monitoring/Alerting
- Kosten- und Performance-Optimierung je Tenant
- Erweiterte Sicherheits- und Auditprozesse

---

## 10. Entscheidungsprinzipien (ADR-light)

Technische Entscheidungen orientieren sich an:

1. **Datenschutz & Mandantensicherheit zuerst**
2. **Betriebliche Einfachheit vor unnötiger Komplexität**
3. **Skalierbarkeit über klare Grenzen und modularen Ausbau**
4. **Klare Ownership pro Domäne/Feature**

Bei größeren Richtungsänderungen wird ein kurzer ADR-Eintrag im `/docs`-Bereich ergänzt.
