import type { PillTone } from "@/components/ui/pill";
import type { BillingState, BookingState, Season } from "@/lib/demo/data";

export const billingMeta: Record<
  BillingState,
  { label: string; tone: PillTone }
> = {
  paid: { label: "In good standing", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
  grace: { label: "Grace period", tone: "warning" },
  pending: { label: "Payment pending", tone: "info" },
};

export const bookingMeta: Record<
  BookingState,
  { label: string; tone: PillTone }
> = {
  confirmed: { label: "Confirmed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  waitlisted: { label: "Waitlisted", tone: "info" },
  available: { label: "Available", tone: "neutral" },
  completed: { label: "Completed", tone: "neutral" },
};

export const seasonMeta: Record<Season, { label: string; tone: PillTone }> = {
  "in-season": { label: "In-season", tone: "brand" },
  "off-season": { label: "Off-season", tone: "neutral" },
};
