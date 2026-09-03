"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { logSecurityEvent } from "@/lib/authz/audit";
import { DEMO_ROLE_COOKIE } from "@/lib/demo/personas";
import { DEMO_CHILD_COOKIE } from "@/lib/demo/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getResolvedTenant, getTenantMode } from "@/lib/tenant/context";

/** Ends the Supabase session (if any) and clears demo persona cookies. */
export async function signOutAction(): Promise<void> {
  let actorId: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    actorId = user?.id ?? null;
    if (user) await supabase.auth.signOut();
  } catch {
    // No Supabase env / no session — persona-only surface.
  }

  cookies().delete(DEMO_ROLE_COOKIE);
  cookies().delete(DEMO_CHILD_COOKIE);

  if (actorId && getTenantMode() === "tenant") {
    const tenant = await getResolvedTenant();
    await logSecurityEvent({
      action: "logout",
      tenantId: tenant?.id ?? null,
      actorUserId: actorId,
    });
  }

  redirect("/auth/sign-in");
}
