import { requireApiUser } from "@/lib/session";
import { safeJsonError } from "@/lib/security";
import { query } from "@/lib/db";
import { can } from "@/lib/permissions";

type Item={id:string;title:string;titleAr:string;count:number;href:string;level:"info"|"warning"|"critical"};
async function count(sql:string,values:unknown[]){const r=await query<{count:string}>(sql,values);return Number(r.rows[0]?.count??0)}
export async function GET(){
  const a=await requireApiUser("dashboard:view");if(!a.ok)return safeJsonError(a.message,a.status);const u=a.user;const items:Item[]=[];
  const own=u.role==="EMPLOYEE"&&u.employeeId;const vals:unknown[]=own?[u.organizationId,u.employeeId]:[u.organizationId];const employeeScope=own?" AND employee_id=$2":"";
  if(can(u.role,"leave:read")){const n=await count(`SELECT count(*)::text count FROM leave_requests WHERE organization_id=$1 AND status='PENDING'${employeeScope}`,vals);if(n)items.push({id:"leave",title:"Pending leave requests",titleAr:"طلبات إجازة معلقة",count:n,href:"/leave/requests",level:"warning"})}
  if(can(u.role,"requests:read")){const n=await count(`SELECT count(*)::text count FROM hr_requests WHERE organization_id=$1 AND status='PENDING'${employeeScope}`,vals);if(n)items.push({id:"requests",title:"Open HR requests",titleAr:"طلبات موارد بشرية مفتوحة",count:n,href:"/requests/hr-cases",level:"warning"})}
  if(can(u.role,"approvals:read")){const n=await count("SELECT count(*)::text count FROM approval_actions WHERE organization_id=$1 AND approver_user_id=$2 AND decision IS NULL",[u.organizationId,u.id]);if(n)items.push({id:"approvals",title:"Approvals waiting for you",titleAr:"اعتمادات تنتظر قرارك",count:n,href:"/approvals/pending",level:"critical"})}
  if(can(u.role,"documents:read")){const n=await count(`SELECT count(*)::text count FROM employee_documents WHERE organization_id=$1 AND expires_on BETWEEN CURRENT_DATE AND CURRENT_DATE+INTERVAL '30 days'${employeeScope}`,vals);if(n)items.push({id:"documents",title:"Documents expiring within 30 days",titleAr:"مستندات تنتهي خلال 30 يومًا",count:n,href:"/documents/expiry",level:"critical"})}
  if(can(u.role,"performance:read")){const n=await count(`SELECT count(*)::text count FROM probation_reviews WHERE organization_id=$1 AND outcome='PENDING'${employeeScope}`,vals);if(n)items.push({id:"probation",title:"Probation reviews pending",titleAr:"تقييمات فترة التجربة معلقة",count:n,href:"/onboarding/probation",level:"warning"})}
  return Response.json({ok:true,items,total:items.reduce((s,x)=>s+x.count,0)},{headers:{"Cache-Control":"no-store"}});
}
