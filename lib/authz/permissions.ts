import type { UserRole } from "@/types/user";

/**
 * The central permission matrix — the single source of truth for what each
 * role may do. Server guards (lib/authz/guards.ts) enforce it; frontend
 * checks may read it for UI display only. Roles come exclusively from
 * tenant_members (or the demo persona on demo hosts) — never from the
 * client. Extending roles = extend the enum + one column here; no rewrite.
 */

export type Permission =
  // Member-facing (own data; parents act for linked children)
  | "self:training"
  | "self:booking"
  | "self:billing"
  | "self:messaging"
  | "self:profile"
  // Coaching surfaces
  | "athlete:view"
  | "athlete:edit"
  | "athlete:note"
  | "roster:view"
  | "team:view"
  | "team:manage"
  | "training:view"
  | "training:create"
  | "training:edit"
  | "booking:manage"
  | "messaging:view"
  | "messaging:send"
  | "messaging:moderate"
  | "metrics:view"
  // Administration
  | "users:view"
  | "users:invite"
  | "users:manage"
  | "billing:view"
  | "billing:manage"
  | "audit:view"
  | "organization:view"
  // Owner-only
  | "organization:manage"
  | "branding:manage"
  | "domains:manage"
  | "subscription:manage";

const MEMBER: readonly Permission[] = [
  "self:training",
  "self:booking",
  "self:billing",
  "self:messaging",
  "self:profile",
];

const COACH: readonly Permission[] = [
  "athlete:view",
  "athlete:edit",
  "athlete:note",
  "team:view",
  "training:view",
  "training:create",
  "training:edit",
  "booking:manage",
  "messaging:view",
  "messaging:send",
  "self:profile",
];

const ADMIN: readonly Permission[] = [
  ...COACH,
  "roster:view",
  "team:manage",
  "messaging:moderate",
  "metrics:view",
  "users:view",
  "users:invite",
  "users:manage",
  "billing:view",
  "billing:manage",
  "audit:view",
  "organization:view",
];

const OWNER: readonly Permission[] = [
  ...ADMIN,
  "organization:manage",
  "branding:manage",
  "domains:manage",
  "subscription:manage",
];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  athlete: MEMBER,
  parent: MEMBER,
  coach: COACH,
  admin: ADMIN,
  owner: OWNER,
};

/** Union of permissions across a membership's roles. */
export function permissionsForRoles(roles: readonly UserRole[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) set.add(p);
  }
  return set;
}
