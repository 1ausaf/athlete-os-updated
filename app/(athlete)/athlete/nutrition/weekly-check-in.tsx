"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Minus,
  Scale,
  Trash2,
} from "lucide-react";

import { Sparkline } from "@/components/app/mini-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtDay } from "@/lib/demo/data";
import { leanMassLb, type NutritionCheckIn } from "@/lib/demo/training";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Delta math — "is it trending in the right direction?"               */
/* ------------------------------------------------------------------ */

type Direction = "up" | "down" | "flat";

interface Delta {
  direction: Direction;
  /** Absolute % change vs the previous check-in. */
  pct: number;
  /** Absolute unit change vs the previous check-in (lb for weights). */
  abs: number;
  /** Trending the right way for this metric. */
  good: boolean;
}

/**
 * Change vs the previous check-in. `goodWhen` decides the color:
 * weight down (or stable), body fat down, lean mass up = success.
 */
function deltaVsPrev(
  curr: number,
  prev: number | undefined,
  goodWhen: (change: number) => boolean,
): Delta | null {
  if (prev == null || prev === 0) return null;
  const change = ((curr - prev) / prev) * 100;
  const direction: Direction = change > 0.05 ? "up" : change < -0.05 ? "down" : "flat";
  return {
    direction,
    pct: Math.abs(change),
    abs: Math.abs(curr - prev),
    good: goodWhen(change),
  };
}

/**
 * Client direction: weight-type metrics show the change in pounds, body fat
 * shows the relative % change — always "vs last measured", with an arrow.
 */
