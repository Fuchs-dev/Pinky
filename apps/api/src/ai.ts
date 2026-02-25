import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const aiGeneratedMicroTaskSchema = z.object({
    title: z.string().describe("Kurzer, aussagekräftiger Titel der Teilaufgabe"),
    description_how: z.string().describe("Wie soll die Aufgabe erledigt werden? (Maximal 3 Sätze)"),
    location: z.string().nullable().describe("Wo findet die Aufgabe statt? (Ort, Remote oder null falls unbekannt)"),
    estimatedDuration: z.string().describe("Geschätzte Dauer, z.B. 'ca. 30 Minuten' oder '2 Stunden'"),
    rewardPoints: z.number().int().min(5).max(100).describe("Belohnungspunkte für die Erledigung (5-100 je nach Aufwand)"),
    impactReason: z.string().describe("Warum ist diese Aufgabe extrem wichtig für das Projekt? (Motivierend formulieren!)"),
    suggestedAssigneeAlias: z.string().nullable().describe("Der Alias der Person, die für diese Aufgabe am besten geeignet ist (aus dem übergebenen Kontext) oder null, wenn keine Person sicher passt.")
});

export const splitTaskResultSchema = z.object({
    microTasks: z.array(aiGeneratedMicroTaskSchema)
});

/**
 * Splits a complex task prompt into a structured list of microtasks.
 * It strictly uses the provided user aliases to suggest assignees without leaking PII.
 *
 * @param prompt The user's prompt (e.g. "Sommerfest organisieren")
 * @param anonymizedUsers Array of pseudonyms and context (e.g. [{ alias: "User_1", role: "Vorstand" }])
 * @returns Array of generated microTasks
 */
export async function generateMicroTasksFromPrompt(prompt: string, anonymizedUsers: { alias: string, role: string }[]) {
    const usersContext = anonymizedUsers.length > 0
        ? `Verfügbare Personen (verwendet ausschließlich den 'alias' für Zuweisungsvorschläge in suggestedAssigneeAlias):\n` + anonymizedUsers.map(u => `- Alias: ${u.alias} (Rolle im Verein: ${u.role})`).join('\n')
        : `Keine spezifischen Personen verfügbar. Setze suggestedAssigneeAlias auf null.`;

    const systemPrompt = `Du bist ein hochintelligenter Organisations-Assistent für gemeinnützige Vereine.
Deine Aufgabe ist es, große Vorhaben in handhabbare, kleine und motivierende 'MicroTasks' zu zerlegen.
Jede Teilaufgabe soll konkret und machbar erscheinen (Impact-Fokussiert!).

WICHTIG ZUR ZUWEISUNG:
${usersContext}

Regeln:
1. Brich das vom Nutzer genannte Projekt in 3-8 extrem spezifische Teilaufgaben herunter.
2. Wenn das Projekt bereits eine Teilaufgabe ist, verfeinere sie.
3. Formuliere motivierend und nutze den Kontext der Personen sinnvoll, falls eine Rolle (wie 'Vorstand') besonders gut zu einer Aufgabe passt.
4. Du darfst nur generieren, keine Datenbank-Mutationen ausführen.`;

    if (!process.env.OPENAI_API_KEY) {
        console.warn("OPENAI_API_KEY is not set. Using mock AI data.");
        return [
            {
                title: "Mock Task 1 (Auto-Split)",
                description_how: "Das ist ein automatisch generierter Mock-Task.",
                location: "Remote",
                estimatedDuration: "1 Stunde",
                rewardPoints: 10,
                impactReason: "Da kein API Key hinterlegt ist, ist dies ein Test-Mock.",
                suggestedAssigneeAlias: anonymizedUsers.length > 0 ? anonymizedUsers[0].alias : null
            }
        ];
    }

    const { object } = await generateObject({
        model: openai('gpt-4o'), // LLM-Agnostic: Dies kann 1-zeilig auf google() oder anthropic() geändert werden
        system: systemPrompt,
        prompt: `Projekt / Aufgabe: ${prompt}`,
        schema: splitTaskResultSchema,
        temperature: 0.7
    });

    return (object as any).microTasks;
}
