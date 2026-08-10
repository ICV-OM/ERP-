import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { randomToken, sha256, hashTelemetry } from "@/lib/crypto";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure } from "@/lib/rate-limit";
import { assertTrustedOrigin, CSRF_COOKIE, safeJsonError } from "@/lib/security";
import { DEV_SESSION_COOKIE, SESSION_COOKIE, signSession } from "@/lib/auth-token";
import type { Role } from "@/lib/permissions";

const schema=z.object({email:z.string().email().max(254),password:z.string().min(12).max(200)});
const DUMMY_PASSWORD_HASH="$argon2id$v=19$m=65536,t=3,p=1$9jGFjX1b1plWL7kyyzTc4A$LnIXgzF0cx8rDv3ZJil0JKFPEf4W1jU+m652jNSKG0w";
type UserRow={id:string;organization_id:string;email:string;password_hash:string;role:Role;is_active:boolean};
export async function POST(request:NextRequest){
  try{assertTrustedOrigin(request)}catch{return safeJsonError("Request rejected",403)}
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return safeJsonError("Invalid credentials",400);
  const email=parsed.data.email.trim().toLowerCase();const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const limit=await checkLoginRateLimit(`${ip}:${email}`);if(!limit.allowed)return safeJsonError("Too many attempts. Try again later.",429);
  const r=await query<UserRow>(`SELECT id,organization_id,email,password_hash,role,is_active FROM users WHERE lower(email)=lower($1) LIMIT 1`,[email]);const user=r.rows[0];
  const passwordOk=await argon2.verify(user?.password_hash??DUMMY_PASSWORD_HASH,parsed.data.password).catch(()=>false);const valid=!!user&&user.is_active&&passwordOk;
  if(!valid){await recordLoginFailure(limit.key);return safeJsonError("Invalid credentials",401)}
  await clearLoginFailures(limit.key);await query(`UPDATE users SET last_login_at=NOW() WHERE id=$1`,[user.id]);
  const sid=crypto.randomUUID();const expiresAt=new Date(Date.now()+env.SESSION_TTL_HOURS*60*60*1000);
  const token=await signSession({sub:user.id,sid,role:user.role,orgId:user.organization_id},expiresAt);
  await query(`INSERT INTO sessions(id,user_id,token_hash,expires_at,ip_hash,user_agent_hash) VALUES($1,$2,$3,$4,$5,$6)`,[sid,user.id,sha256(token),expiresAt,hashTelemetry(ip),hashTelemetry(request.headers.get("user-agent")||"unknown")]);
  const csrf=randomToken(24);const res=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});const secure=env.COOKIE_SECURE==="true";
  res.cookies.set(secure?SESSION_COOKIE:DEV_SESSION_COOKIE,token,{httpOnly:true,secure,sameSite:"strict",path:"/",expires:expiresAt});
  res.cookies.set(CSRF_COOKIE,csrf,{httpOnly:false,secure,sameSite:"strict",path:"/",expires:expiresAt});
  return res;
}
