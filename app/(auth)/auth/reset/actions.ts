"use server";

import { logSecurityEvent } from "@/lib/authz/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getResolvedTenant, getTenantHost, getTenantMode } from "@/lib/tenant/context";

/**
 * Password-reset request. Enumeration-safe: the response is identical
 * whether or not the account exists. The redirect target is built from the
 * server-resolved hostname — never from user input — so the recovery
 * session lands on the tenant host that requested it.
 */

export interface ResetState {
  done: boolean;
  error: string | null;
}

const GENERIC_DONE =
  "If an account exists for that email, we've sent instructions.";

export async function requestPasswordResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  if (getTenantMode() !== "tenant") {
    // Demo hosts have no real accounts.
    return { done: true, error: null };
  }
  const tenant = await getResolvedTenant();
  if (!tenant) return { done: true, error: null };

  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) {
    return { done: false, error: "Enter your email address." };
  }

  const host = getTenantHost();
  const supabase = createSupabaseServerClient();
  // Result deliberately ignored — same outward response either way.
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `https://${host}/auth/callback?next=/auth/update-password`,
  });

  await logSecurityEvent({
    action: "password_reset_requested",
    tenantId: tenant.id,
  });

  return { done: true, error: null };
}

/** GENERIC_DONE is rendered client-side after `done`. */
export async function genericResetMessage(): Promise<string> {
  return GENERIC_DONE;
}
