import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import { ScreenPage } from "@/components/ScreenPage";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import { getWorkspaceConfig } from "@/lib/workspace-config";

export default async function GenericScreen({params}:{params:Promise<{module:string;screen:string}>}){
  const {module:key,screen:slug}=await params;const locale=await getLocale();const m=getModule(key,locale);const s=m?.screens.find(x=>x.slug===slug);const workspace=getWorkspaceConfig(key,slug);
  if(!m||!s||!workspace)notFound();await requireUser(workspace.readPermission);return <ScreenPage module={m} screen={s} locale={locale}/>;
}
