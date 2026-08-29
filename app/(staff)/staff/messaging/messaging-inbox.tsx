"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Mail,
  MailOpen,
  MoreVertical,
  Pin,
  PinOff,
  Search,
} from "lucide-react";

import { TabBar } from "@/components/app/tab-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { relTime, type Thread } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

/** Serializable inbox row prepared server-side (assignments + admin flag). */
export interface InboxThread {
  thread: Thread;
  /** Full name of the athlete the thread is about (null for broadcasts). */
  athleteName: string | null;
  /** Assigned to this athlete via a coach assignment (or facility broadcast). */
  involved: boolean;
  /** Follows the thread without being assigned (hardcoded demo set). */
  subscribed: boolean;
  /** Round 18 (D12) — a message body @mentions the viewer. */
  tagged: boolean;
  /** R8 (H4) — the viewer's relationship to the member ("—" when null). */
  roleLabel: string | null;
}

type InboxFilter = "involved" | "subscribed" | "tagged" | "everything";
type SortKey = "name" | "role" | "activity" | "unread";

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: "involved", label: "Involved" },
  { key: "subscribed", label: "Subscribed" },
  // Round 18 (D12) — chats where a message @mentions the signed-in staffer.
  { key: "tagged", label: "Tagged" },
  { key: "everything", label: "All" },
];

/** X1 — pinned chats persist per browser; hard cap of 5 like WhatsApp. */
const PIN_STORAGE_KEY = "lps-staff-messaging-pins";
const MAX_PINS = 5;

/** Round 12 (N17) — read/unread overrides persist too (reception-desk clear
    sticks across visits); the sidebar Chats badge listens for the event. */
const READ_STORAGE_KEY = "lps-staff-messaging-read";
const READ_EVENT = "aos-staff-read-changed";

/** Round 19.1 — the ⋮ menu portals to the body (the table's overflow wrapper
    clips absolute children — with a single visible row, e.g. the Tagged
    filter, the menu never showed at all). Anchor captured at click time. */
interface MenuAnchor {
  id: string;
  top: number;
  bottom: number;
  right: number;
  dropUp: boolean;
}

/** Estimated menu height — flips the menu upward near the viewport bottom. */
const MENU_EST_PX = 96;

/** H2 — rows carry just the member/group name (broadcasts use the subject). */
function displayName(row: InboxThread): string {
  return row.athleteName ?? row.thread.subject;
}

/**
 * R8 (H4): the inbox reads like the Members table now — sortable Name /
 * Role / Last Activity / Unread columns, no avatars (H2), no Rule-of-Two
 * pills (H3 — the admin auto-adds parents). Search, pins and the ⋮ menu
 * survive from earlier rounds.
 */
