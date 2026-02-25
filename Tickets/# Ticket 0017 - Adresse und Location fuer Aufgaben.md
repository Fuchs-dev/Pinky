# Ticket 0017 – Adresse / Location für Aufgaben

## Kontext
Damit Helfer genau wissen, wo ein Einsatz stattfindet und diese Information sauber in den Kalender (Ticket 0014) exportiert werden kann, benötigen Aufgaben einen klar definierten Ort bzw. eine Adresse. Bisher gibt es das Feld `location` als einfachen String in der API (Ticket 0005/0010), dies soll nun robuster integriert und im UI nutzbar gemacht werden.

## Ziele
- Sicherstellen, dass jede (Micro)Task eine vernünftige Ortsangabe / Adresse zugewiesen bekommen kann.
- Darstellung dieser Adresse im UI.

## Anforderungen

1.  **Datenmodell-Check (`store.ts` & `schema.ts`)**
    - Sicherstellen, dass das Feld `location` (text) für MicroTasks in der Datenbank persistiert wird und **strikt als optional (nullable)** definiert bleibt. Viele Aufgaben finden ortsunabhängig statt.
    - Optional: Erweitern um Felder wie `locationLat` und `locationLng` für spätere Karten-Darstellung, falls gewünscht (ebenfalls komplett optional).

2.  **API Endpunkte (`server.ts`)**
    - Bei der Task-Erstellung (`POST /tasks/:taskId/microtasks`) und beim AI-Split sicherstellen, dass `location` korrekt verarbeitet und gespeichert wird, aber auch fehlende Werte akzpetiert/erlaubt werden.
    - Wenn ein Standort (Adresse) vorliegt, muss dieser beim Abruf einer Task (`GET /microtasks/:id`) ausgeliefert werden.

3.  **UI Updates (Mobile & Web)**
    - **Erstellung:** Eingabefeld "Einsatzort / Adresse" beim manuellen Erstellen einer Aufgabe hinzufügen. Dies muss klar als *optional* gekennzeichnet sein.
    - **KI-Review:** Zeigen der vorgeschlagenen `location` beim Freigeben von KI-gemachten Aufgaben (falls die KI überhaupt einen generiert hat).
    - **Task Detail:** Ort des Einsatzes gut lesbar in der Helfer-Ansicht rendern – aber den gesamten UI-Block ausblenden, falls kein Ort hinterlegt ist.

## Definition of Done
- Ort/Adresse kann bei der Aufgabenerstellung hinterlegt werden.
- Ort ist in der Datenbank dauerhaft gespeichert.
- Ort wird dem Nutzer in der App auf der Aufgabendetail-Seite angezeigt.
- Kalender-Export (Ticket 0014) kann sich verlässlich auf das `location`-Feld beziehen.
