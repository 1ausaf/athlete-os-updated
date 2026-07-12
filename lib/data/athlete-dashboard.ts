import { getAthleteIdForProfileId } from "@/lib/data/athletes";
import {
  getBillingStatusForAthlete,
  type AthleteBillingView,
} from "@/lib/data/billing";
import { messagePreviewSnippet } from "@/lib/data/messaging";
import { getAthleteProgramSummary, type AthleteProgramSummary } from "@/lib/data/programs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type SessionRow = Pick<
  Database["public"]["Tables"]["sessions"]["Row"],
  "id" | "starts_at" | "ends_at" | "location" | "status"
>;

export type AthleteDashboardUnreadSnippet = {
  threadId: string;
  snippet: string;
  createdAt: string;
};

export type AthleteDashboardUnreadMessages = {
  /**
   * Threads whose latest message is from someone other than the athlete.
   * No read-receipt column exists yet; this proxies "unread" for the dashboard.
   */
  unreadCount: number;
  latestUnread: AthleteDashboardUnreadSnippet[];
};

export type AthleteDashboardUpcomingSession = {
  sessionId: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
};

export type AthleteDashboardData = {
  unreadMessages: AthleteDashboardUnreadMessages;
  upcomingSessions: AthleteDashboardUpcomingSession[];
  currentProgramSummary: AthleteProgramSummary;
  financialStatus: AthleteBillingView;
  /** TODO: wire to PRs / accolades table when schema exists */
  recentPRsOrAccolades: string[];
};

async function loadUnreadMessagesForDashboard(
  athleteProfileId: string,
): Promise<AthleteDashboardUnreadMessages> {
  const supabase = createSupabaseServerClient();

  const { data: myRows, error: myErr } = await supabase
    .from("thread_participants")
    .select("thread_id")
    .eq("profile_id", athleteProfileId);

  if (myErr || !myRows?.length) {
    return { unreadCount: 0, latestUnread: [] };
  }

  const threadIds = [
    ...new Set(
      (myRows as { thread_id: string }[]).map((r) => r.thread_id),
    ),
  ];

  const { data: msgsRaw, error: msgsErr } = await supabase
    .from("messages")
    .select("thread_id, sender_profile_id, body, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false });

  if (msgsErr || !msgsRaw?.length) {
    return { unreadCount: 0, latestUnread: [] };
  }

  const lastByThread = new Map<
    string,
    Pick<MessageRow, "sender_profile_id" | "body" | "created_at">
  >();
  for (const m of msgsRaw as Pick<
    MessageRow,
    "thread_id" | "sender_profile_id" | "body" | "created_at"
  >[]) {
    if (!lastByThread.has(m.thread_id)) {
      lastByThread.set(m.thread_id, {
        sender_profile_id: m.sender_profile_id,
        body: m.body,
        created_at: m.created_at,
      });
    }
  }

  const unread: AthleteDashboardUnreadSnippet[] = [];
  for (const [threadId, last] of lastByThread) {
    if (last.sender_profile_id === athleteProfileId) continue;
    unread.push({
      threadId,
      snippet: messagePreviewSnippet(last.body),
      createdAt: last.created_at,
    });
  }

  unread.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    unreadCount: unread.length,
    latestUnread: unread.slice(0, 3),
  };
}

async function loadUpcomingBookedSessions(
  athleteId: string | null,
  limit = 5,
): Promise<AthleteDashboardUpcomingSession[]> {
  if (!athleteId) return [];

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      session_id,
      sessions!inner (
        id,
        starts_at,
        ends_at,
        location,
        status
      )
    `,
    )
    .eq("athlete_id", athleteId)
    .in("status", ["pending", "confirmed", "waitlisted"]);

  if (error || !data?.length) return [];

  type Row = {
    session_id: string;
    sessions: SessionRow | SessionRow[] | null;
  };

  const out: AthleteDashboardUpcomingSession[] = [];
  for (const row of data as Row[]) {
    const s = row.sessions;
    const session = Array.isArray(s) ? s[0] : s;
    if (!session) continue;
    if (session.status !== "scheduled") continue;
    if (new Date(session.starts_at).getTime() <= new Date(nowIso).getTime()) {
      continue;
    }
    out.push({
      sessionId: session.id,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      location: session.location,
    });
  }

  out.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  return out.slice(0, limit);
}

const EMPTY_PRS: string[] = [];

export async function getAthleteDashboardData(
  athleteProfileId: string,
): Promise<AthleteDashboardData> {
  const athleteId = await getAthleteIdForProfileId(athleteProfileId);

  const [unreadMessages, upcomingSessions, currentProgramSummary, financialStatus] =
    await Promise.all([
      loadUnreadMessagesForDashboard(athleteProfileId),
      loadUpcomingBookedSessions(athleteId),
      getAthleteProgramSummary(athleteProfileId),
      getBillingStatusForAthlete(athleteProfileId),
    ]);

  return {
    unreadMessages,
    upcomingSessions,
    currentProgramSummary,
    financialStatus,
    recentPRsOrAccolades: EMPTY_PRS,
  };
}
