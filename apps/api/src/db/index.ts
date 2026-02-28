import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const cxnString = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// for query purposes
const queryClient = postgres(cxnString);
export const db = drizzle(queryClient, { schema });
