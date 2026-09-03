import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Token-hash verification for email links rendered by our own templates
 * (branded emails build https://{host}/auth/confirm?token_hash=…&type=…).
 * Same open-redirect guard as the callback route.
 */

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes(":")) {
    return null;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));

  const denied = () =>
    NextResponse.redirect(new URL("/auth/sign-in?error=denied", request.url));

  if (!tokenHash || !type || !OTP_TYPES.includes(type)) return denied();

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return denied();

  const fallback = type === "recovery" ? "/auth/update-password" : "/athlete/dashboard";
  return NextResponse.redirect(new URL(next ?? fallback, request.url));
}
