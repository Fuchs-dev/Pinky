# Ticket 0002 – MicroTask Feed (OPEN) + Detailansicht (Read-only) im aktiven Workspace

## Kontext
Nach Ticket 0001 existieren:
- Auth (Token)
- Workspace-Konzept (User hat mehrere Organisations-Memberships)
- Org-Kontext-Guard im Backend via `X-Org-Id`

Jetzt soll der Nutzer im aktiven Workspace erstmals echten fachlichen Inhalt sehen:  
einen Feed der offenen Micro-Tasks (`OPEN`) sowie eine Detailansicht pro Micro-Task.

Dieses Ticket ist bewusst **read-only** (keine Statusänderungen). Das „Übernehmen“ kommt in Ticket 0003.

---

## Ziel
1) Backend stellt MicroTasks im Kontext der aktiven Organisation bereit (gefiltert nach `OPEN`).  
2) Nutzer kann im **Mobile Client** und in der **Web App**:
   - eine Liste offener MicroTasks sehen
   - einen MicroTask öffnen und Details sehen
3) Alle Requests (außer Health/Auth) laufen mit:
   - `Authorization: Bearer <token>`
   - `X-Org-Id: <activeOrgId>`
4) Der Feed hat sinnvolle UI-States: Loading / Empty / Error.

---

## Scope

### In Scope
- Datenmodell für `Task` und `MicroTask` (Minimum)
- Backend Endpunkte (Read):
  - `GET /microtasks?status=OPEN`
  - `GET /microtasks/:id`
- Serverseitige Org-Isolation: MicroTasks nur aus `X-Org-Id` Organisation liefern
- Minimaler Seed/Testdaten-Mechanismus für Dev/Staging, damit Feed nicht leer ist
- Web UI:
  - MicroTask Feed (Liste)
  - MicroTask Detail (read-only)
- Mobile UI:
  - MicroTask Feed (Liste)
  - MicroTask Detail (read-only)
- Basic Tests (Backend): Filter, Org-Isolation, 404

### Out of Scope
- MicroTask übernehmen/abschließen (kommt Ticket 0003)
- KI-Splitting von Tasks
- Pagination/Infinite Scroll (optional später)
- Vollständige Filter-UI (optional später)
- Notifications
- Komplexe Suchfunktion

---

## Referenzen (verbindlich)
- `/docs/PROJECT.md`
- `/docs/ARCHITECTURE.md`
- `/docs/DOMAIN.md` (Task, MicroTask, Statusmodell)
- `/docs/DECISIONS.md` (Org-Kontext via Header)
- `/docs/STYLEGUIDE.md`

---

## Fachliche Regeln (aus DOMAIN.md, hier zusammengefasst)
- MicroTasks sind immer:
  - Teil genau einer Task
  - Teil genau einer Organization
- MicroTask Status: `OPEN`, `ASSIGNED`, `DONE` (optional `BLOCKED` später)
- Ticket 0002 zeigt ausschließlich `OPEN` MicroTasks im Feed
- Zugriff:
  - Nur Mitglieder der Organisation dürfen MicroTasks der Organisation sehen
  - Org-Kontext wird serverseitig geprüft (`X-Org-Id` + Membership)

---

## Backend – Anforderungen

### Datenmodell (Minimum)
> Umsetzung bevorzugt über Prisma + PostgreSQL (wenn bereits angelegt).  
> Falls DB noch nicht existiert, muss sie spätestens in Ticket 0002 eingeführt werden, da wir echte Daten brauchen.

#### Entity: Task
- `id` (uuid)
- `organizationId` (uuid, FK)
- `title` (string)
- `description` (optional)
- timestamps

#### Entity: MicroTask
- `id` (uuid)
- `organizationId` (uuid, FK) **(redundant zur schnelleren Filterung, aber ok/empfohlen)**
- `taskId` (uuid, FK)
- `title` (string)
- `description` (optional)
- `status` (`OPEN` | `ASSIGNED` | `DONE`)
- `assignedUserId` (uuid, optional; in Ticket 0002 i. d. R. null)
- `dueAt` (optional, ISO date)
- timestamps

**Constraints**
- `MicroTask.organizationId` muss zur Task.organizationId passen (serverseitig erzwingen)
- `status` default `OPEN`

---

### Endpunkte

#### 1) `GET /microtasks`
Query:
- `status` optional (default `OPEN`)

