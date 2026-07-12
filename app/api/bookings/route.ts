import { NextResponse } from "next/server";

import { loadAppUser } from "@/lib/auth";
import { createLogger } from "@/lib/log";
import { bookSessionForAthleteUser } from "@/lib/server/mutations";
import {
  apiInvalidJsonMessage,
  apiUnauthorizedMessage,
} from "@/lib/ui/messages";

type BookPostBody = { sessionId?: unknown };

const log = createLogger("api/bookings");

export async function POST(request: Request) {
  log.info("POST begin");
  const user = await loadAppUser();
  if (!user) {
    log.warn("unauthorized");
    return NextResponse.json(
      {
        ok: false,
        error: { code: "UNAUTHORIZED", message: apiUnauthorizedMessage },
      },
      { status: 401 },
    );
  }

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
  const outcome = await bookSessionForAthleteUser(user, sessionId);

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
}
