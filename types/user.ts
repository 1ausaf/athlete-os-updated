/**
 * Role hierarchy (lowest privilege to highest):
 *   athlete < coach < admin < owner
 *
 * Roles are stored in Postgres on the `user_roles` table (one row per role)
 * and enforced by RLS. The strings here must stay in sync with the
 * `user_role` Postgres enum.
 */
export type UserRole = "athlete" | "coach" | "admin" | "owner";

export const STAFF_ROLES: ReadonlyArray<UserRole> = ["coach", "admin", "owner"];
export const ADMIN_ROLES: ReadonlyArray<UserRole> = ["admin", "owner"];

/**
 * Application-level view of an authenticated user. Hydrated server-side from
 * the Supabase session, `profiles`, and `user_roles`.
 */
export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  /** True if the user is under 18; drives Rule-of-Two messaging guardrails. */
  isMinor?: boolean;
  /** For an athlete: the coaches they are assigned to. */
  coachIds?: string[];
  /** For staff: the athletes they currently roster. */
  athleteIds?: string[];
  /** Set when the athlete's membership is active and usable for booking. */
  hasActiveMembership?: boolean;
}

/** A minimal handle used when passing users between RBAC predicates. */
export type UserHandle = Pick<AppUser, "id" | "role" | "isMinor">;
