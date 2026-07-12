import type { PostgrestError } from "@supabase/supabase-js";

import { getAthleteIdForProfileId } from "@/lib/data/athletes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  athleteBookingUserMessages,
  BOOKING_INVALID_REQUEST_TEXT,
  bookingErrorMessage,
  bookingScenarioMessages,
} from "@/lib/ui/messages";
import { isValidUuid } from "@/lib/validation";
import type { Database } from "@/types/db";

export type BookingResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "BOOKING_FREQUENCY_EXCEEDED"
        | "PAYMENT_NOT_AUTHORIZED"
        | "SESSION_FULL"
        | "GENERIC_BOOKING_ERROR";
      message: string;
    };

export type BookingErrorCode = Extract<
  BookingResult,
  { ok: false }
>["code"];

export { athleteBookingUserMessages };

/** Shown when booking APIs receive malformed input or a non-athlete caller. */
export const bookingInvalidRequestMessage = BOOKING_INVALID_REQUEST_TEXT;

function validateUuid(id: string): BookingResult | null {
  if (!isValidUuid(id)) {
    return {
      ok: false,
      code: "GENERIC_BOOKING_ERROR",
      message: BOOKING_INVALID_REQUEST_TEXT,
    };
  }
  return null;
}

/**
 * Maps PostgREST / Postgres errors from `bookings` writes to a BookingResult
 * branch. Tuned for `booking_membership_limit` / `booking_payment_required`
 * from public.trg_bookings_membership_and_payment.
 */
export function mapBookingError(
  rawMessage: string,
  rawCode?: string,
): { code: BookingErrorCode; message: string } {
  const m = rawMessage.toLowerCase();
  const c = (rawCode ?? "").toLowerCase();

  if (
    c === "23505" ||
    m.includes("bookings_session_athlete_uniq") ||
    m.includes("duplicate key")
  ) {
    return { code: "GENERIC_BOOKING_ERROR", message: bookingScenarioMessages.alreadyBooked };
  }
  if (
    m.includes("booking_membership_limit") ||
    m.includes("membership frequency") ||
    m.includes("exceeds active membership")
  ) {
    return {
      code: "BOOKING_FREQUENCY_EXCEEDED",
      message: bookingErrorMessage("BOOKING_FREQUENCY_EXCEEDED"),
    };
  }
  if (
    m.includes("booking_payment_required") ||
    m.includes("cannot be confirmed until payment")
  ) {
    return {
      code: "PAYMENT_NOT_AUTHORIZED",
      message: bookingErrorMessage("PAYMENT_NOT_AUTHORIZED"),
    };
  }
  return {
    code: "GENERIC_BOOKING_ERROR",
    message: bookingErrorMessage("GENERIC_BOOKING_ERROR"),
  };
}

type BookingsInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingsUpdate = Database["public"]["Tables"]["bookings"]["Update"];

/** Narrow bridge: generated `Database` breaks `.from('bookings').insert` inference here. */
function bookingsInsert(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  row: BookingsInsert,
): Promise<{ error: PostgrestError | null }> {
  type BookingsFrom = {
    insert(values: BookingsInsert): Promise<{ error: PostgrestError | null }>;
  };
  return (supabase.from("bookings") as unknown as BookingsFrom).insert(row);
}

function bookingsUpdateById(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  id: string,
  patch: BookingsUpdate,
): Promise<{ error: PostgrestError | null }> {
  type Chain = {
    eq(column: "id", value: string): Promise<{ error: PostgrestError | null }>;
  };
  type BookingsFrom = {
    update(values: BookingsUpdate): Chain;
  };
  return (supabase.from("bookings") as unknown as BookingsFrom)
    .update(patch)
    .eq("id", id);
}

/** Counts roster seats: pending, confirmed, and waitlisted (excludes cancelled / no_show). */
async function countRosterBookingsForSession(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  sessionId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .in("status", ["pending", "confirmed", "waitlisted"]);

  if (error) return 0;
  return count ?? 0;
}

