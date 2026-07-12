import { cookies } from "next/headers";

import type { AppUser, UserRole } from "@/types/user";
import type { DemoRole } from "@/lib/demo/data";

export const DEMO_ROLE_COOKIE = "aos-demo-role";

export interface Persona {
  key: DemoRole;
  user: AppUser;
  label: string;
  blurb: string;
}

/**
 * Fixed demo personas. Selecting one writes {@link DEMO_ROLE_COOKIE}; every
 * server component then hydrates the matching AppUser with no backend involved.
 */
export const PERSONAS: Record<DemoRole, Persona> = {
  athlete: {
    key: "athlete",
    label: "Athlete",
    blurb: "Jordan Vega · Hockey · Pro Track",
    user: {
      id: "ath-jordan",
      email: "jordan.vega@lpsathletic.com",
      fullName: "Jordan Vega",
      role: "athlete",
      isMinor: false,
      hasActiveMembership: true,
    },
  },
  coach: {
    key: "coach",
    label: "Coach",
    blurb: "Coach Ellis · Head Coach",
    user: {
      id: "coach-ellis",
      email: "ellis@lpsathletic.com",
      fullName: "Coach Ellis",
      role: "coach",
      isMinor: false,
    },
  },
  owner: {
    key: "owner",
    label: "Owner",
    blurb: "Jeremy Choi · Founder / COO",
    user: {
      id: "owner-jeremy",
      email: "jeremy@lpsathletic.com",
      fullName: "Jeremy Choi",
      role: "owner",
      isMinor: false,
    },
  },
};

export const PERSONA_LIST: Persona[] = [
  PERSONAS.athlete,
  PERSONAS.coach,
  PERSONAS.owner,
];

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
