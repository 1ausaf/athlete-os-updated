import { cookies } from "next/headers";

import type { AppUser, UserRole } from "@/types/user";
import type { DemoRole } from "@/lib/demo/data";
import { DEMO_ROLE_COOKIE, PERSONAS } from "@/lib/demo/personas";

export { DEMO_ROLE_COOKIE, PERSONAS, PERSONA_LIST } from "@/lib/demo/personas";
export type { Persona } from "@/lib/demo/personas";

function readRole(): DemoRole {
  const raw = cookies().get(DEMO_ROLE_COOKIE)?.value;
  if (raw === "coach" || raw === "owner" || raw === "athlete") return raw;
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
  return role === "athlete" ? "/athlete/dashboard" : "/staff/athletes";
}
