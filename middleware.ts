import { NextResponse, type NextRequest } from "next/server";

import { DEMO_ROLE_COOKIE } from "@/lib/demo/personas";

/**
 * Round 9: "URL should be a parent URL" — when a parent is signed in, the
 * member portal lives under /parent/… in the address bar:
 *
 * - /parent/:path  →  rewritten to the /athlete/:path pages (same portal,
 *   parent-aware via the persona cookies).
 * - /athlete/:path →  redirected to /parent/:path while the parent persona
 *   is active, so every in-app link lands on a parent URL.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isParent =
    request.cookies.get(DEMO_ROLE_COOKIE)?.value === "parent";

  if (pathname === "/parent" || pathname.startsWith("/parent/")) {
    // Non-parents have no business on /parent URLs — send them to the
    // member portal directly.
    const rest = pathname.slice("/parent".length) || "/dashboard";
    if (!isParent) {
      return NextResponse.redirect(
        new URL(`/athlete${rest}${search}`, request.url),
      );
    }
    return NextResponse.rewrite(
      new URL(`/athlete${rest}${search}`, request.url),
    );
  }

  if (isParent && pathname.startsWith("/athlete")) {
    const rest = pathname.slice("/athlete".length) || "/dashboard";
    return NextResponse.redirect(
      new URL(`/parent${rest}${search}`, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/athlete/:path*", "/parent/:path*", "/parent"],
};
