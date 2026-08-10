import Link from "next/link";
import type { ModuleConfig } from "@/lib/modules";
import type { Locale } from "@/lib/locale";
import { ui } from "@/lib/i18n";

export function ModulePage({module,locale}:{module:ModuleConfig;locale:Locale}){
  const ar=locale==="ar";const t=ui(locale).modulePage;const first=module.screens[0];
  return <div>
    <section className="pageHeader"><div><div className="eyebrow">{t.module} · {module.accent}</div><h1>{module.title}</h1><p>{module.subtitle}</p></div><div className="pageActions">{module.key==="admin"&&<Link className="secondaryButton" href="/admin/users/new">{ar?"إنشاء مستخدم":"Create user"}</Link>}{first&&<Link className="primaryButton" href={`/${module.key}/${first.slug}`}>{ar?"فتح مساحة العمل":"Open workspace"}</Link>}</div></section>
    <div className="metricRow">
      <div className="metricCard"><span>{ar?"مساحات العمل":"Workspaces"}</span><strong>{module.screens.length}</strong><small>{ar?"شاشات تشغيلية مرتبطة بالبيانات":"Live operational screens"}</small></div>
      <div className="metricCard"><span>{ar?"مصدر البيانات":"Data source"}</span><strong>Supabase</strong><small>PostgreSQL</small></div>
      <div className="metricCard"><span>{ar?"التحكم بالوصول":"Access control"}</span><strong>RBAC</strong><small>{ar?"حسب دور المستخدم":"Role based"}</small></div>
      <div className="metricCard"><span>{ar?"التدقيق":"Audit"}</span><strong>{ar?"مفعّل":"Enabled"}</strong><small>{ar?"تسجيل عمليات التغيير":"Mutation logging"}</small></div>
    </div>
    <section className="panel"><div className="panelHead"><div><h2>{t.workspace}</h2><p>{ar?"اختر الشاشة لإدارة السجلات الحقيقية في قاعدة البيانات.":"Select a screen to manage live database records."}</p></div></div>
      <div className="screenGrid">{module.screens.map((s,i)=><Link className="screenCard" href={`/${module.key}/${s.slug}`} key={s.slug}><div className="screenNo">{String(i+1).padStart(2,"0")}</div><div><h3>{s.title}</h3><p>{s.description}</p></div><span className="arrow">→</span></Link>)}</div>
    </section>
  </div>;
}
