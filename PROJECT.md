# Pinky – Projektbeschreibung & Domänenmodell (PROJECT.md)

> **Projekt:** Pinky  
> **Stand:** 2026-02-23  
> **Ziel:** Eine umfassende, fachliche und konzeptionelle Basis, die direkt zur Ableitung und Umsetzung von funktionalen Tickets genutzt werden kann.

---

## 1. Vision & Problemstellung

**Das Problem:**  
Vereine und ehrenamtliche Gruppen leiden unter Überlastung weniger Leistungsträger. Aufgaben und Ämter wirken groß, monolithisch und abschreckend. Engagement ist oft unsichtbar und schwer planbar, die Organisation verläuft chaotisch über Chats oder Listen. Das führt zu Frust und einer stetig sinkenden Beteiligung.

**Die Lösung (Pinky):**  
Pinky bricht diese großen, abstrakten Aufgabenkreistrukturen (z.B. "Sommerfest organisieren") systematisch in **kleine, klar abgegrenzte und niedrigschwellige Micro-Tasks** (z.B. "Getränke am Freitag abholen") herunter. Diese Micro-Tasks werden transparent verteilt.

**Kernziele:**
- Weniger Verpflichtung pro Aufgabe (Micro-Tasks).
- Mehr Flexibilität & Sichtbarkeit für die engagierten Mitglieder.
- Ein spürbarer organisatorischer Mehrwert (Planbarkeit & Übersicht) für die Aufgabensteller/Vorstände.

*(Hinweis zur ersten Version / Beta: Fokus liegt strikt auf der Kernfunktionalität der Aufgabenverteilung. Keine Monetarisierung, kein öffentliches soziales Netzwerk, keine komplexe Gamification oder Echtzeit-Chats.)*

---

## 2. Zielgruppen & Clients

### 2.1 Aufgabensteller / Organisatoren (Admin Web App)
**Nutzerprofil:** Vorstände, Projektverantwortliche, Trainer, Koordinatoren.
**Werkzeug:** Eine Desktop-/Web-Anwendung (Next.js), namentlich das Admin Dashboard (`/admin`).
**Hauptaufgaben:**
- Anlegen und Verwalten von Organisationen (Vereinen) und deren Mitgliedern/Rollen.
- Erstellen und Strukturieren von großen `Tasks` (Projekten).
- Herunterbrechen dieser Tasks in `Micro-Tasks` (durch KI-Vorschläge unterstützt oder manuell).
- KI gestützte Vorschläge für die Zuteilung von Micro-Tasks auf grundlage von Nutzerverhalten und Profilen.
- Fortschrittsüberwachung und Auswertung.
- Zuteilung von Micro-Tasks an Mitglieder soll den Mitgliedern klar als Angebot kommuniziert werden. 
- Mitglieder sollen die Möglichkeit haben, sich auf Micro-Tasks nach dem Angebot anzunehmen oder zu ignorieren.
- Wenn eine Aufgabe angenommen wird, soll die Aufgabe in eine Liste des Mitglieders übertragen werden.
- Die Liste soll die Aufgaben anzeigen, die der User angenommen hat und die er abgeschlossen hat.
- Die Tasks sollen für den Nutzer maximal präzise beschrieben werden. Was? Wann? Wo? Wie? Wer ist mein Ansprechpartner?

### 2.2 Mitglieder / Ehrenamtliche (Mobile App)
**Nutzerprofil:** Vereinsmitglieder, Helferinnen und Helfer.
**Werkzeug:** Eine mobile App (Flutter) und die Web-Ansicht für Helfer (`/feed`).
**Hauptaufgaben:**
- Entdecken verfügbarer Micro-Tasks (Task-Feed).
- Einfache Übernahme ("Assign") von passenden Micro-Tasks.
- Statusaktualisierung auf "Abgeschlossen" ("Done").
- Beitreten von Warteschlangen (Queue-Intent) für aktuell vergebene Aufgaben.
- Erhalten von relevanten Push-Benachrichtigungen.
## 2.3 Profile der Mitglieder
- Nutzer sollen Alter, Sparte, Interessen, Qualifikationen bzw. Fähigkeiten angeben können.
- **Zeit-Budget:** Nutzer legen fest, wie viel Zeit (in Stunden/Minuten) sie pro Woche für Aufgaben aufwenden möchten. Diese Angabe ist flexibel und kann vom Nutzer jederzeit im eigenen Profil angepasst und hinterlegt werden.
- Nutzer sollen angeben können in welchem Kontext sie Helfen können und möchten. Beispiel: Mutter von U13 Jungen möchte nur in der U13 aushelfen und hat Führerschein.

