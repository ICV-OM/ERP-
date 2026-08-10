import { NextRequest } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { assertCsrf, safeJsonError } from "@/lib/security";
import { query, withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";

const schema=z.object({currentPassword:z.string().min(12).max(200),newPassword:z.string().min(14).max(200)}).refine(x=>x.currentPassword!==x.newPassword,{message:"New password must be different"});
export async function POST(request:NextRequest){
  try{assertCsrf(request)}catch{return safeJsonError("Request rejected",403)}const a=await requireApiUser("dashboard:view");if(!a.ok)return safeJsonError(a.message,a.status);const p=schema.safeParse(await request.json().catch(()=>null));if(!p.success)return safeJsonError(p.error.issues[0]?.message??"Invalid password",422);
  const r=await query<{password_hash:string}>("SELECT password_hash FROM users WHERE id=$1 AND organization_id=$2 AND is_active=TRUE LIMIT 1",[a.user.id,a.user.organizationId]);const current=r.rows[0]?.password_hash;if(!current||!(await argon2.verify(current,p.data.currentPassword).catch(()=>false)))return safeJsonError("Current password is incorrect",401);
  const hash=await argon2.hash(p.data.newPassword,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1});await withTransaction(async c=>{await c.query("UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2 AND organization_id=$3",[hash,a.user.id,a.user.organizationId]);await c.query("DELETE FROM sessions WHERE user_id=$1",[a.user.id])});await audit({organizationId:a.user.organizationId,actorUserId:a.user.id,action:"auth.password_change",entityType:"user",entityId:a.user.id,after:{sessionsRevoked:true},requestId:request.headers.get("x-request-id")});return Response.json({ok:true,reauthenticate:true},{headers:{"Cache-Control":"no-store"}});
}
