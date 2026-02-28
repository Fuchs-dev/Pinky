# Ticket 0015 – Push-Benachrichtigungen & Warteschlangen-Nachrücklogik

## Kontext
Laut Projekt-Definition (vgl. `PROJECT.md`) können sich Mitglieder in eine Warteschlange (`QueueIntent`) eintragen, falls eine Aufgabe bereits vergeben ist (`ASSIGNED`). Fällt die Aufgabe auf `OPEN` zurück (z.B. durch `/unassign`), muss das nächste Mitglied in der Schlange automatisch den Status `NOTIFIED` erhalten und **zwingend per Push-Benachrichtigung** informiert werden. Die App muss diese Push-Nachricht anzeigen.

## Ziele
- Implementierung eines Push-Benachrichtigungs-Kanals vom Backend (Node/Express) zur Frontend-App (Flutter/Next.js).
- Logikauslösung bei `/unassign` zur Berechnung des Nachrückers und Versand des Pushes.
- Timeout-Logik für Angebote.

## Anforderungen

1.  **Push-Infrastruktur**
    - Entscheidung für einen Push-Service (z.B. Firebase Cloud Messaging / FCM, oder Web-Push für PWA).
    - Speicherung des Geräte-Tokens (Device-Token) des Nutzers im Backend bei Login (`POST /auth/login` erweitern oder neuer Endpoint `/me/device-token`).

2.  **Nachrück-Logik in `apps/api/src/store.ts`**
    - Wird eine MicroTask über `unassignTask` wieder freigegeben, prüfen, ob es `QueueIntent` Einträge mit Status `QUEUED` gibt.
    - Den ältesten (oder priorisierten) `QUEUED` Eintrag auf `NOTIFIED` setzen.
    - Timestamp `notifiedAt` setzen, um ein Timeout berechnen zu können.

3.  **Push Senden in `apps/api/src/server.ts`**
    - Ist ein Nachrücker gefunden worden, sofortige Anstoßung des FCM/Push-Versands an das referenzierte Device-Token des Nutzers: "Die Aufgabe XYZ ist wieder verfügbar! Du wurdest informiert."

4.  **Timeout-Job / Cron & Eskalation**
    - Ein periodischer Job (z.B. `node-cron`), der alle `NOTIFIED` Intents prüft.
    - Sind z.B. 6 Stunden vergangen ohne Reaktion (Accept), wechselt der Intent von `NOTIFIED` auf `EXPIRED`.
    - Der Nächste in der `QUEUED`-Liste rückt nach -> Neuer Push.
    - **Eskalation ans Dashboard:** Wenn die Queue *leer* ist und der letzte benachrichtigte User in den Timeout läuft, muss eine Daten-Grundlage geschaffen werden (z. B. ein Event in einer Notification-Tabelle, oder ein Flag `needsAttention` am Task), damit der Organisator im Dashboard sieht: "Warteschlange erschöpft, Aufgabe unbesetzt!".

## Definition of Done
- Device-Token kann im Backend gespeichert werden.
- Bei `/unassign` erhält der Nächste in der Queue (falls vorhanden) eine Push-Message und wechselt den State auf `NOTIFIED`.
- Zeitgesteuerte Prüfung lässt nicht reagierte Intents ablaufen (`EXPIRED`) und benachrichtigt den/die Nächste(n).
