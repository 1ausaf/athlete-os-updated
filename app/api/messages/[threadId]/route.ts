import { NextResponse } from "next/server";

import { loadAppUser } from "@/lib/auth";
import { createLogger } from "@/lib/log";
import { sendThreadMessageForUser } from "@/lib/server/mutations";
import {
  apiInvalidJsonMessage,
  apiUnauthorizedMessage,
} from "@/lib/ui/messages";

type MessagePostBody = { body?: unknown };

const log = createLogger("api/messages");

export async function POST(
  request: Request,
  context: { params: { threadId: string } },
) {
  const threadId = context.params.threadId;
  log.info("POST begin", threadId.slice(0, 8));
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
  const outcome = await sendThreadMessageForUser(user, threadId, text);

  if (!outcome.ok) {
    log.warn("send_failed", outcome.code, threadId.slice(0, 8));
    return NextResponse.json(
      { ok: false, error: { code: outcome.code, message: outcome.message } },
      { status: 400 },
    );
  }

  log.info("send_ok", threadId.slice(0, 8));
  return NextResponse.json({ ok: true }, { status: 200 });
}
