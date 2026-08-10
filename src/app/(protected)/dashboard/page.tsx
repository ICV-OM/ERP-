import { requireUser } from "@/lib/session";
import { getLocale, ui } from "@/lib/i18n";
import { query } from "@/lib/db";

export default async function Dashboard(){
  const [user,locale]=await Promise.all([requireUser("dashboard:view"),getLocale()]);const t=ui(locale).dashboard;const ar=locale==="ar";
  const personal=user.role==="EMPLOYEE"&&user.employeeId;const scope=personal?" AND employee_id=$2":"";const vals:unknown[]=personal?[user.organizationId,user.employeeId]:[user.organizationId];
  const empScope=personal?" AND id=$2":"";
  const [active,onLeave,present,leavePending,hrPending,expiry,overtime,probation,trend]=await Promise.all([
    query<{count:string}>(`SELECT count(*)::text count FROM employees WHERE organization_id=$1 AND deleted_at IS NULL AND status='ACTIVE'${empScope}`,vals),
    query<{count:string}>(`SELECT count(*)::text count FROM employees WHERE organization_id=$1 AND deleted_at IS NULL AND status='ON_LEAVE'${empScope}`,vals),
    query<{count:string}>(`SELECT count(*)::text count FROM attendance_records WHERE organization_id=$1 AND work_date=CURRENT_DATE AND status IN ('PRESENT','LATE','REMOTE')${scope}`,vals),
    query<{count:string}>(`SELECT count(*)::text count FROM leave_requests WHERE organization_id=$1 AND status='PENDING'${scope}`,vals),
    query<{count:string}>(`SELECT count(*)::text count FROM hr_requests WHERE organization_id=$1 AND status='PENDING'${scope}`,vals),
    query<{count:string}>(`SELECT count(*)::text count FROM employee_documents WHERE organization_id=$1 AND expires_on BETWEEN CURRENT_DATE AND CURRENT_DATE+INTERVAL '90 days'${scope}`,vals),
    query<{minutes:string|null}>(`SELECT coalesce(sum(overtime_minutes),0)::text minutes FROM attendance_records WHERE organization_id=$1 AND date_trunc('month',work_date)=date_trunc('month',CURRENT_DATE)${scope}`,vals),
    query<{count:string}>(`SELECT count(*)::text count FROM probation_reviews WHERE organization_id=$1 AND outcome='PENDING'${scope}`,vals),
    query<{work_date:string;count:number}>(`SELECT work_date::text, count(*)::int count FROM attendance_records WHERE organization_id=$1 AND work_date>=CURRENT_DATE-INTERVAL '11 days' AND status IN ('PRESENT','LATE','REMOTE')${scope} GROUP BY work_date ORDER BY work_date`,vals)
  ]);
  const activeN=Number(active.rows[0]?.count??0),presentN=Number(present.rows[0]?.count??0),presentPct=activeN?Math.min(100,(presentN/activeN)*100):0;
  const overtimeHours=Number(overtime.rows[0]?.minutes??0)/60;const trendMap=new Map(trend.rows.map(x=>[String(x.work_date),Number(x.count)]));const max=Math.max(1,...trend.rows.map(x=>Number(x.count)));const bars=Array.from({length:12},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(11-i));const key=d.toISOString().slice(0,10);return Math.max(4,Math.round(((trendMap.get(key)??0)/max)*100))});
  const openActions=Number(leavePending.rows[0]?.count??0)+Number(hrPending.rows[0]?.count??0)+Number(probation.rows[0]?.count??0);
  return <div><section className="dashboardHero"><div><div className="eyebrow heroEyebrow">{t.eyebrow}</div><h1>{t.greeting}، {user.displayName.split(" ")[0]}</h1><p>{t.snapshot}</p></div><div className="heroStats"><div><strong>{activeN}</strong><span>{personal?(ar?"حساب الموظف":"Employee scope"):t.employees}</span></div><div><strong>{presentPct.toFixed(1)}%</strong><span>{t.presentToday}</span></div><div><strong>{openActions}</strong><span>{t.openActions}</span></div></div></section>
  <div className="metricRow"><div className="metricCard"><span>{t.activeWorkforce}</span><strong>{activeN}</strong><small>{t.activeHint}</small></div><div className="metricCard"><span>{t.onLeave}</span><strong>{Number(onLeave.rows[0]?.count??0)}</strong><small>{t.leaveHint}</small></div><div className="metricCard"><span>{t.overtime}</span><strong>{overtimeHours.toFixed(1)}h</strong><small>{t.overtimeHint}</small></div><div className="metricCard"><span>{t.expiring}</span><strong>{Number(expiry.rows[0]?.count??0)}</strong><small>{t.expiringHint}</small></div></div>
  <div className="dashboardGrid"><section className="panel"><div className="panelHead"><div><h2>{t.trend}</h2><p>{ar?"الحضور الفعلي خلال آخر 12 يومًا.":"Actual attendance over the last 12 days."}</p></div><div className="searchFake">{personal?(ar?"بياناتي":"My data"):t.allLocations}</div></div><div className="chartFake">{bars.map((h,i)=><div className="bar" style={{height:`${h}%`}} key={i}/>)}</div></section><section className="panel"><div className="panelHead"><div><h2>{t.actionCenter}</h2><p>{t.priority}</p></div></div><ul className="list"><li><span>{t.leaveApprovals}</span><strong>{Number(leavePending.rows[0]?.count??0)}</strong></li><li><span>{ar?"طلبات الموارد البشرية":"HR requests"}</span><strong>{Number(hrPending.rows[0]?.count??0)}</strong></li><li><span>{t.contracts}</span><strong>{Number(expiry.rows[0]?.count??0)}</strong></li><li><span>{t.probation}</span><strong>{Number(probation.rows[0]?.count??0)}</strong></li></ul></section></div></div>;
}
