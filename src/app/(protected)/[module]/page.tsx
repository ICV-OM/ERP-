import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import type { Permission } from "@/lib/permissions";

const permissionByModule:Record<string,Permission>={payroll:"payroll:read",recruitment:"recruitment:read",reports:"reports:view",attendance:"attendance:read",leave:"leave:read",performance:"performance:read",documents:"documents:read",relations:"relations:read",offboarding:"offboarding:read",workforce:"workforce:read",approvals:"approvals:read"};
export default async function GenericModule({params}:{params:Promise<{module:string}>}){
  const {module:key}=await params;const locale=await getLocale();const m=getModule(key,locale);if(!m)notFound();
  await requireUser(key==="admin"?"admin:manage":permissionByModule[key]);return <ModulePage module={m} locale={locale}/>;
}
