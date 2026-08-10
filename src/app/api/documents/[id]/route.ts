import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/session";
import { assertCsrf, safeJsonError } from "@/lib/security";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";

type FileRow={document_id:string;employee_id:string;type:string;document_no:string|null;file_name:string;mime_type:string;size_bytes:number;content:Buffer};
export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const a=await requireApiUser("documents:read");if(!a.ok)return safeJsonError(a.message,a.status);const {id}=await params;const values:unknown[]=[id,a.user.organizationId];let scope="";if(a.user.role==="EMPLOYEE"){if(!a.user.employeeId)return safeJsonError("Document not found",404);values.push(a.user.employeeId);scope=" AND d.employee_id=$3"}
  const r=await query<FileRow>(`SELECT f.document_id,d.employee_id,d.type,d.document_no,f.file_name,f.mime_type,f.size_bytes,f.content FROM employee_document_files f JOIN employee_documents d ON d.id=f.document_id WHERE d.id=$1 AND d.organization_id=$2${scope} LIMIT 1`,values);const f=r.rows[0];if(!f)return safeJsonError("Document not found",404);
  return new Response(new Uint8Array(f.content),{headers:{"Content-Type":f.mime_type,"Content-Length":String(f.size_bytes),"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(f.file_name)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{assertCsrf(request)}catch{return safeJsonError("Request rejected",403)}const a=await requireApiUser("documents:write");if(!a.ok)return safeJsonError(a.message,a.status);const {id}=await params;
  const before=await query<{id:string;employee_id:string;type:string;document_no:string|null}>("SELECT id,employee_id,type,document_no FROM employee_documents WHERE id=$1 AND organization_id=$2 LIMIT 1",[id,a.user.organizationId]);if(!before.rowCount)return safeJsonError("Document not found",404);
  await query("DELETE FROM employee_documents WHERE id=$1 AND organization_id=$2",[id,a.user.organizationId]);await audit({organizationId:a.user.organizationId,actorUserId:a.user.id,action:"document.delete",entityType:"employee_document",entityId:id,before:before.rows[0],requestId:request.headers.get("x-request-id")});return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
