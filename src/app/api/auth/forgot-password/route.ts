import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { randomToken,sha256,hashTelemetry } from "@/lib/crypto";
import { assertTrustedOrigin,safeJsonError } from "@/lib/security";
import { sendPasswordResetEmail } from "@/lib/password-reset-email";
import { audit } from "@/lib/audit";

const schema=z.object({email:z.string().email().max(254)});
type UserRow={id:string;organization_id:string;email:string;display_name:string;is_active:boolean};
const generic={ok:true,message:"If the email is registered, a password reset link will be sent."};

export async function POST(request:NextRequest){
  try{assertTrustedOrigin(request)}catch{return safeJsonError("Request rejected",403)}
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return safeJsonError("Enter a valid email address",422);
  const email=parsed.data.email.trim().toLowerCase();const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";const rateKey=sha256(`password-reset:${ip}:${email}`);
  const rate=await query<{attempts:number;locked_until:Date|null}>(`INSERT INTO auth_rate_limits(id_hash,attempts,window_started_at,locked_until) VALUES($1,1,NOW(),NULL)
    ON CONFLICT(id_hash) DO UPDATE SET attempts=CASE WHEN auth_rate_limits.window_started_at < NOW()-INTERVAL '15 minutes' THEN 1 ELSE auth_rate_limits.attempts+1 END,
    window_started_at=CASE WHEN auth_rate_limits.window_started_at < NOW()-INTERVAL '15 minutes' THEN NOW() ELSE auth_rate_limits.window_started_at END,
    locked_until=CASE WHEN auth_rate_limits.window_started_at >= NOW()-INTERVAL '15 minutes' AND auth_rate_limits.attempts+1 >= 6 THEN NOW()+INTERVAL '15 minutes' WHEN auth_rate_limits.window_started_at < NOW()-INTERVAL '15 minutes' THEN NULL ELSE auth_rate_limits.locked_until END
    RETURNING attempts,locked_until`,[rateKey]);
  if(rate.rows[0]?.locked_until&&new Date(rate.rows[0].locked_until)>new Date())return safeJsonError("Too many reset requests. Try again later.",429);

  const ur=await query<UserRow>("SELECT id,organization_id,email,display_name,is_active FROM users WHERE lower(email)=lower($1) LIMIT 1",[email]);const user=ur.rows[0];
  if(!user||!user.is_active)return Response.json(generic,{headers:{"Cache-Control":"no-store"}});
  const recent=await query("SELECT 1 FROM password_reset_tokens WHERE user_id=$1 AND used_at IS NULL AND created_at > NOW()-INTERVAL '60 seconds' LIMIT 1",[user.id]);
  if(recent.rowCount)return Response.json(generic,{headers:{"Cache-Control":"no-store"}});

  const token=randomToken(32),tokenHash=sha256(token),expires=new Date(Date.now()+30*60*1000);
  await query("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",[user.id]);
  const created=await query<{id:string}>("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at,created_ip_hash) VALUES($1,$2,$3,$4) RETURNING id",[user.id,tokenHash,expires,hashTelemetry(ip)]);
  const base=env.APP_ORIGIN.replace(/\/$/,"");const resetUrl=`${base}/reset-password?token=${encodeURIComponent(token)}`;
  try{
    await sendPasswordResetEmail({to:user.email,displayName:user.display_name,resetUrl});
    await audit({organizationId:user.organization_id,actorUserId:user.id,action:"password.reset.requested",entityType:"user",entityId:user.id,after:{expiresAt:expires.toISOString()},requestId:request.headers.get("x-request-id")});
  }catch(error){
    console.error("password_reset_email_failed",error);await query("DELETE FROM password_reset_tokens WHERE id=$1",[created.rows[0]?.id]);
  }
  return Response.json(generic,{headers:{"Cache-Control":"no-store"}});
}
