# Ticket 0001 – Auth + Workspace (Multi-Organisation) + Org-Kontext (X-Org-Id)

## Kontext
Pinky ist multi-organisationsfähig: Ein Nutzer kann in mehreren Vereinen/Organisationen aktiv sein.  
Wie bei Slack soll der Nutzer in Web und Mobile den „Workspace“ (aktive Organisation) wechseln können.  
Alle Datenzugriffe müssen strikt im Kontext der aktiven Organisation erfolgen. Die Business-Logik liegt im Backend.

Dieses Ticket schafft die Grundlage für alle folgenden Features (Tasks/MicroTasks, Zuweisung, etc.).

---

## Ziel
1) Ein Nutzer kann sich anmelden (Beta-fähiger Auth-Skeleton).  
2) Ein Nutzer kann seine Organisationen (Memberships) laden.  
3) Ein Nutzer kann eine aktive Organisation wählen/wechseln („Workspace switch“).  
4) Jeder API-Request (außer Auth/Health) wird serverseitig über `X-Org-Id` gegen Membership geprüft.  
5) Web und Mobile zeigen den aktuell aktiven Workspace sichtbar an.

---

## Scope

### In Scope
- Backend Auth Skeleton (Beta-geeignet) mit Token-basierter Auth (Access Token)
- Datenmodell: User, Organization, Membership (inkl. Rolle)
- Endpunkte: Login, Me, Memberships
- Org-Kontext Middleware: erzwingt `X-Org-Id` + Membership
- Minimal UI in Web + Mobile:
  - Login Screen (sehr simpel)
  - Workspace Switcher (Dropdown/Liste)
  - Anzeige der aktiven Organisation (Name/Id)
- Root `.env.example` (oder pro App) ohne Secrets im Repo
- Minimale Backend-Tests für Auth/Org-Guard

### Out of Scope
- Registrierung / Invite-Flows / Beitritt zu Orgs
- Passwort-Reset, MFA, Social Login
- Vollständiges RBAC für alle Endpunkte (nur Grundstruktur + erste Regeln)
- Tasks/MicroTasks Funktionen
- UI-Design-Feinschliff (nur funktional)

---

## Referenzen (verbindlich)
- `/docs/PROJECT.md`
- `/docs/ARCHITECTURE.md`
- `/docs/DOMAIN.md` (Organization, Membership, Rollen, Multi-Org Workspace)
- `/docs/DECISIONS.md` (Org-Kontext über Header `X-Org-Id`, REST, Stack)
- `/docs/STYLEGUIDE.md` (Layering, Naming, KI-Regeln)

---

## Fachliche Regeln (aus DOMAIN.md, hier zusammengefasst)
- Ein User kann mehrere Memberships haben
- Rollen sind pro Organisation: `ADMIN`, `ORGANIZER`, `MEMBER`
- Nutzung passiert immer im Kontext genau einer aktiven Organisation (Workspace)
- Alle Datenzugriffe müssen auf Organisationsebene isoliert sein
- Server prüft bei Org-Requests: User ist Mitglied der Organisation, sonst `403`

---

## Technische Regeln / Konventionen
- Backend läuft standardmäßig auf **Port 3001**
- Web läuft standardmäßig auf Port 3000
- Org-Kontext wird im Request-Header übertragen:
  - `X-Org-Id: <organizationId>`
- Backend validiert `X-Org-Id` in Middleware (nicht im Controller)
- Business-Logik (Membership Checks, Token Checks) liegt im Backend (Service/Middleware)
- Keine Secrets ins Repo, nur `.env.example`
- Kleine Commits, klare Messages

---

## Backend – Anforderungen

### Datenmodell (Minimum)
> Umsetzung mit Prisma + PostgreSQL ist erlaubt/gewünscht, wenn bereits vorgesehen.  
> Falls DB-Anbindung in diesem Ticket zu groß wird, kann für Beta ein In-Memory-Store als Übergang genutzt werden – bevorzugt ist aber DB, weil es Basis für alles ist.

#### Entities
**User**
- `id` (uuid)
- `email` (unique)
- `displayName` (optional)
- timestamps

**Organization**
- `id` (uuid)
- `name`
- timestamps

**Membership**
- `id` (uuid)
- `userId` (FK)
- `organizationId` (FK)
- `role` (`ADMIN` | `ORGANIZER` | `MEMBER`)
- `status` (`ACTIVE` | `INACTIVE`) (optional für Beta)
- unique constraint: (`userId`, `organizationId`)
- timestamps

---

### Auth (Beta Skeleton)
Ziel: schnell funktionsfähig, ohne Sicherheits-Overkill.

