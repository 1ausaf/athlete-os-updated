"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Mail,
  MailOpen,
  Megaphone,
  MoreVertical,
  Pin,
  PinOff,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { TabBar } from "@/components/app/tab-bar";
import { Input } from "@/components/ui/input";
import { Pill, type PillTone } from "@/components/ui/pill";
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
type SortMode = "activity" | "unread" | "read";

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: "involved", label: "Involved" },
  { key: "subscribed", label: "Subscribed" },
  { key: "everything", label: "All" },
];

/** X1 — pinned chats persist per browser; hard cap of 5 like WhatsApp. */
const PIN_STORAGE_KEY = "lps-staff-messaging-pins";
const MAX_PINS = 5;

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
  const [sortMode, setSortMode] = useState<SortMode>("activity");
  // X1 — local read/unread overrides (id → forced state) + pinned ids.
  const [readOverride, setReadOverride] = useState<
    Record<string, "read" | "unread">
  >({});
  const [pinned, setPinned] = useState<string[]>([]);
  const [pinsLoaded, setPinsLoaded] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number>();

  // Pins load after mount (avoids SSR/localStorage hydration mismatch)…
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
      if (raw) {
        const ids: unknown = JSON.parse(raw);
        if (Array.isArray(ids)) {
          setPinned(
            ids
              .filter((x): x is string => typeof x === "string")
              .slice(0, MAX_PINS),
          );
        }
      }
    } catch {
      // Ignore corrupt storage — start unpinned.
    }
    setPinsLoaded(true);
  }, []);

  // …and persist on every change once loaded.
  useEffect(() => {
    if (!pinsLoaded) return;
    try {
      window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinned));
    } catch {
      // Storage unavailable (private mode) — pins stay session-only.
    }
  }, [pinned, pinsLoaded]);

  useEffect(
    () => () => window.clearTimeout(flashTimer.current),
    [],
  );

  function showFlash(message: string) {
    setFlash(message);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 2200);
  }

  /** Unread count after any local Mark-as-read / Mark-as-unread override. */
  function unreadOf(row: InboxThread): number {
    const o = readOverride[row.thread.id];
    if (o === "read") return 0;
    if (o === "unread") return Math.max(1, row.thread.unread);
    return row.thread.unread;
  }

  function markRead(id: string, read: boolean) {
    setReadOverride((prev) => ({ ...prev, [id]: read ? "read" : "unread" }));
    setMenuFor(null);
  }

  function togglePin(id: string) {
    setMenuFor(null);
    if (pinned.includes(id)) {
      setPinned(pinned.filter((p) => p !== id));
      return;
    }
    if (pinned.length >= MAX_PINS) {
      showFlash("Max 5 pinned");
      return;
    }
    setPinned([...pinned, id]);
  }

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
    const matches = rows.filter((r) => {
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

    const byActivity = (a: InboxThread, b: InboxThread) =>
      b.thread.updatedAt > a.thread.updatedAt ? 1 : -1;
    const unreadCount = (r: InboxThread) => {
      const o = readOverride[r.thread.id];
      if (o === "read") return 0;
      if (o === "unread") return Math.max(1, r.thread.unread);
      return r.thread.unread;
    };

    matches.sort((a, b) => {
      // X1 — pinned chats float to the top, in the order they were pinned.
      const pa = pinned.indexOf(a.thread.id);
      const pb = pinned.indexOf(b.thread.id);
      if (pa !== -1 || pb !== -1) {
        if (pa === -1) return 1;
        if (pb === -1) return -1;
        return pa - pb;
      }
      // X4 — read/unread grouping, newest-first within each group.
      if (sortMode === "unread") {
        const d = Number(unreadCount(b) > 0) - Number(unreadCount(a) > 0);
        if (d !== 0) return d;
      } else if (sortMode === "read") {
        const d = Number(unreadCount(a) > 0) - Number(unreadCount(b) > 0);
        if (d !== 0) return d;
      }
      return byActivity(a, b);
    });
    return matches;
  }, [rows, filter, query, sortMode, pinned, readOverride]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs (shared line style, CM2) + chat search + sort (X4) */}
      <TabBar
        tabs={FILTERS.map(({ key, label }) => ({
          value: key,
          label,
          count: counts[key],
        }))}
        active={filter}
        onSelect={setFilter}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="pl-8"
          />
        </div>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          aria-label="Sort chats"
          className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm"
        >
          <option value="activity">Last activity</option>
          <option value="unread">Unread first</option>
          <option value="read">Read first</option>
        </select>
      </div>

      {!admin ? (
        <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Threads are created automatically when you&rsquo;re assigned to a
          client — coaches can&rsquo;t start private chats (Safe-Sport).
        </p>
      ) : null}

      {/* Thread list */}
      <div className="flex flex-col gap-3">
        {visible.map((row) => (
          <ThreadRow
            key={row.thread.id}
            row={row}
            unread={unreadOf(row)}
            isPinned={pinned.includes(row.thread.id)}
            menuOpen={menuFor === row.thread.id}
            onToggleMenu={() =>
              setMenuFor((cur) =>
                cur === row.thread.id ? null : row.thread.id,
              )
            }
            onMarkRead={(read) => markRead(row.thread.id, read)}
            onTogglePin={() => togglePin(row.thread.id)}
          />
        ))}
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {filter === "involved" && counts.involved === 0
              ? "No assigned threads yet — a thread opens automatically when you're assigned to a client."
              : filter === "subscribed" && counts.subscribed === 0
                ? "You're not subscribed to any extra threads."
                : "No threads match."}
          </div>
        ) : null}
      </div>

      {/* Click-away layer for the row menus (sits below the open menu). */}
      {menuFor ? (
        <button
          type="button"
          aria-label="Close thread menu"
          className="fixed inset-0 z-20 cursor-default"
          onClick={() => setMenuFor(null)}
        />
      ) : null}

      {/* X1 — tiny flash when the 5-pin cap is hit. */}
      {flash ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-raised"
        >
          {flash}
        </div>
      ) : null}
    </div>
  );
}

function ThreadRow({
  row,
  unread,
  isPinned,
  menuOpen,
  onToggleMenu,
  onMarkRead,
  onTogglePin,
}: {
  row: InboxThread;
  unread: number;
  isPinned: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onMarkRead: (read: boolean) => void;
  onTogglePin: () => void;
}) {
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
            {isPinned ? (
              <Pin
                className="h-3.5 w-3.5 shrink-0 text-brand-ink"
                aria-label="Pinned chat"
              />
            ) : null}
            {unread > 0 ? (
              <Pill tone="brand" dot>
                {unread} new
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

        {/* X1 — per-thread ⋮ menu (read state + pinning), inside the link
            so clicks must not navigate. */}
        <span
          className="relative self-start sm:self-center"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            aria-label={`Thread options for ${thread.subject}`}
            aria-expanded={menuOpen}
            onClick={onToggleMenu}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <span className="absolute right-0 top-full z-30 mt-1 block w-44 rounded-lg border border-border bg-card p-1 shadow-raised">
              <button
                type="button"
                onClick={() => onMarkRead(unread > 0)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent"
              >
                {unread > 0 ? (
                  <>
                    <MailOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    Mark as read
                  </>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Mark as unread
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onTogglePin}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent"
              >
                {isPinned ? (
                  <>
                    <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                    Pin chat
                  </>
                )}
              </button>
            </span>
          ) : null}
        </span>
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
