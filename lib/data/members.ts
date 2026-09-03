import "server-only";

// eslint-disable-next-line no-restricted-imports -- allowed importer: members table is service-role-only in the DB (minors' PII); reads are staff-gated server-side
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Live imported roster (the public.members staging table — the client's real
 * spreadsheet import). The table is deliberately service-role-only in the
 * database (minors' PII), so this read happens strictly server-side and the
 * whole surface stays invisible when the deployment has no service
 * credentials. Promotion to real profiles/athletes (with logins) is the
 * follow-up phase; this is the read-only bridge.
 */

/** The pinned LPS tenant (seeded in migration 20260902200200). */
export const LPS_TENANT_ID = "00000000-0000-4000-8000-000000000001";

export interface LiveRosterRow {
  id: string;
  name: string;
  /** Whole years, computed from date_of_birth; null when unknown/raw. */
  age: number | null;
  isMinor: boolean;
  sex: string | null;
  focus: string | null;
  membershipType: string | null;
  plan: string | null;
  groupName: string | null;
  /** Preserved verbatim when one spreadsheet cell held two birthdates. */
  dobRaw: string | null;
}

/** True when this deployment can read the live roster at all. */
export function liveRosterConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * Demo hosts run persona auth over a public URL, so real PII there is an
 * EXPLICIT opt-in: credentials present AND ALLOW_DEMO_LIVE_ROSTER=1.
 * Tenant hosts ignore this — they require a real staff session instead.
 */
export function demoLiveRosterAllowed(): boolean {
  return liveRosterConfigured() && process.env.ALLOW_DEMO_LIVE_ROSTER === "1";
}

function ageFrom(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(`${dob}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export async function getLiveRoster(
  tenantId: string,
): Promise<LiveRosterRow[] | null> {
  if (!liveRosterConfigured()) return null;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("members")
    .select(
      "id, first_name, last_name, date_of_birth, date_of_birth_raw, sex, focus, membership_type, plan, group_name",
    )
    .eq("tenant_id", tenantId)
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("first_name", { ascending: true });

  if (error || !data) return null;

  return data.map((m) => {
    const age = ageFrom(m.date_of_birth);
    return {
      id: m.id,
      name: [m.first_name, m.last_name].filter(Boolean).join(" "),
      age,
      isMinor: age !== null && age < 18,
      sex: m.sex,
      focus: m.focus,
      membershipType: m.membership_type,
      plan: m.plan,
      groupName: m.group_name,
      dobRaw: m.date_of_birth_raw,
    };
  });
}
