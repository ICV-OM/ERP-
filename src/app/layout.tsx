import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALTURUD People ERP",
  description: "Secure enterprise HR ERP for Alturud International",
  robots: { index: false, follow: false }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning><body>{children}</body></html>;
}
