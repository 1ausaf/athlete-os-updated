"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  Dumbbell,
  LogIn,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { BarSeries, Sparkline } from "@/components/app/mini-charts";
import { StatTile } from "@/components/app/stat-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { athletes, fmtDay, fmtFullDay, relTime, type Athlete } from "@/lib/demo/data";
import {
  athleteMaxes,
  complianceStats,
  liftHistory,
  prsByRepMax,
  trainingSummaries,
  type LiftPoint,
  type ReferenceMaxEntry,
  type SessionSummary,
} from "@/lib/demo/training";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

const shortDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/** Preset range chips (C21) — default is 1 month. */
const RANGE_PRESETS = [
  { key: "1w", label: "1w", days: 7 },
  { key: "1m", label: "1m", days: 30 },
  { key: "3m", label: "3m", days: 91 },
  { key: "6m", label: "6m", days: 182 },
  { key: "1y", label: "1y", days: 365 },
] as const;

type RangeKey = (typeof RANGE_PRESETS)[number]["key"] | "custom";

/** Athletes that actually have logged training data. */
const athletesWithData: Athlete[] = athletes.filter(
  (a) => (trainingSummaries[a.id] ?? []).length > 0,
);

function liftsFor(athleteId: string): string[] {
  return Object.keys(liftHistory[athleteId] ?? {});
}