function DeltaBadge({
  delta,
  unit,
}: {
  delta: Delta | null;
  unit: "lb" | "%";
}) {
  if (!delta) {
    return (
      <span className="text-xs text-muted-foreground">first check-in</span>
    );
  }
  const Icon =
    delta.direction === "up"
      ? ArrowUpRight
      : delta.direction === "down"
        ? ArrowDownRight
        : Minus;
  const amount =
    unit === "lb" ? `${delta.abs.toFixed(1)} lb` : `${delta.pct.toFixed(1)}%`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        delta.good ? "text-success" : "text-warning",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {delta.direction === "flat"
        ? "No change vs last measured"
        : `${amount} vs last measured`}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Weekly check-in — TrainHeroic-style weigh-in log + trend            */
/* ------------------------------------------------------------------ */

export function WeeklyCheckIn({
  initialCheckIns,
}: {
  /** History from the protocol, oldest → newest. */
  initialCheckIns: NutritionCheckIn[];
}) {
  const [checkIns, setCheckIns] = useState<NutritionCheckIn[]>(initialCheckIns);
  const [weightInput, setWeightInput] = useState("");
  const [bodyFatInput, setBodyFatInput] = useState("");
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const weight = Number(weightInput);
  const bodyFat = Number(bodyFatInput);
  const canSubmit =
    weightInput.trim() !== "" &&
    bodyFatInput.trim() !== "" &&
    Number.isFinite(weight) &&
    Number.isFinite(bodyFat) &&
    weight > 0 &&
    bodyFat > 0 &&
    bodyFat < 100;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setCheckIns((prev) => [
      ...prev,
      {
        date: new Date().toISOString(),
        weightLb: Math.round(weight * 10) / 10,
        bodyFatPct: Math.round(bodyFat * 10) / 10,
      },
    ]);
    setWeightInput("");
    setBodyFatInput("");
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 4000);
  }

  /** Fat-fingered a check-in? Remove it — the trend recalculates. */
  function handleDelete(indexNewestFirst: number) {
    setCheckIns((prev) => {
      const originalIdx = prev.length - 1 - indexNewestFirst;
      return prev.filter((_, i) => i !== originalIdx);
    });
  }

  const latest = checkIns[checkIns.length - 1];
  const prev = checkIns[checkIns.length - 2];

  const weightDelta = latest
    ? deltaVsPrev(latest.weightLb, prev?.weightLb, (c) => c <= 0)
    : null;
  const bodyFatDelta = latest
    ? deltaVsPrev(latest.bodyFatPct, prev?.bodyFatPct, (c) => c < 0)
    : null;
  const leanDelta =
    latest && prev
      ? deltaVsPrev(leanMassLb(latest), leanMassLb(prev), (c) => c > 0)
      : null;

  const weightSeries = checkIns.map((c) => c.weightLb);
  const bodyFatSeries = checkIns.map((c) => c.bodyFatPct);
  const newestFirst = [...checkIns].reverse();

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Scale className="h-5 w-5 text-success" aria-hidden />
            <h3 className="text-lg font-extrabold">Check-in</h3>
            <Pill tone="success" className="ml-auto" dot>
              {checkIns.length} logged
            </Pill>
          </div>
          <p className="text-xs text-muted-foreground text-pretty">
            Body weight and body fat, same scale, fasted. Logged every week —
            your coach sees the trend.
          </p>
        </div>

        {/* Log form */}
        {/* Light green on purpose — the earlier brand-red tint read as an
            error state to the client. Logging should feel positive. */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success/[0.06] p-4"
        >
          <span className="eyebrow">Log this week&apos;s check-in</span>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="checkin-weight"
                className="text-xs text-muted-foreground"
              >
                Weight (lb)
              </Label>
              <Input
                id="checkin-weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                placeholder={latest ? String(latest.weightLb) : "185.0"}
                className="tnum h-9 font-semibold"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="checkin-bodyfat"
                className="text-xs text-muted-foreground"
              >
                Body fat (%)
              </Label>
              <Input
                id="checkin-bodyfat"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                max={99}
                placeholder={latest ? String(latest.bodyFatPct) : "12.0"}
                className="tnum h-9 font-semibold"
                value={bodyFatInput}
                onChange={(e) => setBodyFatInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="brand" disabled={!canSubmit}>
              Log check-in
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canSubmit ? (
              <span className="text-xs text-muted-foreground">
                Lean mass auto-computes:{" "}
                <span className="tnum font-semibold text-foreground">
                  {leanMassLb({ weightLb: weight, bodyFatPct: bodyFat })} lb
                </span>
              </span>
            ) : null}
            {flash ? (
              <Pill tone="success" icon={<CheckCircle2 className="h-3 w-3" />}>
                Check-in logged — trend updated
              </Pill>
            ) : null}
          </div>
        </form>

        {latest ? (
          <>
            {/* Current numbers with trend arrows */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface/50 p-4">
                <span className="eyebrow">Weight</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="tnum font-display text-2xl font-extrabold tracking-tight">
                    {latest.weightLb.toFixed(1)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    lb
                  </span>
                </div>
                <div className="mt-1.5">
                  <DeltaBadge delta={weightDelta} unit="lb" />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface/50 p-4">
                <span className="eyebrow">Body fat</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="tnum font-display text-2xl font-extrabold tracking-tight">
                    {latest.bodyFatPct.toFixed(1)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    %
                  </span>
                </div>
                <div className="mt-1.5">
                  <DeltaBadge delta={bodyFatDelta} unit="%" />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface/50 p-4">
                <span className="eyebrow">Lean mass</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="tnum font-display text-2xl font-extrabold tracking-tight">
                    {leanMassLb(latest).toFixed(1)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    lb
                  </span>
                </div>
                <div className="mt-1.5">
                  <DeltaBadge delta={leanDelta} unit="lb" />
                </div>
              </div>
            </div>

            {/* Trend charts */}
            {checkIns.length >= 2 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-surface/50 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Weight trend
                    </span>
                    <span className="tnum text-xs text-muted-foreground">
                      {weightSeries[0]?.toFixed(1)} →{" "}
                      {weightSeries[weightSeries.length - 1]?.toFixed(1)} lb
                    </span>
                  </div>
                  <Sparkline data={weightSeries} width={240} height={44} />
                </div>
                <div className="flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-surface/50 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Body fat trend
                    </span>
                    <span className="tnum text-xs text-muted-foreground">
                      {bodyFatSeries[0]?.toFixed(1)} →{" "}
                      {bodyFatSeries[bodyFatSeries.length - 1]?.toFixed(1)}%
                    </span>
                  </div>
                  <Sparkline data={bodyFatSeries} width={240} height={44} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Log a second check-in and the trend charts appear here.
              </p>
            )}

            {/* History — mirrors the protocol doc's tracking table */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h4 className="eyebrow">Check-in history</h4>
                <span className="h-px flex-1 bg-border" aria-hidden />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Weight (lbs)</TableHead>
                    <TableHead className="text-right">Body fat %</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                      Lean mass (lbs)
                    </TableHead>
                    <TableHead className="w-10" aria-label="Actions" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newestFirst.map((c, i) => (
                    <TableRow key={`${c.date}-${i}`}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {fmtDay(c.date)}
                        {i === 0 ? (
                          <span className="ml-2 text-xs font-semibold text-success">
                            latest
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="tnum text-right">
                        {c.weightLb.toFixed(1)}
                      </TableCell>
                      <TableCell className="tnum text-right">
                        {c.bodyFatPct.toFixed(1)}
                      </TableCell>
                      <TableCell className="tnum hidden text-right sm:table-cell">
                        {leanMassLb(c).toFixed(1)}
                      </TableCell>
                      <TableCell className="w-10 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(i)}
                          title="Delete this check-in"
                          aria-label={`Delete check-in from ${fmtDay(c.date)}`}
                          className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No check-ins yet — log your first one above to start the trend.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
