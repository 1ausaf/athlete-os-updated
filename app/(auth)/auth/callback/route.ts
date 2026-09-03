import { NextResponse, type NextRequest } from "next/server";

import { logSecurityEvent } from "@/lib/authz/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getResolvedTenant, getTenantMode } from "@/lib/tenant/context";

/**
 * PKCE / magic-link / invite / recovery session exchange. Replaces the old
 * placeholder page — a route handler can set session cookies.
 *
 * Open-redirect guard: `next` is honored only as a same-origin relative
 * path. On tenant hosts, the session must belong to a member of THIS
 * tenant, or it is signed out on the spot (recovery flows excepted — the
 * user needs the session to set a new password).
 */

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes(":")) {
    return null;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  const denied = () =>
    NextResponse.redirect(new URL("/auth/sign-in?error=denied", request.url));

  if (!code) return denied();

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return denied();

  const isRecovery = next === "/auth/update-password";

  if (getTenantMode() === "tenant" && !isRecovery) {
    const tenant = await getResolvedTenant();
    if (!tenant) return denied();
    const { data: membership } = await supabase
      .rpc("get_my_membership", { p_tenant_id: tenant.id })
      .maybeSingle();
    if (!membership || membership.status !== "active") {
      await supabase.auth.signOut();
      await logSecurityEvent({
        action: "login_denied_no_membership",
        tenantId: tenant.id,
        actorUserId: data.user.id,
        metadata: { via: "callback" },
      });
      return denied();
    }
    await logSecurityEvent({
      action: "session_exchange",
      tenantId: tenant.id,
      actorUserId: data.user.id,
    });
  }

  return NextResponse.redirect(new URL(next ?? "/athlete/dashboard", request.url));
}