export function MessagingInbox({
  rows,
  admin,
}: {
  rows: InboxThread[];
  admin: boolean;
}) {
  const router = useRouter();
  // Admins land on Everything (oversight); coaches land on their own threads.
  const [filter, setFilter] = useState<InboxFilter>(
    admin ? "everything" : "involved",
  );
  const [query, setQuery] = useState("");
  // H4 — column sorting; Last Activity (newest first) is the default.
  const [sortKey, setSortKey] = useState<SortKey>("activity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // X1 — local read/unread overrides (id → forced state) + pinned ids.
  const [readOverride, setReadOverride] = useState<
    Record<string, "read" | "unread">
  >({});
  const [readLoaded, setReadLoaded] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [pinsLoaded, setPinsLoaded] = useState(false);
  const [menuFor, setMenuFor] = useState<MenuAnchor | null>(null);
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

  // N17 — read overrides follow the same load/persist pattern as pins…
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(READ_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setReadOverride(parsed as Record<string, "read" | "unread">);
        }
      }
    } catch {
      // Ignore corrupt storage — no overrides.
    }
    setReadLoaded(true);
  }, []);

  // N18 — the thread-view "Subscribe to Chat" checkbox persists per thread;
  // merging it here keeps the Subscribed tab honest.
  const [subsOverride, setSubsOverride] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("aos-thread-subs");
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setSubsOverride(parsed as Record<string, boolean>);
        }
      }
    } catch {
      // Ignore corrupt storage — seed subscriptions stand.
    }
  }, []);

  function isSubscribed(row: InboxThread): boolean {
    return subsOverride[row.thread.id] ?? row.subscribed;
  }

  // …and every change persists + pings the sidebar Chats badge.
  useEffect(() => {
    if (!readLoaded) return;
    try {
      window.localStorage.setItem(
        READ_STORAGE_KEY,
        JSON.stringify(readOverride),
      );
    } catch {
      // Storage unavailable — read state stays session-only.
    }
    window.dispatchEvent(new Event(READ_EVENT));
  }, [readOverride, readLoaded]);

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

  /** N17 — the reception-desk clear: force every chat to read. */
  function markAllRead() {
    const next: Record<string, "read" | "unread"> = {};
    for (const r of rows) next[r.thread.id] = "read";
    setReadOverride(next);
    showFlash("All chats marked as read");
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

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Text columns start ascending; activity + unread start "most first".
      setSortDir(key === "name" || key === "role" ? "asc" : "desc");
    }
  }

  // The open menu's row — the menu itself renders in a body portal below.
  const menuRow = menuFor
    ? (rows.find((r) => r.thread.id === menuFor.id) ?? null)
    : null;

  const counts = useMemo(
    () => ({
      involved: rows.filter((r) => r.involved).length,
      subscribed: rows.filter((r) => isSubscribed(r)).length,
      tagged: rows.filter((r) => r.tagged).length,
      everything: rows.length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, subsOverride],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = rows.filter((r) => {
      if (filter === "involved" && !r.involved) return false;
      if (filter === "subscribed" && !isSubscribed(r)) return false;
      if (filter === "tagged" && !r.tagged) return false;
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

    const unreadCount = (r: InboxThread) => {
      const o = readOverride[r.thread.id];
      if (o === "read") return 0;
      if (o === "unread") return Math.max(1, r.thread.unread);
      return r.thread.unread;
    };

    const compare = (a: InboxThread, b: InboxThread): number => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = displayName(a).localeCompare(displayName(b));
      } else if (sortKey === "role") {
        cmp = (a.roleLabel ?? "—").localeCompare(b.roleLabel ?? "—");
      } else if (sortKey === "unread") {
        cmp = unreadCount(a) - unreadCount(b);
      } else {
        cmp = a.thread.updatedAt.localeCompare(b.thread.updatedAt);
      }
      if (cmp === 0) {
        // Round 13 (S9c): ties break by unread (most first), then newest
        // activity — absolute order, not flipped by the sort direction.
        cmp = unreadCount(b) - unreadCount(a);
        if (cmp === 0) cmp = -a.thread.updatedAt.localeCompare(b.thread.updatedAt);
        return cmp;
      }
      return sortDir === "asc" ? cmp : -cmp;
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
      return compare(a, b);
    });
    return matches;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filter, query, sortKey, sortDir, pinned, readOverride, subsOverride]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs (shared line style, CM2) + chat search */}
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
        {/* Round 13 (S9b): full-width search on phones, capped on sm+ */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="pl-8"
          />
        </div>
        {filter === "everything" ? (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={markAllRead}
          >
            <MailOpen className="h-4 w-4" />
            Mark all as read
          </Button>
        ) : null}
      </div>

      {/* Round 13 (S8): the safe-sport line lives in the page header now */}

      {/* H4 — the chats table. Phones: tighter cells + no Role column, so
          the coaches' main mobile surface fits without sideways scroll. */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
        <Table className="max-sm:table-fixed max-sm:[&_td]:px-2 max-sm:[&_th]:px-2">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <SortableHead
                label="Name"
                sortKey="name"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableHead
                label="Last Activity"
                sortKey="activity"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                className="max-sm:w-[4.75rem]"
              />
              <SortableHead
                label="Unread"
                sortKey="unread"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                className="max-sm:w-14"
              />
              {/* Round 13 (S9a): Role reads last — activity columns first */}
              <SortableHead
                label="Role"
                sortKey="role"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                className="hidden sm:table-cell"
              />
              <TableHead className="w-10 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <InboxRow
                key={row.thread.id}
                row={row}
                unread={unreadOf(row)}
                isPinned={pinned.includes(row.thread.id)}
                menuOpen={menuFor?.id === row.thread.id}
                onOpen={() =>
                  router.push(`/staff/messaging/${row.thread.id}` as Route)
                }
                onToggleMenu={(rect) =>
                  setMenuFor((cur) =>
                    cur?.id === row.thread.id
                      ? null
                      : {
                          id: row.thread.id,
                          top: rect.bottom + 4,
                          bottom: window.innerHeight - rect.top + 4,
                          right: Math.max(window.innerWidth - rect.right, 8),
                          dropUp:
                            rect.bottom + MENU_EST_PX > window.innerHeight,
                        },
                  )
                }
              />
            ))}
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  {filter === "involved" && counts.involved === 0
                    ? "No assigned chats yet — a chat opens automatically when you're assigned to a member."
                    : filter === "subscribed" && counts.subscribed === 0
                      ? "You're not subscribed to any extra chats."
                      : filter === "tagged" && counts.tagged === 0
                        ? "No chats tag you right now."
                        : "No chats match."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {/* The open row's ⋮ menu + its click-away layer — portaled to the body
          so the table's overflow wrapper can't clip it (bit the single-row
          Tagged view before). */}
      {menuFor && menuRow
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close thread menu"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setMenuFor(null)}
              />
              <span
                className="fixed z-30 block w-44 rounded-lg border border-border bg-card p-1 text-left shadow-raised"
                style={
                  menuFor.dropUp
                    ? { right: menuFor.right, bottom: menuFor.bottom }
                    : { right: menuFor.right, top: menuFor.top }
                }
              >
                <button
                  type="button"
                  onClick={() => markRead(menuFor.id, unreadOf(menuRow) > 0)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent"
                >
                  {unreadOf(menuRow) > 0 ? (
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
                  onClick={() => togglePin(menuFor.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent"
                >
                  {pinned.includes(menuFor.id) ? (
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
            </>,
            document.body,
          )
        : null}

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

function SortableHead({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon
          className={cn(
            "h-3 w-3",
            active ? "text-brand-ink" : "text-muted-foreground/60",
          )}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}

function InboxRow({
  row,
  unread,
  isPinned,
  menuOpen,
  onOpen,
  onToggleMenu,
}: {
  row: InboxThread;
  unread: number;
  isPinned: boolean;
  menuOpen: boolean;
  onOpen: () => void;
  /** Receives the trigger's rect so the parent can position the portal. */
  onToggleMenu: (rect: DOMRect) => void;
}) {
  const { thread } = row;
  const lastMessage = thread.messages[thread.messages.length - 1];

  return (
    <TableRow
      onClick={onOpen}
      className="cursor-pointer transition-colors hover:bg-surface/60"
    >
      {/* H2 — just the name (plus pin + unread badge), no avatars/icons */}
      <TableCell>
        <div className="flex items-center gap-2">
          <Link
            href={`/staff/messaging/${thread.id}` as Route}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "truncate font-semibold hover:underline",
              unread > 0 && "text-foreground",
            )}
          >
            {displayName(row)}
          </Link>
          {isPinned ? (
            <Pin
              className="h-3.5 w-3.5 shrink-0 text-brand-ink"
              aria-label="Pinned chat"
            />
          ) : null}
          {/* S9d — phones lean on the Unread column; the pill is sm+ only */}
          {unread > 0 ? (
            <Pill tone="brand" dot className="hidden sm:inline-flex">
              {unread} new
            </Pill>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 max-w-md text-xs text-muted-foreground">
          {lastMessage
            ? `${lastMessage.senderName}: ${lastMessage.body}`
            : "No messages yet"}
        </p>
      </TableCell>
      <TableCell className="tnum whitespace-nowrap text-sm text-muted-foreground">
        {relTime(thread.updatedAt)}
      </TableCell>
      <TableCell className="tnum text-sm">
        {unread > 0 ? (
          <span className="font-semibold text-brand-ink">{unread}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      {/* S9a — Role trails the activity columns (phones: the column hides
          so the inbox fits without sideways scroll) */}
      <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground sm:table-cell">
        {row.roleLabel ?? "—"}
      </TableCell>

      {/* X1 — per-thread ⋮ menu (read state + pinning); clicks must not
          trigger the row navigation. */}
      <TableCell
        className="w-10 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label={`Chat options for ${displayName(row)}`}
          aria-expanded={menuOpen}
          onClick={(e) =>
            onToggleMenu(e.currentTarget.getBoundingClientRect())
          }
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </TableCell>
    </TableRow>
  );
}
