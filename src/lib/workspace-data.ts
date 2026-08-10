import type { AuthUser } from "@/lib/session";
import { query, withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { getWorkspaceConfig, publicField, type WorkspaceConfig, type WorkspaceField } from "@/lib/workspace-config";

function ident(value:string){if(!/^[a-z_][a-z0-9_]*$/i.test(value))throw new Error("INVALID_IDENTIFIER");return value}
function cols(cfg:WorkspaceConfig){return [...new Set(cfg.fields.map(f=>ident(f.column)))];}
function scopedEmployeeClause(cfg:WorkspaceConfig,user:AuthUser,values:unknown[]){
  if(!cfg.scopeEmployeeColumn)return "";const col=ident(cfg.scopeEmployeeColumn);
  if(user.role==="EMPLOYEE"){if(!user.employeeId)return " AND 1=0";values.push(user.employeeId);return ` AND ${col}=$${values.length}`}
  if(user.role==="MANAGER"){if(!user.employeeId)return " AND 1=0";values.push(user.employeeId);const empIdx=values.length;values.push(user.organizationId);const orgIdx=values.length;return ` AND (${col}=$${empIdx} OR ${col} IN (SELECT id FROM employees WHERE organization_id=$${orgIdx} AND manager_employee_id=$${empIdx} AND deleted_at IS NULL))`}
  return "";
}
function orgWhere(cfg:WorkspaceConfig,user:AuthUser,values:unknown[]){values.push(user.organizationId);let sql=`organization_id=$${values.length}`;if(cfg.whereSql)sql+=` AND (${cfg.whereSql})`;sql+=scopedEmployeeClause(cfg,user,values);if(cfg.table==="approval_actions"&&user.role==="MANAGER"){values.push(user.id);sql+=` AND approver_user_id=$${values.length}`}return sql}

function normalize(field:WorkspaceField,value:unknown){
  if(value===""||value===undefined||value===null)return null;
  if(field.type==="number"){const n=typeof value==="number"?value:Number(value);if(!Number.isFinite(n))throw new Error(`INVALID_FIELD:${field.key}`);return n}
  if(field.type==="boolean"){if(typeof value==="boolean")return value;if(value==="true"||value==="1"||value===1)return true;if(value==="false"||value==="0"||value===0)return false;throw new Error(`INVALID_FIELD:${field.key}`)}
  if(field.type==="json"){if(typeof value==="object")return JSON.stringify(value);try{return JSON.stringify(JSON.parse(String(value)))}catch{throw new Error(`INVALID_FIELD:${field.key}`)}}
  const s=String(value).trim();if(field.options?.length&&!field.options.some(o=>o.value===s))throw new Error(`INVALID_FIELD:${field.key}`);if(field.type==="email"&&s&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new Error(`INVALID_FIELD:${field.key}`);return s||null;
}
function mutationValues(cfg:WorkspaceConfig,user:AuthUser,body:Record<string,unknown>,mode:"create"|"update"){
  const values=new Map<string,unknown>();for(const field of cfg.fields){if(field.readOnly||field.hidden||!(field.key in body))continue;const value=normalize(field,body[field.key]);if(field.required&&(value===null||value===""))throw new Error(`REQUIRED_FIELD:${field.key}`);values.set(ident(field.column),value)}
  if(mode==="create")for(const field of cfg.fields){if(field.readOnly||field.hidden||!field.required)continue;if(!values.has(field.column)&&!(cfg.fixedValues&&field.column in cfg.fixedValues))throw new Error(`REQUIRED_FIELD:${field.key}`)}
  for(const [key,value] of Object.entries(cfg.fixedValues??{}))values.set(ident(key),value);
  if(user.role==="EMPLOYEE"&&cfg.scopeEmployeeColumn){if(!user.employeeId)throw new Error("EMPLOYEE_NOT_LINKED");values.set(ident(cfg.scopeEmployeeColumn),user.employeeId)}
  if(mode==="create"&&cfg.createdByColumn)values.set(ident(cfg.createdByColumn),user.id);if(mode==="update"&&cfg.updatedByColumn)values.set(ident(cfg.updatedByColumn),user.id);return values;
}
async function ensureManagerTarget(cfg:WorkspaceConfig,user:AuthUser,map:Map<string,unknown>){
  if(user.role!=="MANAGER"||!cfg.scopeEmployeeColumn)return;const target=map.get(cfg.scopeEmployeeColumn);if(!target)return;if(!user.employeeId)throw new Error("RECORD_NOT_FOUND");const r=await query("SELECT 1 FROM employees WHERE organization_id=$1 AND id=$2 AND deleted_at IS NULL AND (id=$3 OR manager_employee_id=$3)",[user.organizationId,target,user.employeeId]);if(!r.rowCount)throw new Error("RECORD_NOT_FOUND");
}
function applyMutationGuards(moduleKey:string,screenSlug:string,user:AuthUser,map:Map<string,unknown>,mode:"create"|"update",before?:Record<string,unknown>){
  if(moduleKey==="leave"&&screenSlug==="requests"){
    if(mode==="create"){map.set("status","PENDING");map.delete("current_approver_user_id")}
    else{map.delete("status");map.delete("current_approver_user_id");if(before&&!can(user.role,"leave:approve")&&!['DRAFT','PENDING'].includes(String(before.status??"")))throw new Error("UPDATE_NOT_ALLOWED")}
  }
  if(moduleKey==="requests"&&screenSlug==="my-requests"&&user.role==="EMPLOYEE"){
    map.delete("assigned_to_user_id");if(mode==="create")map.set("status","PENDING");else{map.delete("status");if(before&&!['DRAFT','PENDING'].includes(String(before.status??"")))throw new Error("UPDATE_NOT_ALLOWED")}
  }
  if(moduleKey==="approvals"&&screenSlug==="pending"){
    for(const k of ["entity_type","entity_id","step_no","approver_user_id","decided_at"])map.delete(k);if(map.has("decision")&&!['APPROVED','REJECTED','RETURNED',null].includes(map.get("decision") as any))throw new Error("INVALID_FIELD:decision")
  }
}
function fieldForUser(moduleKey:string,screenSlug:string,user:AuthUser,field:WorkspaceField,locale:"ar"|"en"){
  const p=publicField(field,locale);if(moduleKey==="leave"&&screenSlug==="requests"&&["status","current_approver_user_id"].includes(field.key))return {...p,readOnly:true};if(moduleKey==="requests"&&screenSlug==="my-requests"&&user.role==="EMPLOYEE"&&["status","assigned_to_user_id"].includes(field.key))return {...p,readOnly:true};if(moduleKey==="approvals"&&screenSlug==="pending"&&["entity_type","entity_id","step_no","approver_user_id","decided_at"].includes(field.key))return {...p,readOnly:true};return p;
}
async function lookupData(cfg:WorkspaceConfig,user:AuthUser){
  const entries=await Promise.all(cfg.fields.filter(f=>f.lookup).map(async field=>{const l=field.lookup!,table=ident(l.table),values:unknown[]=[user.organizationId];let where="organization_id=$1";if(l.whereSql)where+=` AND (${l.whereSql})`;
    if(cfg.scopeEmployeeColumn===field.column&&table==="employees"){
      if(user.role==="EMPLOYEE"){if(!user.employeeId)return [field.key,[]] as const;values.push(user.employeeId);where+=` AND id=$2`}
      if(user.role==="MANAGER"){if(!user.employeeId)return [field.key,[]] as const;values.push(user.employeeId);where+=` AND (id=$2 OR manager_employee_id=$2)`}
    }
    const r=await query<{id:string;label:string}>(`SELECT id, ${l.labelSql} AS label FROM ${table} WHERE ${where} ORDER BY ${l.orderBy??"2"} LIMIT 1000`,values);return [field.key,r.rows] as const}));return Object.fromEntries(entries);
}
export async function getWorkspacePayload(moduleKey:string,screenSlug:string,user:AuthUser,locale:"ar"|"en"){
  const cfg=getWorkspaceConfig(moduleKey,screenSlug);if(!cfg)throw new Error("WORKSPACE_NOT_FOUND");const values:unknown[]=[],where=orgWhere(cfg,user,values),selected=["id",...cols(cfg)].join(",");const r=await query<Record<string,unknown>>(`SELECT ${selected} FROM ${ident(cfg.table)} WHERE ${where} ORDER BY ${cfg.orderBy} LIMIT 500`,values);
  return {config:cfg,publicConfig:{fields:cfg.fields.map(f=>fieldForUser(moduleKey,screenSlug,user,f,locale)),listFields:cfg.listFields,allowCreate:cfg.allowCreate,allowUpdate:cfg.allowUpdate,allowDelete:cfg.allowDelete},rows:r.rows,lookups:await lookupData(cfg,user)};
}
async function recordForMutation(cfg:WorkspaceConfig,user:AuthUser,id:string){const values:unknown[]=[user.organizationId,id];let where="organization_id=$1 AND id=$2";where+=scopedEmployeeClause(cfg,user,values);if(cfg.table==="approval_actions"&&user.role==="MANAGER"){values.push(user.id);where+=` AND approver_user_id=$${values.length}`}const r=await query<Record<string,unknown>>(`SELECT * FROM ${ident(cfg.table)} WHERE ${where} LIMIT 1`,values);return r.rows[0]??null}
async function leaveApprover(user:AuthUser,employeeId:string){const r=await query<{id:string}>(`SELECT u.id FROM employees e JOIN users u ON u.organization_id=e.organization_id AND u.employee_id=e.manager_employee_id AND u.is_active=TRUE WHERE e.organization_id=$1 AND e.id=$2 LIMIT 1`,[user.organizationId,employeeId]);if(r.rows[0])return r.rows[0].id;const fallback=await query<{id:string}>(`SELECT id FROM users WHERE organization_id=$1 AND is_active=TRUE AND role IN ('HR_MANAGER','HR_ADMIN') ORDER BY CASE role WHEN 'HR_MANAGER' THEN 1 ELSE 2 END LIMIT 1`,[user.organizationId]);return fallback.rows[0]?.id??null}

export async function createWorkspaceRecord(moduleKey:string,screenSlug:string,user:AuthUser,body:Record<string,unknown>,requestId?:string|null){
  const cfg=getWorkspaceConfig(moduleKey,screenSlug);if(!cfg||!cfg.allowCreate)throw new Error("CREATE_NOT_ALLOWED");const map=mutationValues(cfg,user,body,"create");applyMutationGuards(moduleKey,screenSlug,user,map,"create");await ensureManagerTarget(cfg,user,map);map.set("organization_id",user.organizationId);
  let approver:string|null=null;if(moduleKey==="leave"&&screenSlug==="requests"){const employeeId=String(map.get("employee_id")??"");if(!employeeId)throw new Error("REQUIRED_FIELD:employee_id");approver=await leaveApprover(user,employeeId);if(approver)map.set("current_approver_user_id",approver)}
  const columns=[...map.keys()],values=[...map.values()],params=values.map((_,i)=>`$${i+1}`).join(",");const row=await withTransaction(async c=>{const r=await c.query<Record<string,unknown>>(`INSERT INTO ${ident(cfg.table)}(${columns.join(",")}) VALUES(${params}) RETURNING *`,values);const created=r.rows[0];if(approver&&moduleKey==="leave"&&screenSlug==="requests")await c.query(`INSERT INTO approval_actions(organization_id,entity_type,entity_id,step_no,approver_user_id) VALUES($1,'leave_request',$2,1,$3)`,[user.organizationId,created.id,approver]);return created});
  await audit({organizationId:user.organizationId,actorUserId:user.id,action:`${moduleKey}.${screenSlug}.create`,entityType:cfg.table,entityId:String(row.id??""),after:row,requestId});return row;
}
export async function updateWorkspaceRecord(moduleKey:string,screenSlug:string,user:AuthUser,id:string,body:Record<string,unknown>,requestId?:string|null){
  const cfg=getWorkspaceConfig(moduleKey,screenSlug);if(!cfg||!cfg.allowUpdate)throw new Error("UPDATE_NOT_ALLOWED");const before=await recordForMutation(cfg,user,id);if(!before)throw new Error("RECORD_NOT_FOUND");const map=mutationValues(cfg,user,body,"update");applyMutationGuards(moduleKey,screenSlug,user,map,"update",before);await ensureManagerTarget(cfg,user,map);if(!map.size)return before;
  const values=[...map.values()],set=[...map.keys()].map((k,i)=>`${k}=$${i+1}`).join(",");values.push(user.organizationId,id);let where=`organization_id=$${values.length-1} AND id=$${values.length}`;if(user.role==="EMPLOYEE"&&cfg.scopeEmployeeColumn){if(!user.employeeId)throw new Error("EMPLOYEE_NOT_LINKED");values.push(user.employeeId);where+=` AND ${ident(cfg.scopeEmployeeColumn)}=$${values.length}`}if(user.role==="MANAGER"&&cfg.scopeEmployeeColumn){if(!user.employeeId)throw new Error("RECORD_NOT_FOUND");values.push(user.employeeId,user.organizationId);where+=` AND (${ident(cfg.scopeEmployeeColumn)}=$${values.length-1} OR ${ident(cfg.scopeEmployeeColumn)} IN (SELECT id FROM employees WHERE manager_employee_id=$${values.length-1} AND organization_id=$${values.length} AND deleted_at IS NULL))`}if(cfg.table==="approval_actions"&&user.role==="MANAGER"){values.push(user.id);where+=` AND approver_user_id=$${values.length}`}
  const r=await query<Record<string,unknown>>(`UPDATE ${ident(cfg.table)} SET ${set} WHERE ${where} RETURNING *`,values),after=r.rows[0];if(!after)throw new Error("RECORD_NOT_FOUND");await audit({organizationId:user.organizationId,actorUserId:user.id,action:`${moduleKey}.${screenSlug}.update`,entityType:cfg.table,entityId:id,before,after,requestId});return after;
}
export async function deleteWorkspaceRecord(moduleKey:string,screenSlug:string,user:AuthUser,id:string,requestId?:string|null){
  const cfg=getWorkspaceConfig(moduleKey,screenSlug);if(!cfg||!cfg.allowDelete)throw new Error("DELETE_NOT_ALLOWED");const before=await recordForMutation(cfg,user,id);if(!before)throw new Error("RECORD_NOT_FOUND");if(moduleKey==="leave"&&screenSlug==="requests"&&!can(user.role,"leave:approve")&&!['DRAFT','PENDING'].includes(String(before.status??"")))throw new Error("DELETE_NOT_ALLOWED");if(moduleKey==="requests"&&screenSlug==="my-requests"&&user.role==="EMPLOYEE"&&!['DRAFT','PENDING'].includes(String(before.status??"")))throw new Error("DELETE_NOT_ALLOWED");
  const values:unknown[]=[user.organizationId,id];let where="organization_id=$1 AND id=$2";where+=scopedEmployeeClause(cfg,user,values);if(cfg.table==="approval_actions"&&user.role==="MANAGER"){values.push(user.id);where+=` AND approver_user_id=$${values.length}`}const r=await query(`DELETE FROM ${ident(cfg.table)} WHERE ${where}`,values);if(!r.rowCount)throw new Error("RECORD_NOT_FOUND");await audit({organizationId:user.organizationId,actorUserId:user.id,action:`${moduleKey}.${screenSlug}.delete`,entityType:cfg.table,entityId:id,before,requestId});
}
