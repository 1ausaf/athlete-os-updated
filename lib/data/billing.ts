import "server-only";

import { getAthleteIdForProfileId } from "@/lib/data/athletes";
import { membershipPaymentStatusAllowsBooking } from "@/lib/data/membership-payment-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/types/db";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];
type MembershipPlanRow = Database["public"]["Tables"]["membership_plans"]["Row"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];
type MembershipStatus = Database["public"]["Enums"]["membership_status"];
type MembershipFrequency =
  Database["public"]["Enums"]["membership_frequency"];

export type BillingStatus = {
  status: "paid" | "overdue" | "grace_period" | "pending" | "unknown";
  nextInvoiceDate?: string | null;
  lastChargeDate?: string | null;
  provider?: "square" | "stripe" | null;
  rawStatus?: string | null;
};

export type AthleteBillingView = BillingStatus & {
  balanceCents: number;
  bookingRestricted: boolean;
  planName: string | null;
  membershipFrequency: MembershipFrequency | null;
  membershipStatus: MembershipStatus | null;
  /** Raw `memberships.payment_status` for the chosen row. */
  membershipPaymentStatus: PaymentStatus | null;
  membershipValidTo: string | null;
  membershipValidFrom: string | null;
};

export function athleteBillingBlocksBooking(
  view: Pick<AthleteBillingView, "membershipPaymentStatus" | "balanceCents">,
): boolean {
  if (view.balanceCents > 0) return true;
  return !membershipPaymentStatusAllowsBooking(view.membershipPaymentStatus);
}

/** Re-exported for callers that should share booking vs compliance rules without importing `billing` from non-server modules. */
export {
  MEMBERSHIP_PAYMENT_STATUS_COMPLIANCE_FLAGS,
  membershipPaymentStatusAllowsBooking,
} from "@/lib/data/membership-payment-rules";

const MEMBERSHIP_PLAN_SELECT = `
  membership_plans (
    id,
    name,
    description,
    membership_frequency,
    sessions_allowed_per_period,
    period_days,
    price_cents,
    is_active,
    created_at,
    updated_at
  )
` as const;

function normalizePlan(
  plan: MembershipPlanRow | MembershipPlanRow[] | null,
): MembershipPlanRow | null {
  if (plan == null) return null;
  return Array.isArray(plan) ? plan[0] ?? null : plan;
}

/** Next billing period boundary from anchor + period_days (placeholder until Square/Stripe). */
function estimateNextInvoiceDateIso(
  validFrom: string,
  periodDays: number | null,
): string | null {
  if (periodDays == null || periodDays <= 0) return null;
  const stepMs = periodDays * 86_400_000;
  const now = Date.now();
  let cursor = new Date(validFrom).getTime();
  if (Number.isNaN(cursor)) return null;
  let guard = 0;
  while (cursor < now && guard < 10_000) {
    cursor += stepMs;
    guard += 1;
  }
  return new Date(cursor).toISOString().slice(0, 10);
}

/**
 * Maps membership `payment_status` + balance to a high-level billing label.
 * Balance due always wins as `overdue`. When there is no membership row,
 * uses `unknown` (or `overdue` if balance > 0).
 */
function deriveBillingLevelStatus(
  paymentStatus: PaymentStatus | null,
  balanceCents: number,
  hasChosenMembership: boolean,
): BillingStatus["status"] {
  if (balanceCents > 0) return "overdue";
  if (!hasChosenMembership) {
    return "unknown";
  }
  if (paymentStatus == null) return "unknown";
  if (paymentStatus === "failed" || paymentStatus === "unpaid") {
    return "overdue";
  }
  if (paymentStatus === "refunded") return "overdue";
  if (paymentStatus === "pending") return "pending";
  if (paymentStatus === "authorized") return "grace_period";
  if (paymentStatus === "paid" || paymentStatus === "waived") {
    return "paid";
  }
  return "unknown";
}

function emptyAthleteBillingView(): AthleteBillingView {
  return {
    status: "unknown",
    nextInvoiceDate: null,
    lastChargeDate: null,
    provider: null,
    rawStatus: null,
    balanceCents: 0,
    bookingRestricted: true,
    planName: null,
    membershipFrequency: null,
    membershipStatus: null,
    membershipPaymentStatus: null,
    membershipValidTo: null,
    membershipValidFrom: null,
  };
}

type MembershipWithPlanRow = MembershipRow & {
  membership_plans: MembershipPlanRow | MembershipPlanRow[] | null;
};

function isMembershipInActiveWindow(row: MembershipRow, nowMs: number): boolean {
  if (row.status !== "active") return false;
  const fromMs = new Date(row.valid_from).getTime();
  if (fromMs > nowMs) return false;
  if (row.valid_to == null) return true;
  return new Date(row.valid_to).getTime() >= nowMs;
}

function pickChosenMembershipRow<T extends MembershipRow>(
  rows: T[],
  nowMs: number,
): T | null {
  if (!rows.length) return null;
  const inWindow = rows.filter((r) => isMembershipInActiveWindow(r, nowMs));
  return (
    inWindow[0] ??
    rows.find((r) => new Date(r.valid_from).getTime() <= nowMs) ??
    rows[0] ??
    null
  );
}

/**
 * Billing snapshot for an athlete (by **profile** id). Uses the cookie-backed
 * server client so RLS matches the signed-in user on athlete/staff pages.
 */
