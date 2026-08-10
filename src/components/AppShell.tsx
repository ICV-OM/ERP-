import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/session";
import type { Locale } from "@/lib/locale";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export function AppShell({ user, locale, children }: { user: AuthUser; locale: Locale; children: ReactNode }) {
  return <div className="appShell"><Sidebar user={user} locale={locale}/><div className="appMain"><Topbar user={user} locale={locale}/><main className="content">{children}</main></div></div>;
}
