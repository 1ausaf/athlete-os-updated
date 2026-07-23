import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, MessagesSquare, Plus, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/rbac";
import { athleteById, threads, type Thread } from "@/lib/demo/data";
import {
  assignedStaffIds,
  assignmentsForAthlete,
  COACH_ROLE_LABEL,
} from "@/lib/demo/staff";

import { MessagingInbox, type InboxThread } from "./messaging-inbox";

/**
 * Threads a staffer follows WITHOUT being assigned to the athlete (C20's
 * "Subscribed" tab) — a small hardcoded demo set per staff id.
 */
const SUBSCRIBED: Record<string, readonly string[]> = {
  "coach-ellis": ["thread-broadcast"],
  "owner-jeremy": ["thread-jordan", "thread-broadcast"],
  "admin-victoria": ["thread-broadcast"],
};

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

    const reason: InboxThread["reason"] =
      t.kind === "broadcast"
        ? null
        : assignment
          ? { label: COACH_ROLE_LABEL[assignment.role], tone: "brand" }
          : admin
            ? { label: "Admin", tone: "info" }
            : { label: "View only", tone: "neutral" };

    return {
      thread: t,
      athleteName,
      involved,
      subscribed: SUBSCRIBED[user.id]?.includes(t.id) ?? false,
      reason,
    };
  });

  const unread = threads.reduce((n, t) => n + t.unread, 0);
  const minorThreads = threads.filter((t) => t.involvesMinor).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Messaging"
        title="Messaging"
        description="Threads open automatically from coach assignments — every conversation is visible to staff, and Safe-Sport Rule of Two is enforced on every thread that includes a minor."
        actions={
          admin ? (
            <Button asChild variant="brand" size="sm">
              <Link href={"/staff/messaging/new" as Route}>
                <Plus className="h-4 w-4" />
                New thread
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Active threads"
          value={threads.length}
          icon={MessagesSquare}
          accent
        />
        <StatTile
          label="Unread"
          value={unread}
          icon={ArrowRight}
          hint="messages awaiting a reply"
        />
        <StatTile
          label="Minor threads"
          value={minorThreads}
          icon={ShieldCheck}
          hint="Rule of Two monitored"
        />
      </div>

      <MessagingInbox rows={rows} admin={admin} />
    </div>
  );
}
