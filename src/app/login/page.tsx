import { LoginForm } from "@/components/LoginForm";
import { getLocale, ui } from "@/lib/i18n";

export default async function LoginPage(){
  const locale=await getLocale();
  return <LoginForm locale={locale} labels={ui(locale).login}/>;
}
