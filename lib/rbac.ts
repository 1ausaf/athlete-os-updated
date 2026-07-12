import {
  ADMIN_ROLES,
  STAFF_ROLES,
  type AppUser,
  type UserHandle,
  type UserRole,
} from "@/types/user";

/**
 * Pure, synchronous capability predicates over an `AppUser`.
 *
 * These helpers gate the UI only - every privileged read or write must also be
 * enforced server-side via Postgres Row Level Security policies. Treat this
 * file as defense-in-depth, not authorization of record.
 */

type MaybeUser = AppUser | UserHandle | null | undefined;

/** True when `user` is non-null and holds one of the listed roles. */
export function hasRole(user: MaybeUser, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/** Coach, admin, or owner. */
export function isStaff(user: MaybeUser): boolean {
  if (!user) return false;
  return STAFF_ROLES.includes(user.role);
}

/** Admin or owner. */
export function isAdmin(user: MaybeUser): boolean {
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role);
}

/**
 * Billing visibility: admin/owner can see all; an athlete can only see their
 * own record. Pass `targetAthleteId` when checking a specific athlete's data.
 */
export function canViewBilling(
  user: MaybeUser,
  targetAthleteId?: string,
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (user.role === "athlete") {
    if (!targetAthleteId) return true;
    return user.id === targetAthleteId;
  }
  return false;
}

/** CAP note authoring is staff-only. */
export function canEditNotes(user: MaybeUser): boolean {
  return isStaff(user);
}

/** Membership plans + pricing are owner/admin only. */
export function canManageMemberships(user: MaybeUser): boolean {
  return isAdmin(user);
}

/**
 * Athletes can book a session if they have an active membership.
 * TODO: replace `hasActiveMembership` check with a live membership lookup
 * once the `memberships` table lands.
 */
export function canBookSession(user: MaybeUser): boolean {
  if (!user) return false;
  if (user.role !== "athlete") return false;
  const full = user as AppUser;
  return Boolean(full.hasActiveMembership);
}

/**
 * Safe-Sport Rule-of-Two: an adult staff member and a minor athlete must never
 * be alone together in a 1:1 direct message. Returns false when a direct
 * message would create that situation - callers should add a second adult
 * (parent/guardian or another coach) to the thread instead.
 *
 * TODO: extend with a `threadParticipants` overload once messaging is wired up.
 */
export function canMessageDirectly(
  actor: MaybeUser,
  target: MaybeUser,
): boolean {
  if (!actor || !target) return false;
  if (actor.id === target.id) return false;

  const actorIsStaff = isStaff(actor);
  const targetIsStaff = isStaff(target);
  const actorIsMinor = Boolean(actor.isMinor);
  const targetIsMinor = Boolean(target.isMinor);

  const adultStaffWithMinor =
    (actorIsStaff && !actorIsMinor && targetIsMinor) ||
    (targetIsStaff && !targetIsMinor && actorIsMinor);

  if (adultStaffWithMinor) return false;

  return true;
}
