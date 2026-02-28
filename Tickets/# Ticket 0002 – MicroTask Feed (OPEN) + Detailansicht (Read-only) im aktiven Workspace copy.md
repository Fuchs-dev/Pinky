# Ticket 0002 – MicroTask Feed (Offered vs. OPEN) + Detailansicht

## Kontext
Nach Ticket 0001 existieren:
- Auth (Token)
- Workspace-Konzept inklusive Nutzerprofilen
- Org-Kontext-Guard im Backend via `X-Org-Id`

Jetzt soll der Nutzer im aktiven Workspace erstmals echten fachlichen Inhalt sehen: Das "Angebotssystem" von Pinky. Die Feed-Ansicht soll **klar trennen** zwischen MicroTasks, die dem Nutzer explizit (von einer KI oder manuell) angeboten wurden, und Aufgaben, die allgemein offen sind.

Zudem muss eine Detailansicht her, die **präzise Fragen beantwortet** (Was? Wann? Wo? Wie? Wer ist Ansprechpartner?), damit Ehrenamtliche sofort wissen, worauf sie sich einlassen.

Dieses Ticket ist bewusst **read-only** (keine Statusänderungen). Das Option „Angebot annehmen“ kommt in Ticket 0003.

---

## Ziel
1) Backend stellt MicroTasks im Kontext der aktiven Organisation bereit.
2) Nutzer kann im **Mobile Client** und in der **Web App**:
   - einen Feed einsehen, der in zwei Bereiche unterteilt ist: **"Für dich angeboten"** und **"Allgemein offen"**.
   - einen MicroTask öffnen und dessen **präzise Details** einsehen (Was/Wann/Wo/Wie/Wer).
3) Alle Requests laufen mit:
   - `Authorization: Bearer <token>`
   - `X-Org-Id: <activeOrgId>`
4) Der Feed hat sinnvolle UI-States: Loading / Empty / Error.

---

## Scope

### In Scope
- Datenmodell für `Task` und **detaillierte** `MicroTask`
- `Offer`-Logik im Modell (Relation: Welche MicroTask wird wem angeboten?)
- Backend Endpunkte (Read):
  - `GET /microtasks/feed` (Liefert Offered + Open getrennt oder markiert)
  - `GET /microtasks/:id`
- Serverseitige Org-Isolation
- Manuelles Seeding von Testdaten (damit Feed nicht leer ist)
- Web & Mobile UI:
  - Feed-Ansicht (Unterteilt in "Angebote" und "Offen")
  - MicroTask Detail (Was/Wann/Wo/Wie/Wer)
- Basic Tests (Backend)

### Out of Scope
- MicroTask übernehmen/abschließen (kommt Ticket 0003)
- KI-Splitting von Tasks
- Pagination/Infinite Scroll (optional später)
- Vollständige Filter-UI (optional später)
- Notifications
- Komplexe Suchfunktion

---

## Referenzen (verbindlich)
- `/docs/PROJECT.md` (KI-Angebote, präzise Task-Struktur)
- `/docs/ARCHITECTURE.md`
- `/docs/CODESTYLE.md`

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

#### Entity: MicroTask (Präzise Struktur!)
Laut PROJECT.md müssen Tasks maximal klar sein.
- `id` (uuid)
- `organizationId` (uuid, FK)
- `taskId` (uuid, FK)
- `title` (Was?)
- `description_how` (Wie? Ausführungshilfe)
- `location` (Wo?)
- `contactPerson` (Wer ist Ansprechpartner?)
- `timeframe` oder `dueAt` (Wann?)
- `status` (`OPEN` | `ASSIGNED` | `DONE`)
- `assignedUserId` (uuid, optional)
- timestamps

#### Entity: TaskOffer (Das "Angebot")
Neu durch KI-Profil-Matching bedingt. Eine MicroTask kann einem Nutzer gezielt angeboten werden, bevor/während sie `OPEN` ist.
- `id` (uuid)
- `microTaskId` (FK)
- `userId` (FK)
- `status` (`SUGGESTED` | `REJECTED`)
- timestamps

**Constraints**
- `MicroTask.organizationId` muss zur Task.organizationId passen
- `status` default `OPEN`

---

### Endpunkte

### Endpunkte

#### 1) `GET /microtasks/feed`
Anpassung für den Feed.
Sollte die Tasks so aufbereiten, dass der Client weiß, was ein Angebot ist und was generisch offen ist.
Response (Beispiel, minimal):
```json
{
  "offered": [
    {
      "id": "uuid",
      "title": "Getränke am Freitag abholen",
      "status": "OPEN",
      "task": { "id": "uuid", "title": "Sommerfest" },
      "timeframe": "Freitag ab 15 Uhr",
      "location": "Getränkemarkt Süd"
    }
  ],
  "open": [
      // ... list of OPEN microtasks without explicit offer to this user
  ]
}
```
Regeln:
- Liefert nur MicroTasks, deren `organizationId = X-Org-Id`.
- "offered" sind Tasks, für die es einen `TaskOffer` für den aufrufenden `userId` gibt mit Status `SUGGESTED`.
- "open" sind alle anderen.

#### 2) `GET /microtasks/:id`
Gibt das komplette, detaillierte Objekt zurück.
```json
{
  "id": "uuid",
  "title": "Getränke am Freitag abholen",
  "description_how": "Transporter steht am Vereinsheim bereit. Leergut mitnehmen.",
  "location": "Getränkemarkt Süd",
  "contactPerson": "Maria (Vorstand)",
  "status": "OPEN",
  ...
}
```


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

/feed – Feed (Helfer-Dashboard)

/feed/[id] – Detail

Feed UI
- Zeigt Liste unterteilt in zwei Segmente: **"Angebote für mich"** und **"Weitere offene Aufgaben"**
- Jede Zeile/Karte zeigt Title, Task.Title und Wann/Wo.

Detail UI
- Klar strukturiert: Was? Wann? Wo? Wie? Ansprechpartner?

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

 Backend Datenmodell Task, detaillierte MicroTask und TaskOffer vorhanden

 GET /microtasks/feed liefert kombinierte Struktur (Offered + Open)

 GET /microtasks/:id liefert detaillierte Struktur (Isolation gewahrt)

 Seed/Testdaten existieren, inkl. eines simulierten Angebots für den Dev-User

 Backend Tests für Feed/Isolation/404 vorhanden und laufen

 Web/App UI Feed segmentiert korrekt und zeigt UI-States

 Detailansicht gibt Antworten auf Was/Wann/Wo/Wie/Wer

 Keine Business-Logik in Clients

 STYLEGUIDE/Einfachheit eingehalten, kleine Commits

 Alles auf Branch feature/architecture-setup


Hinweise für KI / Umsetzung

Backend zuerst (Model + Endpoints + Tests + Seed), dann Web, dann Mobile

Keine neuen Frameworks einführen

Keine Pagination, keine Suche – nur sauberer Read-Flow

IDs/Orgs nicht leaken: fremde Org = 404 auf Detail

::contentReference[oaicite:0]{index=0}

