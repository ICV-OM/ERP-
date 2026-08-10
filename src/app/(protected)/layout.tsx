import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({children}:{children:React.ReactNode}){
  const [user,locale]=await Promise.all([requireUser(),getLocale()]);
  return <AppShell user={user} locale={locale}>{children}</AppShell>;
}
