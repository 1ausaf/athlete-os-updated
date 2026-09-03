"use server";

import { redirect } from "next/navigation";

import { logSecurityEvent } from "@/lib/authz/audit";
import { homePathForRole } from "@/lib/demo/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getResolvedTenant, getTenantMode } from "@/lib/tenant/context";
import type { UserRole } from "@/types/user";

/**
 * Real tenant-host sign-in. The tenant comes from the trusted hostname —
 * never from the form. Chain: credentials → session → ACTIVE membership at
 * THIS tenant → in. Any failure signs the session back out and returns a
 * generic message (no account enumeration, no raw provider errors).
 */

export interface SignInState {
  error: string | null;
}

const GENERIC_CREDS = "Invalid email or password.";
const GENERIC_DENIED = "You don't have access to this workspace.";

const ROLE_PRECEDENCE: UserRole[] = ["owner", "admin", "coach", "parent", "athlete"];

/** Optional Turnstile verification — active only when the secret is set. */
async function captchaOk(formData: FormData): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  const token = formData.get("cf-turnstile-response");
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret, response: token }),
      },
    );
    const body = (await res.json()) as { success?: boolean };
    return Boolean(body.success);
  } catch {
    return false; // fail closed
  }
}

export async function signInToTenantAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  // Tenant context is server-derived only.
  if (getTenantMode() !== "tenant") {
    return { error: GENERIC_DENIED };
  }
  const tenant = await getResolvedTenant();
  if (!tenant) return { error: GENERIC_DENIED };

  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: GENERIC_CREDS };
  }

  if (!(await captchaOk(formData))) {
    return { error: "Verification failed — please try again." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) {
    await logSecurityEvent({
      action: "failed_login",
      tenantId: tenant.id,
      metadata: { reason: "invalid_credentials" },
    });
    return { error: GENERIC_CREDS };
  }

  const { data: membership } = await supabase
    .rpc("get_my_membership", { p_tenant_id: tenant.id })
    .maybeSingle();

  if (!membership || membership.status !== "active") {
    await supabase.auth.signOut();
    await logSecurityEvent({
      action: "login_denied_no_membership",
      tenantId: tenant.id,
      actorUserId: data.user.id,
    });
    return { error: GENERIC_DENIED };
  }

  await logSecurityEvent({
    action: "login",
    tenantId: tenant.id,
    actorUserId: data.user.id,
  });

  const roles = (membership.roles ?? []) as UserRole[];
  const primary = ROLE_PRECEDENCE.find((r) => roles.includes(r)) ?? "athlete";
  redirect(homePathForRole(primary));
}
