"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/session";
import type { Locale } from "@/lib/locale";
import { LanguageToggle } from "@/components/LanguageToggle";

function csrf(){return document.cookie.split("; ").find(v=>v.startsWith("alturud_csrf="))?.split("=")[1]??""}

const labels={
  ar:{company:"الطرود الدولية",title:"نظام تخطيط موارد الموارد البشرية",search:"بحث",notifications:"الإشعارات",signOut:"تسجيل الخروج",signingOut:"جارٍ تسجيل الخروج…"},
  en:{company:"ALTURUD INTERNATIONAL",title:"Human Resources ERP",search:"Search",notifications:"Notifications",signOut:"Sign out",signingOut:"Signing out…"}
} as const;
const roleAr:Record<string,string>={SUPER_ADMIN:"مدير النظام العام",HR_ADMIN:"مسؤول الموارد البشرية",HR_MANAGER:"مدير الموارد البشرية",MANAGER:"مدير",PAYROLL:"مسؤول الرواتب",RECRUITER:"مسؤول التوظيف",EMPLOYEE:"موظف",AUDITOR:"مدقق"};
function roleLabel(role:string,locale:Locale){return locale==="ar"?(roleAr[role]??role):role.toLowerCase().replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}

export function Topbar({ user, locale }: { user: AuthUser; locale: Locale }) {
  const [busy,setBusy]=useState(false);const router=useRouter();const t=labels[locale];
  async function logout(){setBusy(true);await fetch("/api/auth/logout",{method:"POST",headers:{"x-csrf-token":decodeURIComponent(csrf())}});router.replace("/login");router.refresh()}
  return <header className="topbar">
    <div><div className="eyebrow">{t.company}</div><div className="topTitle">{t.title}</div></div>
    <div className="topActions">
      <LanguageToggle locale={locale} compact/>
      <button className="iconButton" aria-label={t.search}>⌕</button><button className="iconButton" aria-label={t.notifications}>◌</button>
      <div className="userCard"><div className="avatar">{user.displayName.slice(0,1).toUpperCase()}</div><div><strong>{user.displayName}</strong><span>{roleLabel(user.role,locale)}</span></div></div>
      <button className="textButton" onClick={logout} disabled={busy}>{busy?t.signingOut:t.signOut}</button>
    </div>
  </header>;
}
