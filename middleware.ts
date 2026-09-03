import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { DEMO_ROLE_COOKIE } from "@/lib/demo/personas";
import {
  classifyHost,
  platformApex,
  TENANT_HOST_HEADER,
  TENANT_MODE_HEADER,
  TENANT_SLUG_HEADER,
} from "@/lib/tenant/host";

/**
 * One middleware, two jobs, fixed order:
 *
 * 1. HOSTNAME → MODE (multi-tenant routing). Classifies the request host as
 *    platform (powa.com marketing), tenant ({slug}.powa.com / custom domain)
 *    or demo (legacy .vercel.app, previews, localhost) — by SHAPE only: zero
 *    network calls, zero secrets at the edge. The result is stamped into
 *    x-powa-* REQUEST headers, always overwriting anything inbound, so a
 *    forged "x-powa-mode: demo" can never reach app code. Layouts do the
 *    actual DB lookup (lib/tenant/resolve.ts).
 *
 * 2. The Round-9 /parent/* ⇄ /athlete/* vanity rewrite, unchanged, which
 *    must run AFTER host routing.
 */

/** Paths that belong to the app, not the marketing site. */
const APP_PREFIXES = ["/athlete", "/parent", "/staff", "/auth", "/invoice", "/api"];

/**
 * Supabase session refresh (tenant hosts only) — the documented
 * @supabase/ssr middleware pattern: getUser() revalidates/rotates tokens
 * and the refreshed cookies ride the response, keeping server components
 * and the browser in sync. Demo hosts skip it (persona-only, no sessions).
 */
async function passWithSessionRefresh(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  // Result unused on purpose — the call itself performs the refresh.
  await supabase.auth.getUser();
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const info = classifyHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );

  // Trusted tenant headers — always set, never pass-through.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_HOST_HEADER, info.host);
  requestHeaders.set(TENANT_MODE_HEADER, info.mode);
  if (info.slug) requestHeaders.set(TENANT_SLUG_HEADER, info.slug);
  else requestHeaders.delete(TENANT_SLUG_HEADER);

  const withHeaders = { request: { headers: requestHeaders } };
  const pass = () =>
    info.mode === "tenant"
      ? passWithSessionRefresh(request, requestHeaders)
      : NextResponse.next(withHeaders);

  // Canonical apex: www.powa.com → powa.com.
  if (info.mode === "platform" && info.isWww) {
    const url = request.nextUrl.clone();
    url.host = platformApex();
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  if (info.mode === "platform") {
    // The apex is marketing/platform-admin only — app paths go home.
    if (APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return pass();
  }

  if (info.mode === "tenant") {
    // Tenant hosts never serve the platform marketing site.
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }
  }

  // Round 9 parent rewrite — applies on tenant and demo hosts alike (the
  // parent-URL feature carries over into real auth).
  const isParent = request.cookies.get(DEMO_ROLE_COOKIE)?.value === "parent";

  if (pathname === "/parent" || pathname.startsWith("/parent/")) {
    const rest = pathname.slice("/parent".length) || "/dashboard";
    if (!isParent) {
      return NextResponse.redirect(
        new URL(`/athlete${rest}${search}`, request.url),
      );
    }
    return NextResponse.rewrite(
      new URL(`/athlete${rest}${search}`, request.url),
      withHeaders,
    );
  }

  if (isParent && pathname.startsWith("/athlete")) {
    const rest = pathname.slice("/athlete".length) || "/dashboard";
    return NextResponse.redirect(
      new URL(`/parent${rest}${search}`, request.url),
    );
  }

  return pass();
}

export const config = {
  // Everything except Next internals and static assets — host classification
  // must cover every page and API route.
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)).*)",
  ],
};
