"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clipboard,
  MapPin,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, type PillTone } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { fmtDay, fmtTime, type TrainingSession } from "@/lib/demo/data";
import {
  DEFAULT_SESSION_TYPE_META,
  loadSessionTypes,
  saveSessionTypes,
  sessionTypeMetaFor,
  SESSION_TYPE_TONES,
  SESSION_TYPES_EVENT,
  type SessionTypeMeta,
  type SessionTypeTone,
} from "@/lib/demo/session-types";
import { staffByName, staffMembers } from "@/lib/demo/staff";
import { cn } from "@/lib/utils";

type ListMode = "upcoming" | "past";
type RangeKey = "today" | "weekly" | "monthly" | "custom";

const DAY_MS = 86_400_000;

/** "4:00–5:30 PM" — drop the first meridiem when both ends share it (S4). */
function fmtTimeRange(startIso: string, endIso: string): string {
  const start = fmtTime(startIso);
  const end = fmtTime(endIso);
  const [startClock, startMeridiem] = start.split(" ");
  return startMeridiem === end.split(" ")[1]
    ? `${startClock}–${end}`
    : `${start}–${end}`;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toDateInput(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function toTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function parseDateInput(value: string): number | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

/* ------------------------------------------------------------------ */
/* R8 (B1) — recurring booking creator                                 */
/* ------------------------------------------------------------------ */

type RepeatKey = "weekly" | "biweekly" | "monthly" | "none";

const REPEAT_LABEL: Record<RepeatKey, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  none: "Doesn't repeat",
};

/* Round 11 (A4): session types moved to the shared managed store
 * (@/lib/demo/session-types) — name + COLOR + DESCRIPTION per type. */

/** Tone → solid dot/swatch class (the Pill tone palette, full strength). */
const TONE_DOT: Record<SessionTypeTone, string> = {
  neutral: "bg-muted-foreground/50",
  brand: "bg-brand",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

/** Round 18 (D11): the "Coaches working this booking" chips read A→Z. */
const STAFF_ALPHABETICAL = [...staffMembers].sort((a, b) =>
  a.name.localeCompare(b.name),
);

/** SessionTypeTone → Pill tone ("destructive" is Pill's "danger"). */
const TONE_TO_PILL: Record<SessionTypeTone, PillTone> = {
  neutral: "neutral",
  brand: "brand",
  info: "info",
  success: "success",
  warning: "warning",
  destructive: "danger",
};

interface BookingDraft {
  name: string;
  type: string;
  date: string;
  start: string;
  end: string;
  online: boolean;
  location: string;
  meetingLink: string;
  coaches: string[];
  capacity: number;
  allowWaitlist: boolean;
  repeat: RepeatKey;
}

function emptyDraft(): BookingDraft {
  return {
    name: "",
    type: "Semi-Private",
    date: toDateInput(startOfToday() + DAY_MS),
    start: "16:00",
    end: "17:30",
    online: false,
    location: "",
    meetingLink: "",
    coaches: [],
    capacity: 6,
    allowWaitlist: true,
    repeat: "weekly",
  };
}

/** Series id lives before "::" so edits can find every future occurrence. */
function seriesIdOf(sessionId: string): string {
  return sessionId.split("::")[0]!;
}

function isLocalBooking(sessionId: string): boolean {
  return sessionId.startsWith("local-");
}

/** Materialize the next `count` occurrences of a recurring booking. */
function buildOccurrences(
  draft: BookingDraft,
  seriesId: string,
  count: number,
  startIndex = 0,
): TrainingSession[] {
  const [y, m, d] = draft.date.split("-").map(Number);
  const [sh, sm] = draft.start.split(":").map(Number);
  const [eh, em] = draft.end.split(":").map(Number);
  const rows: TrainingSession[] = [];
  for (let i = 0; i < count; i++) {
    const dayOffset =
      draft.repeat === "weekly" ? 7 * i : draft.repeat === "biweekly" ? 14 * i : 0;
    const monthOffset = draft.repeat === "monthly" ? i : 0;
    const starts = new Date(
      y ?? 2026,
      (m ?? 1) - 1 + monthOffset,
      (d ?? 1) + dayOffset,
      sh ?? 0,
      sm ?? 0,
    );
    const ends = new Date(
      y ?? 2026,
      (m ?? 1) - 1 + monthOffset,
      (d ?? 1) + dayOffset,
      eh ?? 0,
      em ?? 0,
    );
    rows.push({
      id: `${seriesId}::${startIndex + i}`,
      title: draft.name.trim(),
      type: draft.type,
      startsAt: starts.toISOString(),
      endsAt: ends.toISOString(),
      coach: draft.coaches[0] ?? "Coach Ellis",
      coaches: draft.coaches.length > 0 ? [...draft.coaches] : undefined,
      location: draft.online
        ? `Online · ${draft.meetingLink.trim() || "meeting link to follow"}`
        : draft.location.trim() || "Floor A",
      capacity: draft.capacity,
      roster: [],
      waitlist: [],
    });
  }
  return rows;
}

/**
 * R6 (S2–S4): Amelia-style booking admin. Flat table-like rows (Date · Time ·
 * Session · Location · Coach · Capacity · Bookings/Briefings) behind a
 * Today / Weekly / Monthly / custom from–to range filter.
 * R8 (B1): admins create recurring bookings right here — the rows land
 * locally and stay editable ("all future events, or only this one?").
 */
export function SessionsList({
  mode,
  sessions,
  isAdmin = false,
}: {
  mode: ListMode;
  sessions: TrainingSession[];
  isAdmin?: boolean;
}) {
  const [range, setRange] = useState<RangeKey>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // B1 — locally created recurring bookings + their series drafts.
  const [created, setCreated] = useState<TrainingSession[]>([]);
  const [seriesMeta, setSeriesMeta] = useState<Record<string, BookingDraft>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TrainingSession | null>(null);
  const [editScope, setEditScope] = useState<"series" | "one" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number>();

  // A4 — managed type colors: rows re-tint live when the list changes.
  const [types, setTypes] = useState<SessionTypeMeta[]>(
    DEFAULT_SESSION_TYPE_META,
  );

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  useEffect(() => {
    const sync = () => setTypes(loadSessionTypes());
    sync();
    window.addEventListener(SESSION_TYPES_EVENT, sync);
    return () => window.removeEventListener(SESSION_TYPES_EVENT, sync);
  }, []);

  function showFlash(message: string) {
    setFlash(message);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 3200);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function createBooking(draft: BookingDraft) {
    const seriesId = `local-${Date.now()}`;
    const count = draft.repeat === "none" ? 1 : 4;
    setCreated((prev) => [...prev, ...buildOccurrences(draft, seriesId, count)]);
    setSeriesMeta((prev) => ({ ...prev, [seriesId]: draft }));
    setCreateOpen(false);
    // Jump to the monthly window so the new rows are on screen right away.
    setRange("monthly");
    showFlash(
      draft.repeat === "none"
        ? "Booking added. Members get an email confirmation when they book."
        : "Recurring booking added — next 4 occurrences on the schedule. Members get an email confirmation when they book.",
    );
  }

  function saveEdit(draft: BookingDraft) {
    if (!editTarget) return;
    const seriesId = seriesIdOf(editTarget.id);
    if (editScope === "one") {
      // Only this event: rebuild the single occurrence, keep its id.
      const [row] = buildOccurrences({ ...draft, repeat: "none" }, seriesId, 1);
      setCreated((prev) =>
        prev.map((s) => (s.id === editTarget.id ? { ...row!, id: s.id } : s)),
      );
      showFlash("Changes applied to this event only.");
    } else {
      // All future events: drop this + later occurrences, regrow from draft.
      setCreated((prev) => {
        const future = prev.filter(
          (s) =>
            seriesIdOf(s.id) === seriesId && s.startsAt >= editTarget.startsAt,
        );
        const kept = prev.filter((s) => !future.some((f) => f.id === s.id));
        return [
          ...kept,
          ...buildOccurrences(draft, seriesId, Math.max(1, future.length)),
        ];
      });
      setSeriesMeta((prev) => ({ ...prev, [seriesId]: draft }));
      showFlash("Changes applied to all future events in this booking.");
    }
    setEditTarget(null);
    setEditScope(null);
  }

  /** R43 — remove ONE occurrence (holiday); the series stays intact. */
  function deleteOccurrence() {
    if (!editTarget) return;
    setCreated((prev) => prev.filter((s) => s.id !== editTarget.id));
    setEditTarget(null);
    setEditScope(null);
    showFlash("Occurrence deleted — the rest of the series is unchanged.");
  }

  /** Prefill an edit draft from the clicked occurrence + its series meta. */
  function draftFor(session: TrainingSession): BookingDraft {
    const meta = seriesMeta[seriesIdOf(session.id)];
    return {
      name: session.title,
      type: session.type,
      date: toDateInput(new Date(session.startsAt).getTime()),
      start: toTimeInput(session.startsAt),
      end: toTimeInput(session.endsAt),
      online: meta?.online ?? session.location.startsWith("Online"),
      location: meta?.online ? (meta?.location ?? "") : session.location,
      meetingLink: meta?.meetingLink ?? "",
      coaches: session.coaches ?? [session.coach],
      capacity: session.capacity,
      allowWaitlist: meta?.allowWaitlist ?? true,
      repeat: meta?.repeat ?? "weekly",
    };
  }

  // S3 — the visible window. Upcoming looks forward, past looks backward.
  const dayStart = startOfToday();
  let lo = Number.NEGATIVE_INFINITY;
  let hi = Number.POSITIVE_INFINITY;
  if (range === "today") {
    lo = dayStart;
    hi = dayStart + DAY_MS;
  } else if (range === "weekly") {
    if (mode === "upcoming") {
      lo = dayStart;
      hi = dayStart + 7 * DAY_MS;
    } else {
      lo = dayStart - 6 * DAY_MS;
      hi = dayStart + DAY_MS;
    }
  } else if (range === "monthly") {
    if (mode === "upcoming") {
      lo = dayStart;
      hi = dayStart + 31 * DAY_MS;
    } else {
      lo = dayStart - 30 * DAY_MS;
      hi = dayStart + DAY_MS;
    }
  } else {
    const f = parseDateInput(from);
    const t = parseDateInput(to);
    if (f != null) lo = f;
    if (t != null) hi = t + DAY_MS; // inclusive "to" day
  }

  // B1 — locally created bookings merge into the upcoming table.
  const all =
    mode === "upcoming" && created.length > 0
      ? [...sessions, ...created].sort((a, b) =>
          a.startsAt.localeCompare(b.startsAt),
        )
      : sessions;

  const visible = all.filter((s) => {
    const t = new Date(s.startsAt).getTime();
    return t >= lo && t < hi;
  });

  function activateCustom() {
    if (!from || !to) {
      // Seed a sensible window so results appear immediately.
      setFrom(toDateInput(mode === "upcoming" ? dayStart : dayStart - 7 * DAY_MS));
      setTo(toDateInput(mode === "upcoming" ? dayStart + 7 * DAY_MS : dayStart));
    }
    setRange("custom");
  }

  const hint =
    range === "today"
      ? "today"
      : range === "weekly"
        ? mode === "upcoming"
          ? "next 7 days"
          : "last 7 days"
        : range === "monthly"
          ? mode === "upcoming"
            ? "next 31 days"
            : "last 31 days"
          : "custom range";

  const gridCols = mode === "upcoming" ? GRID_UPCOMING : GRID_PAST;

  const briefHref =
    `/staff/sessions/huddle-brief?sessions=${[...selected].join(",")}` as Route;

  return (
    <div className="flex flex-col gap-3">
      {/* S3 — date range selector */}
      <div className="flex flex-wrap items-center gap-2">
        {(["today", "weekly", "monthly"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            aria-pressed={range === key}
            className={cn(
              "h-8 rounded-full border px-3.5 text-xs font-semibold capitalize transition-colors",
              range === key
                ? "border-brand/40 bg-brand/10 text-brand-ink"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={activateCustom}
          aria-pressed={range === "custom"}
          className={cn(
            "h-8 rounded-full border px-3.5 text-xs font-semibold transition-colors",
            range === "custom"
              ? "border-brand/40 bg-brand/10 text-brand-ink"
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          Custom
        </button>
        {range === "custom" ? (
          <span className="flex items-center gap-1.5">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
              className="h-8 rounded-md border border-input bg-surface px-2 text-xs font-medium"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
              className="h-8 rounded-md border border-input bg-surface px-2 text-xs font-medium"
            />
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
        <span className="tnum ml-auto text-xs text-muted-foreground">
          {visible.length} booking{visible.length === 1 ? "" : "s"}
        </span>
        {/* B1 — admin+ only */}
        {isAdmin && mode === "upcoming" ? (
          <Button variant="brand" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Booking
          </Button>
        ) : null}
      </div>

      {/* S4 — table-like rows */}
      <Card className="overflow-hidden">
        <div
          className={cn(
            "hidden border-b border-border bg-surface/50 px-4 py-2 text-[0.66rem] font-semibold uppercase tracking-wider text-muted-foreground xl:grid xl:items-center xl:gap-x-3",
            gridCols,
          )}
        >
          {mode === "upcoming" ? <span aria-hidden /> : null}
          <span>Date</span>
          <span>Time</span>
          <span>Session</span>
          <span>Location</span>
          <span className="text-center">Coach</span>
          <span className="text-center">
            {mode === "upcoming" ? "Capacity" : "Attended"}
          </span>
          <span className="text-right">Actions</span>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
            <CalendarDays className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm font-semibold">
              No {mode === "upcoming" ? "upcoming" : "past"} bookings in this
              range
            </p>
            <p className="text-xs text-muted-foreground">
              Try Weekly, Monthly or a custom from–to range.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                typeMeta={sessionTypeMetaFor(s.type, types)}
                mode={mode}
                gridCols={gridCols}
                selected={selected.has(s.id)}
                onToggle={() => toggle(s.id)}
                onEdit={
                  isAdmin && isLocalBooking(s.id)
                    ? () => {
                        setEditTarget(s);
                        setEditScope(null);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </Card>

      {/* Sticky combined-brief bar — unchanged, still loved */}
      {mode === "upcoming" && selected.size > 0 ? (
        <div className="sticky bottom-4 z-30 flex items-center gap-3 self-center rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-raised backdrop-blur">
          <span className="text-sm font-medium">
            {selected.size} session{selected.size === 1 ? "" : "s"} selected
          </span>
          <Button asChild variant="brand" size="sm">
            <Link href={briefHref}>
              <Clipboard className="h-4 w-4" />
              Combined briefing
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear selection"
            onClick={() => setSelected(new Set())}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {/* B1 — create dialog */}
      {createOpen ? (
        <BookingDialog
          title="Add Booking"
          subtitle="A recurring booking members can book into — repeats indefinitely until you end it."
          initial={emptyDraft()}
          onCancel={() => setCreateOpen(false)}
          onSave={createBooking}
        />
      ) : null}

      {/* B1 — edit: scope question first, then the prefilled form */}
      {editTarget && editScope === null ? (
        <LocalDialog
          title="Edit recurring booking"
          onClose={() => setEditTarget(null)}
        >
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {editTarget.title}
            </span>{" "}
            repeats. Apply changes to all future events, or only this one?
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditScope("one")}>
              Only this event
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={() => setEditScope("series")}
            >
              All future events
            </Button>
          </div>
        </LocalDialog>
      ) : null}
      {editTarget && editScope !== null ? (
        <BookingDialog
          title={
            editScope === "series"
              ? "Edit booking — all future events"
              : "Edit booking — only this event"
          }
          subtitle={fmtDay(editTarget.startsAt)}
          initial={draftFor(editTarget)}
          occurrence={editScope === "one"}
          onDelete={editScope === "one" ? deleteOccurrence : undefined}
          onCancel={() => {
            setEditTarget(null);
            setEditScope(null);
          }}
          onSave={saveEdit}
        />
      ) : null}

      {/* B1 — success flash */}
      {flash ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-lg border border-success/40 bg-card px-3.5 py-2 text-center text-xs font-semibold shadow-raised"
        >
          {flash}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row grid templates. R10 (R31): the table collapses to the stacked    */
/* mobile layout below xl (was md — rows squished at ~1024–1280px next  */
/* to the sidebar), and Session/Location flex + truncate while Actions  */
/* sizes to its buttons so nothing overlaps at any width.               */
/* ------------------------------------------------------------------ */

const GRID_UPCOMING =
  "xl:grid-cols-[1.25rem_6.25rem_8.25rem_minmax(0,1.2fr)_minmax(0,1fr)_5.5rem_4rem_auto]";
const GRID_PAST =
  "xl:grid-cols-[6.25rem_8.25rem_minmax(0,1.2fr)_minmax(0,1fr)_5.5rem_4rem_auto]";

/**
 * One session as a table row. Desktop lays the cells on the shared grid;
 * mobile stacks them (the md:contents wrappers dissolve on desktop).
 */
function SessionRow({
  session,
  typeMeta,
  mode,
  gridCols,
  selected,
  onToggle,
  onEdit,
}: {
  session: TrainingSession;
  /** A4 — managed meta for session.type (tone + description). */
  typeMeta?: SessionTypeMeta;
  mode: ListMode;
  gridCols: string;
  selected: boolean;
  onToggle: () => void;
  /** B1 — locally created bookings stay editable (admin+). */
  onEdit?: () => void;
}) {
  // Round 6 (S4): every coach working the session — avatar stack, lead first.
  const coachNames = session.coaches?.length ? session.coaches : [session.coach];
  const coachStaff = coachNames
    .map((n) => staffByName(n))
    .filter((s): s is NonNullable<ReturnType<typeof staffByName>> => Boolean(s));
  const booked = session.roster.length;
  const attended = session.roster.filter((r) => r.state === "completed").length;
  const isFull = booked >= session.capacity;
  const isOnline = session.location.startsWith("Online");

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-4 py-3.5 transition-colors hover:bg-surface/40 xl:grid xl:items-center xl:gap-x-3 xl:gap-y-0 xl:py-2.5",
        gridCols,
        selected && "bg-brand/[0.04]",
      )}
    >
      {/* Mobile line 1: [checkbox] date · time — dissolves into cells on xl */}
      <div className="flex items-center gap-2.5 xl:contents">
        {mode === "upcoming" ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Add ${session.title} to the combined briefing`}
            className="h-4 w-4 shrink-0 accent-[hsl(var(--brand))]"
          />
        ) : null}
        <span className="tnum text-xs font-medium text-muted-foreground xl:text-sm xl:font-semibold xl:text-foreground">
          {fmtDay(session.startsAt)}
        </span>
        <span className="tnum text-xs text-muted-foreground xl:text-sm xl:text-foreground">
          {fmtTimeRange(session.startsAt, session.endsAt)}
        </span>
      </div>

      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 text-[0.95rem] font-bold leading-snug xl:truncate xl:text-sm xl:font-semibold">
          {session.title}
        </span>
        {/* A4 — the type chip renders in its managed color */}
        <span className="shrink-0" title={typeMeta?.description || undefined}>
          <Pill
            tone={TONE_TO_PILL[typeMeta?.tone ?? "neutral"]}
            className="px-2 py-px text-[0.65rem]"
          >
            {session.type}
          </Pill>
        </span>
      </span>

      <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground xl:text-[0.8rem]">
        {isOnline ? (
          <Video className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <MapPin className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate">{session.location}</span>
      </span>

      {/* Mobile line 4: coach + count + actions */}
      {/* Round 11: flex-wrap keeps the type chip + actions on-screen at 375px */}
      <div className="mt-1 flex flex-wrap items-center gap-2 xl:contents">
        {/* Round 14 (V9): avatars only — staff know each other; each avatar
            carries a title tooltip with the coach's name. */}
        <span className="flex shrink-0 -space-x-1.5 xl:justify-self-center">
          {coachStaff.map((c) => (
            <span key={c.id} title={c.name} className="inline-flex">
              <AthleteAvatar
                initials={c.initials}
                hue={c.hue}
                size="sm"
                ring
              />
            </span>
          ))}
        </span>

        {mode === "upcoming" ? (
          <Pill
            tone={isFull ? "warning" : "neutral"}
            className="tnum xl:justify-self-center"
          >
            {booked}/{session.capacity}
          </Pill>
        ) : (
          <Pill
            tone={attended < booked ? "warning" : "success"}
            className="tnum xl:justify-self-center"
          >
            {attended}/{booked}
          </Pill>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 xl:ml-0 xl:justify-self-end">
          {onEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              aria-label={`Edit ${session.title}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href={`/staff/sessions/${session.id}` as Route}>
              <Users className="h-3.5 w-3.5" />
              Bookings
            </Link>
          </Button>
          {mode === "upcoming" ? (
            <Button asChild variant="outline" size="sm">
              <Link
                href={
                  `/staff/sessions/huddle-brief?sessions=${session.id}` as Route
                }
              >
                <Clipboard className="h-3.5 w-3.5" />
                Briefings
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B1 — dialog chrome + the recurring-booking form                      */
/* ------------------------------------------------------------------ */

function LocalDialog({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm md:py-12"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-raised"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border bg-surface/60 p-4">
          <div>
            <h3 className="text-base font-bold">{title}</h3>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-4 p-4">{children}</div>
      </div>
    </div>
  );
}

function BookingDialog({
  title,
  subtitle,
  initial,
  occurrence = false,
  onDelete,
  onCancel,
  onSave,
}: {
  title: string;
  subtitle?: string;
  initial: BookingDraft;
  /** R43 — editing a single occurrence: rename hint + delete-this-one. */
  occurrence?: boolean;
  /** R43 — removes just this occurrence; the series stays. */
  onDelete?: () => void;
  onCancel: () => void;
  onSave: (draft: BookingDraft) => void;
}) {
  const [draft, setDraft] = useState<BookingDraft>(initial);
  // R43 — two-step confirm before a single occurrence is deleted.
  const [deleteArmed, setDeleteArmed] = useState(false);
  // Round 18 (D10): a DIRTY dialog won't die to a stray backdrop click,
  // Escape or the X — it asks "Discard this booking?" first. A pristine
  // dialog still closes freely.
  const initialRef = useRef(initial);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  function requestClose() {
    if (JSON.stringify(draft) !== JSON.stringify(initialRef.current)) {
      setConfirmDiscard(true);
    } else {
      onCancel();
    }
  }

  function patch(next: Partial<BookingDraft>) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function toggleCoach(name: string) {
    setDraft((prev) => ({
      ...prev,
      coaches: prev.coaches.includes(name)
        ? prev.coaches.filter((c) => c !== name)
        : [...prev.coaches, name],
    }));
  }

  const valid =
    draft.name.trim().length > 0 &&
    draft.date.length > 0 &&
    draft.start.length > 0 &&
    draft.end.length > 0 &&
    (draft.online ? true : draft.location.trim().length > 0);

  return (
    <LocalDialog title={title} subtitle={subtitle} onClose={requestClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Booking name</Label>
          <Input
            value={draft.name}
            placeholder="e.g. Semi-Private — Power"
            onChange={(e) => patch({ name: e.target.value })}
          />
          {occurrence ? (
            <p className="text-[0.7rem] text-muted-foreground">
              Renaming applies to this occurrence only — e.g. &ldquo;Labour Day
              — Holiday Schedule&rdquo;.
            </p>
          ) : null}
        </div>
        {/* R42 — session types are a managed list (add / rename / delete) */}
        <ManagedTypeSelect
          value={draft.type}
          onChange={(type) => patch({ type })}
        />
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input
            type="date"
            value={draft.date}
            aria-label="Booking date"
            onChange={(e) => patch({ date: e.target.value })}
            className="pr-3"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Start time</Label>
          <Input
            type="time"
            value={draft.start}
            aria-label="Start time"
            onChange={(e) => patch({ start: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">End time</Label>
          <Input
            type="time"
            value={draft.end}
            aria-label="End time"
            onChange={(e) => patch({ end: e.target.value })}
          />
        </div>
      </div>

      {/* Location / online */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface/40 p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={draft.online}
            onChange={(e) => patch({ online: e.target.checked })}
            className="h-4 w-4 accent-[hsl(var(--brand))]"
          />
          <Video className="h-4 w-4 text-muted-foreground" aria-hidden />
          Online session
        </label>
        {draft.online ? (
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Meeting link (Google Meet / Zoom)
            </Label>
            <Input
              value={draft.meetingLink}
              placeholder="https://meet.google.com/…"
              onChange={(e) => patch({ meetingLink: e.target.value })}
            />
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Location / address
            </Label>
            <Input
              value={draft.location}
              placeholder="e.g. Floor A · Racks 1–4"
              onChange={(e) => patch({ location: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Coaches multi-select */}
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">
          Coaches working this booking
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {STAFF_ALPHABETICAL.map((s) => {
            const on = draft.coaches.includes(s.name);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCoach(s.name)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors",
                  on
                    ? "border-brand/40 bg-brand/10 text-brand-ink"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                <AthleteAvatar initials={s.initials} hue={s.hue} size="sm" />
                {s.name}
              </button>
            );
          })}
        </div>
        <p className="text-[0.7rem] text-muted-foreground">
          Coach assignments here drive the weekly schedule and each coach&apos;s
          hours tally.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Capacity</Label>
          <Input
            type="number"
            min={1}
            value={draft.capacity}
            aria-label="Capacity"
            onChange={(e) =>
              patch({ capacity: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Repeat</Label>
          <select
            value={draft.repeat}
            onChange={(e) => patch({ repeat: e.target.value as RepeatKey })}
            aria-label="Repeat"
            className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm"
          >
            {(Object.keys(REPEAT_LABEL) as RepeatKey[]).map((k) => (
              <option key={k} value={k}>
                {REPEAT_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={draft.allowWaitlist}
          onChange={(e) => patch({ allowWaitlist: e.target.checked })}
          className="h-4 w-4 accent-[hsl(var(--brand))]"
        />
        Allow waitlist when full
      </label>

      <div className="flex flex-col gap-1 rounded-lg border border-info/30 bg-info/[0.06] px-3 py-2 text-xs text-info">
        <span>Members get an email confirmation when they book.</span>
        {draft.repeat !== "none" ? (
          <span>
            Repeats indefinitely — the schedule always shows the next
            occurrences.
          </span>
        ) : null}
      </div>

      {/* R43 — drop a single occurrence (holiday) without killing the series */}
      {onDelete ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.04] px-3 py-2">
          {deleteArmed ? (
            <>
              <span className="text-xs font-medium text-destructive">
                Delete this session? The rest of the series stays.
              </span>
              <span className="flex items-center gap-1.5">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                >
                  Yes, delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteArmed(false)}
                >
                  Keep
                </Button>
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                Holiday or one-off cancellation? Remove just this date.
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteArmed(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete just this session
              </Button>
            </>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-[0.7rem] text-muted-foreground">
          Saves locally in this demo.
        </span>
        <Button variant="ghost" size="sm" onClick={requestClose}>
          Cancel
        </Button>
        <Button variant="brand" size="sm" disabled={!valid} onClick={() => onSave(draft)}>
          Save booking
        </Button>
      </div>

      {/* D10 — the small discard confirm; Escape lands here too when dirty */}
      {confirmDiscard ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Discard this booking?"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDiscard(false)}
        >
          <div
            className="w-full max-w-xs rounded-xl border border-border bg-card p-4 shadow-raised"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold">Discard this booking?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your changes haven&apos;t been saved.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDiscard(false)}
              >
                Keep editing
              </Button>
              <Button variant="destructive" size="sm" onClick={onCancel}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </LocalDialog>
  );
}

/* ------------------------------------------------------------------ */
/* R42 — Session-type select whose OPTIONS are manageable (add /        */
/* rename / delete) from a gear popover. Round 11 (A4): the options     */
/* are SessionTypeMeta from the shared store — the popover also edits   */
/* each type's COLOR (6 Pill tones) and DESCRIPTION, and the select     */
/* shows a colored dot per option (custom listbox — native <option>     */
/* can't render one).                                                   */
/* ------------------------------------------------------------------ */

function ManagedTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [options, setOptions] = useState<SessionTypeMeta[]>(
    DEFAULT_SESSION_TYPE_META,
  );
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [addDraft, setAddDraft] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  // A4 — which row has its color/description editor expanded.
  const [detailIdx, setDetailIdx] = useState<number | null>(null);

  useEffect(() => {
    setOptions(loadSessionTypes());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveSessionTypes(options);
  }, [options, loaded]);

  // The current value always renders, even if its option was deleted.
  const shown = options.some((o) => o.name === value)
    ? options
    : [
        { name: value, tone: "neutral" as const, description: "" },
        ...options,
      ];
  const selectedTone =
    shown.find((o) => o.name === value)?.tone ?? "neutral";

  function addOption() {
    const v = addDraft.trim();
    setAddDraft("");
    if (!v || options.some((o) => o.name === v)) return;
    setOptions((prev) => [
      ...prev,
      { name: v, tone: "neutral", description: "" },
    ]);
  }

  function commitRename(i: number) {
    const next = editDraft.trim();
    setEditIdx(null);
    if (
      !next ||
      next === options[i]?.name ||
      options.some((o) => o.name === next)
    )
      return;
    const prevName = options[i]?.name;
    setOptions((prev) =>
      prev.map((o, j) => (j === i ? { ...o, name: next } : o)),
    );
    if (value === prevName) onChange(next);
  }

  function patchMeta(i: number, patch: Partial<SessionTypeMeta>) {
    setOptions((prev) =>
      prev.map((o, j) => (j === i ? { ...o, ...patch } : o)),
    );
  }

  return (
    <div className="grid gap-1.5">
      <Label className="flex items-center justify-between text-xs text-muted-foreground">
        Session type
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Manage session-type options"
          title="Manage session types — add, rename, color, description"
          className="rounded p-0.5 transition-colors hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </Label>
      <div className="relative">
        {/* A4 — custom listbox so each option carries its colored dot */}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={pickOpen}
          aria-label="Session type"
          onClick={() => setPickOpen((v) => !v)}
          className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-surface px-2.5 text-sm"
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              TONE_DOT[selectedTone],
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-left">{value}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
        {pickOpen ? (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden
              onClick={() => setPickOpen(false)}
            />
            <ul
              role="listbox"
              aria-label="Session type options"
              className="absolute left-0 top-full z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-raised"
            >
              {shown.map((o) => (
                <li key={o.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.name === value}
                    title={o.description || undefined}
                    onClick={() => {
                      onChange(o.name);
                      setPickOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/40",
                      o.name === value && "font-semibold",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        TONE_DOT[o.tone],
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{o.name}</span>
                    {o.name === value ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {open ? (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-full z-50 mt-1.5 max-h-[26rem] w-72 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-raised">
              <p className="eyebrow px-1.5 pb-1.5">Session types</p>
              <ul className="flex flex-col gap-0.5">
                {options.map((o, i) => (
                  <li
                    key={`${o.name}-${i}`}
                    className="rounded-md transition-colors hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-1 px-1.5 py-1 text-sm">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          TONE_DOT[o.tone],
                        )}
                        aria-hidden
                      />
                      {editIdx === i ? (
                        <input
                          autoFocus
                          value={editDraft}
                          aria-label={`Rename ${o.name}`}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onBlur={() => commitRename(i)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") setEditIdx(null);
                          }}
                          className="h-7 min-w-0 flex-1 rounded border border-input bg-surface px-1.5 text-sm focus:outline-none"
                        />
                      ) : (
                        <>
                          {/* A4 — expand the row's color + description editor */}
                          <button
                            type="button"
                            aria-expanded={detailIdx === i}
                            aria-label={`Edit ${o.name} color and description`}
                            title="Color & description"
                            onClick={() =>
                              setDetailIdx(detailIdx === i ? null : i)
                            }
                            className="flex min-w-0 flex-1 items-center gap-1 text-left"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {o.name}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
                                detailIdx === i && "rotate-180",
                              )}
                            />
                          </button>
                          <button
                            type="button"
                            aria-label={`Rename ${o.name}`}
                            title="Rename"
                            onClick={() => {
                              setEditIdx(i);
                              setEditDraft(o.name);
                            }}
                            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${o.name}`}
                            title="Delete"
                            onClick={() => {
                              setDetailIdx(null);
                              setOptions((prev) =>
                                prev.filter((_, j) => j !== i),
                              );
                            }}
                            className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                    {detailIdx === i ? (
                      <div className="flex flex-col gap-2 px-1.5 pb-2 pl-5">
                        <div className="flex items-center gap-1.5">
                          {SESSION_TYPE_TONES.map(({ tone, label }) => (
                            <button
                              key={tone}
                              type="button"
                              aria-pressed={o.tone === tone}
                              aria-label={`${label} color`}
                              title={label}
                              onClick={() => patchMeta(i, { tone })}
                              className={cn(
                                "h-5 w-5 rounded-full transition-transform hover:scale-110",
                                TONE_DOT[tone],
                                o.tone === tone &&
                                  "ring-2 ring-foreground/60 ring-offset-2 ring-offset-popover",
                              )}
                            />
                          ))}
                        </div>
                        <Textarea
                          rows={2}
                          value={o.description}
                          placeholder="What members see when they pick this type…"
                          aria-label={`${o.name} description`}
                          onChange={(e) =>
                            patchMeta(i, { description: e.target.value })
                          }
                          className="text-xs"
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 flex items-center gap-1.5 border-t border-border/60 pt-1.5">
                <Input
                  value={addDraft}
                  placeholder="Add type…"
                  className="h-7 flex-1 text-xs"
                  onChange={(e) => setAddDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addOption();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={!addDraft.trim()}
                  aria-label="Add session type"
                  onClick={addOption}
                >
                  Add
                </Button>
              </div>
              <p className="px-1.5 pt-1.5 text-[0.65rem] text-muted-foreground">
                Colors show on the schedule and booking chips. Saves locally in
                this demo.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
