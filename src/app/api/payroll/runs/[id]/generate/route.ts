import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/session";
import { assertCsrf, safeJsonError } from "@/lib/security";
import { query, withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";

type Run={id:string;period_year:number;period_month:number;currency:string;status:string};
type PayRow={employee_id:string;basic_salary:string;housing_allowance:string;transport_allowance:string;other_allowance:string;currency:string;overtime_minutes:string};

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{assertCsrf(request)}catch{return safeJsonError("Request rejected",403)}
  const a=await requireApiUser("payroll:write");if(!a.ok)return safeJsonError(a.message,a.status);const {id}=await params;
  const rr=await query<Run>("SELECT id,period_year,period_month,currency,status FROM payroll_runs WHERE id=$1 AND organization_id=$2 LIMIT 1",[id,a.user.organizationId]);const run=rr.rows[0];
  if(!run)return safeJsonError("Payroll run not found",404);if(!["DRAFT","PENDING"].includes(run.status))return safeJsonError("Only draft or pending payroll runs can be generated",409);
  const start=`${run.period_year}-${String(run.period_month).padStart(2,"0")}-01`;
  const rows=await query<PayRow>(`
    WITH comp AS (
      SELECT DISTINCT ON (c.employee_id) c.employee_id,c.basic_salary,c.housing_allowance,c.transport_allowance,c.other_allowance,c.currency
      FROM employee_compensation c JOIN employees e ON e.id=c.employee_id AND e.organization_id=c.organization_id
      WHERE c.organization_id=$1 AND c.is_active=TRUE AND e.deleted_at IS NULL AND e.status IN ('ACTIVE','ON_LEAVE')
        AND c.effective_from < ($2::date + INTERVAL '1 month') AND (c.effective_to IS NULL OR c.effective_to >= $2::date)
        AND c.currency=$3
      ORDER BY c.employee_id,c.effective_from DESC,c.created_at DESC
    ), ot AS (
      SELECT employee_id,COALESCE(SUM(overtime_minutes),0)::text overtime_minutes FROM attendance_records
      WHERE organization_id=$1 AND work_date >= $2::date AND work_date < ($2::date + INTERVAL '1 month')
        AND overtime_minutes>0 AND correction_status IN ('APPROVED','COMPLETED') GROUP BY employee_id
    )
    SELECT comp.employee_id,comp.basic_salary::text,comp.housing_allowance::text,comp.transport_allowance::text,comp.other_allowance::text,comp.currency,COALESCE(ot.overtime_minutes,'0') overtime_minutes
    FROM comp LEFT JOIN ot USING(employee_id)
  `,[a.user.organizationId,start,run.currency]);
  if(!rows.rowCount)return safeJsonError("No active compensation records found for this payroll period and currency",409);
  const settings=await query<{setting_key:string;setting_value_json:any}>("SELECT setting_key,setting_value_json FROM system_settings WHERE organization_id=$1 AND setting_key IN ('payroll.standard_monthly_hours','payroll.overtime_multiplier')",[a.user.organizationId]);
  let standardHours=240,multiplier=1.25;for(const s of settings.rows){const v=Number(s.setting_value_json?.value??s.setting_value_json);if(Number.isFinite(v)&&v>0){if(s.setting_key.endsWith("standard_monthly_hours"))standardHours=v;else multiplier=v}}
  try{
    const generated=await withTransaction(async client=>{
      let count=0;
      for(const r of rows.rows){const basic=Number(r.basic_salary),allowances=Number(r.housing_allowance)+Number(r.transport_allowance)+Number(r.other_allowance);const overtime=((Number(r.overtime_minutes)/60)*(basic/standardHours)*multiplier);
        await client.query(`INSERT INTO payslips(organization_id,payroll_run_id,employee_id,basic_salary,allowances,overtime,incentives,deductions,net_salary,currency)
          VALUES($1,$2,$3,$4,$5,$6,0,0,0,$7)
          ON CONFLICT(payroll_run_id,employee_id) DO UPDATE SET basic_salary=EXCLUDED.basic_salary,allowances=EXCLUDED.allowances,overtime=EXCLUDED.overtime,currency=EXCLUDED.currency`,[a.user.organizationId,run.id,r.employee_id,basic,allowances,overtime,run.currency]);count++}
      return count;
    });
    await audit({organizationId:a.user.organizationId,actorUserId:a.user.id,action:"payroll.generate",entityType:"payroll_run",entityId:run.id,after:{generated,periodYear:run.period_year,periodMonth:run.period_month,currency:run.currency,standardHours,overtimeMultiplier:multiplier},requestId:request.headers.get("x-request-id")});
    return Response.json({ok:true,generated},{headers:{"Cache-Control":"no-store"}});
  }catch(e){console.error("payroll_generate",e);return safeJsonError("Unable to generate payroll",500)}
}
