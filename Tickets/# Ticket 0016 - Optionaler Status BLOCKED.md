# Ticket 0016 – Optionaler Status "BLOCKED" für MicroTasks

## Kontext
Manchmal kann ein Helfer eine Aufgabe nicht abschließen, weil externe Abhängigkeiten fehlen (z.B. "Ich wollte den Raum fegen, aber der Schlüssel war nicht da"). Im `PROJECT.md` wurde hierfür optional der Status `BLOCKED` vorgesehen. Dieser weicht vom Standard `OPEN -> ASSIGNED -> DONE` ab.

## Ziele
- Ein Mitglied, das einer Aufgabe zugewiesen ist (`ASSIGNED`), soll die Aufgabe als `BLOCKED` markieren können.
- Ein Organisator soll diesen Blockade-Grund einsehen können.

## Anforderungen

1.  **Datenmodell-Update**
    - Status-Enum `MicroTaskStatus` (in `schema.ts`) um `"BLOCKED"` erweitern.
    - Ein neues Feld `blockedReason` (text, optional) an der `MicroTasks`-Tabelle hinzufügen.

2.  **API Endpunkte (`server.ts`)**
    - `POST /microtasks/:id/block`: Markiert die zugewiesene Aufgabe als blockiert. Erfordert einen Grund (`reason` im Body).
    - Berechtigungsprüfung: Nur der *zugewiesene* Nutzer (oder ein Admin/Organizer) darf blockieren.
    - `POST /microtasks/:id/unblock`: Hebt die Blockade auf, Status springt zurück auf `ASSIGNED`.

3.  **UI Updates (Web & Mobile)**
    - Button "Problem melden / Blockieren" in der Task-Detailansicht, wenn Status `ASSIGNED` ist.
    - Modal oder Textfeld zur Eingabe des Blockadegrundes (`reason`).
    - Visuelle Hervorhebung (z.B. Orange/Rot) von blockierten Tasks im Organizer-Dashboard.

## Definition of Done
- Datenbank-Enum-Update per Drizzle durchgelaufen.
- Blockade-Endpunkt speichert `BLOCKED` und den `blockedReason` String.
- UI reflektiert den blockierten Status und zeigt Organisatoren den Grund an.
