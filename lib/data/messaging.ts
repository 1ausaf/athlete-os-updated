import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MessageSendErrorCode } from "@/lib/ui/messages";
import { messageSendErrorMessage } from "@/lib/ui/messages";
import type { Database } from "@/types/db";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type MessageThreadRow = Database["public"]["Tables"]["message_threads"]["Row"];
type ProfileNameRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name"
>;

export type MessageSummary = {
  senderProfileId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export type ThreadSummary = {
  id: string;
  createdAt: string;
  title: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

export type ThreadDetail = {
  id: string;
  createdAt: string;
  title: string | null;
  messages: MessageSummary[];
};

export async function fetchProfileNamesByIds(
  profileIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(profileIds)].filter(Boolean);
  if (!unique.length) return map;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", unique);

  if (error || !data) return map;

  for (const row of data as ProfileNameRow[]) {
    const name = row.full_name?.trim() || "Unknown";
    map.set(row.id, name);
  }
  for (const id of unique) {
    if (!map.has(id)) map.set(id, "Unknown");
  }
  return map;
}

/** Trims and ellipsizes message bodies for inbox / dashboard previews. */
export function messagePreviewSnippet(body: string, maxLen = 120): string {
  const t = body.trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function mapSendError(raw: string): {
  code: MessageSendErrorCode;
  message: string;
} {
  const lower = raw.toLowerCase();
  if (lower.includes("rule_of_two") || lower.includes("rule-of-two")) {
    return {
      code: "RULE_OF_TWO_VIOLATION",
      message: messageSendErrorMessage("RULE_OF_TWO_VIOLATION"),
    };
  }
  if (
    lower.includes("messages_sender_not_in_thread") ||
    lower.includes("sender must be a participant")
  ) {
    return {
      code: "NOT_THREAD_PARTICIPANT",
      message: messageSendErrorMessage("NOT_THREAD_PARTICIPANT"),
    };
  }
  if (lower.includes("violates row-level security")) {
    return {
      code: "MESSAGE_FORBIDDEN",
      message: messageSendErrorMessage("MESSAGE_FORBIDDEN"),
    };
  }
  const fallback = messageSendErrorMessage("MESSAGE_GENERIC");
  return {
    code: "MESSAGE_GENERIC",
    message: raw?.trim() ? raw : fallback,
  };
}

function mapCreateThreadErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("rule_of_two") || lower.includes("rule-of-two")) {
    return "Rule-of-Two: threads with a minor need at least two adults, and one-to-one adult–minor threads are not allowed. Add another adult (e.g. guardian or second coach).";
  }
  if (lower.includes("no_participants")) {
    return "Add at least one participant.";
  }
  if (lower.includes("not_authenticated")) {
    return "You must be signed in to create a thread.";
  }
  if (lower.includes("thread_participants_uniq") || lower.includes("unique")) {
    return "Duplicate participant in the list.";
  }
  if (lower.includes("violates row-level security")) {
    return "You do not have permission to create this thread.";
  }
  return raw || "Could not create thread.";
}