**Variante (empfohlen für Beta):**
- `POST /auth/login` nimmt `email` (+ optional `displayName`)
- Wenn User nicht existiert: User erstellen (Beta-only Verhalten)
- Gibt Access Token zurück (JWT oder ähnlich)
- Token enthält `userId`
- Token wird als `Authorization: Bearer <token>` genutzt

> Hinweis: Das ist bewusst nicht „Production Auth“. Für Beta ok, spätere Härtung folgt.

---

### Endpunkte (Minimal)

#### Health
- `GET /health`
- Response: `{ "status": "ok" }`

#### Auth
- `POST /auth/login`
  - Body: `{ "email": string, "displayName"?: string }`
  - Response: `{ "accessToken": string }`

#### Me
- `GET /me`
  - Requires Bearer Token
  - Response: `{ "id": string, "email": string, "displayName"?: string }`

#### Memberships
- `GET /me/memberships`
  - Requires Bearer Token
  - Response: list of memberships incl. org info:
```json
[
  {
    "organization": { "id": "org-uuid", "name": "Floorball Kiel" },
    "role": "MEMBER"
  }
]

Org-Kontext Guard (Middleware)

Gilt für alle Endpunkte außer:

/health

/auth/

Regeln:

Header X-Org-Id muss vorhanden sein → sonst 400

User muss authentifiziert sein → sonst 401

User muss Membership zur X-Org-Id haben → sonst 403

(Optional) Membership muss ACTIVE sein → sonst 403

Output:

Middleware stellt req.org oder req.organizationId bereit

Middleware stellt req.membershipRole bereit (für spätere RBAC)

Validierung (Zod)

Login Body per Zod validieren

Header X-Org-Id in Middleware validieren (z.B. uuid format)

Einheitliche Fehlerantworten (mindestens message, optional code)

Tests (Minimum, Backend)

GET /health returns 200 + {status:"ok"}

Org-Guard:

ohne Token → 401

ohne X-Org-Id → 400

mit Token aber ohne Membership → 403

mit Token + Membership + Header → 200 für einen Test-Endpunkt (z.B. GET /org/ping)

Falls es keinen org-spezifischen Endpunkt gibt, bitte GET /org/ping als minimalen Guard-Test-Endpunkt hinzufügen.

Web App – Anforderungen (Next.js)
Minimal UI

Login Page

Input: Email

Button: Login

Speichert accessToken (z.B. in memory + localStorage für Beta)

Workspace Auswahl

Nach Login: lädt GET /me/memberships

Zeigt Dropdown/Liste aller Organisationen

On select: setzt activeOrgId (z.B. localStorage)

Anzeige: „Aktive Organisation: <Name> (<Id>)“

API Client

Fügt automatisch hinzu:

Authorization: Bearer <token>

X-Org-Id: <activeOrgId> (für org-geschützte Calls, später)

Für Ticket 0001 reicht es, wenn der Header für einen „ping“ Call genutzt wird.

Web-Seite / Route (Vorschlag)

/login

/workspace (oder / als Start nach Login)

Mobile App – Anforderungen (Flutter)
Minimal UI

Login Screen

Input: Email

Button: Login

Speichert accessToken (secure storage optional, für Beta reicht lokal)

Workspace Switcher Screen

lädt GET /me/memberships

Liste der Orgs

Tap setzt activeOrgId (persistent speichern)

Anzeige aktive Organisation

API Client

Attach:

Bearer Token

X-Org-Id (für org-Calls)

Definition of Done (DoD)

 Backend läuft auf Port 3001 und GET /health funktioniert

 POST /auth/login funktioniert und liefert Access Token

 GET /me funktioniert mit Token

 GET /me/memberships liefert Orgs + Rollen

 Org-Guard Middleware erzwingt X-Org-Id und Membership (400/401/403 korrekt)

 Mindestens ein org-geschützter Test-Endpunkt existiert (GET /org/ping)

 Backend Tests für health + org-guard vorhanden und laufen

 Web App: Login + Workspace Switcher funktioniert und zeigt aktive Org

 Mobile App: Login + Workspace Switcher funktioniert und zeigt aktive Org

 Keine Secrets im Repo, .env.example vorhanden

 Struktur und Konventionen aus STYLEGUIDE eingehalten

 Kleine, nachvollziehbare Commits; Änderungen sind auf feature/architecture-setup

Hinweise für KI / Umsetzung

Erst Backend (Auth + Guard) stabil bauen, dann Web/Mobile minimal anschließen

Keine neuen Frameworks einführen

Keine Business-Logik in Web/Mobile

Wenn DB/Prisma in diesem Ticket umgesetzt wird: migrations sauber, keine generierten Build-Artefakte committen


Wenn du willst, schreibe ich dir als nächstes noch den **Codex-Prompt**, der genau dieses Ticket umsetzt (inkl. Reihenfolge der Arbeitspakete + Commit-Struktur).
::contentReference[oaicite:0]{index=0}