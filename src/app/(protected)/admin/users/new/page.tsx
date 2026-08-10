import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import { query } from "@/lib/db";
import { AdminUserForm } from "@/components/AdminUserForm";

type Opt={id:string;label:string};
export default async function NewUser(){
  const [user,locale]=await Promise.all([requireUser("admin:manage"),getLocale()]);const ar=locale==="ar";
  const [branches,employees]=await Promise.all([
    query<Opt>("SELECT id,code || ' · ' || name label FROM branches WHERE organization_id=$1 AND is_active=TRUE ORDER BY code",[user.organizationId]),
    query<Opt>("SELECT id,employee_no || ' · ' || first_name || ' ' || last_name label FROM employees WHERE organization_id=$1 AND deleted_at IS NULL ORDER BY employee_no",[user.organizationId])
  ]);
  return <div><div className="breadcrumbs"><Link href="/admin">{ar?"إدارة النظام":"Administration"}</Link><span>/</span><Link href="/admin/users">{ar?"المستخدمون":"Users"}</Link><span>/</span><span>{ar?"مستخدم جديد":"New user"}</span></div>
    <section className="pageHeader"><div><div className="eyebrow">ADMIN · RBAC</div><h1>{ar?"إنشاء حساب مستخدم":"Create user account"}</h1><p>{ar?"أنشئ حسابًا آمنًا واربطه بالموظف والفرع وحدد صلاحياته حسب الدور.":"Create a secure account, link it to an employee and branch, and assign its role."}</p></div></section>
    <AdminUserForm locale={locale} branches={branches.rows} employees={employees.rows}/></div>;
}