export async function listThreadsForUser(
  profileId: string,
): Promise<ThreadSummary[]> {
  const supabase = createSupabaseServerClient();

  const { data: myRows, error: myErr } = await supabase
    .from("thread_participants")
    .select("thread_id")
    .eq("profile_id", profileId);

  if (myErr || !myRows?.length) return [];

  const threadIds = [
    ...new Set(
      (myRows as { thread_id: string }[]).map((r) => r.thread_id),
    ),
  ];

  const { data: threadsRaw, error: threadsErr } = await supabase
    .from("message_threads")
    .select("id, created_at, title")
    .in("id", threadIds);

  if (threadsErr || !threadsRaw?.length) return [];

  const threads = threadsRaw as Pick<
    MessageThreadRow,
    "id" | "created_at" | "title"
  >[];

  const { data: othersRaw, error: othersErr } = await supabase
    .from("thread_participants")
    .select("thread_id, profile_id")
    .in("thread_id", threadIds)
    .neq("profile_id", profileId);

  const othersByThread = new Map<string, string[]>();
  if (!othersErr && othersRaw) {
    for (const row of othersRaw as {
      thread_id: string;
      profile_id: string;
    }[]) {
      const list = othersByThread.get(row.thread_id) ?? [];
      list.push(row.profile_id);
      othersByThread.set(row.thread_id, list);
    }
  }

  const otherIds = [...othersByThread.values()].flat();
  const nameMap = await fetchProfileNamesByIds(otherIds);

  const { data: msgsRaw, error: msgsErr } = await supabase
    .from("messages")
    .select("thread_id, body, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false });

  const lastByThread = new Map<
    string,
    { created_at: string; body: string }
  >();
  if (!msgsErr && msgsRaw) {
    for (const m of msgsRaw as Pick<
      MessageRow,
      "thread_id" | "body" | "created_at"
    >[]) {
      if (!lastByThread.has(m.thread_id)) {
        lastByThread.set(m.thread_id, {
          created_at: m.created_at,
          body: m.body,
        });
      }
    }
  }

  const summaries: ThreadSummary[] = threads.map((t) => {
    const otherPids = othersByThread.get(t.id) ?? [];
    let title: string;
    if (otherPids.length === 0) {
      title = t.title?.trim() || "Conversation";
    } else {
      const names = [...new Set(otherPids)]
        .map((id) => nameMap.get(id) ?? "Unknown")
        .sort((a, b) => a.localeCompare(b));
      title = names.join(", ");
    }
    const last = lastByThread.get(t.id);
    return {
      id: t.id,
      createdAt: t.created_at,
      title,
      lastMessageAt: last?.created_at ?? null,
      lastMessagePreview: last ? messagePreviewSnippet(last.body) : null,
    };
  });

  summaries.sort((a, b) => {
    const ta = a.lastMessageAt
      ? new Date(a.lastMessageAt).getTime()
      : new Date(a.createdAt).getTime();
    const tb = b.lastMessageAt
      ? new Date(b.lastMessageAt).getTime()
      : new Date(b.createdAt).getTime();
    return tb - ta;
  });

  return summaries;
}

export async function getThreadWithMessages(
  threadId: string,
  profileId: string,
): Promise<ThreadDetail | null> {
  const supabase = createSupabaseServerClient();

  const { data: part, error: partErr } = await supabase
    .from("thread_participants")
    .select("id")
    .eq("thread_id", threadId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (partErr || !part) return null;

  const { data: threadRaw, error: threadErr } = await supabase
    .from("message_threads")
    .select("id, created_at, title")
    .eq("id", threadId)
    .maybeSingle();

  if (threadErr || !threadRaw) return null;

  const thread = threadRaw as Pick<
    MessageThreadRow,
    "id" | "created_at" | "title"
  >;

  const { data: msgsRaw, error: msgsErr } = await supabase
    .from("messages")
    .select("sender_profile_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (msgsErr || !msgsRaw) {
    return {
      id: thread.id,
      createdAt: thread.created_at,
      title: thread.title,
      messages: [],
    };
  }

  const msgs = msgsRaw as Pick<
    MessageRow,
    "sender_profile_id" | "body" | "created_at"
  >[];

  const senderIds = [...new Set(msgs.map((m) => m.sender_profile_id))];
  const senderNames = await fetchProfileNamesByIds(senderIds);

  const messages: MessageSummary[] = msgs.map((m) => ({
    senderProfileId: m.sender_profile_id,
    senderName: senderNames.get(m.sender_profile_id) ?? "Unknown",
    body: m.body,
    createdAt: m.created_at,
  }));

  return {
    id: thread.id,
    createdAt: thread.created_at,
    title: thread.title,
    messages,
  };
}

export interface CreateThreadWithParticipantsParams {
  /** Must match the signed-in user; used to assert client + include them in participants. */
  creatorProfileId: string;
  participantProfileIds: string[];
  title?: string | null;
}

export async function createThreadWithParticipants(
  params: CreateThreadWithParticipantsParams,
): Promise<{ ok: true; threadId: string } | { ok: false; message: string }> {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== params.creatorProfileId) {
    return { ok: false, message: "You must be signed in as the thread creator." };
  }

  const deduped = [...new Set(params.participantProfileIds.filter(Boolean))];
  if (!deduped.includes(params.creatorProfileId)) {
    deduped.push(params.creatorProfileId);
  }

  // RPC args are valid; Database self-reference can widen `rpc` args to `undefined`.
  const { data, error } = await supabase.rpc(
    "create_message_thread_with_participants",
    // @ts-expect-error -- see create_message_thread_with_participants in types/db
    {
      p_title: params.title ?? null,
      p_participant_profile_ids: deduped,
    },
  );

  if (error) {
    return { ok: false, message: mapCreateThreadErrorMessage(error.message) };
  }

  const threadId = data as string | null;
  if (!threadId) {
    return { ok: false, message: "Thread was not created." };
  }

  return { ok: true, threadId };
}

export interface SendMessageParams {
  threadId: string;
  senderProfileId: string;
  body: string;
}

export type SendMessageResult =
  | { ok: true }
  | { ok: false; code: MessageSendErrorCode; message: string };

export async function sendMessage(
  params: SendMessageParams,
): Promise<SendMessageResult> {
  const trimmed = params.body.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "MESSAGE_EMPTY",
      message: messageSendErrorMessage("MESSAGE_EMPTY"),
    };
  }
  if (trimmed.length > 10_000) {
    return {
      ok: false,
      code: "MESSAGE_BODY_TOO_LONG",
      message: messageSendErrorMessage("MESSAGE_BODY_TOO_LONG"),
    };
  }

  const supabase = createSupabaseServerClient();

  const row: Database["public"]["Tables"]["messages"]["Insert"] = {
    thread_id: params.threadId,
    sender_profile_id: params.senderProfileId,
    body: trimmed,
  };

  const { error } =
    // @ts-expect-error -- insert payload is valid; see messages Insert in types/db
    await supabase.from("messages").insert([row]);

  if (error) {
    return { ok: false, ...mapSendError(error.message ?? "") };
  }

  return { ok: true };
}

/** Staff-visible athletes for composing threads (RLS-aligned roster shape). */
export type MessagingAthleteOption = {
  athleteId: string;
  profileId: string;
  fullName: string;
  dateOfBirth: string | null;
};

export async function listAthletesForStaffMessaging(): Promise<
  MessagingAthleteOption[]
> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("athletes")
    .select("id, profile_id, profiles(full_name, date_of_birth)");

  if (error || !data?.length) return [];

  type Row = {
    id: string;
    profile_id: string;
    profiles:
      | { full_name: string | null; date_of_birth: string | null }
      | { full_name: string | null; date_of_birth: string | null }[]
      | null;
  };

  return (data as Row[]).map((row) => {
    const p = row.profiles;
    const prof = Array.isArray(p) ? p[0] : p;
    return {
      athleteId: row.id,
      profileId: row.profile_id,
      fullName: prof?.full_name?.trim() || "Unknown athlete",
      dateOfBirth: prof?.date_of_birth ?? null,
    };
  });
}
