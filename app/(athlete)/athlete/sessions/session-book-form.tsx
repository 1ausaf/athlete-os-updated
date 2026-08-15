"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  Info,
  ListChecks,
  Lock,
  Repeat2,
  RotateCcw,
  ShieldCheck,
  Undo2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { Progress } from "@/components/app/progress";
import { TabBar } from "@/components/app/tab-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill, type PillTone } from "@/components/ui/pill";
import {
  SESSION_TYPE_INFO,
  type BookableSlot,
  type MyBooking,
  type PastBooking,
} from "@/lib/demo/training";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Formatting + week math                                              */
/* ------------------------------------------------------------------ */

const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
const WEEK_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const fmtDay = (iso: string) => DAY_FMT.format(new Date(iso));
const fmtTime = (iso: string) => TIME_FMT.format(new Date(iso));
const fmtRange = (a: string, b: string) => `${fmtTime(a)}–${fmtTime(b)}`;

/** Round 7 (R7-10): the Past Sessions range filter — 30 days is the default. */
type PastRange = "30d" | "3m" | "1y" | "all";
const PAST_RANGES: { key: PastRange; label: string; days: number | null }[] = [
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "3m", label: "Last 3 months", days: 92 },
  { key: "1y", label: "Last year", days: 365 },
  { key: "all", label: "All", days: null },
];

const WEEK_MS = 7 * 86_400_000;

/** Round 10 (R10): plans cap bookings per 4-week BILLING CYCLE, not per week. */
const CYCLE_WEEKS = 4;
const CYCLE_MS = CYCLE_WEEKS * WEEK_MS;

