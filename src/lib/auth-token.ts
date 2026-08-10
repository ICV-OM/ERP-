import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import type { Role } from "@/lib/permissions";

const key = new TextEncoder().encode(env.SESSION_SECRET);
export const SESSION_COOKIE = "__Host-alturud_session";
export const DEV_SESSION_COOKIE = "alturud_session";

export type SessionClaims = {
  sub: string;
  sid: string;
  role: Role;
  orgId: string;
};

export async function signSession(claims: SessionClaims, expiresAt: Date) {
  return new SignJWT({ sid: claims.sid, role: claims.role, orgId: claims.orgId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .setIssuer("alturud-hr-erp")
    .setAudience("alturud-web")
    .sign(key);
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, key, {
    issuer: "alturud-hr-erp",
    audience: "alturud-web"
  });
  if (!payload.sub || !payload.sid || !payload.role || !payload.orgId) throw new Error("Invalid session");
  return {
    sub: payload.sub,
    sid: String(payload.sid),
    role: String(payload.role) as Role,
    orgId: String(payload.orgId)
  } satisfies SessionClaims;
}
