import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { getLocale, ui } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { EmployeeDirectoryTable, type EmployeeDirectoryRow } from "@/components/EmployeeDirectoryTable";

export default async function Employees(){
  const [user,locale]=await Promise.all([requireUser("employee:read"),getLocale()]);const t=ui(locale).employees;let rows:EmployeeDirectoryRow[]=[];let dbError=false;
  try{const scope=user.role==="EMPLOYEE"?"AND e.id=$2":user.role==="MANAGER"?"AND (e.id=$2 OR e.manager_employee_id=$2)":"";const values:unknown[]=[user.organizationId];if(scope)values.push(user.employeeId??"00000000-0000-0000-0000-000000000000");const r=await query<EmployeeDirectoryRow>(`SELECT e.id,e.employee_no,e.first_name,e.last_name,e.work_email,e.job_title,e.status,b.name branch_name,d.name department_name FROM employees e LEFT JOIN branches b ON b.id=e.branch_id LEFT JOIN departments d ON d.id=e.department_id WHERE e.organization_id=$1 ${scope} AND e.deleted_at IS NULL ORDER BY e.created_at DESC LIMIT 1000`,values);rows=r.rows}catch{dbError=true}
  return <div><section className="pageHeader"><div><div className="eyebrow">{t.eyebrow}</div><h1>{t.title}</h1><p>{t.subtitle}</p></div><div className="pageActions">{can(user.role,"employee:write")&&<><Link className="secondaryButton" href="/employees/import">{locale==="ar"?"استيراد Excel":"Import Excel"}</Link><Link className="primaryButton" href="/employees/new">{t.add}</Link></>}</div></section>
  <div className="metricRow"><div className="metricCard"><span>{t.total}</span><strong>{rows.length}</strong><small>{t.currentResult}</small></div><div className="metricCard"><span>{t.active}</span><strong>{rows.filter(r=>r.status==="ACTIVE").length}</strong><small>{t.employmentStatus}</small></div><div className="metricCard"><span>{t.onLeave}</span><strong>{rows.filter(r=>r.status==="ON_LEAVE").length}</strong><small>{t.currentStatus}</small></div><div className="metricCard"><span>{t.dataScope}</span><strong>RBAC</strong><small>{t.isolated}</small></div></div>
  {dbError?<section className="panel"><div className="emptyState">{t.dbError}</div></section>:<EmployeeDirectoryTable rows={rows} locale={locale} headers={t.headers}/>}</div>;
}
