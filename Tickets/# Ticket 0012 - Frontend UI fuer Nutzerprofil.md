# Ticket 0012 – Frontend: UI für das Nutzerprofil & Zeit-Budget

## Kontext
Nachdem das Backend in Ticket 0011 um Profilfelder und das Zeit-Budget erweitert wurde, benötigt der Nutzer nun in der App eine grafische Oberfläche, um diese Daten einzusehen und zu bearbeiten.

## Ziele
- Eine Profil-Seite/Ansicht in der App (Web/Mobile), in der der Nutzer seine Informationen pflegen kann.

## Anforderungen

1.  **Typ-Definitionen**
    - Frontend-Interfaces für den `User` um die neuen Felder (`age`, `department`, `interests`, `qualifications`, `hasDriversLicense`, `weeklyTimeBudgetMinutes`, `helpContext`) erweitern.

2.  **Profil Ansicht (UI)**
    - Erstellen einer neuen Maske "Mein Profil" (z.B. unter `/profile`).
    - Formular-Felder für Text-Inputs (Interessen, Qualifikationen) und Selects/Numbers (Zeit-Budget, Alter, Sparte).
    - **Mobilität/Führerschein:** Ein Toggle/Checkbox für `hasDriversLicense`. **Wichtig:** Dieses Feld darf in der UI nur gerendert/abgefragt werden, wenn das Feld `age` einen Wert >= 18 aufweist.
    - Klarer Fokus auf das Auswählen des **wöchentlichen Zeit-Budgets**, da dies essenziell für spätere KI-Berechnungen ist.

3.  **API Integration**
    - GET-Aufruf an `/me` beim Laden der Komponente, um das Formular vorauszufüllen.
    - PUT-Aufruf an `/me/profile` beim Speichern ("Speichern"-Button).
    - Feedback-UI (Erfolgsmeldung oder Fehler Toast).

## Definition of Done
- Nutzer können ihr Profil inklusive Zeit-Budget im Frontend ansehen und ändern.
- Änderungen werden persistiert (Backend-Aufruf erfolgreich).
- Keine UI-Ausreißer auf Mobile-Geräten.
