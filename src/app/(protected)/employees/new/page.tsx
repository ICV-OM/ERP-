import Link from "next/link";
import { EmployeeForm } from "@/components/EmployeeForm";
import { requireUser } from "@/lib/session";
import { getLocale, ui } from "@/lib/i18n";
export default async function NewEmployee(){
  await requireUser("employee:write");const locale=await getLocale();const t=ui(locale);
  return <div><div className="breadcrumbs"><Link href="/employees">{t.employees.breadcrumb}</Link><span>/</span><span>{t.employees.newEmployee}</span></div><section className="pageHeader"><div><div className="eyebrow">{t.employees.eyebrow}</div><h1>{t.employees.createTitle}</h1><p>{t.employees.createSubtitle}</p></div></section><EmployeeForm locale={locale} labels={t.employeeForm}/></div>;
}
