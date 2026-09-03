import { NextResponse } from "next/server";

import {
  assertAuthContext,
  AuthzError,
  FORBIDDEN_MESSAGE,
} from "@/lib/authz/guards";
import { createLogger } from "@/lib/log";
import { sendThreadMessageForUser } from "@/lib/server/mutations";
import { apiInvalidJsonMessage } from "@/lib/ui/messages";

type MessagePostBody = { body?: unknown };

const log = createLogger("api/messages");

export async function POST(
  request: Request,
  context: { params: { threadId: string } },
) {
  const threadId = context.params.threadId;
  log.info("POST begin", threadId.slice(0, 8));
  try {
    // Central authz: authenticated context required; thread-participant
    // checks stay downstream (sendMessage + RLS).
    const ctx = await assertAuthContext();

    let parsed: MessagePostBody;
    try {
      parsed = (await request.json()) as MessagePostBody;
    } catch {
      log.warn("invalid_json", threadId.slice(0, 8));
      return NextResponse.json(
        {
          ok: false,
          error: { code: "INVALID_JSON", message: apiInvalidJsonMessage },
        },
        { status: 400 },
      );
    }

    const text = typeof parsed.body === "string" ? parsed.body : "";
    const outcome = await sendThreadMessageForUser(ctx.user, threadId, text);

    if (!outcome.ok) {
      log.warn("send_failed", outcome.code, threadId.slice(0, 8));
      return NextResponse.json(
        { ok: false, error: { code: outcome.code, message: outcome.message } },
        { status: 400 },
      );
    }

    log.info("send_ok", threadId.slice(0, 8));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    // AuthzError maps to a generic client response; details stay server-side.
    if (err instanceof AuthzError) {
      log.warn("authz_denied", err.code, threadId.slice(0, 8));
      return NextResponse.json(
        { ok: false, error: FORBIDDEN_MESSAGE },
        { status: err.code === "unauthenticated" ? 401 : 403 },
      );
    }
    throw err;
  }
}
