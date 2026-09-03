import "server-only";

import { cache } from "react";

import { getDemoUser } from "@/lib/demo/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getResolvedTenant, getTenantMode } from "@/lib/tenant/context";
import type { TenantMode } from "@/lib/tenant/host";
import type { ResolvedTenant } from "@/lib/tenant/resolve";
import type { AppUser, UserRole } from "@/types/user";

import { permissionsForRoles, type Permission } from "./permissions";

/**
 * The one place request identity + authority is assembled:
 *
 *   hostname (trusted header) → tenant → session user → ACTIVE membership
 *   → roles → permissions
 *
 * Fail closed: any unresolved link returns null. Nothing here ever reads
 * tenant/role/permission data from the client.
 *
 * Demo hosts (and DB-flagged pilot tenants) resolve through the persona
 * shim — fictional data only; isRealAuth stays false so surfaces holding
 * real data can insist on a genuine session regardless of mode.
 */

export interface AuthContext {
  mode: TenantMode;
  tenant: ResolvedTenant | null;
  user: AppUser;
  roles: readonly UserRole[];
  permissions: ReadonlySet<Permission>;
  /** True only for a validated Supabase session + active membership. */
  isRealAuth: boolean;
}

const ROLE_PRECEDENCE: UserRole[] = ["owner", "admin", "coach", "parent", "athlete"];

function primaryRole(roles: readonly string[]): UserRole {
  for (const r of ROLE_PRECEDENCE) {
    if (roles.includes(r)) return r;
  }
  return "athlete";
}

function isMinorDob(dob: string | null): boolean {
  if (!dob) return false;
  const d = new Date(`${dob}T12:00:00`);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return d > cutoff;
}

function personaContext(mode: TenantMode, tenant: ResolvedTenant | null): AuthContext {
  const user = getDemoUser();
  const roles = [user.role] as const;
  return {
    mode,
    tenant,
    user,
    roles,
    permissions: permissionsForRoles(roles),
    isRealAuth: false,
  };
}

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const mode = getTenantMode();

  if (mode !== "tenant") {
    // Demo/platform surfaces run the persona shim over fictional data.
    return personaContext(mode, null);
  }

  const tenant = await getResolvedTenant();
  if (!tenant) return null; // unknown/suspended hostname — deny

  // Phase-A pilot bridge: DB-controlled, demo data only. Removed per tenant
  // the day its real users are onboarded.
  if (tenant.status === "pilot") {
    return personaContext(mode, tenant);
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .rpc("get_my_membership", { p_tenant_id: tenant.id })
    .maybeSingle();
  if (!membership || membership.status !== "active") return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, date_of_birth")
    .eq("id", user.id)
    .maybeSingle();

  const roles = (membership.roles ?? []) as UserRole[];

  return {
    mode,
    tenant,
    user: {
      id: user.id,
      email: profile?.email ?? user.email ?? "",
      fullName: profile?.full_name ?? user.email ?? "Member",
      role: primaryRole(roles),
      isMinor: isMinorDob(profile?.date_of_birth ?? null),
    },
    roles,
    permissions: permissionsForRoles(roles),
    isRealAuth: true,
  };
});
