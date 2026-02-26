# Ticket 0018 – Kalender-Export UI Anpassung (Google Kalender & ICS)

## 1. User Story
Als **Volunteer** möchte ich direkt in der Detailansicht einer Aufgabe, durch einen Klick auf die Datums-/Zeitangabe ("Wann?"), die Möglichkeit haben, diesen Termin in meinen Kalender zu übernehmen. Dabei möchte ich wählen können, ob ich das Event direkt im **Google Kalender** öffne oder eine **.ics-Datei** herunterlade, um es intuitiv in meine persönliche Tagesplanung aufzunehmen.

## 2. Hintergrund & Ziel
Basierend auf UX-Analysen eines Prototyps (Lovable App) hat sich gezeigt, dass isolierte Download-Buttons für Kalender-Exporte weniger intuitiv sind als eine interaktive Datumszeile. Ziel ist es, die Zeile "Wann?" in der Aufgaben-Detailansicht (Modal) als interaktiven Trigger (Dropdown oder Action Sheet) umzubauen, der dem Nutzer transparente Export-Optionen bietet: Google Kalender Link und `.ics` Download. Dies ergänzt das in Ticket 0014 implementierte Backend-Feature um eine optimierte Frontend-Erfahrung.

## 3. Akzeptanzkriterien
1. **Interaktive Datumszeile:** In der Einzelansicht einer Aufgabe (z.B. Modal oder `pages/feed/[id].tsx`) wird die Zeile für das Fälligkeitsdatum (Icon 📅 + "Wann?"-Text) klickbar (z.B. Hover-Effekt, Cursor als Pointer).
2. **Dropdown-Menü / Modal:** Bei einem Klick öffnet sich ein UI-Element (z.B. Popover oder Dropdown-Menü) mit zwei eindeutigen Auswahlmöglichkeiten:
   - "Zu Google Kalender hinzufügen"
   - "Als Kalender-Datei (.ics) herunterladen"
3. **Google Kalender Integration:** Ein Klick auf "Google Kalender" öffnet einen neuen Browser-Tab mit einem vorausgefüllten Google Kalender Link `https://calendar.google.com/calendar/render?action=TEMPLATE&text=[Titel]&dates=[Start/End]&details=[Beschreibung]&location=[Ort]`. Die URL-Parameter müssen via `encodeURIComponent` maskiert werden und sich an den Task-Details orientieren.
4. **.ics Download Integration:** Ein Klick auf ".ics herunterladen" löst den Download der ICS-Datei aus (Nutzung der bereits in Ticket 0014 gebauten API oder clientseitig generiert).
5. **Responsiveness:** Das Dropdown-/Auswahl-Menü ist sowohl auf Desktop- als auch auf Mobilgeräten gut bedienbar (z.B. als Action Sheet am unteren Bildschirmrand auf Mobilgeräten, falls eine UI-Bibliothek wie Radix genutzt wird).

## 4. Technische Hinweise & Umsetzungsideen
- **Komponenten:** In `apps/web` sollte eine neue React-Komponente (z.B. `CalendarExportDropdown.tsx`) erstellt werden, welche den Inhalt aus der `fetchMicroTaskDetail`-Schicht erhält.
- **Google URL Generierung:**
  - Start/End-Dateien in UTC (YYYYMMDDTHHMMSSZ) formatieren. `dates=20230101T100000Z/20230101T110000Z`.
  - Text: `task.title`
  - Details: `task.description_how` (ggf. gekürzt)
  - Location: `task.location`
- **.ics Download:** Die Funktion kann entweder einen Blob aus dem Frontend erzeugen oder einen Redirect/Fetch auf `/api/microtasks/:id/download.ics` machen.
- **Styling (`CODESTYLE.md`):** Die Interaktion (Hover, Click) sollte visuelle Rückmeldung geben. Die Icons im Menü (Google-Icon oder Generisches Kalender-Icon + ICS-Symbol) sollen das Verständnis erleichtern. Das UI sollte clean und dezent wirken (wie im Prototyp: hellgraue Box, sanfte Schatten).
