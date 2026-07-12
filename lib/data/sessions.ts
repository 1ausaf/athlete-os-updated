import { getAthleteIdForProfileId } from "@/lib/data/athletes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

export type UpcomingSessionForAthlete = SessionRow & {
  isBooked: boolean;
};

export async function listUpcomingSessionsForAthlete(
  athleteProfileId: string,
): Promise<UpcomingSessionForAthlete[]> {
  const athleteId = await getAthleteIdForProfileId(athleteProfileId);
  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data: sessionsRaw, error: sErr } = await supabase
    .from("sessions")
    .select("*")
    .gt("starts_at", nowIso)
    .eq("status", "scheduled")
    .order("starts_at", { ascending: true });

  if (sErr || !sessionsRaw?.length) return [];

  const sessions = sessionsRaw as SessionRow[];

  const bookedIds = new Set<string>();
  if (athleteId) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("session_id")
      .eq("athlete_id", athleteId)
      .in("status", ["pending", "confirmed", "waitlisted"]);

    for (const b of bookings ?? []) {
      bookedIds.add((b as { session_id: string }).session_id);
    }
  }

  return sessions.map((s) => ({
    ...s,
    isBooked: bookedIds.has(s.id),
  }));
}

export interface SessionRosterAthleteRow {
  bookingId: string;
  athleteId: string;
  profileId: string;
  fullName: string;
  bookingStatus: Database["public"]["Enums"]["booking_status"];
  bookingPaymentStatus: Database["public"]["Enums"]["payment_status"];
  programDayLabel: string;
  lastCapNoteAt: string | null;
  injuryFlag: boolean;
  paymentStatusLabel: string;
}

export async function listSessionRoster(
  sessionId: string,
): Promise<SessionRosterAthleteRow[]> {
  const supabase = createSupabaseServerClient();

  const { data: bookingRows, error: bErr } = await supabase
    .from("bookings")
    .select("id, athlete_id, status, payment_status")
    .eq("session_id", sessionId)
    .in("status", ["pending", "confirmed", "waitlisted"]);

  if (bErr || !bookingRows?.length) return [];

  type BookingPick = {
    id: string;
    athlete_id: string;
    status: Database["public"]["Enums"]["booking_status"];
    payment_status: Database["public"]["Enums"]["payment_status"];
  };

  const bookings = bookingRows as BookingPick[];
  const athleteIds = [...new Set(bookings.map((b) => b.athlete_id))];

  const { data: athleteRows, error: aErr } = await supabase
    .from("athletes")
    .select(
      `
      id,
      injury_flag,
      profile_id,
      profiles (
        full_name
      )
    `,
    )
    .in("id", athleteIds);

  if (aErr || !athleteRows?.length) return [];

  type ProfileEmbed = { full_name: string | null } | { full_name: string | null }[] | null;
  type AthleteJoin = {
    id: string;
    injury_flag: boolean;
    profile_id: string;
    profiles: ProfileEmbed;
  };

  const athleteMap = new Map<string, AthleteJoin>();
  for (const row of athleteRows as AthleteJoin[]) {
    athleteMap.set(row.id, row);
  }

  const out: SessionRosterAthleteRow[] = [];
  for (const b of bookings) {
    const a = athleteMap.get(b.athlete_id);
    if (!a) continue;
    const p = a.profiles;
    const fullName = Array.isArray(p)
      ? p[0]?.full_name
      : p?.full_name;

    out.push({
      bookingId: b.id,
      athleteId: a.id,
      profileId: a.profile_id,
      fullName: fullName?.trim() || "Unknown athlete",
      bookingStatus: b.status,
      bookingPaymentStatus: b.payment_status,
      programDayLabel: "TODO: program day from assignment + session date",
      lastCapNoteAt: null,
      injuryFlag: a.injury_flag,
      paymentStatusLabel:
        "TODO: billing summary (e.g. billing_accounts / membership)",
    });
  }

  return out;
}

export type StaffSessionListRow = SessionRow & {
  primaryCoachName: string | null;
  confirmedCount: number;
};

/** Upcoming scheduled sessions with coach display name and confirmed headcount. */
export async function listUpcomingSessionsForStaff(): Promise<
  StaffSessionListRow[]
> {
  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data: sessionsRaw, error: sErr } = await supabase
    .from("sessions")
    .select("*")
    .gt("starts_at", nowIso)
    .eq("status", "scheduled")
    .order("starts_at", { ascending: true });

  if (sErr || !sessionsRaw?.length) return [];

  const sessions = sessionsRaw as SessionRow[];
  const sessionIds = sessions.map((s) => s.id);
  const coachIds = [
    ...new Set(
      sessions.map((s) => s.primary_coach_id).filter((id): id is string => Boolean(id)),
    ),
  ];

  const coachNameById = new Map<string, string | null>();
  if (coachIds.length) {
    const { data: coachRows } = await supabase
      .from("coaches")
      .select(
        `
        id,
        profiles (
          full_name
        )
      `,
      )
      .in("id", coachIds);

    type CoachJoin = {
      id: string;
      profiles: { full_name: string | null } | { full_name: string | null }[] | null;
    };

    for (const c of (coachRows ?? []) as CoachJoin[]) {
      const p = c.profiles;
      const name = Array.isArray(p) ? p[0]?.full_name : p?.full_name;
      coachNameById.set(c.id, name?.trim() ?? null);
    }
  }

  const countMap = new Map<string, number>();
  if (sessionIds.length > 0) {
    const { data: countRows } = await supabase
      .from("bookings")
      .select("session_id")
      .eq("status", "confirmed")
      .in("session_id", sessionIds);

    for (const row of countRows ?? []) {
      const sid = (row as { session_id: string }).session_id;
      countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
    }
  }

  return sessions.map((s) => ({
    ...s,
    primaryCoachName: s.primary_coach_id
      ? coachNameById.get(s.primary_coach_id) ?? null
      : null,
    confirmedCount: countMap.get(s.id) ?? 0,
  }));
}
