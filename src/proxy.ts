import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC=[
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/public/hero-slides",
  "/alturud-logo.svg",
  "/hero-port.svg",
  "/hero-containers.svg",
  "/hero-delivery.svg"
];
function isPublic(path:string){return PUBLIC.some(p=>path===p||path.startsWith(`${p}/`))||path.startsWith("/_next/")||path==="/favicon.ico"}
function sessionName(){return process.env.COOKIE_SECURE==="true"?"__Host-alturud_session":"alturud_session"}
async function validToken(token:string|undefined){if(!token||!process.env.SESSION_SECRET)return false;try{const key=new TextEncoder().encode(process.env.SESSION_SECRET);await jwtVerify(token,key,{issuer:"alturud-hr-erp",audience:"alturud-web"});return true}catch{return false}}
export async function proxy(request:NextRequest){
  const nonce=crypto.randomUUID().replaceAll("-","");
  const dev=process.env.NODE_ENV!=="production";
  const directives=["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev?" 'unsafe-eval'":""}`,"style-src 'self'","img-src 'self' data: blob:","font-src 'self' data:","connect-src 'self'","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'"]; if(!dev) directives.push("upgrade-insecure-requests"); const csp=directives.join("; ");
  const requestHeaders=new Headers(request.headers);requestHeaders.set("x-nonce",nonce);requestHeaders.set("Content-Security-Policy",csp);requestHeaders.set("x-request-id",request.headers.get("x-request-id")||crypto.randomUUID());
  const token=request.cookies.get(sessionName())?.value;const ok=await validToken(token);
  if(!isPublic(request.nextUrl.pathname)&&!ok){const url=request.nextUrl.clone();url.pathname="/login";url.searchParams.set("next",request.nextUrl.pathname);return NextResponse.redirect(url,{headers:{"Content-Security-Policy":csp,"Cache-Control":"no-store"}})}
  if(request.nextUrl.pathname==="/login"&&ok){const url=request.nextUrl.clone();url.pathname="/dashboard";return NextResponse.redirect(url,{headers:{"Content-Security-Policy":csp,"Cache-Control":"no-store"}})}
  const response=NextResponse.next({request:{headers:requestHeaders}});response.headers.set("Content-Security-Policy",csp);if(request.nextUrl.pathname.startsWith("/api/")||!isPublic(request.nextUrl.pathname))response.headers.set("Cache-Control","no-store");if(process.env.NODE_ENV==="production")response.headers.set("Strict-Transport-Security","max-age=63072000; includeSubDomains; preload");return response;
}
export const config={matcher:["/((?!_next/static|_next/image).*)"]};
