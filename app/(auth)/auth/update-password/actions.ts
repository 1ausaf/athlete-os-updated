"use server";

import { redirect } from "next/navigation";

import { logSecurityEvent } from "@/lib/authz/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getResolvedTenant, getTenantMode } from "@/lib/tenant/context";

/**
 * Sets a new password on the CURRENT session (arrived via the recovery
 * link's session exchange). Supabase enforces token single-use/expiry and
 * revokes other sessions on password change per its defaults.
 */

export interface UpdatePasswordState {
  error: string | null;
}

export async function updatePasswordAction(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  if (typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // Provider details stay server-side; the user gets a safe message.
    console.error("[auth] password update failed:", error.message);
    return { error: "Couldn't update the password — request a new reset link." };
  }

  const tenant = getTenantMode() === "tenant" ? await getResolvedTenant() : null;
  await logSecurityEvent({
    action: "password_changed",
    tenantId: tenant?.id ?? null,
    actorUserId: user.id,
  });

  redirect("/auth/sign-in?reset=done");
}
