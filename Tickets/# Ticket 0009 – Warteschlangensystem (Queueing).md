# Ticket 0009 – Backend & Frontend: Warteschlangensystem (Queueing)

## Kontext
Nicht jede Aufgabe ist für jeden unbegrenzt verfügbar. Manchmal ist ein beliebter Dienst (z.B. "Bierwagen") sofort vergriffen (`ASSIGNED`). Laut `PROJECT.md` sollen andere Mitglieder jedoch die Möglichkeit haben, sich als "Ersatzspieler" oder "Backup" einzutragen, falls der primäre Verantwortliche abspringt.

## Ziele
* Einführung einer Warteschlangenlogik (`QueueIntent`), durch die Nutzer ihr Interesse an bereits vergebenen MicroTasks signalisieren können.
* Backend-Architektur, die bei einem "Rücktritt" eines Users automatisch den nächsten in der Schlange benachrichtigt oder einrücken lässt. Hier wird die Aufgabe dem Nachrücker angeboten, wenn er zu lange wartet oder ablehnt fólgt der nächste in der Schlange.

## Anforderungen

1.  **Datenmodell (`QueueIntent`)**
    *   Neue Tabelle, die einen `User`, einen `MicroTask` und einen `Status` (z.B. QUEUED, NOTIFIED, EXPIRED, WITHDRAWN) verknüpft.

2.  **Backend Endpunkte**
    *   `POST /microtasks/:id/queue/join`: Nutzer reiht sich in die Warteschlange ein.
    *   `POST /microtasks/:id/queue/leave`: Nutzer zieht sich aus der Queue zurück.
    *   *(Erweiterung)* `POST /microtasks/:id/unassign`: Der aktuell Verantwortliche gibt die Aufgabe zurück -> Die QueueLogik greift.

3.  **Queue-Logik**
    *   Wenn ein MicroTask von `ASSIGNED` zurück auf `OPEN` fällt, prüft das System, ob User den Status `QUEUED` in der `QueueIntent` Tabelle haben.
    *   Wenn ja, wird der erste User in den Status `NOTIFIED` versetzt (als Vorstufe zum automatischen Auto-Assign oder Push-Benachrichtigung).

4.  **UI Updates (Web Feed & Mobile)**
    *   Aufgaben, die `ASSIGNED` sind, verschwinden im Feed nicht sofort, sondern erhalten einen "Auf die Warteliste setzen" Button (falls gewünscht, oder sie sind in einer separaten "Letzte Chance" Sektion sichtbar).

## Definition of Done
- `QueueIntent` Relation in der Datenbank modelliert.
- `/join` und `/leave` API Endpunkte funktionieren mitsamt serverseitiger Validierung.
- Rücktritt-Logik: Gibt der Owner die Task ab, wird der namentliche Nachfolger berechnet.
- Web & Mobile Clients erlauben das Betreten der Queue für belegte Tasks.
