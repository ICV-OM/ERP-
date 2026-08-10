"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/locale";

function csrf(){return decodeURIComponent(document.cookie.split("; ").find(v=>v.startsWith("alturud_csrf="))?.split("=")[1]??"")}
type Opt={id:string;label:string};
const roles=["SUPER_ADMIN","HR_ADMIN","HR_MANAGER","MANAGER","PAYROLL","RECRUITER","EMPLOYEE","AUDITOR"] as const;
const roleAr:Record<string,string>={SUPER_ADMIN:"مدير النظام العام",HR_ADMIN:"مسؤول الموارد البشرية",HR_MANAGER:"مدير الموارد البشرية",MANAGER:"مدير",PAYROLL:"مسؤول الرواتب",RECRUITER:"مسؤول التوظيف",EMPLOYEE:"موظف",AUDITOR:"مدقق"};

export function AdminUserForm({locale,branches,employees}:{locale:Locale;branches:Opt[];employees:Opt[]}){
  const ar=locale==="ar",router=useRouter();const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [role,setRole]=useState("EMPLOYEE");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());try{const r=await fetch("/api/admin/users",{method:"POST",headers:{"content-type":"application/json","x-csrf-token":csrf()},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to create user");router.push("/admin/users");router.refresh()}catch(e){setError(e instanceof Error?e.message:(ar?"تعذر إنشاء المستخدم":"Unable to create user"))}finally{setBusy(false)}}
  return <form className="formPanel" onSubmit={submit}>{error&&<div className="alert error">{error}</div>}<div className="formGrid">
    <label>{ar?"الاسم الظاهر":"Display name"}<input name="displayName" required minLength={2}/></label>
    <label>{ar?"البريد الإلكتروني":"Email"}<input name="email" type="email" required autoComplete="off"/></label>
    <label>{ar?"كلمة المرور الأولية":"Initial password"}<input name="password" type="password" required minLength={14} autoComplete="new-password"/><small>{ar?"14 حرفًا على الأقل. يغيّرها المستخدم بعد الدخول.":"At least 14 characters. The user should change it after sign-in."}</small></label>
    <label>{ar?"الدور":"Role"}<select name="role" value={role} onChange={e=>setRole(e.target.value)}>{roles.map(r=><option key={r} value={r}>{ar?(roleAr[r]??r):r.replaceAll("_"," ")}</option>)}</select></label>
    <label>{ar?"الموظف المرتبط":"Linked employee"}<select name="employeeId" required={role==="EMPLOYEE"}><option value="">—</option>{employees.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
    <label>{ar?"الفرع":"Branch"}<select name="branchId"><option value="">—</option>{branches.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
  </div><div className="formActions"><button type="button" className="secondaryButton" onClick={()=>router.back()}>{ar?"إلغاء":"Cancel"}</button><button className="primaryButton" disabled={busy}>{busy?(ar?"جاري الإنشاء...":"Creating..."):(ar?"إنشاء المستخدم":"Create user")}</button></div></form>;
}
