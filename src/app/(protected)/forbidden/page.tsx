import Link from "next/link";
import { getLocale, ui } from "@/lib/i18n";
export default async function Forbidden(){const locale=await getLocale();const t=ui(locale).forbidden;return <div className="forbidden"><div><h1>403</h1><h2>{t.title}</h2><p>{t.description}</p><Link className="primaryButton" href="/dashboard">{t.back}</Link></div></div>}
