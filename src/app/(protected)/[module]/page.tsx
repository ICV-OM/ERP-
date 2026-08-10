import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import type { Permission } from "@/lib/permissions";

const permissionByModule:Record<string,Permission>={
  organization:"organization:read",attendance:"attendance:read",shifts:"shifts:read",leave:"leave:read",payroll:"payroll:read",recruitment:"recruitment:read",
  onboarding:"employee:read",documents:"documents:read",performance:"performance:read",training:"training:read",workforce:"workforce:read",assets:"assets:read",
  requests:"requests:read",approvals:"approvals:read",relations:"relations:read",offboarding:"offboarding:read",reports:"reports:view",admin:"admin:manage"
};
export default async function GenericModule({params}:{params:Promise<{module:string}>}){
  const {module:key}=await params;const locale=await getLocale();const m=getModule(key,locale);const permission=permissionByModule[key];if(!m||!permission)notFound();
  await requireUser(permission);return <ModulePage module={m} locale={locale}/>;
}
