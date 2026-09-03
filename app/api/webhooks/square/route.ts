import { NextResponse } from "next/server";

import { updateBillingStatusFromEvent } from "@/lib/data/billing";
import { createLogger } from "@/lib/log";
import { verifySquareSignature } from "@/lib/security/webhooks";

const log = createLogger("webhooks/square");

/**
 * Square webhook entry point. Fail closed in EVERY environment: no
 * signature key ⇒ 503; missing/invalid HMAC over (notification URL + raw
 * body) ⇒ 400. SQUARE_WEBHOOK_NOTIFICATION_URL must match the URL
 * registered with Square exactly.
 */
export async function POST(request: Request) {
  log.info("POST received");
  const signatureKey =
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? process.env.SQUARE_WEBHOOK_SECRET;
  if (!signatureKey) {
    log.error("webhook_not_configured_missing_secret");
    return NextResponse.json(
      { ok: false, error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature") ?? "";
  const notificationUrl =
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? request.url;

  if (
    !signature ||
    !verifySquareSignature(rawBody, signature, signatureKey, notificationUrl)
  ) {
    log.warn("invalid_signature");
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch (e) {
    log.error("invalid_json", e instanceof Error ? e.message : "parse_error");
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    log.warn("invalid_body_shape");
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  /** TODO: replace with real Square payload mapping (e.g. invoice.payment_made). */
  const athleteProfileId =
    typeof record.athleteProfileId === "string"
      ? record.athleteProfileId
      : typeof (record.metadata as Record<string, unknown> | undefined)
            ?.athlete_profile_id === "string"
        ? ((record.metadata as Record<string, unknown>).athlete_profile_id as string)
        : "";

  if (!athleteProfileId) {
    log.info("ack_no_athlete_mapping");
    /** Acknowledge without DB write until customer → athlete mapping exists. */
    return NextResponse.json({ received: true });
  }

  const eventType =
    typeof record.type === "string"
      ? record.type
      : typeof record.event_type === "string"
        ? (record.event_type as string)
        : "unknown";
  const status =
    typeof record.status === "string" ? (record.status as string) : "unknown";
  const occurredAt =
    typeof record.created_at === "string"
      ? (record.created_at as string)
      : new Date().toISOString();

  const normalizedType = normalizeSquareEventType(eventType);
  log.info("normalized", { normalizedType, status, athleteProfileId: athleteProfileId.slice(0, 8) });

  try {
    await updateBillingStatusFromEvent({
      athleteProfileId,
      provider: "square",
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

function normalizeSquareEventType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("invoice") && t.includes("paid")) return "invoice_paid";
  if (t.includes("invoice") && (t.includes("fail") || t.includes("void"))) {
    return "invoice_payment_failed";
  }
  if (t.includes("subscription") && t.includes("cancel")) {
    return "subscription_canceled";
  }
  return type;
}