type SessionBookMeta = Pick<
  Database["public"]["Tables"]["sessions"]["Row"],
  "id" | "capacity" | "starts_at" | "status"
>;

export async function createBookingForAthlete(params: {
  athleteProfileId: string;
  sessionId: string;
}): Promise<BookingResult> {
  const badProfile = validateUuid(params.athleteProfileId);
  if (badProfile) return badProfile;
  const badSession = validateUuid(params.sessionId);
  if (badSession) return badSession;

  const athleteId = await getAthleteIdForProfileId(params.athleteProfileId);
  if (!athleteId) {
    return {
      ok: false,
      code: "GENERIC_BOOKING_ERROR",
      message: bookingScenarioMessages.noAthleteRecord,
    };
  }

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data: sessionRaw, error: sErr } = await supabase
    .from("sessions")
    .select("id, capacity, starts_at, status")
    .eq("id", params.sessionId)
    .maybeSingle();

  if (sErr || !sessionRaw) {
    return {
      ok: false,
      code: "GENERIC_BOOKING_ERROR",
      message: bookingScenarioMessages.sessionNotFound,
    };
  }

  const session = sessionRaw as SessionBookMeta;
  if (session.status !== "scheduled") {
    return {
      ok: false,
      code: "GENERIC_BOOKING_ERROR",
      message: bookingScenarioMessages.sessionNotOpen,
    };
  }
  if (new Date(session.starts_at).getTime() <= new Date(nowIso).getTime()) {
    return {
      ok: false,
      code: "GENERIC_BOOKING_ERROR",
      message: bookingScenarioMessages.sessionStartedOrEnded,
    };
  }

  const rosterCount = await countRosterBookingsForSession(
    supabase,
    params.sessionId,
  );
  if (rosterCount >= session.capacity) {
    return {
      ok: false,
      code: "SESSION_FULL",
      message: bookingErrorMessage("SESSION_FULL"),
    };
  }

  const row = {
    athlete_id: athleteId,
    session_id: params.sessionId,
    status: "confirmed" as Database["public"]["Enums"]["booking_status"],
    payment_status:
      "authorized" as Database["public"]["Enums"]["payment_status"],
  } satisfies BookingsInsert;

  const { error } = await bookingsInsert(supabase, row);

  if (error) {
    const { code, message } = mapBookingError(error.message ?? "", error.code);
    return { ok: false, code, message };
  }

  return { ok: true };
}

export async function cancelBookingForAthlete(params: {
  athleteProfileId: string;
  sessionId: string;
}): Promise<BookingResult> {
  const badProfile = validateUuid(params.athleteProfileId);
  if (badProfile) return badProfile;
  const badSession = validateUuid(params.sessionId);
  if (badSession) return badSession;

  const athleteId = await getAthleteIdForProfileId(params.athleteProfileId);
  if (!athleteId) {
    return {
      ok: false,
      code: "GENERIC_BOOKING_ERROR",
      message: bookingScenarioMessages.noAthleteRecord,
    };
  }

  const supabase = createSupabaseServerClient();

  const { data: existing, error: findErr } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("session_id", params.sessionId)
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (findErr || !existing) {
    return {
      ok: false,
      code: "GENERIC_BOOKING_ERROR",
      message: bookingScenarioMessages.noBookingToCancel,
    };
  }

  const booking = existing as { id: string; status: string };
  if (booking.status === "cancelled") {
    return { ok: true };
  }

  const patch = {
    status: "cancelled" as Database["public"]["Enums"]["booking_status"],
  } satisfies BookingsUpdate;

  const { error } = await bookingsUpdateById(supabase, booking.id, patch);

  if (error) {
    const { code, message } = mapBookingError(error.message ?? "", error.code);
    return { ok: false, code, message };
  }

  return { ok: true };
}
