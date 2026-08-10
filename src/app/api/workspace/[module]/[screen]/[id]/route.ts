import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/session";
import { assertCsrf, safeJsonError } from "@/lib/security";
import { getWorkspaceConfig } from "@/lib/workspace-config";
import { deleteWorkspaceRecord, updateWorkspaceRecord } from "@/lib/workspace-data";

function apiError(error:unknown){
  const e=error as {message?:string;code?:string};const m=e?.message??"";
  if(m==="WORKSPACE_NOT_FOUND"||m==="RECORD_NOT_FOUND")return safeJsonError("Record not found",404);
  if(m==="UPDATE_NOT_ALLOWED"||m==="DELETE_NOT_ALLOWED")return safeJsonError("Operation is not allowed",405);
  if(m==="EMPLOYEE_NOT_LINKED")return safeJsonError("User is not linked to an employee",409);
  if(m.startsWith("REQUIRED_FIELD:"))return safeJsonError(`Required field: ${m.split(":")[1]}`,422);
  if(m.startsWith("INVALID_FIELD:"))return safeJsonError(`Invalid field: ${m.split(":")[1]}`,422);
  if(e?.code==="23505")return safeJsonError("A record with the same unique values already exists",409);
  if(e?.code==="23503")return safeJsonError("The record is referenced by another record and cannot be deleted",409);
  if(e?.code==="22P02"||e?.code==="23514")return safeJsonError("One or more field values are invalid",422);
  console.error("workspace_record_api_error",error);return safeJsonError("Unable to process workspace request",500);
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{module:string;screen:string;id:string}>}){
  try{assertCsrf(request)}catch{return safeJsonError("Request rejected",403)}
  const {module,screen,id}=await params;const cfg=getWorkspaceConfig(module,screen);if(!cfg)return safeJsonError("Workspace not found",404);if(!cfg.writePermission)return safeJsonError("Operation is not allowed",405);
  const a=await requireApiUser(cfg.writePermission);if(!a.ok)return safeJsonError(a.message,a.status);
  const body=await request.json().catch(()=>null);if(!body||typeof body!=="object"||Array.isArray(body))return safeJsonError("Invalid request body",400);
  try{const row=await updateWorkspaceRecord(module,screen,a.user,id,body as Record<string,unknown>,request.headers.get("x-request-id"));return Response.json({ok:true,row},{headers:{"Cache-Control":"no-store"}})}catch(e){return apiError(e)}
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{module:string;screen:string;id:string}>}){
  try{assertCsrf(request)}catch{return safeJsonError("Request rejected",403)}
  const {module,screen,id}=await params;const cfg=getWorkspaceConfig(module,screen);if(!cfg)return safeJsonError("Workspace not found",404);if(!cfg.writePermission)return safeJsonError("Operation is not allowed",405);
  const a=await requireApiUser(cfg.writePermission);if(!a.ok)return safeJsonError(a.message,a.status);
  try{await deleteWorkspaceRecord(module,screen,a.user,id,request.headers.get("x-request-id"));return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}})}catch(e){return apiError(e)}
}
