# Ticket 0011 – Erweitertes Nutzerprofil & Zeit-Budgets (Backend)

## Kontext
Nutzer benötigen ein detaillierteres Profil (laut `PROJECT.md`), um qualifizierter für Aufgaben vorgeschlagen zu werden und um Überlastung zu vermeiden. Bisher existieren am User nur `email` und `displayName`.

## Ziele
- Einführung von Profilfeldern wie Alter, Sparte, Interessen, Qualifikationen.
- Einführung eines **Zeit-Budgets** (Wöchentliche Zeit in Stunden/Minuten), das der Nutzer flexibel anpassen kann.

## Anforderungen

1.  **Datenmodell (`User`)**
    - Migration des Drizzle-Schemas in `apps/api/src/db/schema.ts`.
    - Neue Felder zur Tabelle `users` hinzufügen:
        - `age` (integer, optional)
        - `gender` (female, male, diverse, preferNotToSay)
        - `department` / Sparte (text, optional)
        - `interests` (text oder jsonb Array, optional)
        - `qualifications` (text oder jsonb Array, optional)
        - `hasDriversLicense` (boolean, optional) - Darf/Sollte im Frontend nur abgefragt werden, wenn `age` >= 18 ist.
        - `helpContext` / Kontext-Einschränkungen (text, optional)
        - `weeklyTimeBudgetMinutes` (integer, default 0 oder null)
    
2.  **Store Anpassungen (`apps/api/src/store.ts`)**
    - Funktion `updateUserProfile(userId, data)` implementieren.
    - Funktion `getUserProfile(userId)` anpassen/erweitern, sodass die neuen Felder mitkommen.

3.  **Backend API Endpunkt (`apps/api/src/server.ts`)**
    - `PUT /me/profile`: Aktualisiert die Profildaten des eingeloggten Nutzers.
    - Zod-Schema für die Validierung des Request-Bodies anlegen.
    - `GET /me`: Muss die neuen Profil-Felder mit zurückliefern.

## Definition of Done
- Datenbank-Schema ist aktualisiert und migriert.
- `PUT /me/profile` akzeptiert und speichert alle neuen Profil- und Zeit-Budget-Felder.
- `GET /me` liefert die korrekten, aktualisierten Daten zurück.
- Automatisierte API-Tests (in `api.test.ts`) für das Ändern des Profils existieren und sind "grün".
