import { Pool, PoolClient, QueryResultRow } from "pg";
import { env } from "@/lib/env";

const globalForDb = globalThis as unknown as { pool?: Pool };

export const db = globalForDb.pool ?? new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false
});

if (process.env.NODE_ENV !== "production") globalForDb.pool = db;

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return db.query<T>(text, values);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
