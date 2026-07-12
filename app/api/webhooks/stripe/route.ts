import { NextResponse } from "next/server";

import { updateBillingStatusFromEvent } from "@/lib/data/billing";
import { createLogger } from "@/lib/log";

const log = createLogger("webhooks/stripe");

const STRIPE_SECRET =
  process.env.STRIPE_WEBHOOK_SIGNING_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe webhook entry point.
 *
 * TODO: Use `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SIGNING_SECRET)`
 * with the **raw** body string (not re-stringified JSON).
 * TODO: Resolve Stripe `customer` / `subscription` metadata → athlete profile id.
 */
export async function POST(request: Request) {
  log.info("POST received");
  if (!STRIPE_SECRET && process.env.NODE_ENV === "production") {
    log.error("webhook_not_configured_missing_secret");
    return NextResponse.json(
      { ok: false, error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  // TODO: verify signature with Stripe SDK before trusting `rawBody`.

  if (!signature && process.env.NODE_ENV === "production") {
    log.warn("missing_signature");
    return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 400 });
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
