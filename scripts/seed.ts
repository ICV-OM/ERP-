import pg from "pg";
import argon2 from "argon2";

const { Pool } = pg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) throw new Error("SEED_ADMIN_EMAIL is required");

  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 16 || password.includes("REPLACE")) {
    throw new Error(
      "Set a unique SEED_ADMIN_PASSWORD with at least 16 characters",
    );
  }

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let org = (
      await client.query(`SELECT id FROM organizations WHERE code='ALTURUD'`)
    ).rows[0];

    if (!org) {
      org = (
        await client.query(`
          INSERT INTO organizations(name, code, timezone)
          VALUES('ALTURUD International', 'ALTURUD', 'Asia/Muscat')
          RETURNING id
        `)
      ).rows[0];
    }

    let entity = (
      await client.query(
        `SELECT id FROM legal_entities WHERE organization_id=$1 AND country_code='OM' LIMIT 1`,
        [org.id],
      )
    ).rows[0];

    if (!entity) {
      entity = (
        await client.query(
          `INSERT INTO legal_entities(organization_id,name,country_code,currency)
           VALUES($1,'ALTURUD International SPC','OM','OMR') RETURNING id`,
          [org.id],
        )
      ).rows[0];
    }

    let branch = (
      await client.query(
        `SELECT id FROM branches WHERE organization_id=$1 AND code='MCT-HQ'`,
        [org.id],
      )
    ).rows[0];

    if (!branch) {
      branch = (
        await client.query(
          `INSERT INTO branches(organization_id,legal_entity_id,name,code,country_code,city,location_type)
           VALUES($1,$2,'Muscat Head Office','MCT-HQ','OM','Muscat','OFFICE') RETURNING id`,
          [org.id, entity.id],
        )
      ).rows[0];
    }

    for (const [name, code, costCenter] of [
      ["Human Resources", "HR", "CC-HR"],
      ["Operations", "OPS", "CC-OPS"],
      ["Warehouse", "WH", "CC-WH"],
      ["Finance", "FIN", "CC-FIN"],
    ]) {
      await client.query(
        `INSERT INTO departments(organization_id,name,code,cost_center)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(organization_id,code) DO NOTHING`,
        [org.id, name, code, costCenter],
      );
    }

    for (const [name, code, days] of [
      ["Annual Leave", "ANNUAL", 30],
      ["Sick Leave", "SICK", 10],
      ["Emergency Leave", "EMERG", 5],
    ]) {
      await client.query(
        `INSERT INTO leave_types(organization_id,name,code,annual_entitlement)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(organization_id,code) DO NOTHING`,
        [org.id, name, code, days],
      );
    }

    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    await client.query(
      `INSERT INTO users(organization_id,branch_id,email,display_name,password_hash,role)
       VALUES($1,$2,$3,'System Administrator',$4,'SUPER_ADMIN')
       ON CONFLICT(email)
       DO UPDATE SET password_hash=EXCLUDED.password_hash,is_active=TRUE`,
      [org.id, branch.id, email.toLowerCase(), hash],
    );

    await client.query("COMMIT");
    console.log(`Seeded. Admin: ${email}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
