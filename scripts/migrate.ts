import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const pool = new Pool({ connectionString: url });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const dir = path.join(process.cwd(), "db/migrations");
    const files = (await readdir(dir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const done = await pool.query(
        `SELECT 1 FROM schema_migrations WHERE name = $1`,
        [file],
      );

      if (done.rowCount) continue;

      const sql = await readFile(path.join(dir, file), "utf8");
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations(name) VALUES($1)`,
          [file],
        );
        await client.query("COMMIT");
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
