import type { DemoRole } from "@/lib/demo/data";

export interface DemoAccount {
  role: DemoRole;
  email: string;
  name: string;
  label: string;
  blurb: string;
}

/**
 * Demo login accounts. Kept self-contained (no `next/headers` imports) so this
 * module is safe to import from the client sign-in form.
 *
 * In the self-contained demo ANY non-empty password is accepted — there is no
 * real credential store — so the sign-in screen looks and behaves like a normal
 * email/password login without needing a backend.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "athlete",
    email: "jordan.vega@lpsathletic.com",
    name: "Jordan Vega",
    label: "Athlete",
    blurb: "Jordan Vega · Hockey · Pro Track",
  },
  {
    role: "coach",
    email: "ellis@lpsathletic.com",
    name: "Coach Ellis",
    label: "Coach",
    blurb: "Coach Ellis · Head Coach",
  },
  {
    role: "owner",
    email: "jeremy@lpsathletic.com",
    name: "Jeremy Choi",
    label: "Owner",
    blurb: "Jeremy Choi · Founder / COO",
  },
];

/** Shared demo password shown on the sign-in screen (any password also works). */
export const DEMO_PASSWORD = "letsgo";

export function findDemoAccount(email: string): DemoAccount | null {
  const e = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === e) ?? null;
}