/** Monday-anchored start-of-week timestamp — the grouping key. */
function weekStartMs(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
const weekOf = (iso: string) => weekStartMs(new Date(iso));

/** Which 4-week billing cycle a date falls in: 0 = current, 1 = next… (<0 = past). */
const cycleIndex = (iso: string, anchorWeekMs: number) =>
  Math.floor((weekOf(iso) - anchorWeekMs) / CYCLE_MS);

const labelTone: Record<BookableSlot["label"], PillTone> = {
  Coaching: "neutral",
  "Master Coaching": "brand",
  "Weightlifting Team": "info",
};

/** Session types you can't just book — requirements gate entry (demo: informational only). */
const RESTRICTED_TYPES = new Set<BookableSlot["label"]>([
  "Master Coaching",
  "Weightlifting Team",
]);

interface WeekGroup {
  key: number;
  label: string;
  slots: BookableSlot[];
  open: number;
  full: number;
}

interface Flash {
  tone: "success" | "neutral";
  text: string;
  /** Present after a cancel — offers one-tap restore. */
  undoBooking?: MyBooking;
}

const byStart = (a: MyBooking, b: MyBooking) =>
  a.startsAt.localeCompare(b.startsAt);

/* ------------------------------------------------------------------ */
/* Main client component                                               */
/* ------------------------------------------------------------------ */

type SessionsTab = "book" | "booked" | "past";

/** Round 5 (A10): "book this pattern for the next N weeks" options. */
// Round 7: "instead of these increments, it'll be two, three, four, five,
// six, seven, eight."
const REPEAT_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;

export function SessionBooking({
  slots,
  initialBookings,
  pastSessions,
  frequencyPerWeek,
  bookedThisWeek,
  frequencyLabel,
  planName,
  overdue,
  lockedTypes = [],
  isParentView = false,
  bookKids = [],
  activeKidId,
}: {
  /** 12 weeks of bookable times from the real weekly schedule. */
  slots: BookableSlot[];
  /** Already-booked upcoming sessions. */
  initialBookings: MyBooking[];
  /** Attended / no-show history — the "Past sessions" tab (round 5, A9). */
  pastSessions: PastBooking[];
  frequencyPerWeek: number;
  bookedThisWeek: number;
  /** e.g. "3×/week" */
  frequencyLabel: string;
  /** Round 8 (M23): the plan line lives in the cadence card now. */
  planName?: string;
  /** Billing past due — booking paused (FR-11). */
  overdue: boolean;
  /** Session types THIS athlete can't book until staff grant access (A12). */
  lockedTypes?: string[];
  /** Round 8 (P4): a parent is booking — multi-kid checkboxes appear. */
  isParentView?: boolean;
  /** The parent's kids — pick which ones a booking applies to (P4). */
  bookKids?: { id: string; name: string }[];
  /** The currently managed child — ticked by default (P4). */
  activeKidId?: string;
}) {
  const thisWeekKey = weekStartMs(new Date());
  const lockedSet = useMemo(() => new Set(lockedTypes), [lockedTypes]);
  /** Round 8 (P4): parents with 2+ kids choose who each booking is for. */
  const multiKid = isParentView && bookKids.length >= 2;
  const [bookFor, setBookFor] = useState<ReadonlySet<string>>(
    () => new Set(activeKidId ? [activeKidId] : []),
  );

  function toggleKid(id: string) {
    setBookFor((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const groups = useMemo<WeekGroup[]>(() => {
    const map = new Map<number, BookableSlot[]>();
    for (const s of slots) {
      const k = weekOf(s.startsAt);
      const arr = map.get(k);
      if (arr) arr.push(s);
      else map.set(k, [s]);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([key, weekSlots]) => ({
        key,
        label:
          key === thisWeekKey
            ? "This week"
            : key === thisWeekKey + WEEK_MS
              ? "Next week"
              : `Week of ${WEEK_FMT.format(new Date(key))}`,
        slots: weekSlots,
        open: weekSlots.filter((s) => s.spotsLeft > 0).length,
        full: weekSlots.filter((s) => s.spotsLeft === 0).length,
      }));
  }, [slots, thisWeekKey]);

  /* ---- state: `bookings` is the single source of truth ---- */
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<MyBooking[]>(() =>
    [...initialBookings].sort(byStart),
  );
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [openWeeks, setOpenWeeks] = useState<ReadonlySet<number>>(
    () => new Set(groups.slice(0, 2).map((g) => g.key)),
  );
  const [flash, setFlash] = useState<Flash | null>(null);
  const [rescheduling, setRescheduling] = useState<MyBooking | null>(null);
  /** The three-tab layout: Book / Booked / Past — URL-backed (R7-3). */
  const [tab, setTab] = useState<SessionsTab>(() => {
    const t = searchParams.get("tab");
    return t === "booked" || t === "past" ? t : "book";
  });
  /** 1 = just the ticked slots; N = repeat the pattern for N weeks (A10). */
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  /** Round 7 (R7-10): past-history range — 30 days default, like analytics. */
  const [pastRange, setPastRange] = useState<PastRange>("30d");
  const visiblePast = useMemo(() => {
    const days = PAST_RANGES.find((r) => r.key === pastRange)?.days ?? null;
    if (days == null) return pastSessions;
    const cutoff = Date.now() - days * 86_400_000;
    return pastSessions.filter((p) => new Date(p.startsAt).getTime() >= cutoff);
  }, [pastSessions, pastRange]);

  function selectTab(t: SessionsTab) {
    setTab(t);
    // Round 7 bug fix (f_017): the sticky "N selected · Book" bar floated
    // over the other tabs — leaving Book clears the selection.
    if (t !== "book") setSelected(new Set());
    router.replace(
      (t === "book"
        ? "/athlete/sessions"
        : `/athlete/sessions?tab=${t}`) as Route,
      { scroll: false },
    );
  }

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const availableRef = useRef<HTMLDivElement | null>(null);
  const weekRefs = useRef(new Map<number, HTMLDivElement>());

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  function showFlash(next: Flash) {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(next);
    flashTimer.current = setTimeout(() => setFlash(null), 8000);
  }

  /* ---- derived booking state ---- */
  const bookedStarts = useMemo(
    () =>
      new Set(
        bookings.filter((b) => b.status === "confirmed").map((b) => b.startsAt),
      ),
    [bookings],
  );
  const waitlistStarts = useMemo(
    () =>
      new Set(
        bookings
          .filter((b) => b.status === "waitlisted")
          .map((b) => b.startsAt),
      ),
    [bookings],
  );

  /**
   * Round 10 (R10): the strict per-week cap became a BILLING-CYCLE cap —
   * a 4-week cycle allows frequencyPerWeek × 4 bookings total, so a missed
   * week can be made up later in the SAME cycle (weekly overage is fine).
   * Each future 4-week window carries its own cap.
   */
  const cycleCap = Math.max(1, frequencyPerWeek * CYCLE_WEEKS);

  // Sessions already used earlier this week (attended, no longer upcoming) —
  // the seeded weekly count minus the seeded upcoming bookings this week.
  const usedEarlierThisWeek = useMemo(() => {
    const upcomingThisWeek = initialBookings.filter(
      (b) => b.status === "confirmed" && weekOf(b.startsAt) === thisWeekKey,
    ).length;
    return Math.max(0, bookedThisWeek - upcomingThisWeek);
  }, [initialBookings, bookedThisWeek, thisWeekKey]);

  /** Confirmed bookings per cycle (cycle 0 includes already-used sessions). */
  const cycleBooked = useMemo(() => {
    const map = new Map<number, number>();
    map.set(0, usedEarlierThisWeek);
    for (const b of bookings) {
      if (b.status !== "confirmed") continue;
      const c = cycleIndex(b.startsAt, thisWeekKey);
      if (c < 0) continue;
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return map;
  }, [bookings, usedEarlierThisWeek, thisWeekKey]);

  const selectedSlots = useMemo(
    () => slots.filter((s) => selected.has(s.id)),
    [slots, selected],
  );
  const selectedThisWeek = selectedSlots.filter(
    (s) => weekOf(s.startsAt) === thisWeekKey,
  ).length;
  const selectedByCycle = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of selectedSlots) {
      const c = cycleIndex(s.startsAt, thisWeekKey);
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return map;
  }, [selectedSlots, thisWeekKey]);

  /** Booked + selected inside one 4-week cycle — the number the cap gates. */
  const cycleTotalWith = (c: number) =>
    (cycleBooked.get(c) ?? 0) + (selectedByCycle.get(c) ?? 0);

  const currentCycleBooked = cycleBooked.get(0) ?? 0;
  const cycleFull = currentCycleBooked >= cycleCap;
  const remainingThisCycle = Math.max(0, cycleCap - currentCycleBooked);
  const cyclePct = Math.round(
    (Math.min(currentCycleBooked, cycleCap) / cycleCap) * 100,
  );

  /* ---- actions (optimistic, local-only) ---- */

  function toggleSlot(slot: BookableSlot) {
    if (overdue) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slot.id)) {
        next.delete(slot.id);
        return next;
      }
      // Billing-cycle guardrail (R10): block only when this slot's 4-week
      // cycle would exceed frequency × 4 — weekly make-up overage is fine.
      const c = cycleIndex(slot.startsAt, thisWeekKey);
      if (c >= 0 && cycleTotalWith(c) >= cycleCap) return prev;
      next.add(slot.id);
      return next;
    });
  }

  /**
   * Round 5 (A10): the same weekday/time pattern, k weeks later. Prefer the
   * real generated slot (so it reads "Booked" in the available list); fall
   * back to a shifted time if that week isn't in the 12-week window.
   */
  function repeatTimesFor(
    orig: BookableSlot,
    k: number,
  ): { startsAt: string; endsAt: string } {
    const targetStart = new Date(
      new Date(orig.startsAt).getTime() + k * WEEK_MS,
    );
    const match = slots.find((s) => {
      if (s.label !== orig.label) return false;
      const d = new Date(s.startsAt);
      return (
        weekOf(s.startsAt) === weekStartMs(targetStart) &&
        d.getDay() === targetStart.getDay() &&
        d.getHours() === targetStart.getHours() &&
        d.getMinutes() === targetStart.getMinutes()
      );
    });
    if (match) return { startsAt: match.startsAt, endsAt: match.endsAt };
    return {
      startsAt: targetStart.toISOString(),
      endsAt: new Date(
        new Date(orig.endsAt).getTime() + k * WEEK_MS,
      ).toISOString(),
    };
  }

  function bookSelected() {
    if (overdue || selectedSlots.length === 0) return;
    // P4: a parent must tick at least one kid to book for.
    if (multiKid && bookFor.size === 0) return;
    const tickedKids = multiKid
      ? bookKids.filter((k) => bookFor.has(k.id))
      : [];
    const forNames =
      tickedKids.length > 0
        ? ` for ${tickedKids.map((k) => k.name.split(" ")[0]).join(" + ")}`
        : "";
    const releasing = rescheduling;
    const newBookings: MyBooking[] = [];
    const takenStarts = new Set(bookedStarts);
    // R10: repeats respect the 4-week cycle caps too — a repeated pattern
    // never books past frequency × 4 in any cycle.
    const cycleCounts = new Map(cycleBooked);
    let skippedByCap = 0;
    for (const s of selectedSlots) {
      for (let k = 0; k < Math.max(1, repeatWeeks); k++) {
        const times = k === 0 ? { startsAt: s.startsAt, endsAt: s.endsAt } : repeatTimesFor(s, k);
        if (takenStarts.has(times.startsAt)) continue;
        const c = cycleIndex(times.startsAt, thisWeekKey);
        if (c >= 0) {
          const cur = cycleCounts.get(c) ?? 0;
          if (cur >= cycleCap) {
            skippedByCap += 1;
            continue;
          }
          cycleCounts.set(c, cur + 1);
        }
        takenStarts.add(times.startsAt);
        newBookings.push({
          id: `bk-${s.id}-w${k}`,
          startsAt: times.startsAt,
          endsAt: times.endsAt,
          label: s.label,
          status: "confirmed",
        });
      }
    }
    // P4: the visible list is the managed child's calendar — update it only
    // when that child is among the ticked kids.
    if (!multiKid || (activeKidId && bookFor.has(activeKidId))) {
      setBookings((prev) =>
        [...prev.filter((b) => b.id !== releasing?.id), ...newBookings].sort(
          byStart,
        ),
      );
    }
    const patternSize = selectedSlots.length;
    const weeks = Math.max(1, repeatWeeks);
    setSelected(new Set());
    setRescheduling(null);
    setRepeatWeeks(1);
    const n = newBookings.length;
    const capNote =
      skippedByCap > 0
        ? ` ${skippedByCap} ${skippedByCap === 1 ? "time was" : "times were"} skipped — 4-week cycle cap.`
        : "";
    showFlash({
      tone: "success",
      text:
        (releasing
          ? `Rescheduled — ${n} new ${n === 1 ? "time" : "times"} booked${forNames} and ${fmtDay(releasing.startsAt)} · ${fmtTime(releasing.startsAt)} released.`
          : weeks > 1
            ? `Booked ${patternSize} ${patternSize === 1 ? "session" : "sessions"} × ${weeks} weeks (${n} total)${forNames} — see them in My Bookings.`
            : `Booked ${n} ${n === 1 ? "session" : "sessions"}${forNames} — see them in My Bookings.`) +
        capNote,
    });
  }

  function joinWaitlist(slot: BookableSlot) {
    if (overdue || waitlistStarts.has(slot.startsAt)) return;
    setBookings((prev) =>
      [
        ...prev,
        {
          id: `wl-${slot.id}`,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          label: slot.label,
          status: "waitlisted" as const,
        },
      ].sort(byStart),
    );
    showFlash({
      tone: "success",
      text: `You're on the waitlist for ${fmtDay(slot.startsAt)} · ${fmtTime(slot.startsAt)} — we'll bump you in when a spot opens.`,
    });
  }

  function cancelBooking(b: MyBooking) {
    setBookings((prev) => prev.filter((x) => x.id !== b.id));
    if (rescheduling?.id === b.id) setRescheduling(null);
    showFlash({
      tone: "neutral",
      text: `${b.status === "waitlisted" ? "Left the waitlist for" : "Cancelled"} ${fmtDay(b.startsAt)} · ${fmtTime(b.startsAt)}.`,
      undoBooking: b,
    });
  }

  function undoCancel() {
    const b = flash?.undoBooking;
    if (!b) return;
    setBookings((prev) => [...prev, b].sort(byStart));
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(null);
  }

  function startReschedule(b: MyBooking) {
    setRescheduling(b);
    // The available-times list lives in the Book tab.
    setTab("book");
    requestAnimationFrame(() =>
      availableRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }),
    );
  }

  function jumpToWeek(key: number) {
    setOpenWeeks((prev) =>
      prev.has(key) ? prev : new Set([...prev, key]),
    );
    requestAnimationFrame(() =>
      weekRefs.current
        .get(key)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function toggleWeek(key: number) {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /* ---- render ---- */

  return (
    <div className="flex flex-col gap-6">
      {/* Overdue-billing booking block (FR-11) */}
      {overdue ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Booking paused — balance past due
              </p>
              <p className="text-xs text-muted-foreground text-pretty">
                Clear your overdue balance to resume booking. Sessions you
                already booked stay on the schedule.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={"/athlete/billing" as Route}>Go to Billing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Three tabs — round 8 (M21): Booked → My Bookings, Past Sessions →
          Booking History. URL ?tab= values stay book/booked/past. */}
      <TabBar<SessionsTab>
        tabs={[
          { value: "book", label: "Book Sessions" },
          { value: "booked", label: "My Bookings", count: bookings.length },
          {
            value: "past",
            label: "Booking History",
            count: pastSessions.length,
          },
        ]}
        active={tab}
        onSelect={selectTab}
      />

      {tab === "book" ? (
      <>
      {/* Billing-cycle meter — round 10 (R10): the cap is per 4-WEEK CYCLE
          (frequency × 4), so a missed week can be made up inside the cycle.
          The plan line still lives here instead of the page header (M23). */}
      <Card className="bg-brand-sheen">
        <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-brand-ink" aria-hidden />
              <span className="eyebrow">Billing cycle</span>
            </div>
            {planName ? (
              <span className="text-xs text-muted-foreground">
                {planName} · {frequencyLabel}
              </span>
            ) : null}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Booked this 4-week cycle</span>
              <span className="tnum font-semibold text-foreground">
                {currentCycleBooked} of {cycleCap}
              </span>
            </div>
            <Progress value={cyclePct} tone={cycleFull ? "success" : "brand"} />
          </div>
          <p className="text-xs text-muted-foreground text-pretty">
            {overdue
              ? "Booking is paused while your balance is past due — clear it from Billing to resume."
              : cycleFull
                ? `You've used all ${cycleCap} sessions in this 4-week cycle — the next cycle is always open to book ahead.`
                : `Your ${planName ?? `${frequencyLabel} plan`} allows ${cycleCap} sessions per 4-week cycle — missed weeks can be made up within the cycle. ${remainingThisCycle} left in this one.`}
          </p>
        </CardContent>
      </Card>

      </>
      ) : null}

      {/* My Booked Sessions — cancel / reschedule (My Bookings tab) */}
      {tab === "booked" ? (
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg">My Booked Sessions</h2>
          <Pill tone="neutral">{bookings.length}</Pill>
        </div>
        {bookings.length === 0 ? (
          <Empty>
            Nothing booked yet — flip to the Book Sessions tab, check the
            times you want and book them all at once.
          </Empty>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {bookings.map((b) => {
                const d = new Date(b.startsAt);
                const isRescheduling = rescheduling?.id === b.id;
                return (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center gap-3 p-3 sm:px-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-center">
                      <span className="text-[0.6rem] uppercase text-muted-foreground">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="tnum text-sm font-bold leading-none">
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {b.label}
                        <Pill
                          tone={b.status === "confirmed" ? "success" : "info"}
                        >
                          {b.status === "confirmed" ? "Confirmed" : "Waitlisted"}
                        </Pill>
                      </div>
                      <div className="tnum text-xs text-muted-foreground">
                        {fmtDay(b.startsAt)} · {fmtRange(b.startsAt, b.endsAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isRescheduling ? (
                        <Pill tone="warning">Picking new time…</Pill>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={overdue}
                          onClick={() => startReschedule(b)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                          Reschedule
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => cancelBooking(b)}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Cancel
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
      ) : null}

      {/* Booking History — attendance history w/ range filter (R7-10) */}
      {tab === "past" ? (
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg">My Booking History</h2>
          {/* Like analytics: 30 days default, longer ranges a tap away */}
          <div className="ml-auto flex items-center rounded-lg border border-border bg-surface p-0.5">
            {PAST_RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={pastRange === r.key}
                onClick={() => setPastRange(r.key)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  pastRange === r.key
                    ? "bg-brand text-brand-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <p className="tnum text-sm text-muted-foreground">
          {visiblePast.length}{" "}
          {visiblePast.length === 1 ? "session" : "sessions"} ·{" "}
          {visiblePast.filter((p) => p.attended).length} attended
          {visiblePast.some((p) => !p.attended)
            ? ` · ${visiblePast.filter((p) => !p.attended).length} no-show`
            : ""}
        </p>
        {/* M27: attendance defaults to Attended — no-shows are the exception */}
        <p className="text-xs text-muted-foreground text-pretty">
          Every session counts as attended unless your coach marks it a
          no-show — attendance is marked by your coach.
        </p>
        {visiblePast.length === 0 ? (
          <Empty>
            Nothing in this range — try a longer one, your history builds here.
          </Empty>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {visiblePast.map((p) => {
                const d = new Date(p.startsAt);
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 p-3 sm:px-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-center">
                      <span className="text-[0.6rem] uppercase text-muted-foreground">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="tnum text-sm font-bold leading-none">
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {p.label}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className="tnum">
                          {fmtDay(p.startsAt)} · {fmtRange(p.startsAt, p.endsAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3 w-3" aria-hidden />
                          {p.coach}
                        </span>
                      </div>
                    </div>
                    {p.attended ? (
                      <Pill tone="success" icon={<Check className="h-3 w-3" />}>
                        Attended
                      </Pill>
                    ) : (
                      <Pill tone="danger">No-show</Pill>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
      ) : null}

      {/* Available times — the check-check-check list (Book tab) */}
      {tab === "book" ? (
      <section
        ref={availableRef}
        className="flex scroll-mt-24 flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg">Available times</h2>
            <Pill tone="neutral">next {groups.length} weeks</Pill>
          </div>
          <p className="text-sm text-muted-foreground text-pretty">
            Check every session you want — across any week — then book them
            all at once from the bar below.
          </p>
        </div>

        {/* Calendar affordance: week-jump strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-slim">
          <CalendarDays
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => jumpToWeek(g.key)}
              className="shrink-0 rounded-full border border-border bg-surface/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {g.key === thisWeekKey
                ? "This week"
                : g.key === thisWeekKey + WEEK_MS
                  ? "Next week"
                  : WEEK_FMT.format(new Date(g.key))}
            </button>
          ))}
        </div>

        {/* Reschedule hint chip */}
        {rescheduling ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 text-pretty">
              Rescheduling{" "}
              <strong className="tnum">
                {fmtDay(rescheduling.startsAt)} ·{" "}
                {fmtTime(rescheduling.startsAt)}
              </strong>{" "}
              — check a replacement time below; booking releases the old spot.
            </span>
            <button
              type="button"
              onClick={() => setRescheduling(null)}
              className="ml-auto shrink-0 opacity-70 transition-opacity hover:opacity-100"
              aria-label="Stop rescheduling"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {groups.map((g) => {
          const isOpen = openWeeks.has(g.key);
          return (
            <Card
              key={g.key}
              ref={(el) => {
                if (el) weekRefs.current.set(g.key, el);
                else weekRefs.current.delete(g.key);
              }}
              className="scroll-mt-24 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleWeek(g.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <span className="text-sm font-semibold">{g.label}</span>
                <span className="tnum text-xs text-muted-foreground">
                  {g.open} open{g.full ? ` · ${g.full} full` : ""}
                </span>
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  {isOpen ? "Hide" : "Show"} week
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </span>
              </button>
              {isOpen ? (
                <ul className="divide-y divide-border border-t border-border">
                  {g.slots.map((slot) => {
                    // R10: a row only blocks when its whole 4-WEEK CYCLE is
                    // at the plan cap (booked + selected) — never per week.
                    const c = cycleIndex(slot.startsAt, thisWeekKey);
                    return (
                      <SlotRow
                        key={slot.id}
                        slot={slot}
                        locked={lockedSet.has(slot.label)}
                        booked={bookedStarts.has(slot.startsAt)}
                        waitlisted={waitlistStarts.has(slot.startsAt)}
                        checked={selected.has(slot.id)}
                        capBlocked={c >= 0 && cycleTotalWith(c) >= cycleCap}
                        overdue={overdue}
                        onToggle={() => toggleSlot(slot)}
                        onWaitlist={() => joinWaitlist(slot)}
                      />
                    );
                  })}
                </ul>
              ) : null}
            </Card>
          );
        })}
      </section>
      ) : null}

      {/* Sticky action bar / toast-like confirmation */}
      <div className="pointer-events-none sticky bottom-4 z-30">
        {selected.size > 0 && !overdue ? (
          <div className="pointer-events-auto mx-auto flex w-full max-w-xl flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-glow">
            <div className="flex flex-wrap items-center gap-3">
              <ListChecks className="h-5 w-5 shrink-0 text-brand-ink" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="tnum text-sm font-semibold">
                  {selected.size} selected
                </p>
                <p className="tnum text-xs text-muted-foreground">
                  {selectedThisWeek > 0
                    ? `${selectedThisWeek} this week · ${selected.size - selectedThisWeek} in later weeks`
                    : "all in later weeks"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="brand"
                size="sm"
                disabled={multiKid && bookFor.size === 0}
                onClick={bookSelected}
              >
                <CheckCheck className="h-4 w-4" aria-hidden />
                Book {selected.size} selected{" "}
                {selected.size === 1 ? "session" : "sessions"}
                {repeatWeeks > 1 ? ` × ${repeatWeeks} wks` : ""}
              </Button>
            </div>
            {/* Round 8 (P4): parents pick WHICH KIDS the booking is for */}
            {multiKid ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
                <Users
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="text-xs font-medium text-muted-foreground">
                  Book for:
                </span>
                {bookKids.map((k) => {
                  const ticked = bookFor.has(k.id);
                  return (
                    <label
                      key={k.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                        ticked
                          ? "border-brand/40 bg-brand/10 text-foreground"
                          : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 accent-[hsl(var(--brand))]"
                        checked={ticked}
                        onChange={() => toggleKid(k.id)}
                      />
                      {k.name.split(" ")[0]}
                    </label>
                  );
                })}
                {bookFor.size === 0 ? (
                  <span className="text-[0.7rem] text-warning">
                    Tick at least one athlete
                  </span>
                ) : null}
              </div>
            ) : null}
            {/* Repeat the ticked weekday/time pattern for N weeks (A10) */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
              <Repeat2
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <label
                htmlFor="repeat-weeks"
                className="text-xs font-medium text-muted-foreground"
              >
                Repeat
              </label>
              <select
                id="repeat-weeks"
                value={repeatWeeks}
                onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                className="h-7 rounded-md border border-border bg-surface/60 px-2 text-xs font-medium text-foreground outline-none transition-colors focus:border-brand/50"
              >
                <option value={1}>Don&apos;t repeat</option>
                {REPEAT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    for {n} weeks
                  </option>
                ))}
              </select>
              <span className="min-w-0 flex-1 text-[0.7rem] text-muted-foreground">
                {repeatWeeks > 1
                  ? `Books the same weekday & time pattern for ${repeatWeeks} weeks in one go.`
                  : "Ticked a weekly pattern? Book it for weeks ahead in one go."}
              </span>
            </div>
          </div>
        ) : flash ? (
          <div
            className={cn(
              "pointer-events-auto mx-auto flex w-full max-w-xl items-center gap-3 rounded-xl border bg-card p-3 shadow-soft",
              flash.tone === "success" ? "border-success/40" : "border-border",
            )}
            role="status"
          >
            {flash.tone === "success" ? (
              <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
            ) : (
              <Undo2
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            )}
            <p className="min-w-0 flex-1 text-sm text-pretty">{flash.text}</p>
            {flash.undoBooking ? (
              <Button type="button" variant="outline" size="sm" onClick={undoCancel}>
                <Undo2 className="h-3.5 w-3.5" aria-hidden />
                Undo
              </Button>
            ) : null}
            <button
              type="button"
              onClick={() => setFlash(null)}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */

function SlotRow({
  slot,
  locked,
  booked,
  waitlisted,
  checked,
  capBlocked,
  overdue,
  onToggle,
  onWaitlist,
}: {
  slot: BookableSlot;
  /** Needs staff approval before this athlete can book it (A12). */
  locked: boolean;
  booked: boolean;
  waitlisted: boolean;
  checked: boolean;
  /** This slot's 4-week billing cycle is at the plan cap (R10). */
  capBlocked: boolean;
  overdue: boolean;
  onToggle: () => void;
  onWaitlist: () => void;
}) {
  if (booked) {
    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
          <Check className="h-3.5 w-3.5" aria-hidden />
        </span>
        <SlotInfo slot={slot} muted />
        <Pill tone="success" className="ml-auto">
          Booked
        </Pill>
      </li>
    );
  }

  // Locked type — the coaching staff grants access from the back end; the row
  // is visible (so athletes know it exists) but can't be selected.
  if (locked) {
    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-3 opacity-70">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden />
        </span>
        <SlotInfo slot={slot} muted />
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Team members only — ask your coach for access
        </span>
      </li>
    );
  }

  // Full session → waitlist path (spots-left, danger tone).
  if (slot.spotsLeft === 0) {
    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="h-5 w-5 shrink-0 rounded-md border border-dashed border-border bg-muted/40" />
        <SlotInfo slot={slot} muted />
        <span className="ml-auto flex items-center gap-2">
          <Pill tone="danger">Full</Pill>
          {waitlisted ? (
            <Pill tone="info">On waitlist</Pill>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={overdue}
              onClick={onWaitlist}
            >
              Join waitlist
            </Button>
          )}
        </span>
      </li>
    );
  }

  const disabled = overdue || (capBlocked && !checked);
  return (
    <li>
      <label
        className={cn(
          "flex flex-wrap items-center gap-3 px-4 py-3 transition-colors",
          disabled
            ? "cursor-not-allowed opacity-55"
            : "cursor-pointer hover:bg-accent/40",
          checked && "bg-brand/5",
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          aria-label={`${slot.label} — ${fmtDay(slot.startsAt)} ${fmtRange(slot.startsAt, slot.endsAt)}`}
        />
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            checked
              ? "border-brand bg-brand text-brand-foreground"
              : "border-border bg-surface/60",
          )}
          aria-hidden
        >
          {checked ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
        <SlotInfo slot={slot} />
        <span className="ml-auto flex items-center gap-2">
          {capBlocked && !checked && !overdue ? (
            <span className="text-xs text-warning">Cycle cap reached</span>
          ) : null}
          {/* Kept deliberately plain — the client doesn't want scarce spots
              drawing attention (no warning color on "1 spot left"). */}
          <span className="tnum text-xs text-muted-foreground">
            {slot.spotsLeft} {slot.spotsLeft === 1 ? "spot" : "spots"} left
          </span>
        </span>
      </label>
    </li>
  );
}

function SlotInfo({ slot, muted }: { slot: BookableSlot; muted?: boolean }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <span
        className={cn(
          "w-24 shrink-0 text-sm font-semibold",
          muted && "text-muted-foreground",
        )}
      >
        {fmtDay(slot.startsAt)}
      </span>
      <span
        className={cn(
          "tnum w-36 shrink-0 text-sm",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {fmtRange(slot.startsAt, slot.endsAt)}
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        <Pill tone={labelTone[slot.label]}>{slot.label}</Pill>
        <SessionTypeInfoButton label={slot.label} />
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Session-type info popover                                           */
/* ------------------------------------------------------------------ */

/**
 * Small ⓘ trigger next to each slot's type pill. Opens a centered
 * dialog (portaled to <body> so it escapes row labels and week-card
 * overflow clipping) with the type's description + requirements.
 * Escape, the backdrop, and the close button all dismiss it.
 */
function SessionTypeInfoButton({ label }: { label: BookableSlot["label"] }) {
  const [open, setOpen] = useState(false);
  const info = SESSION_TYPE_INFO[label];
  const restricted = RESTRICTED_TYPES.has(label);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // Inside a checkbox <label> — don't let the click toggle the slot.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`About ${label} sessions`}
        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50">
              {/* Click-outside backdrop */}
              <div
                className="absolute inset-0 bg-background/60 backdrop-blur-[2px]"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`${label} session details`}
                className="absolute left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-glow"
              >
                <div className="flex items-center gap-2">
                  <Pill tone={labelTone[label]}>{label}</Pill>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <p className="mt-2 text-sm text-pretty">{info.description}</p>
                <p className="eyebrow mt-4">Requirements before you can book</p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {info.requirements.map((req) => (
                    <li key={req} className="flex items-start gap-2 text-sm">
                      <ShieldCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        aria-hidden
                      />
                      <span className="min-w-0 text-pretty">{req}</span>
                    </li>
                  ))}
                </ul>
                {restricted ? (
                  <p className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning">
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    <span className="min-w-0 text-pretty">
                      You can&apos;t book this session type until requirements
                      are met — talk to your coach.
                    </span>
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}
