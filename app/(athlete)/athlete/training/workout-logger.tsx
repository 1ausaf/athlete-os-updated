"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Dumbbell,
  ExternalLink,
  History,
  Home,
  Link2,
  ListOrdered,
  Play,
  Printer,
  Trophy,
  X,
} from "lucide-react";

import { Progress } from "@/components/app/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  LB_PER_KG,
  LOAD_MODE_LABEL,
  REP_MODE_LABEL,
  isSupersetSlot,
  kgToLb,
  lbToKg,
  slotGroup,
  type ExerciseHistory,
  type LibraryExercise,
  type ProgramDay,
  type ProgramExercise,
  type ReferenceMaxEntry,
} from "@/lib/demo/training";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

type Unit = "lb" | "kg";
type Mark = "hit" | "miss" | null;

interface SetLog {
  /** Logged weight, in the unit it was entered/prescribed. Null = BW / %-computed. */
  weight: { value: number; unit: Unit } | null;
  /** What the athlete actually did (reps, time, distance…). */
  result: string;
  mark: Mark;
}

interface WorkoutLoggerProps {
  days: ProgramDay[];
  exercises: Record<string, LibraryExercise>;
  history: Record<string, ExerciseHistory>;
  maxes: Record<string, ReferenceMaxEntry>;
}

const exKey = (dayId: string, slot: string) => `${dayId}:${slot}`;

function buildInitialLogs(days: ProgramDay[]): Record<string, SetLog[]> {
  const out: Record<string, SetLog[]> = {};
  for (const day of days) {
    for (const section of day.sections) {
      for (const ex of section.exercises) {
        out[exKey(day.id, ex.slot)] = ex.sets.map((s) => ({
          weight:
            (s.loadMode === "lb" || s.loadMode === "kg") && s.load != null
              ? { value: s.load, unit: s.loadMode }
              : null,
          result: "",
          mark: null,
        }));
      }
    }
  }
  return out;
}

function roundForUnit(value: number, unit: Unit): number {
  return unit === "kg" ? Math.round(value * 2) / 2 : Math.round(value);
}

/** Convert a raw value between units, rounding sensibly for the target unit. */
function convertRaw(value: number, from: Unit, to: Unit): number {
  if (from === to) return roundForUnit(value, to);
  return roundForUnit(from === "kg" ? value * LB_PER_KG : value / LB_PER_KG, to);
}

/** Display a logged weight in the current global unit (live lb⇄kg swap). */
function weightInUnit(w: SetLog["weight"], unit: Unit): string {
  if (w == null) return "";
  if (w.unit === unit) return String(w.value);
  return String(w.unit === "lb" ? lbToKg(w.value) : kgToLb(w.value));
}

/** Resolve "60%" against the exercise's mother lift, in the display unit. */
function resolvePct(
  pct: number,
  lib: LibraryExercise | undefined,
  maxes: Record<string, ReferenceMaxEntry>,
  unit: Unit,
): string | null {
  const ref = lib?.referenceMax ? maxes[lib.referenceMax] : undefined;
  if (!ref) return null;
  const raw = (ref.value * pct) / 100;
  return `${convertRaw(raw, ref.unit, unit)} ${unit}`;
}

