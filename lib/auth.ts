import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/authz/context";
import type { AppUser } from "@/types/user";

/**
 * Thin identity facade over the central authorization context
 * (lib/authz/context.ts) — the exported surface predates multi-tenancy and
 * is depended on by ~111 files, so it stays. All resolution (hostname →
 * tenant → session → ACTIVE membership → roles) happens in one audited
 * place; this module only adapts it. Fail closed: no context ⇒ sign-in.
 */

export async function loadAppUser(): Promise<AppUser | null> {
  return (await getAuthContext())?.user ?? null;
}

export async function getCurrentUserWithProfile(): Promise<AppUser | null> {
  return (await getAuthContext())?.user ?? null;
}

export async function requireUserWithProfile(): Promise<AppUser> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/auth/sign-in");
  return ctx.user;
}