---

## 3. Das Domänenmodell (Entities & Begriffe)

Technische Details (Frameworks, DB-Schema-Typen) sind hier ausgeklammert; dieses Kapitel definiert die *Fachsprache* (Ubiquitous Language).

### 3.1 Workspace & Nutzer
- **User:** Eine reale Person (mit E-Mail, Name, etc.). Ein User operiert **niemals** global, sondern immer im Kontext einer *Active Organization* (wie in Slack Workspaces).
- **Organization:** Der Verein, die Initiative oder Gruppe. Jede Aktion, jede Aufgabe und jeder Zugriff ist strikt auf genau eine Organisation begrenzt (Mandanten-/Tenant-Prinzip).
- **Membership:** Die Verbindung (Relation) zwischen einem `User` und einer `Organization`. Besitzt einen Status (aktiv/inaktiv) und definiert die `Role` des Users in genau dieser Organisation.

### 3.2 Rollenmodell (Pro Membership / Organisation)
- **ADMIN:** Vollzugriff auf die Organisation. Darf Rollen ändern, Mitglieder einladen/entfernen und alle fachlichen Objekte verwalten.
- **ORGANIZER:** Operative Steuerung. Darf Tasks und Micro-Tasks erstellen, bearbeiten, zuteilen und den Gesamtfortschritt überwachen.
- **MEMBER:** Die Basis. Sieht nur die für ihn relevanten und offenen Micro-Tasks. Kann diese übernehmen und bearbeiten, hat jedoch keine Verwaltungsrechte über die Struktur.

### 3.3 Das Aufgabenmodell
- **Task (Die große Aufgabe / Das Projekt):** Dient primär der Strukturierung (Beispiel: "Sommerfest", "Website aktualisieren"). Eine `Task` ist fachlich **nicht direkt ausführbar**, sie fasst logische Arbeitspakete zusammen. Sie gehört zwingend zu einer `Organization`.
- **MicroTask (Das kleine Arbeitspaket):** Der auszuführende, zeitlich und inhaltlich scharf umrissene Arbeitsschritt. Gehört zu genau einer `Task` (und der `Organization`). Es wird von genau **einem User** (`Assignment`) übernommen.

### 3.4 Status & Lebenszyklus

#### MicroTask Status:
1. `OPEN`: Bereit zur Bearbeitung. Im Feed sichtbar.
2. `ASSIGNED`: Von einem User übernommen.
3. `DONE`: Erfolgreich abgeschlossen.
4. *(optional später: `BLOCKED`)*

**Regel:** Der lineare Ablauf ist `OPEN` -> `ASSIGNED` -> `DONE`. Rücksprünge (z.B. von "Assigned" zurück zu "Open") sind durch Organisatoren bei Fehlern oder Freigaben möglich. Eine **Warteschlange (Queue)** ist *kein* Status des MicroTasks.

#### Der übergeordnete Task Status (abgeleitet!):
Der Status einer großen `Task` wird **nicht manuell** umgeschaltet, sondern ergibt sich rekursiv:
- **Offen:** Es gibt mindestens einen Micro-Task, der `OPEN` oder `ASSIGNED` ist.
- **Abgeschlossen:** Rechnerisch, wenn alle enthaltenen Micro-Tasks den Status `DONE` aufweisen.

#### Queue Status (Warteschlange für Interessenten):
Wenn ein MicroTask bereits auf `ASSIGNED` steht, sich aber andere Mitglieder dennoch interessieren (z.B. als Backup), können sie die Warteliste betreten. Das Queue-Modell umfasst:
- `QUEUED`: Mitglied steht bereit in der Liste.
- `NOTIFIED`: MicroTask wurde wieder `OPEN` (z.B. Erstbearbeiter ist abgesprungen) -> Nächstes Mitglied in Queue wird per Push benachrichtigt.
- `EXPIRED`: Benachrichtigtes Mitglied hat nicht im Zeitfenster reagiert.
- `WITHDRAWN`: Mitglied verlässt die Warteschlange vorzeitig.

