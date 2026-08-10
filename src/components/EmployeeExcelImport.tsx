"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/locale";

function csrf(){return decodeURIComponent(document.cookie.split("; ").find(v=>v.startsWith("alturud_csrf="))?.split("=")[1]??"")}

export function EmployeeExcelImport({locale}:{locale:Locale}){
  const ar=locale==="ar";const router=useRouter();const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [done,setDone]=useState("");
  async function upload(){if(!file)return;setBusy(true);setError("");setDone("");const fd=new FormData();fd.set("file",file);const res=await fetch("/api/employees/import",{method:"POST",headers:{"x-csrf-token":csrf()},body:fd});const data=await res.json().catch(()=>({}));if(!res.ok){const details=Array.isArray(data.errors)?data.errors.slice(0,8).map((x:any)=>`${ar?"صف":"Row"} ${x.row}: ${x.message}`).join("\n"):"";setError(`${data.error|| (ar?"تعذر الاستيراد":"Import failed")}${details?"\n"+details:""}`);setBusy(false);return}setDone(ar?`تم استيراد ${data.imported} موظف بنجاح.`:`${data.imported} employees imported successfully.`);setBusy(false);router.refresh()}
  return <section className="formPanel importPanel"><div className="importHeader"><div><h2>{ar?"استيراد الموظفين من Excel":"Import employees from Excel"}</h2><p>{ar?"استخدم القالب المعتمد. الحد الأقصى 1000 موظف و5 ميجابايت لكل عملية.":"Use the approved template. Maximum 1,000 employees and 5 MB per import."}</p></div><a className="secondaryButton" href="/api/employees/import/template">{ar?"تنزيل قالب Excel":"Download Excel template"}</a></div>
  <div className="importRules"><strong>{ar?"ضوابط الاستيراد":"Import controls"}</strong><span>{ar?"• ملفات XLSX فقط • لا يسمح بالمعادلات • يتم التحقق من التكرارات والأقسام والفروع • العملية تسجل في سجل التدقيق":"• XLSX only • formulas blocked • duplicates, departments and branches validated • import is audit logged"}</span></div>
  {error&&<pre className="alert error importErrors">{error}</pre>}{done&&<div className="alert success">{done}</div>}
  <div className="uploadBox"><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e=>setFile(e.target.files?.[0]??null)}/><small>{file?.name??(ar?"لم يتم اختيار ملف":"No file selected")}</small></div>
  <div className="formActions"><button type="button" className="secondaryButton" onClick={()=>router.push("/employees")}>{ar?"رجوع":"Back"}</button><button type="button" className="primaryButton" disabled={!file||busy} onClick={upload}>{busy?(ar?"جارٍ التحقق والاستيراد…":"Validating and importing…"):(ar?"تحقق واستورد":"Validate & import")}</button></div></section>
}
