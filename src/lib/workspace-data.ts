import type { AuthUser } from "@/lib/session";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getWorkspaceConfig, publicField, type WorkspaceConfig, type WorkspaceField } from "@/lib/workspace-config";

function ident(value:string){if(!/^[a-z_][a-z0-9_]*$/i.test(value))throw new Error("INVALID_IDENTIFIER");return value}
function cols(cfg:WorkspaceConfig){return [...new Set(cfg.fields.map(f=>ident(f.column)))];}
function scopeClause(cfg:WorkspaceConfig,user:AuthUser,values:unknown[]){
  if(user.role!=="EMPLOYEE"||!cfg.scopeEmployeeColumn)return "";
  if(!user.employeeId)return " AND 1=0";
  values.push(user.employeeId);return ` AND ${ident(cfg.scopeEmployeeColumn)}=$${values.length}`;
}
function orgWhere(cfg:WorkspaceConfig,user:AuthUser,values:unknown[]){
  values.push(user.organizationId);let sql=`organization_id=$${values.length}`;
  if(cfg.whereSql)sql+=` AND (${cfg.whereSql})`;
  sql+=scopeClause(cfg,user,values);return sql;
}

function normalize(field:WorkspaceField,value:unknown){
  if(value===""||value===undefined)return null;
  if(value===null)return null;
  if(field.type==="number"){
    const n=typeof value==="number"?value:Number(value);if(!Number.isFinite(n))throw new Error(`INVALID_FIELD:${field.key}`);return n;
  }
  if(field.type==="boolean"){
    if(typeof value==="boolean")return value;if(value==="true"||value==="1"||value===1)return true;if(value==="false"||value==="0"||value===0)return false;throw new Error(`INVALID_FIELD:${field.key}`);
  }
  if(field.type==="json"){
    if(typeof value==="object")return JSON.stringify(value);
    try{return JSON.stringify(JSON.parse(String(value)))}catch{throw new Error(`INVALID_FIELD:${field.key}`)}
  }
  const s=String(value).trim();
  if(field.options?.length&&!field.options.some(o=>o.value===s))throw new Error(`INVALID_FIELD:${field.key}`);
  if(field.type==="email"&&s&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new Error(`INVALID_FIELD:${field.key}`);
  return s||null;
}

function mutationValues(cfg:WorkspaceConfig,user:AuthUser,body:Record<string,unknown>,mode:"create"|"update"){
  const values=new Map<string,unknown>();
  for(const field of cfg.fields){
    if(field.readOnly||field.hidden||!(field.key in body))continue;
    const value=normalize(field,body[field.key]);
    if(field.required&&(value===null||value===""))throw new Error(`REQUIRED_FIELD:${field.key}`);
    values.set(ident(field.column),value);
  }
  if(mode==="create"){
    for(const field of cfg.fields){
      if(field.readOnly||field.hidden||!field.required)continue;
      if(!values.has(field.column)&&!(cfg.fixedValues&&field.column in cfg.fixedValues))throw new Error(`REQUIRED_FIELD:${field.key}`);
    }
  }
  for(const [key,value] of Object.entries(cfg.fixedValues??{}))values.set(ident(key),value);
  if(user.role==="EMPLOYEE"&&cfg.scopeEmployeeColumn){
    if(!user.employeeId)throw new Error("EMPLOYEE_NOT_LINKED");values.set(ident(cfg.scopeEmployeeColumn),user.employeeId);
  }
  if(mode==="create"&&cfg.createdByColumn)values.set(ident(cfg.createdByColumn),user.id);
  if(mode==="update"&&cfg.updatedByColumn)values.set(ident(cfg.updatedByColumn),user.id);
  return values;
}

async function lookupData(cfg:WorkspaceConfig,user:AuthUser){
  const entries=await Promise.all(cfg.fields.filter(f=>f.lookup).map(async field=>{
    const l=field.lookup!;const table=ident(l.table);const values:unknown[]=[user.organizationId];
    let where="organization_id=$1";
    if(l.whereSql)where+=` AND (${l.whereSql})`;
    if(user.role==="EMPLOYEE"&&cfg.scopeEmployeeColumn===field.column&&user.employeeId){values.push(user.employeeId);where+=` AND id=$2`;}
    const r=await query<{id:string;label:string}>(`SELECT id, ${l.labelSql} AS label FROM ${table} WHERE ${where} ORDER BY ${l.orderBy??"2"} LIMIT 1000`,values);
    return [field.key,r.rows] as const;
  }));
  return Object.fromEntries(entries);
}

export async function getWorkspacePayload(moduleKey:string,screenSlug:string,user:AuthUser,locale:"ar"|"en"){
  const cfg=getWorkspaceConfig(moduleKey,screenSlug);if(!cfg)throw new Error("WORKSPACE_NOT_FOUND");
  const values:unknown[]=[];const where=orgWhere(cfg,user,values);const selected=["id",...cols(cfg)].join(",");
  const r=await query<Record<string,unknown>>(`SELECT ${selected} FROM ${ident(cfg.table)} WHERE ${where} ORDER BY ${cfg.orderBy} LIMIT 500`,values);
  return {config:cfg,publicConfig:{fields:cfg.fields.map(f=>publicField(f,locale)),listFields:cfg.listFields,allowCreate:cfg.allowCreate,allowUpdate:cfg.allowUpdate,allowDelete:cfg.allowDelete},rows:r.rows,lookups:await lookupData(cfg,user)};
}

async function recordForMutation(cfg:WorkspaceConfig,user:AuthUser,id:string){
  const values:unknown[]=[user.organizationId,id];let where="organization_id=$1 AND id=$2";
  if(user.role==="EMPLOYEE"&&cfg.scopeEmployeeColumn){if(!user.employeeId)return null;values.push(user.employeeId);where+=` AND ${ident(cfg.scopeEmployeeColumn)}=$3`;}
  const r=await query<Record<string,unknown>>(`SELECT * FROM ${ident(cfg.table)} WHERE ${where} LIMIT 1`,values);return r.rows[0]??null;
}

export async function createWorkspaceRecord(moduleKey:string,screenSlug:string,user:AuthUser,body:Record<string,unknown>,requestId?:string|null){
  const cfg=getWorkspaceConfig(moduleKey,screenSlug);if(!cfg||!cfg.allowCreate)throw new Error("CREATE_NOT_ALLOWED");
  const map=mutationValues(cfg,user,body,"create");map.set("organization_id",user.organizationId);
  const columns=[...map.keys()];const values=[...map.values()];const params=values.map((_,i)=>`$${i+1}`).join(",");
  const r=await query<Record<string,unknown>>(`INSERT INTO ${ident(cfg.table)}(${columns.join(",")}) VALUES(${params}) RETURNING *`,values);
  const row=r.rows[0];await audit({organizationId:user.organizationId,actorUserId:user.id,action:`${moduleKey}.${screenSlug}.create`,entityType:cfg.table,entityId:String(row.id??""),after:row,requestId});return row;
}

export async function updateWorkspaceRecord(moduleKey:string,screenSlug:string,user:AuthUser,id:string,body:Record<string,unknown>,requestId?:string|null){
  const cfg=getWorkspaceConfig(moduleKey,screenSlug);if(!cfg||!cfg.allowUpdate)throw new Error("UPDATE_NOT_ALLOWED");
  const before=await recordForMutation(cfg,user,id);if(!before)throw new Error("RECORD_NOT_FOUND");
  const map=mutationValues(cfg,user,body,"update");if(!map.size)return before;
  const values=[...map.values()];const set=[...map.keys()].map((k,i)=>`${k}=$${i+1}`).join(",");values.push(user.organizationId,id);
  let where=`organization_id=$${values.length-1} AND id=$${values.length}`;
  if(user.role==="EMPLOYEE"&&cfg.scopeEmployeeColumn){if(!user.employeeId)throw new Error("EMPLOYEE_NOT_LINKED");values.push(user.employeeId);where+=` AND ${ident(cfg.scopeEmployeeColumn)}=$${values.length}`;}
  const r=await query<Record<string,unknown>>(`UPDATE ${ident(cfg.table)} SET ${set} WHERE ${where} RETURNING *`,values);const after=r.rows[0];if(!after)throw new Error("RECORD_NOT_FOUND");
  await audit({organizationId:user.organizationId,actorUserId:user.id,action:`${moduleKey}.${screenSlug}.update`,entityType:cfg.table,entityId:id,before,after,requestId});return after;
}

export async function deleteWorkspaceRecord(moduleKey:string,screenSlug:string,user:AuthUser,id:string,requestId?:string|null){
  const cfg=getWorkspaceConfig(moduleKey,screenSlug);if(!cfg||!cfg.allowDelete)throw new Error("DELETE_NOT_ALLOWED");
  const before=await recordForMutation(cfg,user,id);if(!before)throw new Error("RECORD_NOT_FOUND");
  const values:unknown[]=[user.organizationId,id];let where="organization_id=$1 AND id=$2";
  if(user.role==="EMPLOYEE"&&cfg.scopeEmployeeColumn){if(!user.employeeId)throw new Error("EMPLOYEE_NOT_LINKED");values.push(user.employeeId);where+=` AND ${ident(cfg.scopeEmployeeColumn)}=$3`;}
  const r=await query(`DELETE FROM ${ident(cfg.table)} WHERE ${where}`,values);if(!r.rowCount)throw new Error("RECORD_NOT_FOUND");
  await audit({organizationId:user.organizationId,actorUserId:user.id,action:`${moduleKey}.${screenSlug}.delete`,entityType:cfg.table,entityId:id,before,requestId});
}
