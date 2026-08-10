import { getLocale } from "@/lib/i18n";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{token?:string}>}){const [locale,params]=await Promise.all([getLocale(),searchParams]);return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24}}><ResetPasswordForm locale={locale} token={params.token??""}/></main>}
