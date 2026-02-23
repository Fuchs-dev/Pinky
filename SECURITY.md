# Pinky – Security Strategy

> Stand: 2026-02-23  
> Gültigkeit: Mobile App (Flutter), Admin Web (Next.js), Supabase Plattform (Postgres/Auth/Storage/RLS), Edge Functions, CI/CD und Betrieb.

---

## 1. Sicherheitsziele

Diese Strategie definiert die Sicherheitsziele und Maßnahmen für Pinky als mandantenfähige Plattform für Vereine.

**Primäre Ziele:**

1. **Vertraulichkeit** personenbezogener und organisationsbezogener Daten
2. **Integrität** von Aufgaben-, Rollen- und Statusdaten
3. **Verfügbarkeit** kritischer Kernfunktionen (Auth, Task-Zugriffe, Benachrichtigungen)
4. **Mandantentrennung** ohne Querzugriffe zwischen Organisationen
5. **DSGVO-Compliance** (Datensparsamkeit, Nachvollziehbarkeit, Lösch-/Exportfähigkeit)

---

## 2. Scope & Systemgrenzen

Die Strategie umfasst:

- **Clients:**
  - Mobile App (Flutter)
  - Admin Web (Next.js)
- **Backend-Plattform:**
  - Supabase Auth
  - PostgreSQL
  - Supabase Storage
  - Supabase Edge Functions
- **Integrationen:**
  - Firebase Cloud Messaging (FCM)
  - E-Mail Provider (optional, z. B. Postmark/SendGrid)
  - Sentry (Monitoring)
- **Delivery/Betrieb:**
  - GitHub Actions
  - Hosting (Vercel/Cloudflare)

Nicht im primären Scope:
- Endgeräte-Hardening außerhalb App-Kontext
- Organisationsinterne Prozesse außerhalb der Plattform

---

## 3. Threat Model (Top-Risiken)

### 3.1 Wesentliche Bedrohungen

- **Broken Access Control / IDOR**
  - Unautorisierter Zugriff auf Tasks anderer Organisationen
- **Fehlerhafte Tenant-Isolation**
  - Fehlende/umgehbare `org_id`-Filter
- **Secret Leakage**
  - Schlüssel in Repo, Logs oder Client-Bundles
- **Injection & Input Manipulation**
  - Unsichere SQL-/Webhook-/Export-Verarbeitung
- **Account Takeover**
  - Missbrauch von Magic Links/Session Tokens
- **Abuse/Spam**
  - Missbrauch von APIs, Notifications, Exports
- **Supply-Chain Risiken**
  - Unsichere Dependencies, kompromittierte Actions
- **PII-Leakage in Monitoring**
  - Personenbezug in Logs/Fehlern/Telemetry

### 3.2 Security-Priorität

1. Mandantentrennung und Autorisierung
2. Geheimnisschutz und sichere Konfiguration
3. Daten- und Transportschutz
4. Nachvollziehbarkeit (Audits/Monitoring)
5. Abwehr von Missbrauch und Betriebsstabilität

---

## 4. Sicherheitsprinzipien

- **Zero Trust by Default:** Kein Client-Input wird blind vertraut
- **Server-authoritative Security:** Kritische Prüfungen nur serverseitig
- **Least Privilege:** Minimale Rechte für Nutzer, Services, Tokens
- **Defense in Depth:** RLS + Service-Checks + Monitoring + Audits
- **Secure by Default:** Sichere Defaults statt optionaler Hardening-Schalter
- **Privacy by Design:** Datenminimierung und PII-Schutz in allen Flows

---

## 5. Identity, AuthN & AuthZ

### 5.1 Authentifizierung

- Supabase Auth mit Email + Magic Link (MVP)
- Später: OAuth/Passkeys möglich
- Session-Lebenszeiten begrenzen
- Device-/Session-Management für kritische Rollen ermöglichen

### 5.2 Autorisierung

- Rollenbasiert über Membership je Organisation
- Rollenbeispiele: `owner`, `admin`, `organizer`, `member`
- Kritische Operationen (z. B. Rollenänderungen, Exporte) mit expliziten Berechtigungsprüfungen

### 5.3 Session-Sicherheit

- Tokens nur in sicheren Speichern (z. B. Secure Storage in Flutter)
- Keine Token in Logs, Query-Strings oder Crash-Reports
- Bei Verdacht auf Missbrauch aktive Session-Invalidierung ermöglichen

---

## 6. Multi-Tenant Isolation (Kernanforderung)

### 6.1 Datenmodell

- Jede mandantenrelevante Tabelle besitzt `org_id`
- Foreign Keys sichern konsistente Zugehörigkeiten
- Indizes auf (`org_id`, `id`) zur Performance und klaren Isolation

### 6.2 RLS-Strategie

- RLS auf allen produktiven Tabellen aktivieren
- Policies prüfen:
  - Mitgliedschaft vorhanden
  - Rolle ausreichend
  - Aktion erlaubt (`select`, `insert`, `update`, `delete`)
- Standardregel: **deny by default**

### 6.3 Implementierungsregeln

- `org_id` aus Auth-Kontext ableiten (JWT Claims/Membership)
- Kein Vertrauen in clientseitig übergebene `org_id`
- Service-role Keys nur serverseitig und minimal einsetzen

---

## 7. Data Protection & DSGVO

### 7.1 Datenklassifizierung

- **PII:** Name, E-Mail, Profilinfos
- **Organisationsdaten:** Aufgaben, Rollen, Prozessdaten
- **Technische Metadaten:** Logs, Events, Diagnoseinformationen

### 7.2 Maßnahmen

