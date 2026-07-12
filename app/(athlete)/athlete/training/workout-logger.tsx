"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Minus,
  Plus,
  Printer,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/app/progress";
import { cn } from "@/lib/utils";

export interface WorkoutExercise {
  id: string;
  name: string;
  cue: string;
  sets: number;
  reps: string;
  /** Prescribed working weight in lb (0 = bodyweight). */
  targetLb: number;
  targetRpe: number;
  /** If a logged weight beats this, we flourish a PR. */
  prLb?: number;
}

/** A believable in-season power session for the demo. */
const WORKOUT: WorkoutExercise[] = [
  {
    id: "ex-trap",
    name: "Trap-bar deadlift",
    cue: "Realization — RPE 8 top set, brace hard",
    sets: 4,
    reps: "3",
    targetLb: 375,
    targetRpe: 8,
    prLb: 385,
  },
  {
    id: "ex-bench",
    name: "Bench press",
    cue: "Tempo 2ct, full lockout",
    sets: 4,
    reps: "5",
    targetLb: 235,
    targetRpe: 8,
    prLb: 245,
  },
  {
    id: "ex-pullup",
    name: "Weighted pull-ups",
    cue: "Add load on the belt, controlled negatives",
    sets: 3,
    reps: "6",
    targetLb: 45,
    targetRpe: 8,
  },
  {
    id: "ex-rdl",
    name: "Romanian deadlift",
    cue: "Hinge to mid-shin, feel the hamstrings",
    sets: 3,
    reps: "8",
    targetLb: 205,
    targetRpe: 7,
  },
  {
    id: "ex-row",
    name: "Chest-supported row",
    cue: "Back-off volume — squeeze scap",
    sets: 3,
    reps: "10",
    targetLb: 70,
    targetRpe: 7,
  },
  {
    id: "ex-core",
    name: "Anti-rotation core circuit",
    cue: "Pallof press + dead-bug, no rush",
    sets: 3,
    reps: "12",
    targetLb: 0,
    targetRpe: 6,
  },
];

interface ExerciseState {
  weight: number;
  rpe: number;
  /** Which set indices are ticked complete. */
  done: boolean[];
  pr: boolean;
}

export function WorkoutLogger() {
  const [state, setState] = useState<Record<string, ExerciseState>>(() =>
    Object.fromEntries(
      WORKOUT.map((ex) => [
        ex.id,
        {
          weight: ex.targetLb,
          rpe: ex.targetRpe,
          done: Array.from({ length: ex.sets }, () => false),
          pr: false,
        },
      ]),
    ),
  );

  const totalSets = useMemo(
    () => WORKOUT.reduce((n, ex) => n + ex.sets, 0),
    [],
  );
  const completedSets = useMemo(
    () =>
      Object.values(state).reduce(
        (n, s) => n + s.done.filter(Boolean).length,
        0,
      ),
    [state],
  );
  const completionPct = Math.round((completedSets / totalSets) * 100);
  const prCount = Object.values(state).filter((s) => s.pr).length;

  function toggleSet(ex: WorkoutExercise, setIdx: number) {
    setState((prev) => {
      const cur = prev[ex.id]!;
      const done = cur.done.map((v, i) => (i === setIdx ? !v : v));
      // PR flourish: a completed set at a weight above the athlete's PR.
      const pr =
        ex.prLb != null &&
        cur.weight > ex.prLb &&
        done.some(Boolean);
      return { ...prev, [ex.id]: { ...cur, done, pr } };
    });
  }

  function nudgeWeight(ex: WorkoutExercise, delta: number) {
    setState((prev) => {
      const cur = prev[ex.id]!;
      const weight = Math.max(0, cur.weight + delta);
      const pr =
        ex.prLb != null && weight > ex.prLb && cur.done.some(Boolean);
      return { ...prev, [ex.id]: { ...cur, weight, pr } };
    });
  }

  function setRpe(ex: WorkoutExercise, rpe: number) {
    setState((prev) => ({
      ...prev,
      [ex.id]: { ...prev[ex.id]!, rpe: Math.max(1, Math.min(10, rpe)) },
    }));
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Workout logger</span>
            {prCount > 0 ? (
              <Pill tone="brand" icon={<Sparkles className="h-3 w-3" />}>
                {prCount} PR{prCount > 1 ? "s" : ""} today
              </Pill>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="tnum font-bold">{completedSets}</span>
              <span className="text-muted-foreground">/ {totalSets} sets</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="no-print"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print workout
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Session completion</span>
            <span className="tnum font-semibold text-foreground">
              {completionPct}%
            </span>
          </div>
          <Progress
            value={completionPct}
            tone={completionPct === 100 ? "success" : "brand"}
          />
        </div>

        <ul className="flex flex-col gap-3">
          {WORKOUT.map((ex) => {
            const s = state[ex.id]!;
            const allDone = s.done.every(Boolean);
            return (
              <li
                key={ex.id}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  s.pr
                    ? "border-brand/40 bg-brand/[0.06]"
                    : allDone
                      ? "border-success/30 bg-success/[0.05]"
                      : "border-border bg-surface/50",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{ex.name}</span>
                      {s.pr ? (
                        <Pill
                          tone="brand"
                          icon={<Trophy className="h-3 w-3" />}
                        >
                          PR!
                        </Pill>
                      ) : allDone ? (
                        <Pill tone="success">Done</Pill>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ex.sets} × {ex.reps} · target RPE {ex.targetRpe}
                      {" · "}
                      {ex.cue}
                    </p>
                  </div>

                  {/* Weight + RPE editors */}
                  <div className="flex items-end gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">
                        Weight
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Decrease weight for ${ex.name}`}
                          onClick={() => nudgeWeight(ex, -5)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="tnum w-16 text-center text-sm font-bold">
                          {ex.targetLb === 0 ? "BW" : `${s.weight}`}
                          {ex.targetLb === 0 ? "" : (
                            <span className="ml-0.5 text-[0.65rem] font-medium text-muted-foreground">
                              lb
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase weight for ${ex.name}`}
                          onClick={() => nudgeWeight(ex, 5)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">
                        RPE
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Decrease RPE for ${ex.name}`}
                          onClick={() => setRpe(ex, s.rpe - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="tnum w-8 text-center text-sm font-bold">
                          {s.rpe}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase RPE for ${ex.name}`}
                          onClick={() => setRpe(ex, s.rpe + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Set tickers */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.done.map((done, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleSet(ex, i)}
                      aria-pressed={done}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
                        done
                          ? "border-brand/40 bg-brand text-brand-foreground"
                          : "border-border bg-surface/60 text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : null}
                      <span className="tnum">Set {i + 1}</span>
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-muted-foreground text-pretty">
          Changes save to your session log as you go — you advance a program day
          when the completed session is logged, not by the calendar.
        </p>
      </CardContent>
    </Card>
  );
}