export async function getBillingStatusForAthlete(
  athleteProfileId: string,
): Promise<AthleteBillingView> {
  const athleteId = await getAthleteIdForProfileId(athleteProfileId);
  if (!athleteId) return emptyAthleteBillingView();

  const supabase = createSupabaseServerClient();
  const nowMs = Date.now();

  const [{ data: billingRaw }, { data: membershipRows, error }] =
    await Promise.all([
      supabase
        .from("billing_accounts")
        .select("balance_cents")
        .eq("athlete_id", athleteId)
        .maybeSingle(),
      supabase
        .from("memberships")
        .select(
          `
      id,
      athlete_id,
      plan_id,
      status,
      valid_from,
      valid_to,
      payment_status,
      created_at,
      updated_at,
      ${MEMBERSHIP_PLAN_SELECT}
    `,
        )
        .eq("athlete_id", athleteId)
        .order("valid_from", { ascending: false })
        .limit(25),
    ]);

  const balanceCents =
    billingRaw &&
    typeof (billingRaw as { balance_cents?: number }).balance_cents ===
      "number"
      ? Math.max(0, (billingRaw as { balance_cents: number }).balance_cents)
      : 0;

  if (error || !membershipRows?.length) {
    const base = emptyAthleteBillingView();
    base.balanceCents = balanceCents;
    base.status = deriveBillingLevelStatus(null, balanceCents, false);
    base.bookingRestricted = athleteBillingBlocksBooking({
      membershipPaymentStatus: base.membershipPaymentStatus,
      balanceCents: base.balanceCents,
    });
    return base;
  }

  const rows = membershipRows as MembershipWithPlanRow[];
  const chosen = pickChosenMembershipRow(rows, nowMs);
  if (!chosen) {
    const base = emptyAthleteBillingView();
    base.balanceCents = balanceCents;
    base.status = deriveBillingLevelStatus(null, balanceCents, false);
    base.bookingRestricted = athleteBillingBlocksBooking({
      membershipPaymentStatus: base.membershipPaymentStatus,
      balanceCents: base.balanceCents,
    });
    return base;
  }

  const plan = normalizePlan(chosen.membership_plans);
  const status = deriveBillingLevelStatus(
    chosen.payment_status,
    balanceCents,
    true,
  );
  const nextInvoiceDate = estimateNextInvoiceDateIso(
    chosen.valid_from,
    plan?.period_days ?? null,
  );

  const view: AthleteBillingView = {
    status,
    nextInvoiceDate,
    /** TODO: add `billing_accounts.last_charge_at` or map from provider payloads. */
    lastChargeDate: null,
    provider: null,
    rawStatus: null,
    balanceCents,
    bookingRestricted: athleteBillingBlocksBooking({
      membershipPaymentStatus: chosen.payment_status,
      balanceCents,
    }),
    planName: plan?.name ?? null,
    membershipFrequency: plan?.membership_frequency ?? null,
    membershipStatus: chosen.status,
    membershipPaymentStatus: chosen.payment_status,
    membershipValidTo: chosen.valid_to,
    membershipValidFrom: chosen.valid_from,
  };

  return view;
}

export type BillingWebhookEvent = {
  athleteProfileId: string;
  provider: "square" | "stripe";
  eventType: string;
  status: string;
  occurredAt: string;
};

function mapNormalizedEventToPaymentStatus(
  eventType: string,
  status: string,
): PaymentStatus | null {
  const t = eventType.toLowerCase();
  const s = status.toLowerCase();

  if (t === "invoice_paid" || t === "payment.paid") {
    return "paid";
  }
  if (t === "invoice_payment_failed" || t === "payment.failed") {
    return "failed";
  }
  if (t === "subscription_canceled" || t === "customer.subscription.deleted") {
    /** TODO: product decision — pause membership vs mark unpaid vs leave unchanged. */
    return null;
  }
  if (t === "invoice_created" || t === "payment.pending") {
    return s === "paid" ? "paid" : "pending";
  }
  if (s === "paid" || s === "succeeded") return "paid";
  if (s === "failed" || s === "canceled") return "failed";
  if (s === "pending" || s === "processing") return "pending";
  if (s === "unpaid" || s === "overdue") return "unpaid";
  return null;
}

/**
 * Applies a normalized processor event to the athlete’s primary membership row.
 * Uses the service role client (webhooks have no user session).
 */
export async function updateBillingStatusFromEvent(
  event: BillingWebhookEvent,
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const athleteId = await getAthleteIdForProfileId(
    event.athleteProfileId,
    supabase,
  );
  if (!athleteId) {
    return;
  }

  const nextPaymentStatus = mapNormalizedEventToPaymentStatus(
    event.eventType,
    event.status,
  );
  if (nextPaymentStatus == null) {
    return;
  }

  const nowMs = Date.now();
  const { data: membershipRows, error } = await supabase
    .from("memberships")
    .select(
      "id, athlete_id, plan_id, status, valid_from, valid_to, payment_status, created_at, updated_at",
    )
    .eq("athlete_id", athleteId)
    .order("valid_from", { ascending: false })
    .limit(25);

  if (error || !membershipRows?.length) {
    return;
  }

  type Row = Pick<
    MembershipRow,
    | "id"
    | "athlete_id"
    | "plan_id"
    | "status"
    | "valid_from"
    | "valid_to"
    | "payment_status"
    | "created_at"
    | "updated_at"
  >;

  const chosen = pickChosenMembershipRow(
    membershipRows as Row[],
    nowMs,
  );
  if (!chosen) {
    return;
  }

  await supabase
    .from("memberships")
    .update({
      payment_status: nextPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chosen.id);
}
