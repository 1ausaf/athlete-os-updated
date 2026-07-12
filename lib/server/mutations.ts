import {
  createBookingForAthlete,
  type BookingResult,
} from "@/lib/data/bookings";
import { createCapNoteForAthlete } from "@/lib/data/cap-notes";
import { getAthleteRowForProfileId } from "@/lib/data/athletes";
import { sendMessage, type SendMessageResult } from "@/lib/data/messaging";
import { isStaff } from "@/lib/rbac";
import {
  BOOKING_INVALID_REQUEST_CODE,
  BOOKING_INVALID_REQUEST_TEXT,
  capNoteErrorMessage,
  messageSendErrorMessage,
} from "@/lib/ui/messages";
import { assertValidUuid, isValidUuid, ValidationError } from "@/lib/validation";
import type { AppUser } from "@/types/user";

const CAP_FIELD_MAX = 8000;

export type BookSessionOutcome =
  | BookingResult
  | {
      ok: false;
      code: typeof BOOKING_INVALID_REQUEST_CODE | "FORBIDDEN";
      message: string;
    };

export async function bookSessionForAthleteUser(
  user: AppUser,
  sessionIdRaw: string,
): Promise<BookSessionOutcome> {
  if (user.role !== "athlete") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: BOOKING_INVALID_REQUEST_TEXT,
    };
  }
  if (!isValidUuid(sessionIdRaw)) {
    return {
      ok: false,
      code: BOOKING_INVALID_REQUEST_CODE,
      message: BOOKING_INVALID_REQUEST_TEXT,
    };
  }
  const sessionId = sessionIdRaw.trim();
  return createBookingForAthlete({
    athleteProfileId: user.id,
    sessionId,
  });
}

export async function sendThreadMessageForUser(
  user: AppUser,
  threadIdRaw: string,
  bodyRaw: string,
): Promise<SendMessageResult> {
  let threadId: string;
  try {
    threadId = assertValidUuid(threadIdRaw);
  } catch (e) {
    if (e instanceof ValidationError) {
      return {
        ok: false,
        code: "INVALID_UUID",
        message: messageSendErrorMessage("INVALID_UUID"),
      };
    }
    throw e;
  }
  const result: SendMessageResult = await sendMessage({
    threadId,
    senderProfileId: user.id,
    body: bodyRaw,
  });
  return result;
}

export type CreateStaffCapNoteBody = {
  athleteId: string;
  context: string;
  action: string;
  plan: string;
};

export type CreateStaffCapNoteOutcome =
  | { ok: true }
  | {
      ok: false;
      code: "FORBIDDEN" | "CAP_VALIDATION" | "CAP_NOTE_GENERIC";
      message: string;
    };

function validateCapField(label: string, value: string): string | null {
  const t = value.trim();
  if (!t) return `${label} is required.`;
  if (t.length > CAP_FIELD_MAX) {
    return `${label} is too long (max ${CAP_FIELD_MAX} characters).`;
  }
  return null;
}

/** `athleteId` is the target athlete's profile UUID (`profiles.id`). */
export async function createStaffCapNoteForUser(
  user: AppUser,
  body: CreateStaffCapNoteBody,
): Promise<CreateStaffCapNoteOutcome> {
  if (!isStaff(user)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: capNoteErrorMessage("CAP_FORBIDDEN"),
    };
  }

  let athleteProfileId: string;
  try {
    athleteProfileId = assertValidUuid(body.athleteId);
  } catch (e) {
    if (e instanceof ValidationError) {
      return {
        ok: false,
        code: "CAP_VALIDATION",
        message: capNoteErrorMessage("CAP_VALIDATION"),
      };
    }
    throw e;
  }

  const cErr = validateCapField("Context", body.context);
  if (cErr) {
    return { ok: false, code: "CAP_VALIDATION", message: cErr };
  }
  const aErr = validateCapField("Action", body.action);
  if (aErr) {
    return { ok: false, code: "CAP_VALIDATION", message: aErr };
  }
  const pErr = validateCapField("Plan", body.plan);
  if (pErr) {
    return { ok: false, code: "CAP_VALIDATION", message: pErr };
  }

  const athleteRow = await getAthleteRowForProfileId(athleteProfileId);
  if (!athleteRow) {
    return {
      ok: false,
      code: "CAP_VALIDATION",
      message: "No athlete record for that profile.",
    };
  }

  const res = await createCapNoteForAthlete({
    authorProfileId: user.id,
    athleteId: athleteRow.id,
    context: body.context.trim(),
    action: body.action.trim(),
    plan: body.plan.trim(),
  });

  if (!res.ok) {
    return {
      ok: false,
      code: "CAP_NOTE_GENERIC",
      message: res.message || capNoteErrorMessage("CAP_NOTE_GENERIC"),
    };
  }
  return { ok: true };
}
