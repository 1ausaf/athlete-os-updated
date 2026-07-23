import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { AppUser, UserRole } from "@/types/user";
import type { Athlete, DemoRole } from "@/lib/demo/data";
import { athleteById, parentAccounts } from "@/lib/demo/data";
import { DEMO_ROLE_COOKIE, PERSONAS } from "@/lib/demo/personas";

export { DEMO_ROLE_COOKIE, PERSONAS, PERSONA_LIST } from "@/lib/demo/personas";
export type { Persona } from "@/lib/demo/personas";

/** Which child a parent login is currently viewing. */
export const DEMO_CHILD_COOKIE = "aos-demo-child";

function readRole(): DemoRole {
  const raw = cookies().get(DEMO_ROLE_COOKIE)?.value;
  if (raw === "coach" || raw === "owner" || raw === "athlete" || raw === "parent") {
    return raw;
  }
  return "athlete";
}

/** The current demo persona, from the role cookie (defaults to athlete). */
export function getDemoUser(): AppUser {
  return PERSONAS[readRole()].user;
}

export function getDemoRole(): DemoRole {
  return readRole();
}

/** Maps a demo role to the workspace a user lands in. */
export function homePathForRole(role: UserRole): string {
  if (role === "athlete" || role === "parent") return "/athlete/dashboard";
  return "/staff/athletes";
}

export interface AthleteContext {
  user: AppUser;
  /** The athlete whose portal is being viewed (self, or the selected child). */
  athlete: Athlete;
  /** True when a parent is viewing a child's account. */
  isParentView: boolean;
  /** All children for the parent switcher (empty for athletes). */
  children: Athlete[];
}

/**
 * Resolves who the athlete portal is FOR: an athlete sees themselves, a
 * parent sees the child selected in the switcher (A1). Staff get bounced to
 * their own workspace. Replaces the per-page role guards.
 */
export function requireAthleteContext(): AthleteContext {
  const user = getDemoUser();

  if (user.role === "athlete") {
    const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
    return { user, athlete, isParentView: false, children: [] };
  }

  if (user.role === "parent") {
    const account = parentAccounts.find((p) => p.id === user.id);
    const childIds = account?.childAthleteIds ?? [];
    const children = childIds
      .map((id) => athleteById(id))
      .filter((a): a is Athlete => Boolean(a));
    const requested = cookies().get(DEMO_CHILD_COOKIE)?.value;
    const athlete =
      children.find((c) => c.id === requested) ?? children[0];
    if (!athlete) redirect("/staff/athletes");
    return { user, athlete, isParentView: true, children };
  }

  redirect("/staff/athletes");
}
