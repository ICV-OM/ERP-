import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import { query } from "@/lib/db";
import { can } from "@/lib/permissions";
import { DocumentManager, type DocumentRow } from "@/components/DocumentManager";

type EmployeeOpt={id:string;label:string};
export default async function EmployeeDocuments(){
  const [user,locale]=await Promise.all([requireUser("documents:read"),getLocale()]);const ar=locale==="ar",write=can(user.role,"documents:write");const own=user.role==="EMPLOYEE";
  const values:unknown[]=[user.organizationId];let scope="";if(own){if(!user.employeeId)scope=" AND 1=0";else{values.push(user.employeeId);scope=" AND d.employee_id=$2"}}
  const docs=await query<DocumentRow>(`SELECT d.id,(e.employee_no||' · '||e.first_name||' '||e.last_name) employee_label,d.type,d.document_no,d.issued_on::text,d.expires_on::text,d.classification,f.file_name,f.size_bytes,(f.document_id IS NOT NULL) has_file FROM employee_documents d JOIN employees e ON e.id=d.employee_id LEFT JOIN employee_document_files f ON f.document_id=d.id WHERE d.organization_id=$1${scope} ORDER BY d.created_at DESC LIMIT 1000`,values);
  const employees=write?await query<EmployeeOpt>("SELECT id,employee_no||' · '||first_name||' '||last_name label FROM employees WHERE organization_id=$1 AND deleted_at IS NULL ORDER BY employee_no",[user.organizationId]):({rows:[]} as {rows:EmployeeOpt[]});
  return <div><div className="breadcrumbs"><Link href="/documents">{ar?"المستندات":"Documents"}</Link><span>/</span><span>{ar?"مستندات الموظفين":"Employee documents"}</span></div><section className="pageHeader"><div><div className="eyebrow">DOC · SECURE</div><h1>{ar?"مستندات الموظفين":"Employee documents"}</h1><p>{ar?"رفع المستندات وتخزينها وتنزيلها وحذفها بصلاحيات آمنة مع تتبع عمليات التدقيق.":"Upload, store, download and delete employee documents with secure access and audit tracking."}</p></div></section><DocumentManager locale={locale} employees={employees.rows} documents={docs.rows} canWrite={write}/></div>;
}
