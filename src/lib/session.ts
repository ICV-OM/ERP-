import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { DEV_SESSION_COOKIE, SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";
import { sha256 } from "@/lib/crypto";
import { can, Permission, Role } from "@/lib/permissions";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  organizationId: string;
  branchId: string | null;
  employeeId: string | null;
};

export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(env.COOKIE_SECURE === "true" ? SESSION_COOKIE : DEV_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const claims = await verifySessionToken(token);
    const result = await query<AuthUser & { token_hash: string; expires_at: Date; revoked_at: Date | null }>(`
      SELECT u.id, u.email, u.display_name AS "displayName", u.role,
             u.organization_id AS "organizationId", u.branch_id AS "branchId", u.employee_id AS "employeeId",
             s.token_hash, s.expires_at, s.revoked_at
      FROM users u
      JOIN sessions s ON s.user_id = u.id
      WHERE u.id = $1 AND s.id = $2 AND u.is_active = TRUE
      LIMIT 1
    `, [claims.sub, claims.sid]);
    const row = result.rows[0];
    if (!row || row.revoked_at || new Date(row.expires_at) <= new Date()) return null;
    if (row.token_hash !== sha256(token)) return null;
    return row;
  } catch {
    return null;
  }
}

export async function requireUser(permission?: Permission) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (permission && !can(user.role, permission)) redirect("/forbidden");
  return user;
}

export async function requireApiUser(permission?: Permission) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, status: 401, message: "Authentication required" };
  if (permission && !can(user.role, permission)) return { ok: false as const, status: 403, message: "Insufficient permission" };
  return { ok: true as const, user };
}

export async function requestContext() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent") ?? "unknown",
    requestId: h.get("x-request-id") ?? crypto.randomUUID()
  };
}
