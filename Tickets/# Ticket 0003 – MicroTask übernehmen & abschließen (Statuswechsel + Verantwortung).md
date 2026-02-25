# Ticket 0003 – MicroTask Angebote annehmen & MyTasks Ansicht

## Kontext
Nach Ticket 0002 können Nutzer im aktiven Workspace "Angebote für mich" sowie "Weitere offene Aufgaben" sehen und deren Details aufrufen.  
Jetzt soll die erste **echte Interaktion** möglich werden:  
Ein Nutzer nimmt ein explizites Angebot an (`TaskOffer` -> ACCEPTED) oder übernimmt eine allgemein offene Aufgabe. Anschließend kann er sie als erledigt markieren.

Dieses Ticket baut den ersten **Write-Flow** auf und setzt folgende Regeln um:
- Annahme / Ablehnung von KI-Angeboten
- Verantwortung (Ownership) für Aufgaben
- Eine neue Ansicht: "Meine Aufgaben" (angenommen und erledigt)

---

## Ziel
1) Ein Nutzer kann ein Angebot annehmen (`TaskOffer -> ACCEPTED`, `MicroTask -> ASSIGNED`) oder ablehnen (`TaskOffer -> REJECTED`).  
2) Ein Nutzer kann eine reguläre `OPEN` MicroTask übernehmen → Status wird `ASSIGNED`.  
3) Eine übernommene MicroTask landet zwingend in einer eigenen Liste "Meine Aufgaben" des Users.
4) Dort kann die Aufgabe vom zuständigen Nutzer als `DONE` markiert werden ("Liste zeigt angenommene und abgeschlossene").  
5) Die Regeln aus dem Domainmodell werden strikt serverseitig eingehalten.

---

## Scope

### In Scope
- Backend-Endpunkte:
  - `POST /microtasks/:id/offer/accept`
  - `POST /microtasks/:id/offer/reject`
  - `POST /microtasks/:id/assign` (reguläre offene Tasks)
  - `POST /microtasks/:id/complete`
  - `GET /me/microtasks` (Meine Aufgaben: ASSIGNED & DONE)
- Serverseitige Validierung aller Zustandsübergänge
- UI-Erweiterungen in Web & Mobile:
  - Button „Angebot annehmen“ / „Ablehnen“ bei Angeboten
  - Button „Übernehmen“ bei generischen OPEN Tasks
  - Eigener Screen/Bereich: **"Meine Aufgaben"**
  - Button „Als erledigt markieren“ in "Meine Aufgaben"
- Backend-Tests für alle relevanten Statusfälle

---

## Referenzen (verbindlich)
## Referenzen (verbindlich)
- `/docs/PROJECT.md` (KI-Matching, MyTasks Liste, Statusmodell)
- `/docs/ARCHITECTURE.md`
- `/docs/CODESTYLE.md` (Code extrem simpel halten!)
- Ticket 0001 & 0002

---

## Fachliche Regeln
- `OPEN` → `ASSIGNED`: Wenn Angebot angenommen oder generisch übernommen.
- Bei Angebotsablehnung wird `TaskOffer` auf `REJECTED` gesetzt; die `MicroTask` bleibt/wird `OPEN` für den allgemeinen Feed.
- `ASSIGNED` → `DONE`: Wenn der verantwortliche User es abschließt.
- Meine Aufgaben (MyTasks): Zeigt alle `ASSIGNED` und `DONE` Tasks des authentifizierten Nutzers für die aktuelle Orga.
- Eine MicroTask hat nur einen Verantworlichen (`assignedUserId`).

---

## Backend – Anforderungen

### Endpunkt: MicroTask übernehmen

#### `POST /microtasks/:id/assign`

Voraussetzungen:
- Authentifiziert
- Org-Kontext (`X-Org-Id`) gültig
- User ist Mitglied der Organisation

Regeln:
1) MicroTask existiert?
   - nein → `404`
2) MicroTask gehört zur Organisation?
   - nein → `404`