function daysAgo(iso: string): string {
  const d = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000),
  );
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`;
}

/** Group consecutive superset slots (D1+D2, A1+A2+A3) inside a section. */
function groupExercises(
  list: ProgramExercise[],
): { key: string; superset: boolean; exercises: ProgramExercise[] }[] {
  const groups: { key: string; label: string | null; exercises: ProgramExercise[] }[] =
    [];
  for (const ex of list) {
    const label = isSupersetSlot(ex.slot) ? slotGroup(ex.slot) : null;
    const last = groups[groups.length - 1];
    if (label != null && last && last.label === label) last.exercises.push(ex);
    else groups.push({ key: ex.slot, label, exercises: [ex] });
  }
  return groups.map((g) => ({
    key: g.key,
    superset: g.label != null && g.exercises.length > 1,
    exercises: g.exercises,
  }));
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function WorkoutLogger({
  days,
  exercises,
  history,
  maxes,
}: WorkoutLoggerProps) {
  const [activeDayId, setActiveDayId] = useState(days[0]?.id ?? "");
  const [unit, setUnit] = useState<Unit>("lb");
  const [logs, setLogs] = useState<Record<string, SetLog[]>>(() =>
    buildInitialLogs(days),
  );
  const [doneOverride, setDoneOverride] = useState<Record<string, boolean>>({});
  const [video, setVideo] = useState<LibraryExercise | null>(null);

  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0];

  const isDone = (key: string): boolean => {
    const rows = logs[key] ?? [];
    const allMarked = rows.length > 0 && rows.every((r) => r.mark !== null);
    return doneOverride[key] ?? allMarked;
  };

  const dayProgress = (day: ProgramDay) => {
    const all = day.sections.flatMap((s) => s.exercises);
    const done = all.filter((ex) => isDone(exKey(day.id, ex.slot))).length;
    return { done, total: all.length };
  };

  const activeProgress = activeDay
    ? dayProgress(activeDay)
    : { done: 0, total: 0 };
  const completionPct =
    activeProgress.total === 0
      ? 0
      : Math.round((activeProgress.done / activeProgress.total) * 100);

  const nextDay = useMemo(() => {
    if (!activeDay) return null;
    const idx = days.findIndex((d) => d.id === activeDay.id);
    return days[idx + 1] ?? null;
  }, [days, activeDay]);

  function updateSet(key: string, idx: number, patch: Partial<SetLog>) {
    setLogs((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((row, i) =>
        i === idx ? { ...row, ...patch } : row,
      ),
    }));
  }

  function toggleMark(key: string, idx: number, mark: "hit" | "miss", target: string) {
    setLogs((prev) => {
      const rows = prev[key] ?? [];
      return {
        ...prev,
        [key]: rows.map((row, i) => {
          if (i !== idx) return row;
          const next: Mark = row.mark === mark ? null : mark;
          // Hitting the target auto-fills the result — one-tap logging.
          const result =
            next === "hit" && row.result.trim() === "" ? target : row.result;
          return { ...row, mark: next, result };
        }),
      };
    });
  }

  function toggleDone(key: string) {
    const next = !isDone(key);
    setDoneOverride((prev) => ({ ...prev, [key]: next }));
  }

  if (!activeDay) return null;

  return (
    <>
      {/* -------------------------------------------------- Day picker */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-brand-ink" aria-hidden />
                <h3 className="text-base">Up next in your program</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Sessions run in order — day one, day two, day three. At the
                facility on an at-home day? Skip ahead and do the next in-gym
                session instead.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {days.map((day, i) => {
              const active = day.id === activeDay.id;
              const p = dayProgress(day);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setActiveDayId(day.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-brand/50 bg-brand/[0.05] ring-1 ring-brand/40"
                      : "border-border bg-surface/50 hover:border-brand/30 hover:bg-accent/40",
                  )}
                >
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="tnum text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Day {day.dayNumber}
                    </span>
                    {i === 0 ? (
                      <Pill tone="brand" dot>
                        Up next
                      </Pill>
                    ) : null}
                    <Pill
                      tone={day.location === "gym" ? "neutral" : "info"}
                      icon={
                        day.location === "gym" ? (
                          <Dumbbell className="h-3 w-3" />
                        ) : (
                          <Home className="h-3 w-3" />
                        )
                      }
                      className="ml-auto"
                    >
                      {day.location === "gym" ? "In-gym" : "At-home"}
                    </Pill>
                  </div>
                  <span className="text-sm font-semibold leading-snug">
                    {day.title}
                  </span>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {day.focus}
                  </p>
                  <div className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                    <span className="tnum">
                      {p.total} movement{p.total === 1 ? "" : "s"}
                    </span>
                    {p.done > 0 ? (
                      <span className="tnum font-semibold text-success">
                        · {p.done}/{p.total} done
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------- Session logger */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow">Session log</span>
                <Pill
                  tone={activeDay.location === "gym" ? "neutral" : "info"}
                  icon={
                    activeDay.location === "gym" ? (
                      <Dumbbell className="h-3 w-3" />
                    ) : (
                      <Home className="h-3 w-3" />
                    )
                  }
                >
                  {activeDay.location === "gym" ? "In-gym" : "At-home"}
                </Pill>
              </div>
              <h3 className="mt-1 text-lg">
                Day {activeDay.dayNumber} — {activeDay.title}
              </h3>
              <p className="text-xs text-muted-foreground">{activeDay.focus}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Global lb ⇄ kg swap — Olympic lifts in kilos, gym lifts in pounds. */}
              <div
                role="group"
                aria-label="Weight unit"
                className="no-print flex items-center rounded-lg border border-border bg-surface/60 p-0.5"
              >
                {(["lb", "kg"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={unit === u}
                    onClick={() => setUnit(u)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors",
                      unit === u
                        ? "bg-brand text-brand-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {u}
                  </button>
                ))}
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
              <span>Exercises completed</span>
              <span className="tnum font-semibold text-foreground">
                {activeProgress.done} / {activeProgress.total}
              </span>
            </div>
            <Progress
              value={completionPct}
              tone={completionPct === 100 ? "success" : "brand"}
            />
            {completionPct === 100 ? (
              <div className="mt-2">
                <Pill tone="success" icon={<CheckCircle2 className="h-3 w-3" />}>
                  Session complete
                  {nextDay ? ` — Day ${nextDay.dayNumber} unlocked` : ""}
                </Pill>
              </div>
            ) : null}
          </div>

          {/* Sections rendered as TrainHeroic-style blocks */}
          <div className="flex flex-col gap-6">
            {activeDay.sections.map((section) => (
              <section key={section.title} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <h4 className="eyebrow">{section.title}</h4>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                  <span className="text-xs text-muted-foreground">
                    {section.exercises.length} movement
                    {section.exercises.length === 1 ? "" : "s"}
                  </span>
                </div>

                {groupExercises(section.exercises).map((group) =>
                  group.superset ? (
                    <div
                      key={group.key}
                      className="overflow-hidden rounded-xl border border-brand/30"
                    >
                      <div className="flex flex-wrap items-center gap-2 border-b border-brand/20 bg-brand/[0.06] px-4 py-2">
                        <Link2 className="h-3.5 w-3.5 text-brand-ink" aria-hidden />
                        <span className="text-xs font-bold uppercase tracking-wide text-brand-ink">
                          Superset
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Alternate {group.exercises.map((e) => e.slot).join(" → ")},
                          rest after the last movement
                        </span>
                      </div>
                      <div className="bg-surface/40">
                        {group.exercises.map((ex, i) => (
                          <ExerciseBlock
                            key={ex.slot}
                            ex={ex}
                            lib={exercises[ex.exerciseId]}
                            hist={history[ex.exerciseId]}
                            rows={logs[exKey(activeDay.id, ex.slot)] ?? []}
                            done={isDone(exKey(activeDay.id, ex.slot))}
                            unit={unit}
                            maxes={maxes}
                            inSuperset
                            isLastInGroup={i === group.exercises.length - 1}
                            onToggleDone={() =>
                              toggleDone(exKey(activeDay.id, ex.slot))
                            }
                            onUpdateSet={(idx, patch) =>
                              updateSet(exKey(activeDay.id, ex.slot), idx, patch)
                            }
                            onToggleMark={(idx, mark, target) =>
                              toggleMark(
                                exKey(activeDay.id, ex.slot),
                                idx,
                                mark,
                                target,
                              )
                            }
                            onOpenVideo={setVideo}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ExerciseBlock
                      key={group.key}
                      ex={group.exercises[0]!}
                      lib={exercises[group.exercises[0]!.exerciseId]}
                      hist={history[group.exercises[0]!.exerciseId]}
                      rows={
                        logs[exKey(activeDay.id, group.exercises[0]!.slot)] ?? []
                      }
                      done={isDone(exKey(activeDay.id, group.exercises[0]!.slot))}
                      unit={unit}
                      maxes={maxes}
                      onToggleDone={() =>
                        toggleDone(exKey(activeDay.id, group.exercises[0]!.slot))
                      }
                      onUpdateSet={(idx, patch) =>
                        updateSet(
                          exKey(activeDay.id, group.exercises[0]!.slot),
                          idx,
                          patch,
                        )
                      }
                      onToggleMark={(idx, mark, target) =>
                        toggleMark(
                          exKey(activeDay.id, group.exercises[0]!.slot),
                          idx,
                          mark,
                          target,
                        )
                      }
                      onOpenVideo={setVideo}
                    />
                  ),
                )}
              </section>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-pretty">
            Log what you actually did — hit or miss, set by set. Marking an
            exercise done counts even if you stopped after the top set. Your
            coach sees everything.
          </p>
        </CardContent>
      </Card>

      {video ? <VideoModal lib={video} onClose={() => setVideo(null)} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exercise block — header, history line, per-set table                */
/* ------------------------------------------------------------------ */

function ExerciseBlock({
  ex,
  lib,
  hist,
  rows,
  done,
  unit,
  maxes,
  inSuperset = false,
  isLastInGroup = true,
  onToggleDone,
  onUpdateSet,
  onToggleMark,
  onOpenVideo,
}: {
  ex: ProgramExercise;
  lib: LibraryExercise | undefined;
  hist: ExerciseHistory | undefined;
  rows: SetLog[];
  done: boolean;
  unit: Unit;
  maxes: Record<string, ReferenceMaxEntry>;
  inSuperset?: boolean;
  isLastInGroup?: boolean;
  onToggleDone: () => void;
  onUpdateSet: (idx: number, patch: Partial<SetLog>) => void;
  onToggleMark: (idx: number, mark: "hit" | "miss", target: string) => void;
  onOpenVideo: (lib: LibraryExercise) => void;
}) {
  const name = lib?.name ?? ex.exerciseId;
  const firstMode = ex.sets[0]?.loadMode ?? "lb";
  const weightHeader =
    firstMode === "lb" || firstMode === "kg"
      ? `Weight (${unit})`
      : LOAD_MODE_LABEL[firstMode];
  const resultHeader =
    ex.repMode === "reps" ? "Reps done" : REP_MODE_LABEL[ex.repMode];

  const usesPct = ex.sets.some((s) => s.loadMode === "pct");
  const refEntry = lib?.referenceMax ? maxes[lib.referenceMax] : undefined;

  const body = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{name}</span>
            {lib?.videoUrl ? (
              <button
                type="button"
                onClick={() => onOpenVideo(lib)}
                aria-label={`Watch ${name} demo video`}
                className="no-print inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
              >
                <Play className="h-3 w-3 fill-current" />
              </button>
            ) : null}
            {hist?.isRecentPr ? (
              <Pill tone="brand" icon={<Trophy className="h-3 w-3" />}>
                PR
              </Pill>
            ) : null}
            {done ? (
              <Pill tone="success" icon={<Check className="h-3 w-3" />}>
                Done
              </Pill>
            ) : null}
          </div>
          {ex.instructions ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ex.instructions}
            </p>
          ) : null}
          {hist ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <History className="h-3 w-3" aria-hidden />
              <span>
                Last ({daysAgo(hist.lastDate)}):{" "}
                <span className="tnum font-semibold text-foreground">
                  {hist.lastSummary}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>
                Best:{" "}
                <span className="tnum font-semibold text-foreground">
                  {hist.bestSummary}
                </span>
              </span>
            </p>
          ) : null}
          {usesPct && lib?.referenceMax && refEntry ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Loads are % of{" "}
              <span className="font-semibold text-foreground">
                {lib.referenceMax}
              </span>{" "}
              — ref max{" "}
              <span className="tnum font-semibold text-foreground">
                {refEntry.value} {refEntry.unit}
              </span>{" "}
              <span className="tnum">
                ({convertRaw(
                  refEntry.value,
                  refEntry.unit,
                  refEntry.unit === "lb" ? "kg" : "lb",
                )}{" "}
                {refEntry.unit === "lb" ? "kg" : "lb"})
              </span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggleDone}
          aria-pressed={done}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors",
            done
              ? "border-success/40 bg-success/10 text-success"
              : "border-border bg-surface/60 text-muted-foreground hover:bg-accent",
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {done ? "Done" : "Mark done"}
        </button>
      </div>

      {/* Per-set table: row = set, columns = target / weight / result / hit */}
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[24rem]">
          <div className="grid grid-cols-[2rem_1fr_1.5fr_1.2fr_4.5rem] items-center gap-x-3 px-1 pb-1 text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Set</span>
            <span>Target</span>
            <span>{weightHeader}</span>
            <span>{resultHeader}</span>
            <span className="text-center">Hit?</span>
          </div>
          {ex.sets.map((set, i) => {
            const row = rows[i] ?? { weight: null, result: "", mark: null };
            return (
              <div
                key={i}
                className="grid grid-cols-[2rem_1fr_1.5fr_1.2fr_4.5rem] items-center gap-x-3 border-t border-border/60 px-1 py-1.5"
              >
                <span className="tnum text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="tnum text-sm font-semibold">{set.target}</span>

                {/* Weight cell — lb/kg editable, % resolved, BW fixed */}
                {set.loadMode === "lb" || set.loadMode === "kg" ? (
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    aria-label={`Set ${i + 1} weight for ${name} in ${unit}`}
                    className="tnum h-8 w-full max-w-24 px-2 text-sm font-semibold"
                    value={weightInUnit(row.weight, unit)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        onUpdateSet(i, { weight: null });
                        return;
                      }
                      const n = Number(v);
                      if (!Number.isNaN(n)) {
                        onUpdateSet(i, { weight: { value: n, unit } });
                      }
                    }}
                  />
                ) : set.loadMode === "pct" && set.load != null ? (
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="tnum text-xs text-muted-foreground">
                      {set.load}%
                    </span>
                    <span className="tnum text-sm font-semibold">
                      {resolvePct(set.load, lib, maxes, unit) ?? "—"}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">
                    BW
                  </span>
                )}

                {/* Result cell */}
                <Input
                  type="text"
                  aria-label={`Set ${i + 1} result for ${name}`}
                  placeholder={set.target}
                  className="tnum h-8 w-full max-w-24 px-2 text-sm"
                  value={row.result}
                  onChange={(e) => onUpdateSet(i, { result: e.target.value })}
                />

                {/* Hit / miss */}
                <span className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    aria-label={`Set ${i + 1}: hit target`}
                    aria-pressed={row.mark === "hit"}
                    onClick={() => onToggleMark(i, "hit", set.target)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                      row.mark === "hit"
                        ? "border-success/50 bg-success/15 text-success"
                        : "border-border bg-surface/60 text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Set ${i + 1}: missed target`}
                    aria-pressed={row.mark === "miss"}
                    onClick={() => onToggleMark(i, "miss", set.target)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                      row.mark === "miss"
                        ? "border-destructive/50 bg-destructive/10 text-destructive"
                        : "border-border bg-surface/60 text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (inSuperset) {
    return (
      <div
        className={cn(
          "flex gap-3 px-4 py-4 transition-colors",
          done && "bg-success/[0.05]",
        )}
      >
        {/* Connected left rail */}
        <div className="flex flex-col items-center">
          <SlotBadge slot={ex.slot} done={done} brand />
          {!isLastInGroup ? (
            <span className="-mb-8 mt-1 w-px flex-1 bg-brand/30" aria-hidden />
          ) : null}
        </div>
        {body}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-4 transition-colors",
        done
          ? "border-success/40 bg-success/[0.06]"
          : "border-border bg-surface/50",
      )}
    >
      <SlotBadge slot={ex.slot} done={done} />
      {body}
    </div>
  );
}

