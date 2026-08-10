"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/locale";

function getCsrf(){return decodeURIComponent(document.cookie.split("; ").find(v=>v.startsWith("alturud_csrf="))?.split("=")[1]??"")}

type Labels={employeeNo:string;workEmail:string;firstName:string;lastName:string;phone:string;jobTitle:string;employmentType:string;hireDate:string;status:string;cancel:string;saving:string;create:string;unable:string};

const optionLabels={
  ar:{FULL_TIME:"دوام كامل",PART_TIME:"دوام جزئي",CONTRACT:"عقد",TEMPORARY:"مؤقت",ACTIVE:"نشط",ON_LEAVE:"في إجازة",SUSPENDED:"موقوف",TERMINATED:"منتهي الخدمة"},
  en:{FULL_TIME:"Full time",PART_TIME:"Part time",CONTRACT:"Contract",TEMPORARY:"Temporary",ACTIVE:"Active",ON_LEAVE:"On leave",SUSPENDED:"Suspended",TERMINATED:"Terminated"}
} as const;

export function EmployeeForm({locale,labels}:{locale:Locale;labels:Labels}){
  const router=useRouter();const [error,setError]=useState("");const [busy,setBusy]=useState(false);const o=optionLabels[locale];
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());const res=await fetch("/api/employees",{method:"POST",headers:{"content-type":"application/json","x-csrf-token":getCsrf()},body:JSON.stringify(body)});const data=await res.json();if(!res.ok){const api=String(data.error??"");const arErrors:Record<string,string>={"Employee number or work email already exists":"الرقم الوظيفي أو البريد الوظيفي مستخدم مسبقًا.","Unable to create employee":"تعذر إنشاء الموظف.","Request rejected":"تم رفض الطلب لأسباب أمنية."};setError(locale==="ar"?(arErrors[api]??labels.unable):(api||labels.unable));setBusy(false);return}router.push(`/employees/${data.employee.id}`);router.refresh()}
  return <form className="formPanel" onSubmit={submit}>{error&&<div className="alert error">{error}</div>}<div className="formGrid">
    <label>{labels.employeeNo}<input name="employeeNo" required placeholder="ALT-1060"/></label>
    <label>{labels.workEmail}<input name="workEmail" required type="email" placeholder="name@company.com"/></label>
    <label>{labels.firstName}<input name="firstName" required/></label><label>{labels.lastName}<input name="lastName" required/></label>
    <label>{labels.phone}<input name="phone"/></label><label>{labels.jobTitle}<input name="jobTitle" required/></label>
    <label>{labels.employmentType}<select name="employmentType" defaultValue="FULL_TIME"><option value="FULL_TIME">{o.FULL_TIME}</option><option value="PART_TIME">{o.PART_TIME}</option><option value="CONTRACT">{o.CONTRACT}</option><option value="TEMPORARY">{o.TEMPORARY}</option></select></label>
    <label>{labels.hireDate}<input name="hireDate" required type="date"/></label>
    <label>{labels.status}<select name="status" defaultValue="ACTIVE"><option value="ACTIVE">{o.ACTIVE}</option><option value="ON_LEAVE">{o.ON_LEAVE}</option><option value="SUSPENDED">{o.SUSPENDED}</option><option value="TERMINATED">{o.TERMINATED}</option></select></label>
  </div><div className="formActions"><button type="button" className="secondaryButton" onClick={()=>router.back()}>{labels.cancel}</button><button className="primaryButton" disabled={busy}>{busy?labels.saving:labels.create}</button></div></form>;
}
