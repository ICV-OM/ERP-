import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { requireApiUser } from "@/lib/session";
import { assertCsrf, safeJsonError } from "@/lib/security";
import { query, withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";

const MAX=10*1024*1024;
const allowed=new Set(["application/pdf","image/png","image/jpeg"]);
export async function POST(request:NextRequest){
  try{assertCsrf(request)}catch{return safeJsonError("Request rejected",403)}
  const a=await requireApiUser("documents:write");if(!a.ok)return safeJsonError(a.message,a.status);
  const form=await request.formData().catch(()=>null);if(!form)return safeJsonError("Invalid form",400);
  const file=form.get("file"),employeeId=String(form.get("employeeId")??""),type=String(form.get("type")??"").trim(),documentNo=String(form.get("documentNo")??"").trim(),issuedOn=String(form.get("issuedOn")??"").trim(),expiresOn=String(form.get("expiresOn")??"").trim(),classification=String(form.get("classification")??"INTERNAL").trim();
  if(!(file instanceof File)||!employeeId||!type)return safeJsonError("Employee, document type and file are required",422);if(file.size<=0||file.size>MAX)return safeJsonError("File must be 10 MB or smaller",413);if(!allowed.has(file.type))return safeJsonError("Only PDF, PNG and JPEG files are allowed",415);if(!["INTERNAL","CONFIDENTIAL","RESTRICTED"].includes(classification))return safeJsonError("Invalid classification",422);
  const er=await query("SELECT 1 FROM employees WHERE id=$1 AND organization_id=$2 AND deleted_at IS NULL",[employeeId,a.user.organizationId]);if(!er.rowCount)return safeJsonError("Invalid employee",422);
  const bytes=Buffer.from(await file.arrayBuffer()),hash=createHash("sha256").update(bytes).digest("hex"),storageKey=`db:${crypto.randomUUID()}`;
  try{const doc=await withTransaction(async c=>{const d=await c.query<{id:string}>(`INSERT INTO employee_documents(organization_id,employee_id,type,document_no,issued_on,expires_on,storage_key,classification,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,[a.user.organizationId,employeeId,type,documentNo||null,issuedOn||null,expiresOn||null,storageKey,classification,a.user.id]);const id=d.rows[0].id;await c.query(`INSERT INTO employee_document_files(document_id,organization_id,file_name,mime_type,size_bytes,sha256,content) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,a.user.organizationId,file.name.slice(0,255),file.type,file.size,hash,bytes]);return id});await audit({organizationId:a.user.organizationId,actorUserId:a.user.id,action:"document.upload",entityType:"employee_document",entityId:doc,after:{employeeId,type,documentNo:documentNo||null,fileName:file.name,size:file.size,classification,sha256:hash},requestId:request.headers.get("x-request-id")});return Response.json({ok:true,id:doc},{status:201,headers:{"Cache-Control":"no-store"}})}catch(e){console.error("document_upload",e);return safeJsonError("Unable to upload document",500)}
}
