import { getAthleteIdForProfileId } from "@/lib/data/athletes";
import { MEMBERSHIP_PAYMENT_ALLOWED_FOR_BOOKING } from "@/lib/data/membership-payment-rules";
import { fourWeekThreshold } from "@/lib/data/compliance";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];
type MembershipPlanRow = Database["public"]["Tables"]["membership_plans"]["Row"];

const MEMBERSHIP_PLAN_SELECT = `
  membership_plans (
    id,
    name,
    description,
    membership_frequency,
    sessions_allowed_per_period,
    period_days,
    price_cents,
    is_active,
    created_at,
    updated_at
  )
` as const;

export type ActiveMembershipWithPlan = MembershipRow & {
  membership_plans: MembershipPlanRow | null;
};

/**
 * Active membership for the athlete identified by their **profile** id,
 * including the related plan row under `membership_plans`.
 */
export async function getActiveMembershipForAthlete(
  athleteProfileId: string,
): Promise<ActiveMembershipWithPlan | null> {
  const athleteId = await getAthleteIdForProfileId(athleteProfileId);
  if (!athleteId) return null;

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  const { data, error } = await supabase
    .from("memberships")
    .select(
      `
      id,
      athlete_id,
      plan_id,
      status,
      valid_from,
      valid_to,
      payment_status,
      created_at,
      updated_at,
      ${MEMBERSHIP_PLAN_SELECT}
    `,
    )
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .in("payment_status", [...MEMBERSHIP_PAYMENT_ALLOWED_FOR_BOOKING])
    .lte("valid_from", nowIso)
    .order("valid_from", { ascending: false });

  if (error || !data?.length) return null;

  type Row = MembershipRow & {
    membership_plans: MembershipPlanRow | MembershipPlanRow[] | null;
  };

  const rows = data as Row[];
  const active = rows.find((m) => {
    if (m.valid_to == null) return true;
    return new Date(m.valid_to).getTime() >= nowMs;
  });

  if (!active) return null;

  const plan = active.membership_plans;
  const planRow = Array.isArray(plan) ? plan[0] ?? null : plan;

  return { ...active, membership_plans: planRow };
}

export interface BookingComplianceStatus {
  /** At least one confirmed booking with session start >= referenceDate + 28 days. */
  compliant: boolean;
  furthestBookedSessionStart: string | null;
}

export async function getBookingComplianceStatus(
  athleteProfileId: string,
  referenceDate: Date,
): Promise<BookingComplianceStatus> {
  const athleteId = await getAthleteIdForProfileId(athleteProfileId);
  if (!athleteId) {
    return { compliant: false, furthestBookedSessionStart: null };
  }

  const thresholdMs = fourWeekThreshold(referenceDate).getTime();

  const supabase = createSupabaseServerClient();

  const { data: bookingRows, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      sessions!inner (
        starts_at
      )
    `,
    )
    .eq("athlete_id", athleteId)
    .eq("status", "confirmed");

  if (error || !bookingRows?.length) {
    return { compliant: false, furthestBookedSessionStart: null };
  }

  type BookingJoin = {
    sessions: { starts_at: string } | { starts_at: string }[] | null;
  };

  let furthest: string | null = null;
  for (const row of bookingRows as BookingJoin[]) {
    const s = row.sessions;
    const starts = Array.isArray(s) ? s[0]?.starts_at : s?.starts_at;
    if (!starts) continue;
    const t = new Date(starts).getTime();
    if (t < thresholdMs) continue;
    if (!furthest || new Date(starts) > new Date(furthest)) {
      furthest = starts;
    }
  }

  return {
    compliant: furthest != null,
    furthestBookedSessionStart: furthest,
  };
}
