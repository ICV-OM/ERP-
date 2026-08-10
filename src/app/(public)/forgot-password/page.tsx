import { getLocale } from "@/lib/i18n";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage(){const locale=await getLocale();return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24}}><ForgotPasswordForm locale={locale}/></main>}
