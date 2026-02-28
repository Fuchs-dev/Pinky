# Ticket 0013 – KI-Kapazitätsprüfung & Historien-Abgleich

## Kontext
Gutes Engagement im Ehrenamt scheitert oft an Überlastung. Die in Ticket 0010 gebaute KI zur Aufgabenverteilung darf Nutzer nicht mit Aufgaben überhäufen, die deren festgelegtes Zeitbudget überschreiten. Gleichzeitig muss die KI überprüfen, ob der Nutzer in den vergangenen Wochen bereits "überarbeitet" wurde. Wie gross ist der zeitliche Aufwand im Vergleich zum Zeit-Budget und der in der Organisation üblichen Arbeitslast, den der Nutzer in den letzten Wochen geleistet hat?

## Ziele
- Die KI-Promptgenerierung (`generateMicroTasksFromPrompt`) aus Ticket 0010 anpassen.
- Historische Leistungsdaten des Nutzers abfragen und der KI übergeben.
- Das in Ticket 0011 eingeführte Zeit-Budget in den Prompt injizieren.

## Anforderungen

1.  **Drizzle Store-Erweiterung (`store.ts`)**
    - Neue Funktion: `getUserDoneMicroTasksTime(userId: string, orgId: string, weeksBack: number = 4)`.
    - Neue Funktion: `getOrganizationAverageWeeklyTime(orgId: string, weeksBack: number = 4)`.
    - Diese fragen ab, wie viel Zeit der User bzw. durchschnittlich alle Mitglieder der Organisation in den letzten X Wochen durch abgeschlossene (`DONE`) MicroTasks verbracht haben.

2.  **KI Prompt-Injection (`server.ts` & `ai.ts`)**
    - Beim Aufruf der KI-Routinen müssen die anonymisierten User-Profile um `weeklyTimeBudgetMinutes`, den individuellen `historicalTimeSpentLastWeek` Wert und den organisationsweiten Durchschnitt (`orgAverageWeeklyTime`) erweitert werden.
    - System-Prompt anpassen: "Weise keine Aufgaben an Personen zu, deren Zeitbudget bereits ausgeschöpft ist oder die im Vergleich zur üblichen Arbeitslast der Organisation in den letzten Wochen überlastet waren."

3.  **Fehlerbehandlung**
    - Fallback-Verhalten definieren, falls ein Nutzer kein Zeit-Budget gesetzt hat (z.B. Default-Annahme von 0 oder Unbegrenzt, je nach Policy. Vorschlag: Null = Keine KI-Zuweisungsempfehlung).

## Definition of Done
- Die KI schlägt keine MicroTasks für User vor, wenn deren Budget (kombiniert mit bereits investierter Zeit) überschritten wird.
- Historien-Metriken (`DONE` Tasks der letzten Wochen) werden erfolgreich aus der DB gelesen und im LLM-Prompt verwertet.
- Unit Tests decken ab, dass die Historien-Berechnung im Store mathematisch korrekt addiert.
