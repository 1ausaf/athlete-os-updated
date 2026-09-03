import { NextResponse } from "next/server";

import {
  assertAuthContext,
  AuthzError,
  FORBIDDEN_MESSAGE,
} from "@/lib/authz/guards";
import { createLogger } from "@/lib/log";
import { bookSessionForAthleteUser } from "@/lib/server/mutations";
import { apiInvalidJsonMessage } from "@/lib/ui/messages";

type BookPostBody = { sessionId?: unknown };

const log = createLogger("api/bookings");

export async function POST(request: Request) {
  log.info("POST begin");
  try {
    // Central authz: authenticated context required. The athlete-role and
    // self-only checks stay downstream in bookSessionForAthleteUser.
    const ctx = await assertAuthContext();

    let parsed: BookPostBody;
    try {
      parsed = (await request.json()) as BookPostBody;
    } catch {
      log.warn("invalid_json");
      return NextResponse.json(
        {
          ok: false,
          error: { code: "INVALID_JSON", message: apiInvalidJsonMessage },
        },
        { status: 400 },
      );
    }

    const sessionId =
      typeof parsed.sessionId === "string" ? parsed.sessionId : "";
    const outcome = await bookSessionForAthleteUser(ctx.user, sessionId);

    if (!outcome.ok) {
      const status = outcome.code === "FORBIDDEN" ? 403 : 400;
      log.warn("book_failed", outcome.code, sessionId.slice(0, 8));
      return NextResponse.json(
        { ok: false, error: { code: outcome.code, message: outcome.message } },
        { status },
      );
    }

    log.info("book_ok", sessionId.slice(0, 8));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    // AuthzError maps to a generic client response; details stay server-side.
    if (err instanceof AuthzError) {
      log.warn("authz_denied", err.code);
      return NextResponse.json(
        { ok: false, error: FORBIDDEN_MESSAGE },
        { status: err.code === "unauthenticated" ? 401 : 403 },
      );
    }
    throw err;
  }
}
