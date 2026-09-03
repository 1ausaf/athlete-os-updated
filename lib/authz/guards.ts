import "server-only";

import { redirect } from "next/navigation";

import { getAuthContext, type AuthContext } from "./context";
import type { Permission } from "./permissions";

/**
 * Central authorization guards. Pages use the require* variants (redirect
 * on failure); server actions and API routes use the assert* variants
 * (throw AuthzError, mapped to generic client responses — details are for
 * server logs only). Everything fails closed.
 */

export class AuthzError extends Error {
  readonly code: "unauthenticated" | "forbidden";
  constructor(code: "unauthenticated" | "forbidden", detail?: string) {
    super(detail ?? code);
    this.code = code;
    this.name = "AuthzError";
  }
}

/** Generic, enumeration-safe message for client display. */
export const FORBIDDEN_MESSAGE =
  "You don't have permission to access this resource.";

export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/auth/sign-in");
  return ctx;
}

export async function requirePagePermission(
  perm: Permission,
  fallbackPath = "/athlete/dashboard",
): Promise<AuthContext> {
  const ctx = await requireAuthContext();
  if (!ctx.permissions.has(perm)) redirect(fallbackPath);
  return ctx;
}

export async function assertAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new AuthzError("unauthenticated");
  return ctx;
}

export async function assertPermission(perm: Permission): Promise<AuthContext> {
  const ctx = await assertAuthContext();
  if (!ctx.permissions.has(perm)) {
    throw new AuthzError("forbidden", `missing permission ${perm}`);
  }
  return ctx;
}

export function hasPerm(ctx: AuthContext, perm: Permission): boolean {
  return ctx.permissions.has(perm);
}
