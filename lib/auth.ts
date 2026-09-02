import { redirect } from "next/navigation";

import { getDemoUser } from "@/lib/demo/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getResolvedTenant, getTenantMode } from "@/lib/tenant/context";
import type { AppUser, UserRole } from "@/types/user";

/**
 * The auth branch point.
 *
 * - DEMO hosts (legacy .vercel.app, previews, localhost): the original
 *   cookie-persona shim — unchanged, byte-for-byte.
 * - TENANT hosts with status 'pilot': the persona shim too — the Phase-A
 *   bridge that lets a tenant run branded before real auth ships. The pilot
 *   status is granted in the database, never by a client value.
 * - TENANT hosts otherwise: real Supabase Auth — session → tenant membership
 *   (get_my_membership RPC) → AppUser. No membership at THIS tenant = no user.
 *
 * The exported surface is unchanged from the demo shim, so the ~111 calling
 * files need no edits.
 */

const ROLE_PRECEDENCE: UserRole[] = ["owner", "admin", "coach", "parent", "athlete"];

function primaryRole(roles: string[]): UserRole {
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

async function loadTenantUser(tenantId: string): Promise<AppUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .rpc("get_my_membership", { p_tenant_id: tenantId })
    .maybeSingle();
  if (!membership || membership.status !== "active") return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, date_of_birth")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? user.email ?? "Member",
    role: primaryRole(membership.roles ?? []),
    isMinor: isMinorDob(profile?.date_of_birth ?? null),
  };
}

async function resolveUser(): Promise<AppUser | null> {
  if (getTenantMode() !== "tenant") return getDemoUser();
  const tenant = await getResolvedTenant();
  if (!tenant) return null;
  // Phase-A bridge: pilot tenants run the persona demo behind their branding.
  if (tenant.status === "pilot") return getDemoUser();
  return loadTenantUser(tenant.id);
}

export async function loadAppUser(): Promise<AppUser | null> {
  return resolveUser();
}

export async function getCurrentUserWithProfile(): Promise<AppUser | null> {
  return resolveUser();
}

export async function requireUserWithProfile(): Promise<AppUser> {
  const user = await resolveUser();
  if (!user) redirect("/auth/sign-in");
  return user;
}
