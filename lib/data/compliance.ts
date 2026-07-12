import { formatPaymentStatusLabel } from "@/lib/data/booking-status-labels";
import { MEMBERSHIP_PAYMENT_STATUS_COMPLIANCE_FLAGS } from "@/lib/data/membership-payment-rules";
import { mondayUtcWeekStartIso } from "@/lib/data/cap-notes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

/** Same calendar +28 day rule as legacy `getBookingComplianceStatus` (local `Date`). */
export function fourWeekThreshold(referenceDate: Date): Date {
  const threshold = new Date(referenceDate);
  threshold.setDate(threshold.getDate() + 28);
  return threshold;
}

export type BookingComplianceRow = {
  /** `athletes.id` */
  athleteId: string;
  /** `profiles.id` */
  athleteProfileId: string;
  athleteFullName: string;
  /** Max `sessions.starts_at` among confirmed bookings. */
  furthestBookedSessionStartsAt: string | null;
  /** Earliest future confirmed session (`starts_at >= now`). */
  nextBookedSessionStartsAt: string | null;
};

export type NoteComplianceRow = {
  athleteId: string;
  athleteProfileId: string;
  athleteFullName: string;
  /** Most recent CAP note by `created_at` (any week). */
  lastCapNoteCreatedAt: string | null;
};

export type PaymentComplianceRow = {
  athleteId: string;
  athleteProfileId: string;
  athleteFullName: string;
  /** Worst active-membership `payment_status` when out of good standing; null if only balance flags the row. */
  membershipPaymentStatus: PaymentStatus | null;
  balanceCents: number | null;
  displayLabel: string;
};

