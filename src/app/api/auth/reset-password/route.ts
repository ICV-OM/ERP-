import { NextRequest } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { assertTrustedOrigin,safeJsonError } from "@/lib/security";
import { audit } from "@/lib/audit";

const schema=z.object({token:z.string().min(30).max(200),password:z.string().min(12).max(200)});
type TokenRow={id:string;user_id:string;organization_id:string;expires_at:Date;used_at:Date|null};

export async function POST(request:NextRequest){
  try{assertTrustedOrigin(request)}catch{return safeJsonError("Request rejected",403)}
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return safeJsonError(parsed.error.issues[0]?.message||"Invalid request",422);
  const tokenHash=sha256(parsed.data.token),passwordHash=await argon2.hash(parsed.data.password,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1});
  let userId="",organizationId="";
  try{
    await withTransaction(async client=>{
      const r=await client.query<TokenRow>(`SELECT prt.id,prt.user_id,u.organization_id,prt.expires_at,prt.used_at FROM password_reset_tokens prt JOIN users u ON u.id=prt.user_id WHERE prt.token_hash=$1 AND u.is_active=TRUE FOR UPDATE`,[tokenHash]);
      const row=r.rows[0];if(!row||row.used_at||new Date(row.expires_at)<=new Date())throw new Error("INVALID_RESET_TOKEN");userId=row.user_id;organizationId=row.organization_id;
      await client.query("UPDATE users SET password_hash=$1,password_changed_at=NOW() WHERE id=$2",[passwordHash,row.user_id]);
      await client.query("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",[row.user_id]);
      await client.query("UPDATE sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL",[row.user_id]);
    });
  }catch(error){if(error instanceof Error&&error.message==="INVALID_RESET_TOKEN")return safeJsonError("This reset link is invalid or has expired",400);console.error("password_reset_failed",error);return safeJsonError("Unable to reset password",500)}
  await audit({organizationId,actorUserId:userId,action:"password.reset.completed",entityType:"user",entityId:userId,after:{sessionsRevoked:true},requestId:request.headers.get("x-request-id")});
  return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
