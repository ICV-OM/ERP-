import Link from "next/link";
import type { AuthUser } from "@/lib/session";
import type { Locale } from "@/lib/locale";
import { ui } from "@/lib/i18n";
import { can } from "@/lib/permissions";

export function Sidebar({ user, locale }: { user: AuthUser; locale: Locale }) {
  const t=ui(locale).sidebar;
  const groups = [
    { title:t.groups.core, items:[[t.items.dashboard,"/dashboard","DB"],[t.items.employees,"/employees","PE"],[t.items.organization,"/organization","OR"]] },
    { title:t.groups.workforce, items:[[t.items.attendance,"/attendance","AT"],[t.items.shifts,"/shifts","SH"],[t.items.leave,"/leave","LV"],[t.items.workforce,"/workforce","FW"]] },
    { title:t.groups.peopleOps, items:[[t.items.recruitment,"/recruitment","RC"],[t.items.onboarding,"/onboarding","ON"],[t.items.performance,"/performance","PF"],[t.items.training,"/training","LD"]] },
    { title:t.groups.services, items:[[t.items.documents,"/documents","DC"],[t.items.assets,"/assets","AS"],[t.items.requests,"/requests","HR"],[t.items.approvals,"/approvals","AP"],[t.items.relations,"/relations","ER"],[t.items.offboarding,"/offboarding","OF"]] },
    { title:t.groups.insights, items:[[t.items.payroll,"/payroll","PY"],[t.items.reports,"/reports","BI"],[t.items.admin,"/admin","AD"]] }
  ] as const;
  return <aside className="sidebar">
    <div className="brand"><div className="brandMark">A</div><div><strong>ALTURUD</strong><span>{t.brand}</span></div></div>
    <nav>{groups.map(group=><div className="navGroup" key={group.title}><div className="navGroupTitle">{group.title}</div>{group.items.map(([label,href,icon])=>{
      if(href==="/payroll"&&!can(user.role,"payroll:read"))return null;
      if(href==="/admin"&&!can(user.role,"admin:manage")&&!can(user.role,"audit:read"))return null;
      return <Link className="navItem" href={href} key={href}><span className="navIcon">{icon}</span><span>{label}</span></Link>;
    })}</div>)}</nav>
    <div className="sidebarFooter"><div className="statusDot" /> {t.footer}</div>
  </aside>;
}