---

## 4. Workflows & Zuteilung (Assignments)

- **Das Pull-Prinzip:** Im Normalfall scrollt das Mitglied (`MEMBER`) durch die offenen Micro-Tasks auf der Mobile App und ordnet sich diese selbst zu (Assignment).
- **Das Push-Prinzip (Override):** Ein `ORGANIZER` oder `ADMIN` kann über die Web-App gezielt einen MicroTask an ein Mitglied zuweisen.
- **Einzigartigkeit:** Ein MicroTask hat zu exakt einem Zeitpunkt immer höchstens **eine** verantwortliche Person.

## 4.1 Kalender-Export (iCal / WebCal)
- Mitglieder sollen **ihre zugewiesenen Aufgaben** (`ASSIGNED`) in ihren persönlichen Kalender (Apple Calendar, Google Calendar, Outlook) integrieren können.
- **Architektonische Unabhängigkeit:** Um den Lock-in in spezifische Plattform-APIs (wie Google Calendar API) zu vermeiden und maximal unabhängig zu bleiben, erfolgt der Export primär über einen **serverseitigen iCal (.ics) Feed** (WebCal).
- Jedes Mitglied erhält eine eindeutige, persönliche und kryptografisch sichere Feed-URL (z. B. `/api/calendar/:feedToken.ics`), über die Kalender-Clients die Termine read-only abonnieren können. 
- **1-Klick Single-Export:** Zusätzlich wird die Möglichkeit geschaffen, über einen direkten Download-Link (z. B. `Download .ics`) eine einzelne Aufgabe sofort in die Standard-Kalender-App des Endgeräts zu importieren.

---

## 5. Einsatz von KI (Unterstützend)

Die KI fungiert im Projekt **rein unterstützend**.
Die Entscheidungshohheit liegt immer beim menschlichen Nutzer (Organizer).
- **Features:** KI-gestützte Zerlegung großer `Tasks` ("Organisation des Sommerfests") in detaillierte und sinnvolle `MicroTasks`.
- **Kapazitäts- & Belastungsprüfung:** Bei der automatischen Verteilung/Vorschlägen von Aufgaben berücksichtigt die KI das vom Nutzer definierte wöchentliche Zeit-Budget. Die KI gleicht hierbei die Angabe im Profil zusätzlich damit ab, ob der User in den vorherigen Wochen auch *wirklich* die angegebene Zeit investiert hat (Historien-Abgleich), um realistisch zu planen und Überlastung zu verhindern.
- **Zukunftsausblick:** Sortierung/Priorisierung im User-Feed basierend auf bisherigem Verhalten und Tags.
- **Grenze:** KI erzeugt Entwürfe (Drafts), ein `ORGANIZER` muss diese sichten und per Knopfdruck freigeben.

---

## 6. Tickets ableiten (How-to Work with this File)

Beim Erstellen von Umsetzungstickets ist dieses Dokument die fachliche Single-Source-of-Truth. 
Tickets müssen basierend auf diesen Abgrenzungen geschnitten werden:

1. **Mandanten-Tickets:** Alles beginnt bei der `Organization` & `Membership` (Context-Switching).
2. **Aufgaben-Tickets:** Erstellen/Verwalten von `Tasks` & `MicroTasks` immer unter dem `org_id` Prefix.
3. **Queueing-Tickets:** Warteschlangenlogik muss entkoppelt vom eigentlichen MicroTask-Status (`OPEN`/`ASSIGNED`) als eigene Entität modelliert werden.
4. **App-Sichtbarkeits-Tickets:** Der Feed in der Mobile-App fragt explizit nach Status `OPEN` + Workspace-Context des Nutzers.

Alle Implementierungen sind gegen diese Fachregeln (besonders die Mandanten-Isolation und abgeleiteten Status) durch Unit-/Integration-Tests abzusichern.
