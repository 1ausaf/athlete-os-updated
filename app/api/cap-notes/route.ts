import { NextResponse } from "next/server";

import {
  assertPermission,
  AuthzError,
  FORBIDDEN_MESSAGE,
} from "@/lib/authz/guards";
import { createLogger } from "@/lib/log";
import {
  createStaffCapNoteForUser,
  type CreateStaffCapNoteBody,
} from "@/lib/server/mutations";
import { apiInvalidJsonMessage } from "@/lib/ui/messages";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const log = createLogger("api/cap-notes");

export async function POST(request: Request) {
  log.info("POST begin");
  try {
    // Central authz: CAP notes are staff writing — the athlete:note
    // permission gates the route (isStaff stays downstream as belt+braces).
    const ctx = await assertPermission("athlete:note");

    let parsed: unknown;
    try {
      parsed = await request.json();
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

    if (!isRecord(parsed)) {
      log.warn("body_not_object");
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "CAP_VALIDATION",
            message: "Request body must be a JSON object.",
          },
        },
        { status: 400 },
      );
    }

    const body: CreateStaffCapNoteBody = {
      athleteId: typeof parsed.athleteId === "string" ? parsed.athleteId : "",
      context: typeof parsed.context === "string" ? parsed.context : "",
      action: typeof parsed.action === "string" ? parsed.action : "",
      plan: typeof parsed.plan === "string" ? parsed.plan : "",
    };

    const outcome = await createStaffCapNoteForUser(ctx.user, body);

    if (!outcome.ok) {
      const status = outcome.code === "FORBIDDEN" ? 403 : 400;
      log.warn("create_failed", outcome.code);
      return NextResponse.json(
        { ok: false, error: { code: outcome.code, message: outcome.message } },
        { status },
      );
    }

    log.info("create_ok");
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
