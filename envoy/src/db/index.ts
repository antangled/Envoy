import "server-only";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";
import { secret } from "@/lib/env";

type DB = import("drizzle-orm/pglite").PgliteDatabase<typeof schema> | import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as { __envoyDb?: Promise<DB> };

async function init(): Promise<DB> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const dbUrl = secret("DATABASE_URL");
  if (dbUrl) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const postgres = (await import("postgres")).default;
    const client = postgres(dbUrl, { prepare: false, max: 5 });
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder });
    return db;
  }
  // Vercel's filesystem is read-only and not shared between functions, so the embedded database can't work there.
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set. On Vercel, add a Postgres database to the project (Storage, then Neon) and redeploy.");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.ENVOY_DATA_DIR ? path.resolve(process.env.ENVOY_DATA_DIR) : path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db;
}

export function getDb(): Promise<DB> {
  if (!g.__envoyDb) g.__envoyDb = init().catch((e) => { g.__envoyDb = undefined; throw e; });
  return g.__envoyDb;
}

export { schema };
