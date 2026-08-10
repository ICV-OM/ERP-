import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import { PasswordChangeForm } from "@/components/PasswordChangeForm";
export default async function AccountSecurity(){
  const [user,locale]=await Promise.all([requireUser("dashboard:view"),getLocale()]);const ar=locale==="ar";
  return <div><div className="breadcrumbs"><Link href="/dashboard">{ar?"لوحة التحكم":"Dashboard"}</Link><span>/</span><span>{ar?"أمان الحساب":"Account security"}</span></div><section className="pageHeader"><div><div className="eyebrow">SEC · ACCOUNT</div><h1>{ar?"أمان الحساب":"Account security"}</h1><p>{ar?`إدارة كلمة مرور حساب ${user.email}.`:`Manage the password for ${user.email}.`}</p></div></section><PasswordChangeForm locale={locale}/></div>;
}
