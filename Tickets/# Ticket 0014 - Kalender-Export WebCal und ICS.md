# Ticket 0014 – Kalender-Export (WebCal & 1-Klick .ics)

## Kontext
Damit Aufgaben nicht in der App "vergessen" werden, sollen Mitglieder ihre zugewiesenen Aufgaben in persönliche Kalender-Apps (Apple, Google, Outlook) importieren können. Da wir unabhängig von spezifischen Plattform-APIs bleiben wollen, nutzen wir den iCalendar (.ics) Standard.

## Ziele
- Bereitstellung eines abonnierbaren `.ics` Feeds (WebCal) pro User.
- Bereitstellung eines 1-Klick Downloads für einzelne Aufgaben.

## Anforderungen

1.  **Datenmodell (`User` & Feed-Token)**
    - Neues Feld `calendarFeedToken` in der `users` Tabelle (`uuid`, unique, default generate_v4). Dies fungiert als sicherer, nicht-rotierender Read-Only-Key für den Kalender der Person, ohne Login-Cookie.

2.  **Einzel-Download API Endpoint (`apps/api/src/server.ts`)**
    - `GET /api/microtasks/:id/download.ics` (Nutzt Standard-Auth per Bearer-Token).
    - Liest die MicroTask (wenn der User Berechtigung dafür hat oder `ASSIGNED` ist).
    - Konstruiert einen validen `VCALENDAR` und `VEVENT` String.
    - **Kalender-Details im Event:**
        - **Beschreibung (DESCRIPTION):** Soll relevanten Kontext (Was? Wie? Ansprechpartner) aus der Aufgabe enthalten.
        - **Ort (LOCATION):** Die Adresse/Location der Aufgabe soll direkt in das Kalender-Event geschrieben werden *(nur falls für diese Aufgabe ein Ort hinterlegt wurde - das Feld ist optional!)*.
        - **Erinnerung (VALARM):** Es soll standardmäßig eine Erinnerung/Notification für **1 Stunde vor Beginn** im `.ics` konfiguriert werden.
    - Liefert `Content-Type: text/calendar` zurück.

3.  **Feed-Abonnement API Endpoint (`apps/api/src/server.ts`)**
    - `GET /api/calendar/:feedToken.ics` (Nutzt Token in der URL, KEIN Bearer-Token, damit Apple/Google/Outlook den Link synchronisieren können!).
    - Sucht User nach `calendarFeedToken`.
    - Sammelt alle `ASSIGNED` MicroTasks des Users über alle Organisationen hinweg.
    - Konvertiert diese *mit denselben Details wie beim Einzeldownload* (Beschreibung, Ort, 1h-Reminder) in einen `text/calendar` Stream.

4.  **Frontend Integration**
    - Feed-URL im eigenen Profil `/profile` anzeigen und via Button ("Kalender abonnieren") in die Zwischenablage kopieren oder als `webcal://`-Link öffnen.
    - Download-Button in der MicroTask-Detailansicht implementieren.

## Definition of Done
- Einzelne MicroTasks können als `.ics` heruntergeladen werden.
- Jedes Mitglied hat eine geheime `calendarFeedToken` URL.
- Der Feed-Endpoint ist public aber durch den langen UUID-Token abgesichert und liefert valides iCal zurück.
- Test-Validierung mit einem gängigen Validator.
