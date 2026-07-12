"use server";

import { redirect } from "next/navigation";

import { requireUserWithProfile } from "@/lib/auth";
import type { BookingErrorCode } from "@/lib/data/bookings";
import { bookSessionForAthleteUser } from "@/lib/server/mutations";
import {
  BOOKING_INVALID_REQUEST_CODE,
} from "@/lib/ui/messages";

export type BookingFormState =
  | { kind: "idle" }
  | { kind: "error"; code: BookingErrorCode; message: string };

const initialBookingFormState: BookingFormState = { kind: "idle" };

export { initialBookingFormState };

export async function bookSession(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const user = await requireUserWithProfile();
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  const outcome = await bookSessionForAthleteUser(user, sessionId);

  if (!outcome.ok) {
    const code: BookingErrorCode =
      outcome.code === BOOKING_INVALID_REQUEST_CODE ||
      outcome.code === "FORBIDDEN"
        ? "GENERIC_BOOKING_ERROR"
        : outcome.code;
    return { kind: "error", code, message: outcome.message };
  }

  redirect("/athlete/sessions");
}
