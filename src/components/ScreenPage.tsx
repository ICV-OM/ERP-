"use client";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ModuleConfig, Screen } from "@/lib/modules";
import type { Locale } from "@/lib/locale";

type Option={value:string;label:string};
type Field={key:string;column:string;label:string;type:string;required?:boolean;readOnly?:boolean;hidden?:boolean;options?:Option[]};
type Row=Record<string,unknown>&{id:string|number};
type Payload={ok:boolean;publicConfig:{fields:Field[];listFields:string[];allowCreate:boolean;allowUpdate:boolean;allowDelete:boolean};rows:Row[];lookups:Record<string,{id:string;label:string}[]>;error?:string};

function csrf(){return decodeURIComponent(document.cookie.split("; ").find(v=>v.startsWith("alturud_csrf="))?.split("=")[1]??"")}
function inputValue(field:Field,value:unknown){
  if(value===null||value===undefined)return "";const s=typeof value==="object"?JSON.stringify(value,null,2):String(value);
  if(field.type==="date")return s.slice(0,10);if(field.type==="datetime-local")return s.replace(" ","T").slice(0,16);if(field.type==="time")return s.slice(0,5);return s;
}
function csvCell(value:unknown){const s=value==null?"":String(value);return `"${s.replaceAll('"','""')}"`}
function badgeClass(value:unknown){const s=String(value??"").toUpperCase();if(["ACTIVE","APPROVED","COMPLETED","PRESENT","HIRED","CONFIRMED","AVAILABLE","ENABLED"].includes(s))return "active";if(["PENDING","DRAFT","APPLIED","SCREENING","INTERVIEW","OFFER"].includes(s))return "pending";return "review"}

