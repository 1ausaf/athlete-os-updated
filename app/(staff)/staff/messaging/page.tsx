import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/rbac";
import { athleteById, threads, type Thread } from "@/lib/demo/data";
import { assignedStaffIds, assignmentsForAthlete } from "@/lib/demo/staff";

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
      roleLabel: assignment ? ROLE_COLUMN_LABEL[assignment.role] : null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Team Workspace · Chats"
        title="Chats"
        description="Chats open automatically from coach assignments — every conversation is visible to staff, and the admin auto-adds parents where a second adult belongs."
        actions={
          admin ? (
            <>
              <NewAnnouncementButton />
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
