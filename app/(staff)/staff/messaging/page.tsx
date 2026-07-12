import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Megaphone,
  MessagesSquare,
  Plus,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import {
  relTime,
  threads,
  type Thread,
  type ThreadParticipant,
} from "@/lib/demo/data";

/** Deterministic hue from a participant id so avatars stay stable. */
function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function isCompliant(t: Thread): boolean {
  if (!t.involvesMinor) return true;
  const guardian = t.participants.some((p) => p.role === "guardian");
  const secondCoach =
    t.participants.filter((p) => p.role === "coach").length >= 2;
  return guardian || secondCoach;
}

export default async function StaffMessagingPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const sorted = threads
    .slice()
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));

  const unread = threads.reduce((n, t) => n + t.unread, 0);
  const minorThreads = threads.filter((t) => t.involvesMinor).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Messaging"
        title="Messaging"
        description="Threads with athletes and families. Safe-Sport Rule of Two is enforced on every thread that includes a minor."
        actions={
          <Button asChild variant="brand" size="sm">
            <Link href={"/staff/messaging/new" as Route}>
              <Plus className="h-4 w-4" />
              New thread
            </Link>
          </Button>
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

      <div className="flex flex-col gap-3">
        {sorted.map((thread) => (
          <ThreadRow key={thread.id} thread={thread} />
        ))}
      </div>
    </div>
  );
}

function ThreadRow({ thread }: { thread: Thread }) {
  const compliant = isCompliant(thread);
  const lastMessage = thread.messages[thread.messages.length - 1];
  const isBroadcast = thread.kind === "broadcast";

  return (
    <Link
      href={`/staff/messaging/${thread.id}` as Route}
      className="block rounded-xl border border-border bg-card shadow-soft transition-colors hover:border-brand/40"
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <ParticipantStack participants={thread.participants} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{thread.subject}</span>
            {thread.unread > 0 ? (
              <Pill tone="brand" dot>
                {thread.unread} new
              </Pill>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {lastMessage
              ? `${lastMessage.senderName}: ${lastMessage.body}`
              : "No messages yet"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
          <span className="text-xs text-muted-foreground">
            {relTime(thread.updatedAt)}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {isBroadcast ? (
              <Pill tone="info" icon={<Megaphone className="h-3 w-3" />}>
                Broadcast
              </Pill>
            ) : null}
            {thread.involvesMinor ? (
              compliant ? (
                <Pill tone="success" icon={<ShieldCheck className="h-3 w-3" />}>
                  Rule of Two
                </Pill>
              ) : (
                <Pill tone="danger" icon={<ShieldAlert className="h-3 w-3" />}>
                  Second adult required
                </Pill>
              )
            ) : !isBroadcast ? (
              <Pill tone="neutral" icon={<ShieldCheck className="h-3 w-3" />}>
                Adult 1:1
              </Pill>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ParticipantStack({
  participants,
}: {
  participants: ThreadParticipant[];
}) {
  const shown = participants.slice(0, 4);
  const extra = participants.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <AthleteAvatar
            key={p.id}
            initials={initialsFor(p.name)}
            hue={hueFor(p.id)}
            size="sm"
            ring
          />
        ))}
      </div>
      {extra > 0 ? (
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
