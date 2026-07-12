import "server-only";

import { getAthleteIdForProfileId } from "@/lib/data/athletes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type SessionStatus = Database["public"]["Enums"]["session_status"];

const COMPLETED_SESSION: SessionStatus = "completed";
const CONFIRMED_BOOKING: BookingStatus = "confirmed";

export type AthleteProgramSummary = {
  programId: string | null;
  programName: string | null;
  currentDay: number | null;
  currentPhase: string | null;
  lastCompletedSessionDate: string | null;
};

export type AthleteProgramDayListItem = {
  dayNumber: number;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
};

type ProgramNested = { id: string; name: string } | null;

type AssignmentSelectRow = {
  program_id: string;
  programs: ProgramNested | ProgramNested[] | null;
};

/**
 * BR-07: program-day advancement should follow logged workout / session completion,
 * not the calendar. The MVP schema has no per-day workout log or `program_day_id`
 * on sessions; we proxy "steps completed" with confirmed bookings on completed
 * sessions linked to the athlete's current program. Replace this with native
 * program_day / TrainHeroic sync when those models exist.
 */
export function deriveNextProgramDayFromCompletedSessions(
  completedCount: number,
): number {
  const next = completedCount + 1;
  return next < 1 ? 1 : next;
}

function emptySummary(): AthleteProgramSummary {
  return {
    programId: null,
    programName: null,
    currentDay: null,
    currentPhase: null,
    lastCompletedSessionDate: null,
  };
}

function normalizeProgramJoin(
  programs: AssignmentSelectRow["programs"],
): { id: string; name: string } | null {
  if (!programs) return null;
  const p = Array.isArray(programs) ? programs[0] : programs;
  if (!p?.id) return null;
  return { id: p.id, name: p.name };
}

/**
 * Loads current program assignment and best-effort day/phase from the MVP schema.
 * `athleteProfileId` is `profiles.id` (same as `auth.users.id`).
 *
 * TODO: Wire `currentPhase` and richer `currentDay` from TrainHeroic or a native
 * `program_phases` / `program_days` model when available.
 */
export async function getAthleteProgramSummary(
  athleteProfileId: string,
): Promise<AthleteProgramSummary> {
  const athleteId = await getAthleteIdForProfileId(athleteProfileId);
  if (!athleteId) {
    return emptySummary();
  }

  const supabase = createSupabaseServerClient();

  const { data: assignRaw, error: assignErr } = await supabase
    .from("athlete_program_assignments")
    .select(
      `
      program_id,
      programs (
        id,
        name
      )
    `,
    )
    .eq("athlete_id", athleteId)
    .is("unassigned_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignErr || !assignRaw) {
    return emptySummary();
  }

  const assignRow = assignRaw as AssignmentSelectRow;
  const program = normalizeProgramJoin(assignRow.programs);
  const programId = program?.id ?? assignRow.program_id;

  if (!programId) {
    return emptySummary();
  }

  // TODO: Include sessions with null program_id once staff always links sessions
  // to program days or TH block ids.
  const { data: bookingRows, error: bookErr } = await supabase
    .from("bookings")
    .select(
      `
      id,
      sessions!inner (
        ends_at,
        status,
        program_id
      )
    `,
    )
    .eq("athlete_id", athleteId)
    .eq("status", CONFIRMED_BOOKING);

  type SessionNested = {
    ends_at: string;
    status: SessionStatus;
    program_id: string | null;
  };

  type BookingCompletionRow = {
    sessions: SessionNested | SessionNested[] | null;
  };

  let completedForProgram = 0;
  let lastEndMs = 0;
  let lastEndsAt: string | null = null;

  if (!bookErr && bookingRows?.length) {
    for (const row of bookingRows as BookingCompletionRow[]) {
      const s = row.sessions;
      const session = Array.isArray(s) ? s[0] : s;
      if (!session || session.status !== COMPLETED_SESSION) continue;
      if (session.program_id !== programId) continue;

      completedForProgram += 1;
      const endMs = new Date(session.ends_at).getTime();
      if (endMs >= lastEndMs) {
        lastEndMs = endMs;
        lastEndsAt = session.ends_at;
      }
    }
  }

  // Session "date" for last completion: use ends_at as the canonical boundary
  // for when the in-facility block finished.
  const lastCompletedSessionDate = lastEndsAt;

  return {
    programId,
    programName: program?.name?.trim() || null,
    currentDay: deriveNextProgramDayFromCompletedSessions(completedForProgram),
    currentPhase: null,
    lastCompletedSessionDate,
  };
}

const DAY_WINDOW_BEFORE = 3;
const DAY_WINDOW_AFTER = 7;

function dayTitle(dayNumber: number): string {
  // TODO: Replace with exercise prescriptions / TrainHeroic day labels.
  return `Day ${dayNumber} – Training session`;
}

/**
 * Best-effort list of program days around the athlete's next prescribed day.
 * TODO: Populate `completedAt` per day from workout completion logs when the schema supports it.
 */
export function buildProgramDayListItems(
  summary: AthleteProgramSummary,
): AthleteProgramDayListItem[] {
  const nextDay = summary.currentDay ?? 1;

  if (!summary.programId) {
    return [];
  }

  const start = Math.max(1, nextDay - DAY_WINDOW_BEFORE);
  const end = nextDay + DAY_WINDOW_AFTER;

  const items: AthleteProgramDayListItem[] = [];
  for (let dayNumber = start; dayNumber <= end; dayNumber += 1) {
    const isCompleted = dayNumber < nextDay;
    items.push({
      dayNumber,
      title: dayTitle(dayNumber),
      isCompleted,
      // TODO: Per-day completion timestamps from native / TH workout logs.
      completedAt: null,
    });
  }

  return items;
}

export async function listProgramDaysForAthlete(
  athleteProfileId: string,
): Promise<AthleteProgramDayListItem[]> {
  const summary = await getAthleteProgramSummary(athleteProfileId);
  return buildProgramDayListItems(summary);
}
