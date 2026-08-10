"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/locale";

export function LanguageToggle({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const router = useRouter();

  function setLocale(next: Locale) {
    if (next === locale) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    router.refresh();
  }

  return <div className={`languageToggle ${compact ? "compact" : ""}`} role="group" aria-label={locale === "ar" ? "اختيار اللغة" : "Choose language"}>
    <button type="button" className={locale === "ar" ? "active" : ""} onClick={() => setLocale("ar")}>العربية</button>
    <button type="button" className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")}>EN</button>
  </div>;
}
