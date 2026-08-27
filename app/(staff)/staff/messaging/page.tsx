import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/rbac";
import { athleteById, threads, type Thread } from "@/lib/demo/data";
import {
  assignedStaffIds,
  assignmentsForAthlete,
  staffMembers,
} from "@/lib/demo/staff";

import { MessagingInbox, type InboxThread } from "./messaging-inbox";
import { NewAnnouncementButton } from "./new-announcement";

/**
 * Threads a staffer follows WITHOUT being assigned to the athlete (C20's
 * "Subscribed" tab) — a small hardcoded demo set per staff id.
 */
const SUBSCRIBED: Record<string, readonly string[]> = {
  "coach-ellis": ["thread-broadcast"],
  "owner-jeremy": ["thread-jordan", "thread-broadcast"],
  "admin-victoria": ["thread-broadcast"],
};

/**
 * R8 (H4) — the Role column: the VIEWER's relationship to the member the
 * thread is about. Broadcasts and unassigned threads show "—".
 */
const ROLE_COLUMN_LABEL = {
  management: "Management Coach",
  programming: "Programming Coach",
  assistant: "Assistant Coach",
} as const;

/** The athlete a thread is about (broadcasts have none). */
function threadAthleteId(t: Thread): string | null {
  const p = t.participants.find(
    (x) => x.role === "athlete" && athleteById(x.id),
  );
  return p?.id ?? null;
}

export default async function StaffMessagingPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");
  const admin = isAdmin(user);

  // Round 18 (D12): a chat "tags" you when any message body @mentions you —
  // "@First" or "@Full Name", case-insensitive. Names come from the session
  // user plus the staff record; the bare "@coach" token is skipped so a
  // "Coach X" display name can't match every coach's mention.
  const me = staffMembers.find((s) => s.id === user.id);
  const mentionTokens = new Set<string>();
  for (const full of [user.fullName, me?.name]) {
    const t = full?.trim().toLowerCase();
    if (t) mentionTokens.add(`@${t}`);
  }
  const firstName = (me?.firstName ?? user.fullName.split(/\s+/)[0] ?? "")
    .trim()
    .toLowerCase();
  if (firstName && firstName !== "coach") mentionTokens.add(`@${firstName}`);
  const tokens = [...mentionTokens];
  const isTagged = (t: Thread): boolean =>
    t.messages.some((m) => {
      const body = m.body.toLowerCase();
      return tokens.some((tok) => body.includes(tok));
    });

  const rows: InboxThread[] = threads.map((t) => {
    const athleteId = threadAthleteId(t);
    const athleteName = athleteId
      ? (athleteById(athleteId)?.name ?? null)
      : null;
    const assignment = athleteId
      ? assignmentsForAthlete(athleteId).find((a) => a.staffId === user.id)
      : undefined;
    // Broadcasts go to everyone; direct threads follow coach assignments.
    const involved =
      t.kind === "broadcast"
        ? true
        : athleteId
          ? assignedStaffIds(athleteId).has(user.id)
          : false;

    return {
      thread: t,
      athleteName,
      involved,
      subscribed: SUBSCRIBED[user.id]?.includes(t.id) ?? false,
      tagged: isTagged(t),
      roleLabel: assignment ? ROLE_COLUMN_LABEL[assignment.role] : null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Round 13 (S8): one safe-sport line up here — the inbox banner is gone */}
      <PageHeader
        title="Chats"
        description="Group chats are created automatically when you're assigned to a member — no private chats allowed (safe-sport)."
        actions={
          admin ? (
            <>
              <NewAnnouncementButton staffName={user.fullName} />
              <Button asChild variant="brand" size="sm">
                <Link href={"/staff/messaging/new" as Route}>
                  <Plus className="h-4 w-4" />
                  New thread
                </Link>
              </Button>
            </>
          ) : undefined
        }
      />

      <MessagingInbox rows={rows} admin={admin} />
    </div>
  );
}
