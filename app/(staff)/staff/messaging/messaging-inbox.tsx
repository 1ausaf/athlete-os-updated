"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Megaphone,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Input } from "@/components/ui/input";
import { Pill, type PillTone } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import {
  relTime,
  type Thread,
  type ThreadParticipant,
} from "@/lib/demo/data";

/** Serializable inbox row prepared server-side (assignments + admin flag). */
export interface InboxThread {
  thread: Thread;
  /** Full name of the athlete the thread is about (null for broadcasts). */
  athleteName: string | null;
  /** Assigned to this athlete via a coach assignment (or facility broadcast). */
  involved: boolean;
  /** Follows the thread without being assigned (hardcoded demo set). */
  subscribed: boolean;
  /** WHY the viewer is in the thread — assignment role, Admin, or View only. */
  reason: { label: string; tone: PillTone } | null;
}

type InboxFilter = "involved" | "subscribed" | "everything";

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: "involved", label: "Involved" },
  { key: "subscribed", label: "Subscribed" },
  { key: "everything", label: "Everything" },
];

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

export function MessagingInbox({
  rows,
  admin,
}: {
  rows: InboxThread[];
  admin: boolean;
}) {
  // Admins land on Everything (oversight); coaches land on their own threads.
  const [filter, setFilter] = useState<InboxFilter>(
    admin ? "everything" : "involved",
  );
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => (b.thread.updatedAt > a.thread.updatedAt ? 1 : -1)),
    [rows],
  );

  const counts = useMemo(
    () => ({
      involved: rows.filter((r) => r.involved).length,
      subscribed: rows.filter((r) => r.subscribed).length,
      everything: rows.length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((r) => {
      if (filter === "involved" && !r.involved) return false;
      if (filter === "subscribed" && !r.subscribed) return false;
      if (!q) return true;
      const haystack = [
        r.thread.subject,
        r.athleteName ?? "",
        ...r.thread.participants.map((p) => p.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sorted, filter, query]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs + person search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}{" "}
                <span className="tnum text-xs opacity-60">{counts[key]}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full max-w-xs sm:ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            aria-label="Search threads by person"
            className="pl-8"
          />
        </div>
      </div>

      {!admin ? (
        <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Threads are created automatically when you&rsquo;re assigned to an
          athlete — coaches can&rsquo;t start private chats (Safe-Sport).
        </p>
      ) : null}

      {/* Thread list */}
      <div className="flex flex-col gap-3">
        {visible.map((row) => (
          <ThreadRow key={row.thread.id} row={row} />
        ))}
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {filter === "involved" && counts.involved === 0
              ? "No assigned threads yet — a thread opens automatically when you're assigned to an athlete."
              : filter === "subscribed" && counts.subscribed === 0
                ? "You're not subscribed to any extra threads."
                : "No threads match."}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ThreadRow({ row }: { row: InboxThread }) {
  const { thread, reason } = row;
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
            {reason ? <Pill tone={reason.tone}>{reason.label}</Pill> : null}
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
