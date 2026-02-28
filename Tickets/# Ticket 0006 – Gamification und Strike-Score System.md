# Ticket 0006 – Gamification & Strike-Score System

## Kontext
Der Helfer-Prototyp setzt stark auf Gamification, um das freiwillige Engagement zu fördern. Helfer erhalten "Strike-Scores" (eine Art Währung oder Punkte) für erledigte MicroTasks und können sich über ein Leaderboard ("Wettbewerb") in ihrer Aktivität vergleichen.

## Ziele
* Integration eines Punkte-Systems in das bestehende Pinky-Backend.
* Vergabe von Punkten beim Abschluss von Aufgaben.
* Bereitstellung von Leaderboard-Daten.
* **Feature Toggle:** Die gesamte Gamification-Logik muss zentral ein- und ausschaltbar sein, da sie in der frühen Projektphase ohne Budget für Preise noch deaktiviert bleiben soll.

## Anforderungen

0.  **Feature Flagging**
    *   Einführung eines zentralen Schalters (z. B. Environment-Variable `ENABLE_GAMIFICATION=true|false` oder ein Datenbank-Flag auf Organisations-Ebene), der steuert, ob Punkte vergeben und Bestenlisten berechnet/angezeigt werden.

1.  **Datenmodell-Erweiterung (`schema.ts`)**
    *   Die Tabelle `micro_tasks` benötigt ein neues Feld `reward_points` (Integer), das den Wert der Aufgabe definiert (z.B. 10 Punkte).
    *   Die Tabelle `memberships` (da Punkte organisationsgebunden sind) oder `users` (falls organisationsübergreifend) benötigt ein Feld `strike_score` (Integer, Default: 0). *Architekturentscheidung erforderlich: Sind Punkte pro Organisation oder global? Vorerst gehen wir von organisationsgebundenen Punkten (`memberships`) aus.*

2.  **Transaktionslogik (`store.ts`)**
    *   Die Funktion `completeMicroTask` muss so erweitert werden, dass beim Wechsel in den Status `DONE` die `reward_points` der MicroTask dem `strike_score` des ausführenden Users (in der jeweiligen Organisation) gutgeschrieben werden.

3.  **API Endpunkte (`server.ts`)**
    *   **`GET /org/leaderboard`**: Ein neuer Endpunkt, der die Mitglieder einer Organisation absteigend sortiert nach ihrem `strike_score` zurückgibt, um die Ansicht "Wettbewerb" zu befeuern.
    *   Das Profil im Endpoint `GET /me/memberships` muss den aktuellen Kontostand an Punkten pro Organisation mit ausliefern.

4.  **Sicherheit**
    *   Sicherstellen, dass Punkte nicht mehrfach für dieselbe Aufgabe vergeben werden können.
