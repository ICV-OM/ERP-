import Link from "next/link";
import type { AuthUser } from "@/lib/session";
import type { Locale } from "@/lib/locale";
import { ui } from "@/lib/i18n";
import { can, type Permission } from "@/lib/permissions";

type NavItem=readonly [string,string,string,Permission];
export function Sidebar({user,locale}:{user:AuthUser;locale:Locale}){
  const t=ui(locale).sidebar;
  const groups:{title:string;items:NavItem[]}[]=[
    {title:t.groups.core,items:[[t.items.dashboard,"/dashboard","DB","dashboard:view"],[t.items.employees,"/employees","PE","employee:read"],[t.items.organization,"/organization","OR","organization:read"]]},
    {title:t.groups.workforce,items:[[t.items.attendance,"/attendance","AT","attendance:read"],[t.items.shifts,"/shifts","SH","shifts:read"],[t.items.leave,"/leave","LV","leave:read"],[t.items.workforce,"/workforce","FW","workforce:read"]]},
    {title:t.groups.peopleOps,items:[[t.items.recruitment,"/recruitment","RC","recruitment:read"],[t.items.onboarding,"/onboarding","ON","employee:read"],[t.items.performance,"/performance","PF","performance:read"],[t.items.training,"/training","LD","training:read"]]},
    {title:t.groups.services,items:[[t.items.documents,"/documents","DC","documents:read"],[t.items.assets,"/assets","AS","assets:read"],[t.items.requests,"/requests","HR","requests:read"],[t.items.approvals,"/approvals","AP","approvals:read"],[t.items.relations,"/relations","ER","relations:read"],[t.items.offboarding,"/offboarding","OF","offboarding:read"]]},
    {title:t.groups.insights,items:[[t.items.payroll,"/payroll","PY","payroll:read"],[t.items.reports,"/reports","BI","reports:view"],[t.items.admin,"/admin","AD","admin:manage"]]}
  ];
  return <aside className="sidebar"><div className="brand"><div style={{width:52,height:36,borderRadius:9,background:"#fff",padding:3,display:"grid",placeItems:"center",flex:"0 0 auto",overflow:"hidden"}}><img src="/alturud-logo.svg" alt="ALTURUD" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",display:"block"}}/></div><div><strong>ALTURUD</strong><span>{t.brand}</span></div></div>
    <nav>{groups.map(group=>{const items=group.items.filter(item=>can(user.role,item[3]));if(!items.length)return null;return <div className="navGroup" key={group.title}><div className="navGroupTitle">{group.title}</div>{items.map(([label,href,icon])=><Link className="navItem" href={href} key={href}><span className="navIcon">{icon}</span><span>{label}</span></Link>)}</div>})}</nav>
    <div className="sidebarFooter"><div className="statusDot"/> {t.footer}</div>
  </aside>;
}
