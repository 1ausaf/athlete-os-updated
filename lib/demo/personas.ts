import type { AppUser } from "@/types/user";
import type { DemoRole } from "@/lib/demo/data";

/**
 * Client-safe persona constants. `lib/demo/session.ts` re-exports these for
 * server code; client components (AppShell, sign-in) import from here so the
 * bundle never pulls in `next/headers`.
 */

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
  parent: {
    key: "parent",
    label: "Parent",
    blurb: "Diane Okafor · Maya + Noah",
    user: {
      id: "parent-diane",
      email: "diane.okafor@example.com",
      fullName: "Diane Okafor",
      role: "parent",
      isMinor: false,
      athleteIds: ["ath-maya", "ath-noah"],
    },
  },
};

export const PERSONA_LIST: Persona[] = [
  PERSONAS.athlete,
  PERSONAS.parent,
  PERSONAS.coach,
  PERSONAS.owner,
];
