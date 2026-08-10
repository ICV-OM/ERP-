export type Locale = "ar" | "en";
export const LOCALE_COOKIE = "alturud_locale";
export function isRtl(locale: Locale) { return locale === "ar"; }