- Datensparsamkeit pro Use Case
- Zweckbindung pro Datendomäne
- Löschkonzepte mit Fristen/Anonymisierung
- Exportfähigkeit personenbezogener Daten (DSAR)
- Auftragsverarbeitung (AVV) mit zentralen Dienstleistern

### 7.3 Logging & Telemetrie

- Keine PII in Logs/Events/Tracing
- Fehlercodes statt Freitext mit personenbezogenen Inhalten
- Sentry Data Scrubbing aktivieren

---

## 8. Secret & Key Management

- Secrets nur in:
  - Supabase Secrets
  - Hosting/CI Secret Stores
- Kein Secret im Git-Repo, in Tickets oder in Beispielcode
- Rotationsprozess definieren (mind. halbjährlich, bei Vorfall sofort)
- Access-Tokens mit minimalen Scopes
- Notfallprozess für Key-Revoke dokumentieren

---

## 9. Application Security Controls

### 9.1 Input Validation

- Externe Eingaben strikt validieren (TypeScript: z. B. Zod)
- Whitelist-Ansatz für erlaubte Felder/Enums
- CSV-/Webhook-Payloads robust prüfen

### 9.2 Output Encoding

- XSS-Schutz durch sichere Rendering-Patterns
- Keine ungeprüfte HTML-Injektion

### 9.3 API- und Function-Schutz

- Auth-Pflicht für nicht-öffentliche Endpunkte
- Idempotenz für Webhooks und Exporte
- Signaturprüfung bei eingehenden Webhooks
- Rate Limits auf kritischen Routen

### 9.4 Upload & Storage

- Dateityp-/Größenvalidierung
- Sichere Pfadstruktur mit tenant-bezogenen Buckets/Prefixes
- Zugriff auf Anhänge via signierte URLs + kurze TTL

---

## 10. Infrastruktur- & Plattform-Sicherheit

### 10.1 Transport Security

- TLS überall (Client ↔ Web ↔ Supabase ↔ Integrationen)
- HSTS für Web-Frontend

### 10.2 Web Security Header

- Content Security Policy (CSP)
- X-Frame-Options / frame-ancestors
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

### 10.3 Betriebs-Hardening

- Trennung von dev/staging/prod
- Prinzip „kein direkter Produktionszugriff ohne Bedarf“
- Regelmäßige Überprüfung von IAM-/Projektrollen

---

## 11. Secure SDLC (Entwicklung & CI/CD)

### 11.1 Pflicht-Gates in CI

- Lint + Typecheck + Tests
- Dependency Audit (bekannte CVEs)
- Secret Scanning
- Optional: SAST für TS/Flutter

### 11.2 Dependency Management

- Lockfiles verpflichtend
- Nur gepflegte Libraries mit aktivem Updatezyklus
- Regelmäßige Patchfenster (z. B. monatlich)

### 11.3 Migrations & Policies

- Jede Migration mit Security-Review (RLS/Privileges)
- Policy-Tests für Mandantentrennung
- Keine direkten Schemaänderungen außerhalb Migrationspfad

---

## 12. Monitoring, Detection & Response

### 12.1 Monitoring

- Sentry in Mobile, Web und Edge Functions
- Alarmierung für:
  - Auth-Fehlerraten
  - 5xx-Spikes
  - ungewöhnliche Export-/Webhook-Aktivität

### 12.2 Auditierbarkeit

- Audit-Events für sicherheitsrelevante Aktionen:
  - Rollenänderungen
  - Exportstarts
  - Policy-kritische Admin-Aktionen
- Audit-Logs manipulationsarm speichern

### 12.3 Incident Response

- Runbook für Sicherheitsvorfälle:
  1. Erkennung
  2. Eindämmung
  3. Analyse
  4. Behebung
  5. Kommunikation
  6. Lessons Learned
- RACI für Security Incident klar festlegen

---

## 13. Backup, Recovery & Business Continuity

- Regelmäßige Datenbank-Backups mit Wiederherstellungstests
- Definierte RPO/RTO-Ziele pro Umgebung
- Dokumentierter Restore-Prozess (inkl. Verantwortliche)
- Notfallübungen mindestens jährlich

---

## 14. Sicherheits-Backlog (Roadmap)

### Kurzfristig (MVP)

- RLS auf allen Kern-Tabellen + Policy-Tests
- Secret Scanning im CI aktiv
- Sentry Scrubbing + Error-Code-Standard
- Baseline Security Header im Admin-Web

### Mittelfristig

- Webhook-Signaturframework
- Erweiterte Audit-Logs
- Automatisierte Dependency-Updates mit Review
- Rate-Limit-Tuning auf kritischen Endpunkten

### Langfristig

- Passkeys/OAuth Rollout
- Erweiterte Anomalie-Erkennung
- Regelmäßige externe Security-Assessments/Pentests

---

## 15. Security Review Checkliste (operativ)

- [ ] RLS für neue/angepasste Tabellen aktiv und getestet
- [ ] `org_id`/Tenant-Bezug in allen relevanten Datenpfaden vorhanden
- [ ] Keine Secrets/PII in Code, Logs oder Monitoring
- [ ] Kritische Endpunkte haben Auth, Validation, Rate-Limit
- [ ] Webhooks signaturgeprüft und idempotent
- [ ] Security-Gates in CI grün
- [ ] Incident-Runbook und Kontaktwege aktuell

---

## 16. Governance & Verantwortlichkeiten

- **Product/Engineering:** Umsetzung sicherer Features
- **Tech Lead:** Architekturelle Sicherheitsfreigaben
- **Security Owner (benannt):** Richtlinien, Reviews, Incident-Koordination
- **Alle Entwickler:innen:** Secure Coding, Review-Disziplin, Meldepflicht bei Auffälligkeiten

Die Strategie wird mindestens quartalsweise oder bei relevanten Architekturänderungen aktualisiert.
