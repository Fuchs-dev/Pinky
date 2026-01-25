# Ticket 0003 – MicroTask übernehmen & abschließen (Statuswechsel + Verantwortung)

## Kontext
Nach Ticket 0002 können Nutzer im aktiven Workspace offene MicroTasks (`OPEN`) sehen und deren Details aufrufen.  
Jetzt soll die erste **echte Interaktion** möglich werden:  
Ein Nutzer übernimmt eine MicroTask verbindlich und kann sie anschließend als erledigt markieren.

Dieses Ticket ist der erste **Write-Flow** im System und setzt zentrale fachliche Regeln durch:
- Zustandsübergänge
- Verantwortung (Ownership)
- Serverseitige Business-Logik

---

## Ziel
1) Ein Nutzer kann eine `OPEN` MicroTask übernehmen → Status wird `ASSIGNED`.  
2) Eine übernommene MicroTask kann vom zuständigen Nutzer als `DONE` markiert werden.  
3) Statuswechsel werden **ausschließlich serverseitig** geprüft und durchgeführt.  
4) Feed und Detailansicht aktualisieren sich entsprechend (MicroTask verschwindet aus `OPEN`).  
5) Die Regeln aus dem Domainmodell werden strikt eingehalten.

---

## Scope

### In Scope
- Backend-Endpunkte für Statusänderungen:
  - `POST /microtasks/:id/assign`
  - `POST /microtasks/:id/complete`
- Serverseitige Validierung aller Statusübergänge
- Ownership-Regeln (wer darf was?)
- UI-Erweiterungen in Web & Mobile:
  - Button „Übernehmen“
  - Button „Als erledigt markieren“
- Aktualisierung der Listen/Detailansichten nach Statuswechsel
- Backend-Tests für alle relevanten Status- und Fehlerfälle

### Out of Scope
- Zurücksetzen von Status (`DONE` → `OPEN`)
- Reassign / Abgeben von MicroTasks
- Blockieren (`BLOCKED`)
- Activity-Log / Historie (kommt später)
- Benachrichtigungen

---

## Referenzen (verbindlich)
- `/docs/DOMAIN.md` (MicroTask, Statusmodell, Ownership)
- `/docs/ARCHITECTURE.md`
- `/docs/DECISIONS.md`
- `/docs/STYLEGUIDE.md`
- Ticket 0001 (Auth + Org-Kontext)
- Ticket 0002 (MicroTask Feed & Detail)

---

## Fachliche Regeln (aus DOMAIN.md)

### Statusmodell
- `OPEN` → frei, noch nicht übernommen
- `ASSIGNED` → von genau einem User übernommen
- `DONE` → abgeschlossen

Erlaubte Übergänge:
- `OPEN → ASSIGNED`
- `ASSIGNED → DONE`

Nicht erlaubt:
- `DONE → *`
- `OPEN → DONE`
- `ASSIGNED → ASSIGNED` (erneutes Übernehmen)

---

### Ownership-Regeln
- Eine MicroTask kann **nur von einem User gleichzeitig** übernommen werden.
- Nur der User, der die MicroTask übernommen hat (`assignedUserId`),
  darf sie als `DONE` markieren.
- Organizer/Admins bekommen **keine Sonderrechte** in diesem Ticket
  (Bewusst simpel, spätere Erweiterung möglich).

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

Web App – Anforderungen (Next.js)
Feed (/microtasks)
MicroTask mit Status OPEN:

Button: „Übernehmen“

Nach erfolgreichem Übernehmen:

Task verschwindet aus Feed

optional: Success-Feedback (Toast)

Detailansicht (/microtasks/[id])
Status OPEN:

Button: „Übernehmen“

Status ASSIGNED:

Wenn assignedUserId === currentUser.id:

Button: „Als erledigt markieren“

Sonst:

Hinweis: „Diese Aufgabe wurde bereits übernommen“

Status DONE:

Read-only Anzeige „Erledigt“

UI-Zustände
Loading (während Request)

Error (z. B. Konflikt → kurze Meldung)

Optimistic UI optional, aber nicht erforderlich

Mobile App – Anforderungen (Flutter)
MicroTaskListScreen
OPEN Tasks zeigen Button „Übernehmen“

Nach Übernahme:

Liste neu laden

Task verschwindet

MicroTaskDetailScreen
Gleiches Verhalten wie Web:

OPEN → Übernehmen

ASSIGNED + eigener User → Erledigen

sonst read-only Hinweis

UX-Hinweise
Buttons während Request deaktivieren

Kurzes visuelles Feedback (SnackBar/Toast)

Definition of Done (DoD)
 POST /microtasks/:id/assign implementiert und getestet

 POST /microtasks/:id/complete implementiert und getestet

 Statusübergänge strikt serverseitig validiert

 Ownership-Regeln enforced (nur richtiger User darf abschließen)

 Org-Isolation enforced (X-Org-Id)

 Feed aktualisiert sich korrekt nach Übernahme

 Web UI: Übernehmen & Erledigen funktionieren

 Mobile UI: Übernehmen & Erledigen funktionieren

 Keine Business-Logik in Clients

 STYLEGUIDE eingehalten

 Kleine, nachvollziehbare Commits

 Umsetzung auf feature/architecture-setup

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





