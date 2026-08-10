import { NextRequest } from "next/server";
import { env } from "@/lib/env";

export const CSRF_COOKIE = "alturud_csrf";

export function assertTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== env.APP_ORIGIN) throw new Error("Untrusted origin");
}

export function assertCsrf(request: NextRequest) {
  assertTrustedOrigin(request);
  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  const header = request.headers.get("x-csrf-token");
  if (!cookie || !header || cookie.length < 24 || cookie !== header) throw new Error("CSRF validation failed");
}

export function safeJsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
