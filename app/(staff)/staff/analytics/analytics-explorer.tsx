"use client";

import { useState } from "react";
import { Dumbbell, Timer, TrendingDown, TrendingUp } from "lucide-react";

import { BarSeries, Sparkline } from "@/components/app/mini-charts";
import { Card, CardContent } from "@/components/ui/card";
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
import { athletes, fmtDay, type Athlete } from "@/lib/demo/data";
import {
  athleteMaxes,
  liftHistory,
  trainingSummaries,
  type LiftPoint,
  type ReferenceMaxEntry,
  type SessionSummary,
} from "@/lib/demo/training";

const DAY_MS = 86_400_000;

const shortDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/** Athletes that actually have logged training data. */
const athletesWithData: Athlete[] = athletes.filter(
  (a) => (trainingSummaries[a.id] ?? []).length > 0,
);

function liftsFor(athleteId: string): string[] {
  return Object.keys(liftHistory[athleteId] ?? {});
}

/**
 * Client-side analytics explorer: pick an athlete (and one of their tested
 * lifts) to drive the estimated-1RM panel and the training-summary panel.
 * Pure local state — no backend.
 */
export function AnalyticsExplorer() {
  const defaultAthleteId = athletesWithData[0]?.id ?? "";
  const [athleteId, setAthleteId] = useState(defaultAthleteId);
  const [lift, setLift] = useState(liftsFor(defaultAthleteId)[0] ?? "");

  const athlete = athletesWithData.find((a) => a.id === athleteId);
  const lifts = liftsFor(athleteId);
  const points: LiftPoint[] =
    lift.length > 0 ? (liftHistory[athleteId]?.[lift] ?? []) : [];
  const summaries: SessionSummary[] = trainingSummaries[athleteId] ?? [];

  function handleAthleteChange(id: string) {
    setAthleteId(id);
    setLift(liftsFor(id)[0] ?? "");
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Controls */}
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
        {athlete ? (
          <Pill tone="neutral" className="mb-2 ml-auto hidden sm:inline-flex">
            {athlete.program.name} · Day {athlete.program.day}/
            {athlete.program.totalDays}
          </Pill>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Lift progression / estimated 1RM */}
        <Card>
          <CardContent className="flex h-full flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg">Estimated 1RM</h2>
                <p className="text-sm text-muted-foreground">
                  {athlete?.name}
                  {lift ? ` · ${lift}` : " · no tested lifts yet"}
                </p>
              </div>
            </div>
            {points.length > 0 && athlete ? (
              <LiftProgression
                points={points}
                testedMax={athleteMaxes[athleteId]?.[lift]}
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
                    {athlete?.name ?? "This athlete"} hasn&apos;t logged a
                    tested top set. Once testing week lands, the
                    estimated-1RM curve builds itself.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training summary */}
        <Card>
          <CardContent className="flex h-full flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg">Training summary</h2>
                <p className="text-sm text-muted-foreground">
                  Session-by-session totals — including how long each one
                  actually took.
                </p>
              </div>
              <Pill tone="brand" icon={<Timer className="h-3.5 w-3.5" />}>
                Duration tracked · new
              </Pill>
            </div>
            <TrainingSummary summaries={summaries} />
            <p className="text-xs text-muted-foreground">
              Duration is the column TrainHeroic never showed — LPS logs it
              automatically on every session.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
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
  const delta = best.e1rm - first.e1rm;
  const spanWeeks = Math.max(
    1,
    Math.round(
      (new Date(last.date).getTime() - new Date(first.date).getTime()) /
        (7 * DAY_MS),
    ),
  );
  const unit = first.unit;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Headline stat + trend */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface/50 p-4">
        <div>
          <span className="eyebrow">Current e1RM</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="tnum font-display text-3xl font-extrabold tracking-tight">
              {best.e1rm}
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
          labels={chrono.map((s) => shortDay.format(new Date(s.date)))}
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
