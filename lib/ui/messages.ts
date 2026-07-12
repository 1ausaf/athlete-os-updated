/** Malformed input, wrong role for booking, or invalid UUID on booking flows. */
export const BOOKING_INVALID_REQUEST_CODE = "BOOKING_INVALID_REQUEST" as const;

/** Aligns with `BookingErrorCode` in `lib/data/bookings`. */
export type BookingUserFacingCode =
  | "BOOKING_FREQUENCY_EXCEEDED"
  | "PAYMENT_NOT_AUTHORIZED"
  | "SESSION_FULL"
  | "GENERIC_BOOKING_ERROR";

export type BookingDisplayCode =
  | BookingUserFacingCode
  | typeof BOOKING_INVALID_REQUEST_CODE;

const BOOKING_BY_CODE: Record<BookingUserFacingCode, string> = {
  BOOKING_FREQUENCY_EXCEEDED:
    "You've reached your session limit for this period.",
  PAYMENT_NOT_AUTHORIZED:
    "Billing is overdue or restricted; resolve payment before booking new sessions.",
  SESSION_FULL: "This session is full.",
  GENERIC_BOOKING_ERROR:
    "Unable to book this session right now. Please try again or contact a coach.",
};

/** User-facing copy for known booking error codes. */
export function bookingErrorMessage(code: BookingUserFacingCode): string {
  return BOOKING_BY_CODE[code];
}

export const BOOKING_INVALID_REQUEST_TEXT =
  "Invalid request. Please refresh and try again." as const;

/** Invalid booking request (bad input, wrong caller role for this action). */
export function bookingInvalidRequestMessage(): string {
  return BOOKING_INVALID_REQUEST_TEXT;
}

export function bookingDisplayMessage(code: BookingDisplayCode): string {
  if (code === BOOKING_INVALID_REQUEST_CODE) {
    return BOOKING_INVALID_REQUEST_TEXT;
  }
  return BOOKING_BY_CODE[code];
}

/** @deprecated Prefer `bookingErrorMessage` / `bookingDisplayMessage`. */
export const athleteBookingUserMessages: Record<BookingUserFacingCode, string> =
  BOOKING_BY_CODE;

export const bookingScenarioMessages = {
  alreadyBooked: "You're already booked for this session.",
  noAthleteRecord: "No athlete record for this account.",
  sessionNotFound: "Session not found.",
  sessionNotOpen: "This session is not open for booking.",
  sessionStartedOrEnded: "This session has already started or ended.",
  noBookingToCancel: "No booking to cancel.",
} as const;

export type MessageSendErrorCode =
  | "MESSAGE_EMPTY"
  | "MESSAGE_BODY_TOO_LONG"
  | "INVALID_UUID"
  | "RULE_OF_TWO_VIOLATION"
  | "NOT_THREAD_PARTICIPANT"
  | "MESSAGE_FORBIDDEN"
  | "MESSAGE_GENERIC";

const MESSAGE_SEND_BY_CODE: Record<MessageSendErrorCode, string> = {
  MESSAGE_EMPTY: "Message cannot be empty.",
  MESSAGE_BODY_TOO_LONG:
    "Message is too long. Please shorten it and try again.",
  INVALID_UUID: "Invalid id.",
  RULE_OF_TWO_VIOLATION:
    "This thread no longer meets Safe Sport Rule-of-Two (minors need at least two adults, and one-to-one adult–minor threads are not allowed).",
  NOT_THREAD_PARTICIPANT:
    "You are not a participant in this thread, so the message could not be sent.",
  MESSAGE_FORBIDDEN: "You do not have permission to send this message.",
  MESSAGE_GENERIC: "Could not send message.",
};

export function messageSendErrorMessage(code: MessageSendErrorCode): string {
  return MESSAGE_SEND_BY_CODE[code];
}

export type CapNoteErrorCode = "CAP_VALIDATION" | "CAP_NOTE_GENERIC" | "CAP_FORBIDDEN";

const CAP_BY_CODE: Record<CapNoteErrorCode, string> = {
  CAP_VALIDATION: "Please check the form and try again.",
  CAP_NOTE_GENERIC: "Could not save the CAP note. Please try again.",
  CAP_FORBIDDEN: "You do not have permission to create CAP notes.",
};

export function capNoteErrorMessage(code: CapNoteErrorCode): string {
  return CAP_BY_CODE[code];
}

export const apiUnauthorizedMessage =
  "You must be signed in to perform this action." as const;

export const apiInvalidJsonMessage =
  "Request body must be valid JSON." as const;
