import { Pool, PoolClient, QueryResultRow } from "pg";
import { env } from "@/lib/env";

const globalForDb = globalThis as unknown as { pool?: Pool };

function buildConnectionString() {
  const url = new URL(env.DATABASE_URL);
  // node-postgres lets SSL query parameters override the explicit ssl object.
  // Remove them so TLS behavior is controlled in one place below.
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    url.searchParams.delete(key);
  }
  return url.toString();
}

function buildSslConfig() {
  if (process.env.NODE_ENV !== "production") return false as const;

  const ca = env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (ca) {
    return {
      rejectUnauthorized: true,
      ca
    };
  }

  // Production fallback: TLS remains encrypted, but CA verification is not
  // performed until DATABASE_CA_CERT is supplied. This avoids Supabase pooler
  // self-signed-chain failures while preserving encrypted transport.
  return { rejectUnauthorized: false };
}

export const db = globalForDb.pool ?? new Pool({
  connectionString: buildConnectionString(),
  max: 5,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 8_000,
  ssl: buildSslConfig()
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
