import { NextRequest } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { assertCsrf, safeJsonError } from "@/lib/security";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ROLES } from "@/lib/permissions";

const schema=z.object({
  email:z.string().email().max(254),displayName:z.string().trim().min(2).max(160),password:z.string().min(14).max(200),role:z.enum(ROLES),
  branchId:z.union([z.string().uuid(),z.literal("")]).optional(),employeeId:z.union([z.string().uuid(),z.literal("")]).optional()
});

export async function POST(request:NextRequest){
  try{assertCsrf(request)}catch{return safeJsonError("Request rejected",403)}
  const a=await requireApiUser("admin:manage");if(!a.ok)return safeJsonError(a.message,a.status);
  const p=schema.safeParse(await request.json().catch(()=>null));if(!p.success)return safeJsonError(p.error.issues[0]?.message??"Invalid user",422);const d=p.data;
  if(d.branchId){const b=await query(`SELECT 1 FROM branches WHERE id=$1 AND organization_id=$2`,[d.branchId,a.user.organizationId]);if(!b.rowCount)return safeJsonError("Invalid branch",422)}
  if(d.employeeId){const e=await query(`SELECT 1 FROM employees WHERE id=$1 AND organization_id=$2 AND deleted_at IS NULL`,[d.employeeId,a.user.organizationId]);if(!e.rowCount)return safeJsonError("Invalid employee",422)}
  if(d.role==="EMPLOYEE"&&!d.employeeId)return safeJsonError("Employee accounts must be linked to an employee",422);
  const hash=await argon2.hash(d.password,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1});
  try{
    const r=await query<{id:string;email:string;display_name:string;role:string}>(`INSERT INTO users(organization_id,branch_id,employee_id,email,display_name,password_hash,role,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING id,email,display_name,role`,[a.user.organizationId,d.branchId||null,d.employeeId||null,d.email.trim().toLowerCase(),d.displayName,hash,d.role]);
    await audit({organizationId:a.user.organizationId,actorUserId:a.user.id,action:"admin.user.create",entityType:"user",entityId:r.rows[0].id,after:{email:r.rows[0].email,displayName:r.rows[0].display_name,role:r.rows[0].role},requestId:request.headers.get("x-request-id")});
    return Response.json({ok:true,user:r.rows[0]},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(e:any){if(e?.code==="23505")return safeJsonError("Email already exists",409);console.error("admin_user_create",e);return safeJsonError("Unable to create user",500)}
}
