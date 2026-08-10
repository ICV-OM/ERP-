import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import { query } from "@/lib/db";
import { PayrollGenerator } from "@/components/PayrollGenerator";

type Row={id:string;period_year:number;period_month:number;currency:string;status:string};
export default async function GeneratePayroll(){
  const [user,locale]=await Promise.all([requireUser("payroll:write"),getLocale()]);const ar=locale==="ar";
  const r=await query<Row>("SELECT id,period_year,period_month,currency,status FROM payroll_runs WHERE organization_id=$1 AND status IN ('DRAFT','PENDING') ORDER BY period_year DESC,period_month DESC",[user.organizationId]);
  const runs=r.rows.map(x=>({id:x.id,label:`${x.period_year}-${String(x.period_month).padStart(2,"0")} · ${x.currency} · ${x.status}`}));
  return <div><div className="breadcrumbs"><Link href="/payroll">{ar?"الرواتب":"Payroll"}</Link><span>/</span><span>{ar?"توليد الرواتب":"Generate payroll"}</span></div><section className="pageHeader"><div><div className="eyebrow">PAY · ENGINE</div><h1>{ar?"توليد قسائم الرواتب":"Generate payslips"}</h1><p>{ar?"إنشاء قسائم الدورة من التعويضات الفعالة والعمل الإضافي المعتمد مع إعادة احتساب الإجماليات تلقائيًا.":"Create period payslips from effective compensation and approved overtime, with automatic totals."}</p></div></section>{!runs.length?<section className="panel"><div className="emptyState">{ar?"أنشئ أولًا دورة رواتب بحالة مسودة أو معلقة.":"Create a draft or pending payroll run first."}</div></section>:<PayrollGenerator locale={locale} runs={runs}/>}</div>;
}
