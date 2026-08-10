import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import { EmployeeExcelImport } from "@/components/EmployeeExcelImport";
export default async function ImportEmployees(){await requireUser("employee:write");const locale=await getLocale();const ar=locale==="ar";return <div><div className="breadcrumbs"><Link href="/employees">{ar?"الموظفون":"Employees"}</Link><span>/</span><span>{ar?"استيراد Excel":"Excel Import"}</span></div><section className="pageHeader"><div><div className="eyebrow">{ar?"استيراد جماعي آمن":"SECURE BULK IMPORT"}</div><h1>{ar?"استيراد بيانات الموظفين":"Import employee data"}</h1><p>{ar?"أدخل أعدادًا كبيرة من الموظفين من ملف Excel بدل الإدخال اليدوي، مع التحقق قبل الحفظ.":"Add large employee batches from Excel instead of manual entry, with validation before database writes."}</p></div></section><EmployeeExcelImport locale={locale}/></div>}
