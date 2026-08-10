import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/session";
import { assertCsrf, safeJsonError } from "@/lib/security";
import { getLocale } from "@/lib/i18n";
import { getWorkspaceConfig } from "@/lib/workspace-config";
import { createWorkspaceRecord, getWorkspacePayload } from "@/lib/workspace-data";

function apiError(error:unknown){
  const e=error as {message?:string;code?:string};const m=e?.message??"";
  if(m==="WORKSPACE_NOT_FOUND")return safeJsonError("Workspace not found",404);
  if(m==="CREATE_NOT_ALLOWED")return safeJsonError("Creation is not allowed",405);
  if(m==="EMPLOYEE_NOT_LINKED")return safeJsonError("User is not linked to an employee",409);
  if(m.startsWith("REQUIRED_FIELD:"))return safeJsonError(`Required field: ${m.split(":")[1]}`,422);
  if(m.startsWith("INVALID_FIELD:"))return safeJsonError(`Invalid field: ${m.split(":")[1]}`,422);
  if(e?.code==="23505")return safeJsonError("A record with the same unique values already exists",409);
  if(e?.code==="23503"||e?.code==="22P02"||e?.code==="23514")return safeJsonError("One or more field values are invalid",422);
  console.error("workspace_api_error",error);return safeJsonError("Unable to process workspace request",500);
}

export async function GET(_request:NextRequest,{params}:{params:Promise<{module:string;screen:string}>}){
  const {module,screen}=await params;const cfg=getWorkspaceConfig(module,screen);if(!cfg)return safeJsonError("Workspace not found",404);
  const a=await requireApiUser(cfg.readPermission);if(!a.ok)return safeJsonError(a.message,a.status);
  try{const locale=await getLocale();const {config:_config,...payload}=await getWorkspacePayload(module,screen,a.user,locale);return Response.json({ok:true,...payload},{headers:{"Cache-Control":"no-store"}})}catch(e){return apiError(e)}
}

export async function POST(request:NextRequest,{params}:{params:Promise<{module:string;screen:string}>}){
  try{assertCsrf(request)}catch{return safeJsonError("Request rejected",403)}
  const {module,screen}=await params;const cfg=getWorkspaceConfig(module,screen);if(!cfg)return safeJsonError("Workspace not found",404);if(!cfg.writePermission)return safeJsonError("Creation is not allowed",405);
  const a=await requireApiUser(cfg.writePermission);if(!a.ok)return safeJsonError(a.message,a.status);
  const body=await request.json().catch(()=>null);if(!body||typeof body!=="object"||Array.isArray(body))return safeJsonError("Invalid request body",400);
  try{const row=await createWorkspaceRecord(module,screen,a.user,body as Record<string,unknown>,request.headers.get("x-request-id"));return Response.json({ok:true,row},{status:201,headers:{"Cache-Control":"no-store"}})}catch(e){return apiError(e)}
}
