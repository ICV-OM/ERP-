import { query } from "@/lib/db";
import { sha256 } from "@/lib/crypto";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 8;

export async function checkLoginRateLimit(identifier: string) {
  const key = sha256(identifier.toLowerCase());
  const result = await query<{ attempts: number; window_started_at: Date; locked_until: Date | null }>(`
    SELECT attempts, window_started_at, locked_until FROM auth_rate_limits WHERE id_hash = $1
  `, [key]);
  const row = result.rows[0];
  if (!row) return { allowed: true, key };
  if (row.locked_until && new Date(row.locked_until) > new Date()) return { allowed: false, key };
  const age = Date.now() - new Date(row.window_started_at).getTime();
  if (age > WINDOW_MINUTES * 60_000) return { allowed: true, key };
  return { allowed: row.attempts < MAX_ATTEMPTS, key };
}

export async function recordLoginFailure(key: string) {
  await query(`
    INSERT INTO auth_rate_limits (id_hash, attempts, window_started_at, locked_until)
    VALUES ($1, 1, NOW(), NULL)
    ON CONFLICT (id_hash) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      window_started_at = CASE WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE auth_rate_limits.window_started_at END,
      locked_until = CASE WHEN auth_rate_limits.attempts + 1 >= 8 THEN NOW() + INTERVAL '15 minutes' ELSE auth_rate_limits.locked_until END
  `, [key]);
}

export async function clearLoginFailures(key: string) {
  await query(`DELETE FROM auth_rate_limits WHERE id_hash = $1`, [key]);
}
