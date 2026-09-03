import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook signature verification — no SDKs, standard HMAC schemes, timing-
 * safe comparison, fail closed in EVERY environment (a webhook route that
 * verifies nothing in development is a habit that ships).
 */

function safeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

/**
 * Stripe `Stripe-Signature` scheme: `t=<unix>,v1=<hmacSha256(secret, "t.payload")>`.
 * Multiple v1 entries are possible during secret rotation.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  const parts = new Map<string, string[]>();
  for (const piece of signatureHeader.split(",")) {
    const [k, v] = piece.split("=", 2);
    if (!k || !v) continue;
    const list = parts.get(k.trim()) ?? [];
    list.push(v.trim());
    parts.set(k.trim(), list);
  }

  const t = Number(parts.get("t")?.[0]);
  const candidates = parts.get("v1") ?? [];
  if (!Number.isFinite(t) || candidates.length === 0) return false;

  const age = Math.abs(Date.now() / 1000 - t);
  if (age > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${t}.${rawBody}`, "utf8")
    .digest("hex");

  return candidates.some((c) => safeEqualHex(expected, c));
}

/**
 * Square `x-square-hmacsha256-signature`: base64(hmacSha256(key,
 * notificationUrl + rawBody)).
 */
export function verifySquareSignature(
  rawBody: string,
  signatureHeader: string,
  signatureKey: string,
  notificationUrl: string,
): boolean {
  const expected = createHmac("sha256", signatureKey)
    .update(notificationUrl + rawBody, "utf8")
    .digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHeader, "base64");
  } catch {
    return false;
  }
  return (
    expected.length === provided.length &&
    provided.length > 0 &&
    timingSafeEqual(expected, provided)
  );
}
