import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import { ScreenPage } from "@/components/ScreenPage";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import type { Permission } from "@/lib/permissions";

const permissionByModule:Record<string,Permission>={payroll:"payroll:read",recruitment:"recruitment:read",reports:"reports:view",attendance:"attendance:read",leave:"leave:read",performance:"performance:read",documents:"documents:read",relations:"relations:read",offboarding:"offboarding:read",workforce:"workforce:read",approvals:"approvals:read"};
export default async function GenericScreen({params}:{params:Promise<{module:string;screen:string}>}){
  const {module:key,screen:slug}=await params;const locale=await getLocale();const m=getModule(key,locale);const s=m?.screens.find(x=>x.slug===slug);if(!m||!s)notFound();
  await requireUser(key==="admin"?(slug==="audit"?"audit:read":"admin:manage"):permissionByModule[key]);return <ScreenPage module={m} screen={s} locale={locale}/>;
}
