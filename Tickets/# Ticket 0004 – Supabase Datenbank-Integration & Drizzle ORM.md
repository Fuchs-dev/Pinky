# Ticket 0004 – Supabase Datenbank-Integration & Drizzle ORM

## Zielsetzung
Das Backend arbeitet aktuell komplett **im lokalen Speicher (`store.ts`)**. Dies ist extrem schnell, um die API-Logik und die Frontends als Prototyp zu validieren, aber nicht persistent. Ziel dieses Tickets ist es, die echte Datenbank (Supabase PostgreSQL) anzubinden und den `store.ts` durch ORM-Requests (mit Drizzle) auszutauschen.

## Architektur-Regeln (Laut `ARCHITECTURE.md`)
- **Backend:** `apps/api` (Express + TypeScript).
- **Datenbank:** Supabase (PostgreSQL).
- **ORM:** Drizzle ORM.
- **Migrationen:** Drizzle Kit (`npx drizzle-kit push` oder generierte Migrationsscripte).

## Todo-Liste für die Umsetzung

### 1. Supabase Setup & Environment Variables
- [ ] Stelle sicher, dass das lokale Supabase über CLI läuft (`supabase start` oder Docker). Falls nicht vorhanden, verweise auf eine Remote-Dev-Datenbank.
- [ ] Erstelle eine `.env` Datei im `apps/api` Verzeichnis.
- [ ] Umgebungsvariablen ergänzen: `DATABASE_URL` z.B. `postgres://postgres:postgres@127.0.0.1:54322/postgres`.

### 2. Drizzle ORM & Schema Definition
- [ ] Installiere Drizzle Abhängigkeiten im `apps/api` Ordner: `npm install drizzle-orm postgres` und als dev-dependency `npm install -D drizzle-kit tsx`.
- [ ] Erstelle `apps/api/src/db/schema.ts` für das Drizzle-Schema.
- [ ] Erstelle alle existierenden Interfaces aus `store.ts` als Datenbank-Tabellen in Drizzle:
   - `users`
   - `organizations`
   - `memberships` (Viele-Zu-Viele Rolle zwischen User & Org).
   - `tasks`
   - `micro_tasks` (Mit Fremdschlüsseln zu `tasks` und `organizations`. **Wichtig:** Darauf achten, dass Felder wie `location`, `contactPerson`, `description_how` sowie die neuen Felder `estimatedDuration` (Dauer) und `attachments` (Text/Links) angelegt werden).
   - `task_offers`
- [ ] Richtige Datentypen, Relationen und Not-Null-Constraints (z.B. UUID als Default) in `schema.ts` einbauen.

### 3. Datenbankverbindung einrichten
- [ ] Erstelle `apps/api/src/db/index.ts` und baue die Verbindung zur PostgreSQL-Instanz mittels `postgres` und `drizzle-orm/postgres-js` auf.

### 4. Ersetzen der `store.ts` Funktionen
- [ ] Schrittweiser Austausch der in-memory Funktionen (wie `getMicroTaskById`, `assignMicroTask` etc.) durch asynchrone Datenbank-Queries via Drizzle.
- [ ] Da diese nun asynchron sind (Geben ein `Promise` zurück), muss die gesamte Express-Logik in `server.ts` auf `async/await` umgestellt werden!

### 5. Seeding aktualisieren
- [ ] Passe die `seed.ts` an, damit sie über Drizzle Daten in Supabase pumpt (zwei User, eine Org, ein paar Tasks und MicroTasks wie bestehend in der .json Datei hinterlegt), anstatt sie nur in-memory aufzubauen.

### 6. Verifizierung
- [ ] Stelle sicher, dass alle 13/13 automatisierten API-Tests (`api.test.ts`) wieder erfolgreich durchlaufen.
- [ ] Starte die Web-App (`apps/web`) und Mobile-App (`apps/mobile`) und prüfe, ob die Kommunikation mit der neuen Datenbankverbindung nahtlos funktioniert (da die Schnittstellenkontrakte unverändert bleiben sollten).

## Hinweise
Der `X-Org-Id` Header und das mandantenfähige Layout aus `Ticket 0001` muss beim Datenbankaufbau durch durchgehende Filter in den SQL-Queries gewahrt bleiben (z.B. `where: eq(microTasks.organizationId, orgId)`).