3) Status ist `OPEN`?
   - nein → `409 Conflict`
4) Dann:
   - setze `status = ASSIGNED`
   - setze `assignedUserId = currentUser.id`

Response (Beispiel):
```json
{
  "id": "uuid",
  "status": "ASSIGNED",
  "assignedUserId": "user-uuid"
}
Endpunkt: MicroTask abschließen
POST /microtasks/:id/complete
Voraussetzungen:

Authentifiziert

Org-Kontext (X-Org-Id) gültig

Regeln:

MicroTask existiert?

nein → 404

Gehört zur Org?

nein → 404

Status ist ASSIGNED?

nein → 409 Conflict

assignedUserId === currentUser.id?

nein → 403 Forbidden

Dann:

setze status = DONE

Response (Beispiel):

json
Code kopieren
{
  "id": "uuid",
  "status": "DONE"
}
Fehlercodes (einheitlich)
400 – ungültiger Request (z. B. fehlender Header)

401 – nicht authentifiziert

403 – keine Berechtigung (falscher User)

404 – MicroTask existiert nicht oder falsche Org

409 – ungültiger Statusübergang

Validierung
:id als UUID validieren

Einheitliche Error Responses (message, optional code)

Keine Logik im Controller, nur im Service

Backend Tests (Minimum)
Assign:

OPEN → ASSIGNED (200)

Assign bei ASSIGNED → 409

Assign bei DONE → 409

Complete:

ASSIGNED + richtiger User → DONE (200)

ASSIGNED + falscher User → 403

OPEN → 409

Org-Isolation:

falsche Org → 404

Web App & Mobile App – Anforderungen

Feed (/feed)
Bei "Angebot für mich":
- Zeigt Buttons: „Annehmen“ und „Ignorieren/Ablehnen“
- Nach Klick → Task verschwindet aus Feed (Bei Annahme wandert er in MyTasks)

Bei "Offen":
- Zeigt Button: „Übernehmen“

Meine Aufgaben (/feed/my-tasks)
- Zeigt Liste aller Tasks, bei denen der Nutzer der `assignedUserId` ist.
- Unterteilt in "Aktuell zu tun" (`ASSIGNED`) und "Abgeschlossen" (`DONE`).
- Bei `ASSIGNED` Tasks: klickbares Detail oder direkter Button "Erledigt".

Detailansicht
- Ergänzung um die passenden Action-Buttons je nach Kontext.

UI-Zustände & UX
- Loading (während Request)
- Error (z. B. Konflikt → kurze Meldung, falls jemand schneller war)
- Optimistic UI nicht zwingend, simpler Lade-Spinner reicht.

Definition of Done (DoD)
  POST /microtasks/:id/offer/accept und /reject implementiert
  POST /microtasks/:id/assign implementiert (für generische)
  POST /microtasks/:id/complete implementiert
  GET /me/microtasks Endpunkt existiert
  Meine Aufgaben UI existiert (Web & Mobile, listet Assigned/Done)
  Feed UI aktualisiert: Annehmen/Ablehnen/Übernehmen
  Statusübergänge/Isolation strikt serverseitig validiert
  Einfacher, lesbarer Code garantiert (CODESTYLE.md)
  Umsetzung auf Branch `feature/architecture-setup`

Hinweise für KI / Umsetzung
Backend zuerst (Service + Tests), dann Web, dann Mobile

Keine Sonderfälle einbauen, die nicht im Ticket stehen

Keine neuen Status einführen

Konflikte (409) bewusst nutzen statt stiller Fehler

yaml
Code kopieren

---

### Einordnung (kurz)
Nach Ticket 0003 habt ihr:
- **Identität + Kontext** (0001)
- **Sichtbarkeit** (0002)
- **Verbindliche Handlung** (0003)

👉 Ab hier ist Pinky funktional nutzbar.  
Wenn du willst, formuliere ich dir als Nächstes **Ticket 0004 (Activity Log / Verlauf)** oder einen **konkreten Codex-Prompt für Ticket 0003**.





