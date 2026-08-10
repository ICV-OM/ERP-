import Link from "next/link";
import type { ModuleConfig } from "@/lib/modules";
import type { Locale } from "@/lib/locale";
import { ui } from "@/lib/i18n";

export function ModulePage({ module, locale }: { module: ModuleConfig; locale: Locale }) {
  const t=ui(locale).modulePage;
  return <div>
    <section className="pageHeader"><div><div className="eyebrow">{t.module} · {module.accent}</div><h1>{module.title}</h1><p>{module.subtitle}</p></div><button className="primaryButton">{ui(locale).common.new}</button></section>
    <div className="metricRow">
      <div className="metricCard"><span>{t.openItems}</span><strong>24</strong><small>{t.needsAttention}</small></div>
      <div className="metricCard"><span>{t.completed}</span><strong>186</strong><small>{t.thisMonth}</small></div>
      <div className="metricCard"><span>{t.compliance}</span><strong>97.4%</strong><small>{t.policyTarget}</small></div>
      <div className="metricCard"><span>{t.exceptions}</span><strong>7</strong><small>{t.reviewQueue}</small></div>
    </div>
    <section className="panel"><div className="panelHead"><div><h2>{t.workspace}</h2><p>{t.select}</p></div><div className="searchFake">⌕ {t.search}</div></div>
      <div className="screenGrid">{module.screens.map((s,i)=><Link className="screenCard" href={`/${module.key}/${s.slug}`} key={s.slug}><div className="screenNo">{String(i+1).padStart(2,"0")}</div><div><h3>{s.title}</h3><p>{s.description}</p></div><span className="arrow">→</span></Link>)}</div>
    </section>
  </div>;
}
