import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { DEV_SESSION_COOKIE, SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";
import { query } from "@/lib/db";
import { assertCsrf, CSRF_COOKIE, safeJsonError } from "@/lib/security";
export async function POST(request:NextRequest){try{assertCsrf(request)}catch{return safeJsonError("Request rejected",403)}const jar=await cookies();const name=env.COOKIE_SECURE==="true"?SESSION_COOKIE:DEV_SESSION_COOKIE;const token=jar.get(name)?.value;if(token){try{const c=await verifySessionToken(token);await query(`UPDATE sessions SET revoked_at=NOW() WHERE id=$1 AND user_id=$2`,[c.sid,c.sub])}catch{}}const res=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});res.cookies.set(name,"",{httpOnly:true,secure:env.COOKIE_SECURE==="true",sameSite:"strict",path:"/",maxAge:0});res.cookies.set(CSRF_COOKIE,"",{path:"/",maxAge:0});return res}
