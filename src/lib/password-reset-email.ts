type ResetEmailInput={to:string;displayName:string;resetUrl:string};

function esc(value:string){return value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c))}

export async function sendPasswordResetEmail(input:ResetEmailInput){
  const apiKey=process.env.RESEND_API_KEY?.trim();
  const from=process.env.MAIL_FROM?.trim();
  if(!apiKey||!from)throw new Error("EMAIL_NOT_CONFIGURED");
  const name=esc(input.displayName||"ALTURUD user"),url=esc(input.resetUrl);
  const subject="ALTURUD People — Password reset | إعادة تعيين كلمة المرور";
  const html=`<!doctype html><html lang="ar" dir="rtl"><body style="font-family:Arial,sans-serif;background:#f5f7f8;padding:24px;color:#1f2937"><div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px"><h2 style="margin-top:0">إعادة تعيين كلمة المرور</h2><p>مرحباً ${name}،</p><p>استلمنا طلباً لإعادة تعيين كلمة المرور لحسابك في ALTURUD People.</p><p><a href="${url}" style="display:inline-block;background:#ea8b18;color:white;text-decoration:none;padding:12px 20px;border-radius:9px;font-weight:700">إعادة تعيين كلمة المرور</a></p><p>الرابط صالح لمدة 30 دقيقة ويُستخدم مرة واحدة فقط. إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><div dir="ltr"><h3>Password reset</h3><p>We received a request to reset your ALTURUD People password.</p><p>The link is valid for 30 minutes and can be used once. If you did not request this, ignore this email.</p></div></div></body></html>`;
  const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[input.to],subject,html}),cache:"no-store"});
  if(!res.ok){const detail=await res.text().catch(()=>"");throw new Error(`EMAIL_PROVIDER_${res.status}:${detail.slice(0,200)}`)}
}