/** Format a Date for an `<input type="date">` value (local, not UTC). */
function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Compact day distance for stat tiles: "Today", "Tomorrow", "In 2d", "3d ago". */
function compactDay(iso: string): string {
  const target = new Date(iso);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${diff}d`;
  if (diff === -1) return "Yesterday";
  return `${-diff}d ago`;
}

/**
 * Client-side analytics explorer (C21/C22): pick an athlete, one of their
 * tested lifts and a date range. Every panel below — e1RM progression,
 * rep-max PRs, training summary and compliance — follows the selection.
 * Stacked full-width rows, exactly as the client asked. Pure local state,
 * no backend.
 */
export function AnalyticsExplorer() {
  const defaultAthleteId = athletesWithData[0]?.id ?? "";
  const [athleteId, setAthleteId] = useState(defaultAthleteId);
  const [lift, setLift] = useState(liftsFor(defaultAthleteId)[0] ?? "");
  const [rangeKey, setRangeKey] = useState<RangeKey>("1m");
  const [fromInput, setFromInput] = useState(() =>
    toInputDate(new Date(Date.now() - 30 * DAY_MS)),
  );
  const [toInput, setToInput] = useState(() => toInputDate(new Date()));

  // Preset chips write the from–to inputs, so the effective range always
  // derives from the two dates — the inputs double as the range display.
  const { fromMs, toMs } = useMemo(() => {
    const from = new Date(`${fromInput}T00:00:00`).getTime();
    const to = new Date(`${toInput}T23:59:59`).getTime();
    if (Number.isNaN(from) || Number.isNaN(to)) {
      return { fromMs: Date.now() - 30 * DAY_MS, toMs: Date.now() };
    }
    return { fromMs: Math.min(from, to), toMs: Math.max(from, to) };
  }, [fromInput, toInput]);

  const athlete = athletesWithData.find((a) => a.id === athleteId);
  const lifts = liftsFor(athleteId);
  const allPoints: LiftPoint[] =
    lift.length > 0 ? (liftHistory[athleteId]?.[lift] ?? []) : [];
  const points = allPoints.filter((p) => {
    const t = new Date(p.date).getTime();
    return t >= fromMs && t <= toMs;
  });
  const allSummaries: SessionSummary[] = trainingSummaries[athleteId] ?? [];
  const summaries = allSummaries.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= fromMs && t <= toMs;
  });
  const repMaxes = lift.length > 0 ? prsByRepMax(lift, athleteId) : [];
  const stats = complianceStats(athleteId, fromMs, toMs);
  const rangeLabel = `${shortDay.format(fromMs)} – ${shortDay.format(toMs)}`;
  const loginLabel =
    new Date(stats.lastLogin).getTime() > Date.now()
      ? "Today"
      : relTime(stats.lastLogin);

  function handleAthleteChange(id: string) {
    setAthleteId(id);
    setLift(liftsFor(id)[0] ?? "");
  }

  function selectPreset(key: RangeKey, days: number) {
    setRangeKey(key);
    setFromInput(toInputDate(new Date(Date.now() - days * DAY_MS)));
    setToInput(toInputDate(new Date()));
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Controls: athlete + lift + date range (presets and custom from–to) */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-full flex-col gap-1.5 sm:w-56">
          <label className="text-xs font-medium text-muted-foreground">
            Athlete
          </label>
          <Select value={athleteId} onValueChange={handleAthleteChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pick an athlete" />
            </SelectTrigger>
            <SelectContent>
              {athletesWithData.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-56">
          <label className="text-xs font-medium text-muted-foreground">
            Lift
          </label>
          {lifts.length > 0 ? (
            <Select value={lift} onValueChange={setLift}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a lift" />
              </SelectTrigger>
              <SelectContent>
                {lifts.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-9 w-full items-center rounded-md border border-input px-3 text-sm text-muted-foreground opacity-70">
              No tested lifts yet
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Date range
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {RANGE_PRESETS.map(({ key, label, days }) => {
                const active = rangeKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectPreset(key, days)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-card text-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={fromInput}
                aria-label="Range start date"
                onChange={(e) => {
                  setFromInput(e.target.value);
                  setRangeKey("custom");
                }}
                className={cn(
                  "h-9 w-[8.75rem]",
                  rangeKey === "custom" && "border-brand/50",
                )}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={toInput}
                aria-label="Range end date"
                onChange={(e) => {
                  setToInput(e.target.value);
                  setRangeKey("custom");
                }}
                className={cn(
                  "h-9 w-[8.75rem]",
                  rangeKey === "custom" && "border-brand/50",
                )}
              />
            </div>
          </div>
        </div>
        {athlete ? (
          <Pill tone="neutral" className="mb-2 ml-auto hidden xl:inline-flex">
            {athlete.program.name} · Day {athlete.program.day}/
            {athlete.program.totalDays}
          </Pill>
        ) : null}
      </div>

      {/* Row 1 — Estimated 1RM: chart + tested-set table side by side on xl */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg">Estimated 1RM</h2>
              <p className="text-sm text-muted-foreground">
                {athlete?.name}
                {lift ? ` · ${lift}` : " · no tested lifts yet"} — tested sets
                in the selected range
              </p>
            </div>
            <Pill tone="neutral">{rangeLabel}</Pill>
          </div>
          {points.length > 0 && athlete ? (
            <LiftProgression
              points={points}
              testedMax={athleteMaxes[athleteId]?.[lift]}
            />
          ) : allPoints.length > 0 ? (
            <RangeEmpty
              what="tested sets"
              hint={`${athlete?.name ?? "This athlete"} has ${allPoints.length} tested ${lift} sets on file — widen the date range to see them.`}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <Dumbbell
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden
                />
              </span>
              <div>
                <p className="text-sm font-medium">No tested lifts yet</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                  {athlete?.name ?? "This athlete"} hasn&apos;t logged a tested
                  top set. Once testing week lands, the estimated-1RM curve
                  builds itself.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 2 — PRs by rep-max (C21): best 1/2/3/5/10RM with real dates */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg">PRs by rep-max</h2>
              <p className="text-sm text-muted-foreground">
                Best single, double, triple, 5 and 10-rep sets on record
                {lift ? ` for ${lift}` : ""} — real dates, not &ldquo;30d
                ago&rdquo;.
              </p>
            </div>
            <Pill tone="brand" icon={<Trophy className="h-3.5 w-3.5" />}>
              All-time bests
            </Pill>
          </div>
          {repMaxes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {repMaxes.map((r) => (
                <div
                  key={r.reps}
                  className="rounded-lg border border-border bg-surface/50 p-4"
                >
                  <span className="eyebrow">{r.reps}-rep max</span>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="tnum font-display text-2xl font-extrabold tracking-tight">
                      {r.weight}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {r.unit} × {r.reps}
                    </span>
                  </div>
                  <p className="tnum mt-1 text-xs text-muted-foreground">
                    {fmtFullDay(r.date)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-muted-foreground">
              No rep-max history yet — PRs derive automatically from logged
              tested sets.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Row 3 — Training summary over the selected range */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg">Training summary</h2>
              <p className="text-sm text-muted-foreground">
                Session-by-session totals over the selected range — including
                how long each one actually took.
              </p>
            </div>
            <Pill tone="brand" icon={<Timer className="h-3.5 w-3.5" />}>
              Duration tracked · new
            </Pill>
          </div>
          {summaries.length > 0 ? (
            <TrainingSummary summaries={summaries} />
          ) : (
            <RangeEmpty
              what="logged sessions"
              hint={`${athlete?.name ?? "This athlete"} has ${allSummaries.length} sessions on file — widen the date range to see them.`}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Duration is the column TrainHeroic never showed — LPS logs it
            automatically on every session.
          </p>
        </CardContent>
      </Card>

      {/* Row 4 — Compliance (C22): booking, fill-in, last scheduled, last login */}
      {athlete ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <span className="eyebrow">Compliance</span>
              <h2 className="text-lg">Booking &amp; engagement — {athlete.name}</h2>
            </div>
            <Pill tone="neutral">{rangeLabel}</Pill>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Booking compliance"
              value={`${stats.bookingPct}%`}
              icon={CalendarCheck}
              accent
              hint={`${stats.bookedSessions} of ${stats.expectedSessions} expected sessions booked (${athlete.frequency})`}
            />
            <StatTile
              label="Last scheduled"
              value={stats.lastScheduled ? compactDay(stats.lastScheduled) : "None"}
              icon={CalendarClock}
              hint={
                stats.lastScheduled
                  ? fmtDay(stats.lastScheduled)
                  : "no session on the books"
              }
            />
            <StatTile
              label="Fill-in compliance"
              value={`${stats.fillPct}%`}
              icon={ClipboardCheck}
              hint="booked sessions with the log filled in"
            />
            <StatTile
              label="Last login"
              value={loginLabel}
              icon={LogIn}
              hint={fmtDay(stats.lastLogin)}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Shared empty state for range-filtered panels                        */
/* ------------------------------------------------------------------ */

function RangeEmpty({ what, hint }: { what: string; hint: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center">
      <p className="text-sm font-medium">No {what} in this range</p>
      <p className="mx-auto max-w-sm text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lift progression panel body                                         */
/* ------------------------------------------------------------------ */

function LiftProgression({
  points,
  testedMax,
}: {
  points: LiftPoint[];
  testedMax?: ReferenceMaxEntry;
}) {
  const first = points[0];
  const last = points[points.length - 1];
  const best = points.reduce((m, p) => (p.e1rm > m.e1rm ? p : m), first);
  const delta = last.e1rm - first.e1rm;
  const spanWeeks = Math.max(
    1,
    Math.round(
      (new Date(last.date).getTime() - new Date(first.date).getTime()) /
        (7 * DAY_MS),
    ),
  );
  const unit = first.unit;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* Headline stat + trend */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface/50 p-4">
        <div>
          <span className="eyebrow">Current e1RM</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="tnum font-display text-3xl font-extrabold tracking-tight">
              {last.e1rm}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          </div>
          <p
            className={
              delta >= 0
                ? "mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success"
                : "mt-1 inline-flex items-center gap-1 text-xs font-semibold text-destructive"
            }
          >
            {delta >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" aria-hidden />
            )}
            {delta >= 0 ? "+" : ""}
            {delta} {unit} in {spanWeeks} week{spanWeeks === 1 ? "" : "s"}
          </p>
          {testedMax ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Tested max on file: {testedMax.value} {testedMax.unit}
            </p>
          ) : null}
        </div>
        <Sparkline data={points.map((p) => p.e1rm)} width={180} height={56} />
      </div>

      {/* Tested-set history */}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Reps</TableHead>
              <TableHead className="text-right">Weight ({unit})</TableHead>
              <TableHead className="text-right">e1RM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...points].reverse().map((p) => (
              <TableRow key={p.date}>
                <TableCell className="text-muted-foreground">
                  {fmtDay(p.date)}
                </TableCell>
                <TableCell className="tnum text-right">{p.reps}</TableCell>
                <TableCell className="tnum text-right">{p.weight}</TableCell>
                <TableCell className="tnum text-right font-semibold">
                  <span className="inline-flex items-center gap-2">
                    {p === best ? <Pill tone="brand">peak</Pill> : null}
                    {p.e1rm}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Training summary panel body                                         */
/* ------------------------------------------------------------------ */

function TrainingSummary({ summaries }: { summaries: SessionSummary[] }) {
  // Data arrives newest-first; the volume chart wants oldest → newest.
  const chrono = [...summaries].reverse();
  const totalReps = summaries.reduce((n, s) => n + s.reps, 0);
  const totalVolume = summaries.reduce((n, s) => n + s.volumeKg, 0);
  const avgDuration = summaries.length
    ? Math.round(
        summaries.reduce((n, s) => n + s.durationMin, 0) / summaries.length,
      )
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Volume per session */}
      <div className="rounded-lg border border-border bg-surface/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow">Volume per session (kg)</span>
          <span className="tnum text-xs text-muted-foreground">
            {chrono.length} sessions
          </span>
        </div>
        <BarSeries
          data={chrono.map((s) => s.volumeKg)}
          labels={
            chrono.length <= 14
              ? chrono.map((s) => shortDay.format(new Date(s.date)))
              : undefined
          }
          height={104}
        />
      </div>

      {/* Per-session table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Date</TableHead>
              <TableHead>Session</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Reps</TableHead>
              <TableHead className="text-right">Volume (kg)</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Blocks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((s) => {
              const [done, prescribed] = s.blocksCompleted.split("/");
              const partial = done !== prescribed;
              return (
                <TableRow key={s.date}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {fmtDay(s.date)}
                  </TableCell>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="tnum hidden text-right sm:table-cell">{s.reps}</TableCell>
                  <TableCell className="tnum text-right font-semibold">
                    {s.volumeKg.toLocaleString("en-US")}
                  </TableCell>
                  <TableCell className="tnum whitespace-nowrap text-right">
                    {s.durationMin} min
                  </TableCell>
                  <TableCell
                    className={
                      partial
                        ? "tnum hidden text-right font-medium text-warning sm:table-cell"
                        : "tnum hidden text-right text-muted-foreground sm:table-cell"
                    }
                  >
                    {s.blocksCompleted}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-muted/50">
              <TableCell colSpan={2} className="text-xs text-muted-foreground">
                Totals · {summaries.length} sessions
              </TableCell>
              <TableCell className="tnum text-right">{totalReps}</TableCell>
              <TableCell className="tnum text-right">
                {totalVolume.toLocaleString("en-US")}
              </TableCell>
              <TableCell className="tnum whitespace-nowrap text-right">
                {avgDuration} min avg
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
