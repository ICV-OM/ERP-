import Link from "next/link";
import type { ModuleConfig, Screen } from "@/lib/modules";
import type { Locale } from "@/lib/locale";
import { ui } from "@/lib/i18n";

export function ScreenPage({ module, screen, locale }: { module: ModuleConfig; screen: Screen; locale: Locale }) {
  const t=ui(locale);const sp=t.screenPage;
  const refs=["ALT-1042","ALT-1047","ALT-1051","ALT-1054","ALT-1058"];
  const dates=["08 Aug 2026","08 Aug 2026","07 Aug 2026","06 Aug 2026","06 Aug 2026"];
  return <div>
    <div className="breadcrumbs"><Link href={`/${module.key}`}>{module.title}</Link><span>/</span><span>{screen.title}</span></div>
    <section className="pageHeader"><div><div className="eyebrow">{module.accent} {sp.workspace}</div><h1>{screen.title}</h1><p>{screen.description}</p></div><button className="primaryButton">{t.common.createRecord}</button></section>
    <section className="panel"><div className="toolbar"><div className="searchWide">⌕ {sp.searchRecords}</div><button className="secondaryButton">{t.common.filter}</button><button className="secondaryButton">{t.common.export}</button></div>
      <div className="tableWrap"><table><thead><tr>{sp.headers.map(h=><th key={h}>{h}</th>)}<th></th></tr></thead><tbody>{refs.map((ref,i)=><tr key={ref}><td>{ref}</td><td>{sp.departments[i]}</td><td>{sp.locations[i]}</td><td><span className={`badge ${i===1?"pending":i===3?"review":"active"}`}>{sp.statuses[i]}</span></td><td dir="ltr">{dates[i]}</td><td><button className="rowAction">•••</button></td></tr>)}</tbody></table></div>
      <div className="tableFooter"><span>{t.common.showing}</span><div><button>←</button><button>1</button><button>2</button><button>3</button><button>→</button></div></div>
    </section>
  </div>;
}