export type StaffAthleteRosterRow = {
  id: string;
  profile_id: string;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

function rosterFullName(row: StaffAthleteRosterRow): string {
  const p = row.profiles;
  if (Array.isArray(p)) return p[0]?.full_name?.trim() || "Unknown athlete";
  return p?.full_name?.trim() || "Unknown athlete";
}

async function fetchStaffVisibleAthletes(
  supabase: ReturnType<typeof createSupabaseServerClient>,
): Promise<StaffAthleteRosterRow[]> {
  const { data, error } = await supabase
    .from("athletes")
    .select("id, profile_id, profiles(full_name)");

  if (error || !data?.length) return [];
  return data as StaffAthleteRosterRow[];
}

/** One roster load for staff-visible athletes (RLS); pass into list* helpers to avoid repeat queries. */
export async function fetchStaffAthleteComplianceRoster(): Promise<
  StaffAthleteRosterRow[]
> {
  return fetchStaffVisibleAthletes(createSupabaseServerClient());
}

function sessionStartsAt(
  sessions: { starts_at: string } | { starts_at: string }[] | null,
): string | null {
  const s = sessions;
  const raw = Array.isArray(s) ? s[0]?.starts_at : s?.starts_at;
  return raw ?? null;
}

type BookingJoin = {
  athlete_id: string;
  sessions: { starts_at: string } | { starts_at: string }[] | null;
};

function paymentSeverity(s: PaymentStatus): number {
  switch (s) {
    case "failed":
      return 5;
    case "unpaid":
      return 4;
    case "pending":
      return 3;
    case "refunded":
      return 2;
    default:
      return 0;
  }
}

function buildPaymentDisplayLabel(
  membershipStatus: PaymentStatus | null,
  balanceCents: number | null,
): string {
  const parts: string[] = [];
  if (membershipStatus) {
    if (membershipStatus === "unpaid" || membershipStatus === "failed") {
      parts.push("Overdue");
    } else {
      parts.push(formatPaymentStatusLabel(membershipStatus));
    }
  }
  if (balanceCents != null && balanceCents > 0) {
    if (membershipStatus === "unpaid" || membershipStatus === "failed") {
      parts.push("In collections");
    } else {
      parts.push("Balance due");
    }
  }
  return parts.length ? parts.join(" · ") : "Payment issue";
}

export async function listBookingComplianceIssues(
  rosterArg?: StaffAthleteRosterRow[],
): Promise<BookingComplianceRow[]> {
  const supabase = createSupabaseServerClient();
  const roster =
    rosterArg ??
    (await fetchStaffVisibleAthletes(supabase));
  if (!roster.length) return [];

  const athleteIds = roster.map((r) => r.id);
  const thresholdMs = fourWeekThreshold(new Date()).getTime();
  const nowMs = Date.now();

  const { data: bookingRows, error } = await supabase
    .from("bookings")
    .select(
      `
      athlete_id,
      sessions!inner (
        starts_at
      )
    `,
    )
    .eq("status", "confirmed")
    .in("athlete_id", athleteIds);

  if (error) return [];

  const byAthlete = new Map<
    string,
    { max: number; maxIso: string | null; minFuture: number | null; minFutureIso: string | null }
  >();

  for (const row of (bookingRows ?? []) as BookingJoin[]) {
    const starts = sessionStartsAt(row.sessions);
    if (!starts) continue;
    const t = new Date(starts).getTime();
    const cur = byAthlete.get(row.athlete_id) ?? {
      max: -Infinity,
      maxIso: null as string | null,
      minFuture: null as number | null,
      minFutureIso: null as string | null,
    };
    if (t >= cur.max) {
      cur.max = t;
      cur.maxIso = starts;
    }
    if (t >= nowMs) {
      if (cur.minFuture == null || t < cur.minFuture) {
        cur.minFuture = t;
        cur.minFutureIso = starts;
      }
    }
    byAthlete.set(row.athlete_id, cur);
  }

  const issues: BookingComplianceRow[] = [];
  for (const a of roster) {
    const agg = byAthlete.get(a.id);
    const hasHorizon =
      agg != null && agg.maxIso != null && agg.max >= thresholdMs;
    if (hasHorizon) continue;

    issues.push({
      athleteId: a.id,
      athleteProfileId: a.profile_id,
      athleteFullName: rosterFullName(a),
      furthestBookedSessionStartsAt: agg?.maxIso ?? null,
      nextBookedSessionStartsAt: agg?.minFutureIso ?? null,
    });
  }

  issues.sort((x, y) =>
    x.athleteFullName.localeCompare(y.athleteFullName, undefined, {
      sensitivity: "base",
    }),
  );
  return issues;
}

export async function listNoteComplianceIssues(
  rosterArg?: StaffAthleteRosterRow[],
): Promise<NoteComplianceRow[]> {
  const supabase = createSupabaseServerClient();
  const roster =
    rosterArg ??
    (await fetchStaffVisibleAthletes(supabase));
  if (!roster.length) return [];

  const athleteIds = roster.map((r) => r.id);
  const weekStart = mondayUtcWeekStartIso(new Date());

  const { data: weekNotes, error: weekErr } = await supabase
    .from("cap_notes")
    .select("athlete_id")
    .eq("note_week_start", weekStart)
    .in("athlete_id", athleteIds);

  if (weekErr) return [];

  const compliantThisWeek = new Set(
    (weekNotes ?? []).map((r) => (r as { athlete_id: string }).athlete_id),
  );

  const { data: lastNotes, error: lastErr } = await supabase
    .from("cap_notes")
    .select("athlete_id, created_at")
    .in("athlete_id", athleteIds)
    .order("created_at", { ascending: false });

  if (lastErr) return [];

  const lastCreatedByAthlete = new Map<string, string>();
  for (const row of lastNotes ?? []) {
    const aid = (row as { athlete_id: string }).athlete_id;
    if (!lastCreatedByAthlete.has(aid)) {
      lastCreatedByAthlete.set(
        aid,
        (row as { created_at: string }).created_at,
      );
    }
  }

  const issues: NoteComplianceRow[] = [];
  for (const a of roster) {
    if (compliantThisWeek.has(a.id)) continue;
    issues.push({
      athleteId: a.id,
      athleteProfileId: a.profile_id,
      athleteFullName: rosterFullName(a),
      lastCapNoteCreatedAt: lastCreatedByAthlete.get(a.id) ?? null,
    });
  }

  issues.sort((x, y) =>
    x.athleteFullName.localeCompare(y.athleteFullName, undefined, {
      sensitivity: "base",
    }),
  );
  return issues;
}

export async function listPaymentComplianceIssues(
  rosterArg?: StaffAthleteRosterRow[],
): Promise<PaymentComplianceRow[]> {
  const supabase = createSupabaseServerClient();
  const roster =
    rosterArg ??
    (await fetchStaffVisibleAthletes(supabase));
  if (!roster.length) return [];

  const athleteIds = roster.map((r) => r.id);
  const rosterByAthleteId = new Map(roster.map((r) => [r.id, r]));

  const { data: badM, error: mErr } = await supabase
    .from("memberships")
    .select("athlete_id, payment_status")
    .eq("status", "active")
    .in("athlete_id", athleteIds)
    .in("payment_status", [...MEMBERSHIP_PAYMENT_STATUS_COMPLIANCE_FLAGS]);

  if (mErr) return [];

  const worstMembershipStatus = new Map<string, PaymentStatus>();
  for (const row of badM ?? []) {
    const aid = (row as { athlete_id: string }).athlete_id;
    const ps = (row as { payment_status: PaymentStatus }).payment_status;
    const prev = worstMembershipStatus.get(aid);
    if (!prev || paymentSeverity(ps) > paymentSeverity(prev)) {
      worstMembershipStatus.set(aid, ps);
    }
  }

  const { data: balances, error: bErr } = await supabase
    .from("billing_accounts")
    .select("athlete_id, balance_cents")
    .in("athlete_id", athleteIds)
    .gt("balance_cents", 0);

  if (bErr) return [];

  const balanceByAthlete = new Map<string, number>();
  for (const row of balances ?? []) {
    const aid = (row as { athlete_id: string }).athlete_id;
    balanceByAthlete.set(
      aid,
      (row as { balance_cents: number }).balance_cents,
    );
  }

  const issueIds = new Set<string>([
    ...worstMembershipStatus.keys(),
    ...balanceByAthlete.keys(),
  ]);

  const issues: PaymentComplianceRow[] = [];
  for (const aid of issueIds) {
    const a = rosterByAthleteId.get(aid);
    if (!a) continue;
    const membershipStatus = worstMembershipStatus.get(aid) ?? null;
    const balanceCents = balanceByAthlete.get(aid) ?? null;
    if (!membershipStatus && (balanceCents == null || balanceCents <= 0)) {
      continue;
    }
    issues.push({
      athleteId: a.id,
      athleteProfileId: a.profile_id,
      athleteFullName: rosterFullName(a),
      membershipPaymentStatus: membershipStatus,
      balanceCents,
      displayLabel: buildPaymentDisplayLabel(membershipStatus, balanceCents),
    });
  }

  issues.sort((x, y) =>
    x.athleteFullName.localeCompare(y.athleteFullName, undefined, {
      sensitivity: "base",
    }),
  );
  return issues;
}
