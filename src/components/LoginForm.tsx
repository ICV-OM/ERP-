"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LoginHeroSlider } from "@/components/LoginHeroSlider";
import heroStyles from "@/components/LoginHeroSlider.module.css";
import type { Locale } from "@/lib/locale";

type Labels = {
  platform:string; headline:string; description:string; authorized:string; signIn:string; prompt:string;
  email:string; password:string; verifying:string; secureSignIn:string; help:string; unable:string; badges:readonly string[];
};

export function LoginForm({ locale, labels }: { locale: Locale; labels: Labels }) {
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const router=useRouter();

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);
    setError("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const f=new FormData(e.currentTarget);
      const r=await fetch("/api/auth/login",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({email:f.get("email"),password:f.get("password")}),
        signal:controller.signal
      });

      const d=await r.json().catch(()=>({error:""}));
      if(!r.ok){
        const api=String(d.error??"");
        const arErrors:Record<string,string>={
          "Invalid credentials":"البريد الإلكتروني أو كلمة المرور غير صحيحة.",
          "Too many attempts. Try again later.":"عدد محاولات الدخول كبير. حاول مرة أخرى لاحقًا.",
          "Request rejected":"تم رفض الطلب لأسباب أمنية."
        };
        setError(locale==="ar"?(arErrors[api]??labels.unable):(api||labels.unable));
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(labels.unable);
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  const forgotLabel=locale==="ar"?"هل نسيت كلمة المرور؟":"Forgot your password?";

  return <main className="loginPage">
    <section className={`loginVisual ${heroStyles.visualHost}`}>
      <LoginHeroSlider labels={labels}/>
    </section>
    <section className="loginSide">
      <div className="loginLanguage"><LanguageToggle locale={locale}/></div>
      <form className="loginBox" onSubmit={submit}>
        <div className="eyebrow">{labels.authorized}</div><h2>{labels.signIn}</h2><p>{labels.prompt}</p>
        {error&&<div className="alert error">{error}</div>}
        <label>{labels.email}<input name="email" type="email" autoComplete="username" required /></label>
        <label>{labels.password}<input name="password" type="password" autoComplete="current-password" minLength={12} required /></label>
        <div className={heroStyles.forgotRow}><Link href="/forgot-password" className={heroStyles.forgotLink}>{forgotLabel}</Link></div>
        <button className="primaryButton" disabled={busy}>{busy?labels.verifying:labels.secureSignIn}</button>
        <div className="loginHelp">{labels.help}</div>
      </form>
    </section>
  </main>;
}
