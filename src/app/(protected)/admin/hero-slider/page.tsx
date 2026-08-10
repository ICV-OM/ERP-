import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import { HeroSliderManager } from "@/components/HeroSliderManager";

export default async function HeroSliderPage() {
  const [user, locale] = await Promise.all([requireUser("branding:manage"), getLocale()]);
  const ar = locale === "ar";
  void user;

  return <div>
    <div className="breadcrumbs"><Link href="/dashboard">{ar ? "لوحة التحكم" : "Dashboard"}</Link><span>/</span><span>{ar ? "إعدادات الواجهة" : "Interface settings"}</span><span>/</span><span>Hero Slider</span></div>
    <section className="pageHeader"><div><div className="eyebrow">BRANDING · LOGIN</div><h1>{ar ? "إدارة صور الواجهة الرئيسية" : "Login Hero Slider"}</h1><p>{ar ? "أضف أو استبدل أو رتّب صور شاشة تسجيل الدخول، وتحكم في مدة العرض والنصوص والجدولة دون الحاجة إلى GitHub أو Vercel." : "Add, replace and reorder login images, control timing, text and scheduling without GitHub or Vercel."}</p></div></section>
    <HeroSliderManager locale={locale}/>
  </div>;
}
