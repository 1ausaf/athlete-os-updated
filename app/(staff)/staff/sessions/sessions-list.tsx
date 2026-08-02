"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { CalendarDays, Clipboard, MapPin, Users, X } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { fmtDay, fmtTime, type TrainingSession } from "@/lib/demo/data";
import { staffByName } from "@/lib/demo/staff";
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

function parseDateInput(value: string): number | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

// One template string per mode so the header + every row line up as a table.
const GRID_UPCOMING =
  "md:grid-cols-[1.25rem_6.5rem_8.75rem_minmax(0,1.2fr)_minmax(0,1fr)_2.75rem_3.5rem_auto]";
const GRID_PAST =
  "md:grid-cols-[6.5rem_8.75rem_minmax(0,1.2fr)_minmax(0,1fr)_2.75rem_3.5rem_auto]";

/**
 * R6 (S2–S4): Amelia-style booking admin. Flat table-like rows (Date · Time ·
 * Session · Location · Coach · Booked · Bookings/Briefing) behind a
 * Today / Weekly / Monthly / custom from–to range filter. The multi-select
 * checkboxes + sticky combined-brief bar survive from round 3 — still loved.
 */
export function SessionsList({
  mode,
  sessions,
}: {
  mode: ListMode;
  sessions: TrainingSession[];
}) {
  const [range, setRange] = useState<RangeKey>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const visible = sessions.filter((s) => {
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
          {visible.length} session{visible.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* S4 — table-like rows */}
      <Card className="overflow-hidden">
        <div
          className={cn(
            "hidden border-b border-border bg-surface/50 px-4 py-2 text-[0.66rem] font-semibold uppercase tracking-wider text-muted-foreground md:grid md:items-center md:gap-x-3",
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
            {mode === "upcoming" ? "Booked" : "Attended"}
          </span>
          <span className="text-right">Actions</span>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
            <CalendarDays className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm font-semibold">
              No {mode === "upcoming" ? "upcoming" : "past"} sessions in this
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
                mode={mode}
                gridCols={gridCols}
                selected={selected.has(s.id)}
                onToggle={() => toggle(s.id)}
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
              Open combined brief
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
    </div>
  );
}

/**
 * One session as a table row. Desktop lays the cells on the shared grid;
 * mobile stacks them (the md:contents wrappers dissolve on desktop).
 */
function SessionRow({
  session,
  mode,
  gridCols,
  selected,
  onToggle,
}: {
  session: TrainingSession;
  mode: ListMode;
  gridCols: string;
  selected: boolean;
  onToggle: () => void;
}) {
  // Round 6 (S4): every coach working the session — avatar stack, lead first.
  const coachNames = session.coaches?.length ? session.coaches : [session.coach];
  const coachStaff = coachNames
    .map((n) => staffByName(n))
    .filter((s): s is NonNullable<ReturnType<typeof staffByName>> => Boolean(s));
  const booked = session.roster.length;
  const attended = session.roster.filter((r) => r.state === "completed").length;
  const isFull = booked >= session.capacity;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-4 py-3.5 transition-colors hover:bg-surface/40 md:grid md:items-center md:gap-x-3 md:gap-y-0 md:py-2.5",
        gridCols,
        selected && "bg-brand/[0.04]",
      )}
    >
      {/* Mobile line 1: [checkbox] date · time — dissolves into cells on md */}
      <div className="flex items-center gap-2.5 md:contents">
        {mode === "upcoming" ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Add ${session.title} to the combined brief`}
            className="h-4 w-4 shrink-0 accent-[hsl(var(--brand))]"
          />
        ) : null}
        <span className="tnum text-xs font-medium text-muted-foreground md:text-sm md:font-semibold md:text-foreground">
          {fmtDay(session.startsAt)}
        </span>
        <span className="tnum text-xs text-muted-foreground md:text-sm md:text-foreground">
          {fmtTimeRange(session.startsAt, session.endsAt)}
        </span>
      </div>

      <span className="min-w-0 text-[0.95rem] font-bold leading-snug md:truncate md:text-sm md:font-semibold">
        {session.title}
      </span>

      <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground md:text-[0.8rem]">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{session.location}</span>
      </span>

      {/* Mobile line 4: coach + count + actions */}
      <div className="mt-1 flex items-center gap-2 md:contents">
        <span
          className="flex shrink-0 items-center gap-2 md:justify-self-center"
          title={coachNames.join(" · ")}
        >
          <span className="flex -space-x-1.5">
            {coachStaff.map((c) => (
              <AthleteAvatar
                key={c.id}
                initials={c.initials}
                hue={c.hue}
                size="sm"
                ring
              />
            ))}
          </span>
          <span className="text-xs font-medium md:hidden">
            {coachNames.join(", ")}
          </span>
        </span>

        {mode === "upcoming" ? (
          <Pill
            tone={isFull ? "warning" : "neutral"}
            className="tnum md:justify-self-center"
          >
            {booked}/{session.capacity}
          </Pill>
        ) : (
          <Pill
            tone={attended < booked ? "warning" : "success"}
            className="tnum md:justify-self-center"
          >
            {attended}/{booked}
          </Pill>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0 md:justify-self-end">
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
                Briefing
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