Beispiel:
- `GET /microtasks` → liefert `OPEN`
- `GET /microtasks?status=OPEN` → liefert `OPEN`

Response (Beispiel, minimal):
```json
[
  {
    "id": "uuid",
    "title": "Getränke einkaufen",
    "status": "OPEN",
    "task": { "id": "uuid", "title": "Sommerfest organisieren" },
    "dueAt": null
  }
]

Regeln:

Liefert nur MicroTasks, deren organizationId = X-Org-Id

Auth + Org-Guard Pflicht (aus Ticket 0001)

Sortierung (Minimum):

createdAt desc oder dueAt asc (einheitlich dokumentieren)

2) GET /microtasks/:id

Response (Beispiel, minimal):

{
  "id": "uuid",
  "title": "Getränke einkaufen",
  "description": "Wasser, Saft, Cola für ca. 20 Personen",
  "status": "OPEN",
  "task": { "id": "uuid", "title": "Sommerfest organisieren" },
  "dueAt": null,
  "createdAt": "2026-01-25T10:00:00.000Z"
}


Regeln:

Wenn MicroTask nicht existiert → 404

Wenn MicroTask nicht zur Org passt (organizationId != X-Org-Id) → nicht leaken:

bevorzugt 404 (damit man nicht über IDs Orgs erraten kann)

Validation

status Query validieren (Zod)

id Param als UUID validieren (Zod oder helper)

Einheitliche Error Responses (message, optional code)

Seed / Testdaten (für Dev)

Ziel: nach Start sieht man sofort Daten.

Option A (empfohlen, simpel):

Script npm run seed in apps/api

erzeugt:

1 Org

1 User

1 Task

3 MicroTasks (OPEN)

Option B (noch simpler):

Beim Start in Dev, wenn DB leer → einmalig seed (klar markieren)

Backend Tests (Minimum)

GET /microtasks ohne X-Org-Id → 400 (Guard)

GET /microtasks mit Org, aber ohne Membership → 403

GET /microtasks mit Org + Membership → 200 + nur MicroTasks dieser Org

GET /microtasks/:id:

returns 404 for unknown id

returns 404 if microtask belongs to different org

Web App – Anforderungen (Next.js)
Seiten / Routen (Vorschlag)

/microtasks – Feed

/microtasks/[id] – Detail

Feed UI

zeigt Liste aller OPEN MicroTasks im aktiven Workspace

Jede Zeile/Karte zeigt:

title

task.title (Kontext)

optional dueAt

Status Badge (OPEN)

Klick auf Eintrag → Detailansicht

States

Loading: „Lade Aufgaben…“

Empty: „Keine offenen Aufgaben“

Error: „Fehler beim Laden“ + Retry Button

API Client

setzt automatisch Header:

Authorization

X-Org-Id (aktiver Workspace)

Mobile App – Anforderungen (Flutter)
Screens

MicroTaskListScreen – Feed

MicroTaskDetailScreen – Detail

Feed UI

Liste OPEN MicroTasks

Tap → Detail

Anzeige analog Web (Title, Task, optional dueAt)

States

Loading Spinner

Empty State Text

Error State + Retry

Navigation

go_router oder vorhandenes Routing

Deep Link optional später

API Client

setzt Bearer Token + X-Org-Id für Requests

Definition of Done (DoD)

 Backend Datenmodell Task + MicroTask vorhanden (DB)

 GET /microtasks liefert standardmäßig OPEN MicroTasks

 GET /microtasks/:id liefert Details oder 404 (inkl. Org-Isolation)

 Org-Kontext via X-Org-Id wird strikt serverseitig enforced

 Seed/Testdaten existieren, sodass Feed nach Start nicht leer ist

 Backend Tests für Filter/Isolation/404 vorhanden und laufen

 Web Feed + Detail funktionieren und zeigen UI-States korrekt

 Mobile Feed + Detail funktionieren und zeigen UI-States korrekt

 Keine Business-Logik in Clients

 STYLEGUIDE eingehalten, kleine Commits

 Alles auf Branch feature/architecture-setup

Hinweise für KI / Umsetzung

Backend zuerst (Model + Endpoints + Tests + Seed), dann Web, dann Mobile

Keine neuen Frameworks einführen

Keine Pagination, keine Suche – nur sauberer Read-Flow

IDs/Orgs nicht leaken: fremde Org = 404 auf Detail

::contentReference[oaicite:0]{index=0}

