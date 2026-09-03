import { NextResponse } from "next/server";

import { updateBillingStatusFromEvent } from "@/lib/data/billing";
// eslint-disable-next-line no-restricted-imports -- allowed importer: the stripe_webhook_events idempotency ledger is service-role-only (no user session on webhooks)
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { createLogger } from "@/lib/log";
import { verifyStripeSignature } from "@/lib/security/webhooks";

const log = createLogger("webhooks/stripe");

const STRIPE_SECRET =
  process.env.STRIPE_WEBHOOK_SIGNING_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe webhook entry point. Fail closed in EVERY environment: no secret
 * configured ⇒ 503; missing/invalid signature ⇒ 400. Event-id idempotency
 * via the stripe_webhook_events ledger (service-role only).
 */
export async function POST(request: Request) {
  log.info("POST received");
  if (!STRIPE_SECRET) {
    log.error("webhook_not_configured_missing_secret");
    return NextResponse.json(
      { ok: false, error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  if (!signature || !verifyStripeSignature(rawBody, signature, STRIPE_SECRET)) {
    log.warn("invalid_signature");
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 400 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch (e) {
    log.error("invalid_json", e instanceof Error ? e.message : "parse_error");
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!parsed || typeof parsed !== "object") {
    log.warn("invalid_body_shape");
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const envelope = parsed as Record<string, unknown>;
  const eventType = typeof envelope.type === "string" ? envelope.type : "unknown";
  const data = envelope.data as Record<string, unknown> | undefined;
  const obj = data?.object as Record<string, unknown> | undefined;

  // Idempotency: each Stripe event id is processed exactly once.
  const eventId = typeof envelope.id === "string" ? envelope.id : null;
  if (eventId) {
    try {
      const supabase = createSupabaseServiceRoleClient();
      const { error: ledgerError } = await supabase
        .from("stripe_webhook_events")
        .insert({ id: eventId, type: eventType });
      if (ledgerError?.code === "23505") {
        log.info("duplicate_event_skipped", { eventId });
        return NextResponse.json({ received: true });
      }
      if (ledgerError) {
        log.error("ledger_insert_failed", ledgerError.code ?? "unknown");
        return NextResponse.json(
          { ok: false, error: "Server configuration error" },
          { status: 503 },
        );
      }
    } catch (e) {
      log.error("ledger_unavailable", e instanceof Error ? e.message : "unknown");
      return NextResponse.json(
        { ok: false, error: "Server configuration error" },
        { status: 503 },
      );
    }
  }

  const athleteProfileId =
    extractMetadataString(obj, "athlete_profile_id") ??
    extractMetadataString(obj, "athleteProfileId") ??
    "";

  if (!athleteProfileId) {
    log.info("ack_no_athlete_metadata", { eventType });
    return NextResponse.json({ received: true });
  }

  let status = "unknown";
  if (obj && typeof obj.status === "string") {
    status = obj.status;
  } else if (obj && typeof obj.payment_status === "string") {
    status = obj.payment_status;
  }

  const occurredAt =
    typeof envelope.created === "number"
      ? new Date(envelope.created * 1000).toISOString()
      : new Date().toISOString();

  const normalizedType = normalizeStripeEventType(eventType);
  log.info("normalized", {
    normalizedType,
    status,
    athleteProfileId: athleteProfileId.slice(0, 8),
  });

  try {
    await updateBillingStatusFromEvent({
      athleteProfileId,
      provider: "stripe",
      eventType: normalizedType,
      status,
      occurredAt,
    });
  } catch (e) {
    log.error(
      "billing_update_failed",
      e instanceof Error ? e.message : "unknown_error",
    );
    return NextResponse.json(
      { ok: false, error: "Server configuration error" },
      { status: 503 },
    );
  }

  log.info("processed_ok");
  return NextResponse.json({ received: true });
}

function extractMetadataString(
  obj: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!obj) return undefined;
  const meta = obj.metadata;
  if (!meta || typeof meta !== "object") return undefined;
  const v = (meta as Record<string, unknown>)[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function normalizeStripeEventType(type: string): string {
  switch (type) {
    case "invoice.paid":
      return "invoice_paid";
    case "invoice.payment_failed":
      return "invoice_payment_failed";
    case "customer.subscription.deleted":
      return "subscription_canceled";
    default:
      return type;
  }
}