export function ScreenPage({module,screen,locale}:{module:ModuleConfig;screen:Screen;locale:Locale}){
  const ar=locale==="ar";const [data,setData]=useState<Payload|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [query,setQuery]=useState("");const [statusFilter,setStatusFilter]=useState("");const [editor,setEditor]=useState<Row|Record<string,never>|null>(null);const [saving,setSaving]=useState(false);const [page,setPage]=useState(1);
  const endpoint=`/api/workspace/${module.key}/${screen.slug}`;
  const text=ar?{workspace:"مساحة العمل",create:"إضافة سجل",search:"بحث في السجلات...",filter:"الحالة",all:"الكل",export:"تصدير CSV",loading:"جاري تحميل البيانات...",empty:"لا توجد سجلات حتى الآن.",edit:"تعديل",del:"حذف",save:"حفظ",cancel:"إلغاء",newTitle:"إضافة سجل جديد",editTitle:"تعديل السجل",confirm:"هل تريد حذف هذا السجل؟",unable:"تعذر تنفيذ العملية.",refresh:"تحديث",showing:"سجل",previous:"السابق",next:"التالي"}:{workspace:"Workspace",create:"Create record",search:"Search records...",filter:"Status",all:"All",export:"Export CSV",loading:"Loading data...",empty:"No records yet.",edit:"Edit",del:"Delete",save:"Save",cancel:"Cancel",newTitle:"Create new record",editTitle:"Edit record",confirm:"Delete this record?",unable:"Unable to complete the operation.",refresh:"Refresh",showing:"records",previous:"Previous",next:"Next"};

  async function load(){setLoading(true);setError("");try{const r=await fetch(endpoint,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||text.unable);setData(d)}catch(e){setError(e instanceof Error?e.message:text.unable)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[endpoint]);
  useEffect(()=>{setPage(1)},[query,statusFilter]);

  const fields=data?.publicConfig.fields??[];const listFields=data?.publicConfig.listFields??[];
  const fieldMap=useMemo(()=>Object.fromEntries(fields.map(f=>[f.key,f])),[fields]);
  const lookupLabel=(key:string,value:unknown)=>data?.lookups?.[key]?.find(x=>String(x.id)===String(value))?.label??value;
  const rows=useMemo(()=>{
    const q=query.trim().toLowerCase();return (data?.rows??[]).filter(row=>{
      if(statusFilter&&String(row.status??row.decision??"")!==statusFilter)return false;
      if(!q)return true;return listFields.some(key=>String(lookupLabel(key,row[key])??"").toLowerCase().includes(q));
    });
  },[data,query,statusFilter,listFields]);
  const pageSize=25,totalPages=Math.max(1,Math.ceil(rows.length/pageSize)),visible=rows.slice((page-1)*pageSize,page*pageSize);
  const statusOptions=useMemo(()=>{const values=new Set((data?.rows??[]).map(r=>String(r.status??r.decision??"")).filter(Boolean));return [...values]},[data]);

  function exportCsv(){if(!data)return;const header=listFields.map(k=>fieldMap[k]?.label??k);const lines=[header.map(csvCell).join(","),...rows.map(row=>listFields.map(k=>csvCell(lookupLabel(k,row[k]))).join(","))];const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${module.key}-${screen.slug}.csv`;a.click();URL.revokeObjectURL(a.href)}

  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!data||editor===null)return;setSaving(true);setError("");const fd=new FormData(e.currentTarget);const body=Object.fromEntries(fd.entries());const isEdit="id" in editor;const url=isEdit?`${endpoint}/${editor.id}`:endpoint;try{const r=await fetch(url,{method:isEdit?"PATCH":"POST",headers:{"content-type":"application/json","x-csrf-token":csrf()},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||text.unable);setEditor(null);await load()}catch(e){setError(e instanceof Error?e.message:text.unable)}finally{setSaving(false)}}
  async function remove(row:Row){if(!confirm(text.confirm))return;setError("");try{const r=await fetch(`${endpoint}/${row.id}`,{method:"DELETE",headers:{"x-csrf-token":csrf()}});const d=await r.json();if(!r.ok)throw new Error(d.error||text.unable);await load()}catch(e){setError(e instanceof Error?e.message:text.unable)}}

  return <div>
    <div className="breadcrumbs"><Link href={`/${module.key}`}>{module.title}</Link><span>/</span><span>{screen.title}</span></div>
    <section className="pageHeader"><div><div className="eyebrow">{module.accent} · {text.workspace}</div><h1>{screen.title}</h1><p>{screen.description}</p></div><div className="formActions"><button className="secondaryButton" onClick={()=>void load()}>{text.refresh}</button>{data?.publicConfig.allowCreate&&<button className="primaryButton" onClick={()=>setEditor({})}>{text.create}</button>}</div></section>
    {error&&<div className="alert error">{error}</div>}

    {editor!==null&&data&&<section className="panel" style={{marginBottom:18}}><div className="panelHead"><div><h2>{"id" in editor?text.editTitle:text.newTitle}</h2></div></div>
      <form className="formPanel" onSubmit={submit}><div className="formGrid">{fields.filter(f=>!f.hidden&&!f.readOnly).map(field=>{
        const value="id" in editor?editor[field.key]:undefined;const common={name:field.key,required:Boolean(field.required),defaultValue:inputValue(field,value)};
        if(field.type==="textarea"||field.type==="json")return <label key={field.key}>{field.label}<textarea {...common} rows={field.type==="json"?6:3}/></label>;
        if(field.type==="select")return <label key={field.key}>{field.label}<select {...common}><option value="">—</option>{field.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
        if(field.type==="lookup")return <label key={field.key}>{field.label}<select {...common}><option value="">—</option>{(data.lookups[field.key]??[]).map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>;
        if(field.type==="boolean")return <label key={field.key}>{field.label}<select {...common}><option value="true">{ar?"نعم":"Yes"}</option><option value="false">{ar?"لا":"No"}</option></select></label>;
        const type=field.type==="datetime-local"?"datetime-local":field.type==="number"?"number":field.type==="date"?"date":field.type==="time"?"time":field.type==="email"?"email":"text";
        return <label key={field.key}>{field.label}<input {...common} type={type} step={field.type==="number"?"any":undefined}/></label>})}</div>
        <div className="formActions"><button type="button" className="secondaryButton" onClick={()=>setEditor(null)}>{text.cancel}</button><button className="primaryButton" disabled={saving}>{saving?(ar?"جاري الحفظ...":"Saving..."):text.save}</button></div></form></section>}

    <section className="panel"><div className="toolbar"><input className="searchWide" value={query} onChange={e=>setQuery(e.target.value)} placeholder={text.search}/>{statusOptions.length>0&&<select className="secondaryButton" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">{text.all} · {text.filter}</option>{statusOptions.map(s=><option key={s} value={s}>{s}</option>)}</select>}<button className="secondaryButton" onClick={exportCsv} disabled={!rows.length}>{text.export}</button></div>
      {loading?<div className="emptyState">{text.loading}</div>:!visible.length?<div className="emptyState">{text.empty}</div>:<div className="tableWrap"><table><thead><tr>{listFields.map(k=><th key={k}>{fieldMap[k]?.label??k}</th>)}{(data?.publicConfig.allowUpdate||data?.publicConfig.allowDelete)&&<th></th>}</tr></thead><tbody>{visible.map(row=><tr key={String(row.id)}>{listFields.map(k=>{const v=lookupLabel(k,row[k]);const f=fieldMap[k];return <td key={k}>{(k==="status"||k==="decision")?<span className={`badge ${badgeClass(v)}`}>{String(v??"—")}</span>:f?.type==="boolean"?(row[k]?ar?"نعم":"Yes":ar?"لا":"No"):String(v??"—")}</td>})}{(data?.publicConfig.allowUpdate||data?.publicConfig.allowDelete)&&<td><div className="formActions">{data.publicConfig.allowUpdate&&<button className="rowAction" onClick={()=>setEditor(row)}>{text.edit}</button>}{data.publicConfig.allowDelete&&<button className="rowAction" onClick={()=>void remove(row)}>{text.del}</button>}</div></td>}</tr>)}</tbody></table></div>}
      <div className="tableFooter"><span>{rows.length} {text.showing}</span><div><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>{text.previous}</button><button>{page}/{totalPages}</button><button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>{text.next}</button></div></div>
    </section>
  </div>;
}
