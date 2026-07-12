import type { Database } from "@/types/db";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const MEMBERSHIP_PAYMENT_ALLOWED_FOR_BOOKING = [
  "authorized",
  "paid",
  "waived",
] as const satisfies readonly PaymentStatus[];

const ALL_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "unpaid",
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunded",
  "waived",
] as const;

/**
 * DB `payment_status` values that allow booking (matches `lib/auth` and
 * `trg_bookings_membership_and_payment` confirm rules).
 */
export function membershipPaymentStatusAllowsBooking(
  ps: PaymentStatus | null,
): boolean {
  if (ps == null) return false;
  return (MEMBERSHIP_PAYMENT_ALLOWED_FOR_BOOKING as readonly PaymentStatus[]).includes(
    ps,
  );
}

/**
 * Inverse of {@link membershipPaymentStatusAllowsBooking} for every enum
 * member — use with `.in()` on active memberships for payment compliance.
 */
export const MEMBERSHIP_PAYMENT_STATUS_COMPLIANCE_FLAGS: readonly PaymentStatus[] =
  ALL_PAYMENT_STATUSES.filter((s) => !membershipPaymentStatusAllowsBooking(s));
