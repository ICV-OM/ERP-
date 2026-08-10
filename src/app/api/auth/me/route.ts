import { requireApiUser } from "@/lib/session";
export async function GET(){const a=await requireApiUser();if(!a.ok)return Response.json({ok:false,error:a.message},{status:a.status,headers:{"Cache-Control":"no-store"}});return Response.json({ok:true,user:{id:a.user.id,email:a.user.email,displayName:a.user.displayName,role:a.user.role}},{headers:{"Cache-Control":"no-store"}})}