function SlotBadge({
  slot,
  done,
  brand = false,
}: {
  slot: string;
  done: boolean;
  brand?: boolean;
}) {
  return (
    <span
      className={cn(
        "z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-bold",
        done
          ? "border-success/50 bg-success/15 text-success"
          : brand
            ? "border-brand/40 bg-brand/10 text-brand-ink"
            : "border-border bg-muted text-muted-foreground",
      )}
    >
      {slot}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Video modal — placeholder player + points of performance            */
/* ------------------------------------------------------------------ */

function VideoModal({
  lib,
  onClose,
}: {
  lib: LibraryExercise;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${lib.name} demo video`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="eyebrow">Exercise demo</span>
            <h3 className="mt-1 text-lg">{lib.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Placeholder player frame */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Play className="h-6 w-6 fill-current pl-0.5" />
            </span>
            <span className="text-xs">Coach demo — {lib.name}</span>
          </div>
        </div>

        {lib.pointsOfPerformance.length > 0 ? (
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Points of performance
            </span>
            <ul className="mt-2 flex flex-col gap-1.5">
              {lib.pointsOfPerformance.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm">
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-ink"
                    aria-hidden
                  />
                  <span className="text-pretty">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {lib.videoUrl ? (
            <Button asChild variant="brand" size="sm">
              <a href={lib.videoUrl} target="_blank" rel="noreferrer">
                Watch on YouTube
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
