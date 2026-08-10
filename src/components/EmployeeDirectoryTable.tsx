"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/locale";

export type EmployeeDirectoryRow={id:string;employee_no:string;first_name:string;last_name:string;work_email:string;job_title:string;status:string;branch_name:string|null;department_name:string|null};

const statusAr:Record<string,string>={ACTIVE:"نشط",ON_LEAVE:"في إجازة",SUSPENDED:"موقوف",TERMINATED:"منتهي الخدمة"};
function statusLabel(status:string,locale:Locale){return locale==="ar"?(statusAr[status]??status):status.replaceAll("_"," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}
function csv(v:unknown){const s=v==null?"":String(v);return `"${s.replaceAll('"','""')}"`}

export function EmployeeDirectoryTable({rows,locale,headers}:{rows:EmployeeDirectoryRow[];locale:Locale;headers:readonly string[]}){
  const ar=locale==="ar";const [q,setQ]=useState("");const [status,setStatus]=useState("");const [page,setPage]=useState(1);const pageSize=25;
  const filtered=useMemo(()=>{const s=q.trim().toLowerCase();return rows.filter(r=>(!status||r.status===status)&&(!s||[r.employee_no,r.first_name,r.last_name,r.work_email,r.job_title,r.department_name,r.branch_name].some(v=>String(v??"").toLowerCase().includes(s))))},[rows,q,status]);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));const current=Math.min(page,pages);const visible=filtered.slice((current-1)*pageSize,current*pageSize);
  function exportCsv(){const head=[ar?"الموظف":"Employee",ar?"الرقم الوظيفي":"Employee No",ar?"المسمى الوظيفي":"Job title",ar?"الإدارة":"Department",ar?"الفرع":"Branch",ar?"الحالة":"Status",ar?"البريد":"Email"];const lines=[head.map(csv).join(","),...filtered.map(r=>[`${r.first_name} ${r.last_name}`,r.employee_no,r.job_title,r.department_name??"",r.branch_name??"",statusLabel(r.status,locale),r.work_email].map(csv).join(","))];const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="alturud-employees.csv";a.click();URL.revokeObjectURL(a.href)}
  return <section className="panel"><div className="toolbar"><input className="searchWide" value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder={ar?"ابحث بالاسم أو الرقم أو البريد أو الوظيفة...":"Search name, number, email or job..."}/><select className="secondaryButton" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">{ar?"جميع الحالات":"All statuses"}</option>{["ACTIVE","ON_LEAVE","SUSPENDED","TERMINATED"].map(s=><option key={s} value={s}>{statusLabel(s,locale)}</option>)}</select><button className="secondaryButton" onClick={exportCsv} disabled={!filtered.length}>{ar?"تصدير CSV":"Export CSV"}</button></div>
    {!visible.length?<div className="emptyState">{ar?"لا توجد نتائج مطابقة.":"No matching employees."}</div>:<div className="tableWrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(r=><tr key={r.id}><td><Link href={`/employees/${r.id}`}><strong>{r.first_name} {r.last_name}</strong><br/><span className="mutedEmail" dir="ltr">{r.work_email}</span></Link></td><td dir="ltr">{r.employee_no}</td><td>{r.job_title}</td><td>{r.department_name??"—"}</td><td>{r.branch_name??"—"}</td><td><span className={`badge ${r.status==="ACTIVE"?"active":r.status==="ON_LEAVE"?"pending":"review"}`}>{statusLabel(r.status,locale)}</span></td></tr>)}</tbody></table></div>}
    <div className="tableFooter"><span>{filtered.length} {ar?"موظف":"employees"}</span><div><button disabled={current<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>←</button><button>{current}/{pages}</button><button disabled={current>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>→</button></div></div>
  </section>;
}
