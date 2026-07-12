import type { Database } from "@/types/db";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export type StatusTone = "ok" | "warn" | "bad" | "neutral";

const toneClass: Record<StatusTone, string> = {
  ok: "text-green-700 dark:text-green-400",
  warn: "text-amber-800 dark:text-amber-200",
  bad: "text-destructive",
  neutral: "text-muted-foreground",
};

export function toneToClass(tone: StatusTone): string {
  return toneClass[tone];
}

export function formatBookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Pending";
    case "cancelled":
      return "Cancelled";
    case "waitlisted":
      return "Waitlisted";
    case "no_show":
      return "No-show";
    default:
      return status;
  }
}

export function formatPaymentStatusLabel(payment: PaymentStatus): string {
  switch (payment) {
    case "paid":
      return "Paid";
    case "authorized":
      return "Authorized";
    case "pending":
      return "Pending";
    case "unpaid":
      return "Unpaid / overdue";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    case "waived":
      return "Waived";
    default:
      return payment;
  }
}

export function bookingStatusTone(status: BookingStatus): StatusTone {
  if (status === "confirmed") return "ok";
  if (status === "pending" || status === "waitlisted") return "warn";
  if (status === "cancelled" || status === "no_show") return "bad";
  return "neutral";
}

export function paymentStatusTone(payment: PaymentStatus): StatusTone {
  if (payment === "paid" || payment === "waived") return "ok";
  if (payment === "authorized") return "warn";
  if (payment === "pending") return "warn";
  if (payment === "unpaid") return "bad";
  if (payment === "failed") return "bad";
  if (payment === "refunded") return "neutral";
  return "neutral";
}

/** e.g. "Confirmed / Paid" for roster cells */
export function formatBookingPaymentPair(
  status: BookingStatus,
  payment: PaymentStatus,
): string {
  return `${formatBookingStatusLabel(status)} / ${formatPaymentStatusLabel(payment)}`;
}
