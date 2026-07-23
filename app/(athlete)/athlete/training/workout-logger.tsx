"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  Home,
  Link2,
  ListOrdered,
  MapPin,
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
  LOCATION_LABEL,
  REP_MODE_LABEL,
  isSupersetSlot,
  kgToLb,
  lbToKg,
  slotGroup,
  type CircuitItem,
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

interface SetLog {
  /** Logged weight, in the unit it was entered/prescribed. Null = BW / %-computed. */
  weight: { value: number; unit: Unit } | null;
  /** Entry/display unit for THIS row — kg on set 1 and lb on set 2 is fine. */
  unit: Unit;
  /**
   * What the athlete actually did (reps, time, distance…). This is the whole
   * story — no separate hit/miss control. A result below target IS the miss
   * (client: "if you record how many were done you don't need hit/miss").
   */
  result: string;
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
          unit: s.loadMode === "kg" ? "kg" : "lb",
          result: "",
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
  const [video, setVideo] = useState<{ lib: LibraryExercise; index: number } | null>(
    null,
  );
  /** Per-movement completion for circuit blocks (the warm-up). */
  const [circuitDone, setCircuitDone] = useState<Record<string, boolean[]>>({});
  /** "Everything saves automatically" — flashes on each logged change. */
  const [savedFlash, setSavedFlash] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0];

  function flashSaved() {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSavedFlash(true);
    savedTimer.current = setTimeout(() => setSavedFlash(false), 1800);
  }

  const circuitFor = (ex: ProgramExercise): CircuitItem[] | undefined =>
    exercises[ex.exerciseId]?.circuit;

  const isDone = (key: string, circuitLen?: number): boolean => {
    if (doneOverride[key] != null) return doneOverride[key];
    if (circuitLen) {
      const items = circuitDone[key] ?? [];
      return items.length >= circuitLen && items.slice(0, circuitLen).every(Boolean);
    }
    const rows = logs[key] ?? [];
    return rows.length > 0 && rows.every((r) => r.result.trim() !== "");
  };

  const dayProgress = (day: ProgramDay) => {
    const all = day.sections.flatMap((s) => s.exercises);
    const done = all.filter((ex) =>
      isDone(exKey(day.id, ex.slot), circuitFor(ex)?.length),
    ).length;
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
    flashSaved();
  }

  function toggleCircuitItem(key: string, idx: number, len: number) {
    setCircuitDone((prev) => {
      const items = [...(prev[key] ?? Array.from({ length: len }, () => false))];
      items[idx] = !items[idx];
      return { ...prev, [key]: items };
    });
    flashSaved();
  }

  /** Global lb⇄kg applies to every row; rows can still be flipped one by one. */
  function applyUnitToAll(u: Unit) {
    setUnit(u);
    setLogs((prev) => {
      const next: Record<string, SetLog[]> = {};
      for (const [k, rows] of Object.entries(prev)) {
        next[k] = rows.map((r) => ({ ...r, unit: u }));
      }
      return next;
    });
  }

  /**
   * One-tap set logging: empty result → autofill the target (the common "did
   * exactly what was written" case); filled result → clear it (undo). A number
   * typed below target simply stays — that IS the miss, no extra button.
   */
  function toggleSetCheck(key: string, idx: number, target: string) {
    flashSaved();
    setLogs((prev) => {
      const rows = prev[key] ?? [];
      return {
        ...prev,
        [key]: rows.map((row, i) => {
          if (i !== idx) return row;
          return {
            ...row,
            result: row.result.trim() === "" ? target : "",
          };
        }),
      };
    });
  }

  function toggleDone(key: string, circuitLen?: number) {
    const next = !isDone(key, circuitLen);
    setDoneOverride((prev) => ({ ...prev, [key]: next }));
    flashSaved();
  }

  if (!activeDay) return null;

  return (
    <>
      {/* -------------------------------------------------- Day picker */}
      <Card className="no-print">
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-brand-ink" aria-hidden />
                <h3 className="text-base">Program</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Sessions run in order — day one, day two, day three, restarting
                each week. At LPS on a remote day? Skip ahead and do the next
                LPS session instead.
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
                          <MapPin className="h-3 w-3" />
                        ) : (
                          <Home className="h-3 w-3" />
                        )
                      }
                      className="ml-auto"
                    >
                      {LOCATION_LABEL[day.location]}
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
      <Card className="print-flat overflow-hidden">
        <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow">Session log</span>
                <Pill
                  tone={activeDay.location === "gym" ? "neutral" : "info"}
                  icon={
                    activeDay.location === "gym" ? (
                      <MapPin className="h-3 w-3" />
                    ) : (
                      <Home className="h-3 w-3" />
                    )
                  }
                >
                  {LOCATION_LABEL[activeDay.location]}
                </Pill>
                <span
                  className={cn(
                    "no-print inline-flex items-center gap-1 text-[0.68rem] font-medium transition-opacity",
                    savedFlash ? "text-success opacity-100" : "text-muted-foreground/70 opacity-80",
                  )}
                  aria-live="polite"
                >
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  {savedFlash ? "Saved" : "Saves automatically"}
                </span>
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
                aria-label="Weight unit — applies to all sets"
                title="Sets all rows — each set also has its own lb/kg flip"
                className="no-print flex items-center rounded-lg border border-border bg-surface/60 p-0.5"
              >
                {(["lb", "kg"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={unit === u}
                    onClick={() => applyUnitToAll(u)}
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

          {/* One continuous A → B → C → D1/D2 list — the section labels are a
              coach concept and stay internal (client feedback, round 3). */}
          <div className="flex flex-col gap-3">
            {groupExercises(
              activeDay.sections.flatMap((s) => s.exercises),
            ).map((group) =>
              group.superset ? (
                <div
                  key={group.key}
                  className="overflow-hidden rounded-xl border border-brand/30"
                >
                  <div className="flex flex-wrap items-center gap-2 border-b border-brand/20 bg-brand/[0.06] px-4 py-2">
                    <Link2 className="h-3.5 w-3.5 text-brand-ink" aria-hidden />
                    <span className="text-xs font-bold uppercase tracking-wide text-brand-ink">
                      Superset
                      {group.exercises.length > 2
                        ? ` ×${group.exercises.length}`
                        : ""}
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
                        done={isDone(
                          exKey(activeDay.id, ex.slot),
                          circuitFor(ex)?.length,
                        )}
                        unit={unit}
                        maxes={maxes}
                        inSuperset
                        isLastInGroup={i === group.exercises.length - 1}
                        circuitState={
                          circuitDone[exKey(activeDay.id, ex.slot)] ?? []
                        }
                        onToggleCircuitItem={(idx, len) =>
                          toggleCircuitItem(exKey(activeDay.id, ex.slot), idx, len)
                        }
                        onToggleDone={() =>
                          toggleDone(
                            exKey(activeDay.id, ex.slot),
                            circuitFor(ex)?.length,
                          )
                        }
                        onUpdateSet={(idx, patch) =>
                          updateSet(exKey(activeDay.id, ex.slot), idx, patch)
                        }
                        onToggleCheck={(idx, target) =>
                          toggleSetCheck(exKey(activeDay.id, ex.slot), idx, target)
                        }
                        onOpenVideo={(lib, index) => setVideo({ lib, index })}
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
                  done={isDone(
                    exKey(activeDay.id, group.exercises[0]!.slot),
                    circuitFor(group.exercises[0]!)?.length,
                  )}
                  unit={unit}
                  maxes={maxes}
                  circuitState={
                    circuitDone[exKey(activeDay.id, group.exercises[0]!.slot)] ??
                    []
                  }
                  onToggleCircuitItem={(idx, len) =>
                    toggleCircuitItem(
                      exKey(activeDay.id, group.exercises[0]!.slot),
                      idx,
                      len,
                    )
                  }
                  onToggleDone={() =>
                    toggleDone(
                      exKey(activeDay.id, group.exercises[0]!.slot),
                      circuitFor(group.exercises[0]!)?.length,
                    )
                  }
                  onUpdateSet={(idx, patch) =>
                    updateSet(
                      exKey(activeDay.id, group.exercises[0]!.slot),
                      idx,
                      patch,
                    )
                  }
                  onToggleCheck={(idx, target) =>
                    toggleSetCheck(
                      exKey(activeDay.id, group.exercises[0]!.slot),
                      idx,
                      target,
                    )
                  }
                  onOpenVideo={(lib, index) => setVideo({ lib, index })}
                />
              ),
            )}
          </div>

          <p className="text-xs text-muted-foreground text-pretty">
            Log what you actually did, set by set — tap the check to log the
            set as written, or type what you got. Marking an exercise done
            counts even if you stopped after the top set. Your coach sees
            everything.
          </p>
        </CardContent>
      </Card>

      {video ? (
        <VideoModal
          lib={video.lib}
          index={video.index}
          onNavigate={(i) => {
            const max = (video.lib.circuit?.length ?? 1) - 1;
            if (i < 0 || i > max) return;
            setVideo({ lib: video.lib, index: i });
          }}
          onClose={() => setVideo(null)}
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exercise block — header, history line, per-set table                */
/* ------------------------------------------------------------------ */

/** True when a logged result reads below the written target ("4" vs "6"). */
function belowTarget(result: string, target: string): boolean {
  const r = parseFloat(result.replace(",", "."));
  const t = parseFloat(target.replace(",", "."));
  return Number.isFinite(r) && Number.isFinite(t) && r < t;
}

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
  circuitState,
  onToggleCircuitItem,
  onToggleDone,
  onUpdateSet,
  onToggleCheck,
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
  circuitState: boolean[];
  onToggleCircuitItem: (idx: number, len: number) => void;
  onToggleDone: () => void;
  onUpdateSet: (idx: number, patch: Partial<SetLog>) => void;
  onToggleCheck: (idx: number, target: string) => void;
  onOpenVideo: (lib: LibraryExercise, index: number) => void;
}) {
  const name = lib?.name ?? ex.exerciseId;
  const firstMode = ex.sets[0]?.loadMode ?? "lb";
  const weightHeader =
    firstMode === "lb" || firstMode === "kg"
      ? "Weight"
      : LOAD_MODE_LABEL[firstMode];
  const resultHeader =
    ex.repMode === "reps" ? "Done" : REP_MODE_LABEL[ex.repMode];

  const usesPct = ex.sets.some((s) => s.loadMode === "pct");
  const refEntry = lib?.referenceMax ? maxes[lib.referenceMax] : undefined;

  const body = (
    // Desktop + print run two columns — exercise info left, the set table
    // right — so long programs stay short on screen and on paper (A10).
    <div className="print-two-col min-w-0 flex-1 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] md:items-start md:gap-x-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{name}</span>
            {lib?.videoUrl ? (
              <button
                type="button"
                onClick={() => onOpenVideo(lib, 0)}
                aria-label={`Watch ${name} demo video`}
                className="no-print inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
              >
                <Play className="h-3 w-3 fill-current" />
              </button>
            ) : null}
            {lib?.circuit ? (
              <Pill tone="neutral" icon={<Play className="h-2.5 w-2.5" />}>
                {lib.circuit.length} videos
              </Pill>
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
            <p className="no-print mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
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
            <p className="no-print mt-1 text-xs text-muted-foreground">
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

      {/* Circuit blocks (warm-up): one row PER MOVEMENT, each with its own
          video and complete toggle — TrainHeroic's long-list-of-videos model. */}
      {lib?.circuit ? (
        <ol className="mt-3 flex flex-col gap-1.5 md:mt-0">
          {lib.circuit.map((item, i) => {
            const itemDone = circuitState[i] ?? false;
            return (
              <li
                key={item.name}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors",
                  itemDone
                    ? "border-success/40 bg-success/[0.06]"
                    : "border-border bg-surface/60",
                )}
              >
                <span className="tnum flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[0.62rem] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => lib && onOpenVideo(lib, i)}
                  aria-label={`Watch ${item.name} demo video`}
                  className="no-print flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
                >
                  <Play className="h-3 w-3 fill-current" />
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.prescription}
                  </span>
                </span>
                <button
                  type="button"
                  aria-pressed={itemDone}
                  aria-label={`${item.name}: mark complete`}
                  onClick={() => lib?.circuit && onToggleCircuitItem(i, lib.circuit.length)}
                  className={cn(
                    "flex h-7 w-16 shrink-0 items-center justify-center gap-1 rounded-md border text-[0.65rem] font-semibold transition-colors",
                    itemDone
                      ? "border-success/50 bg-success/15 text-success"
                      : "border-border bg-surface/60 text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Check className="h-3 w-3" />
                  {itemDone ? "Done" : "Mark"}
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
      <div className="mt-3 md:mt-0">
        <div className="grid grid-cols-[1.25rem_3rem_minmax(0,1.6fr)_minmax(0,1fr)_1.75rem] items-center gap-x-2 pb-1 text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Set</span>
          <span className="text-center">Target</span>
          <span>{weightHeader}</span>
          <span>{resultHeader}</span>
          <span aria-hidden />
        </div>
        {ex.sets.map((set, i) => {
          const row: SetLog =
            rows[i] ?? { weight: null, unit: "lb", result: "" };
          const logged = row.result.trim() !== "";
          const short = logged && belowTarget(row.result, set.target);
          return (
            <div
              key={i}
              className="print-set-row grid grid-cols-[1.25rem_3rem_minmax(0,1.6fr)_minmax(0,1fr)_1.75rem] items-center gap-x-2 border-t border-border/60 py-1.5"
            >
              <span className="tnum text-xs font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className="tnum truncate text-center text-xs font-semibold">
                {set.target}
              </span>

              {/* Weight cell — editable with a PER-SET lb/kg flip, % resolved, BW fixed */}
              {set.loadMode === "lb" || set.loadMode === "kg" ? (
                <span className="flex min-w-0 items-center gap-1">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    aria-label={`Set ${i + 1} weight for ${name} in ${row.unit}`}
                    className="tnum h-8 w-full min-w-0 px-1.5 text-sm font-semibold"
                    value={weightInUnit(row.weight, row.unit)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        onUpdateSet(i, { weight: null });
                        return;
                      }
                      const n = Number(v);
                      if (!Number.isNaN(n)) {
                        onUpdateSet(i, { weight: { value: n, unit: row.unit } });
                      }
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Set ${i + 1}: switch unit (now ${row.unit})`}
                    title="Flip this set between lb and kg"
                    onClick={() =>
                      onUpdateSet(i, { unit: row.unit === "lb" ? "kg" : "lb" })
                    }
                    className="no-print flex h-8 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface/60 text-[0.6rem] font-bold uppercase text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
                  >
                    {row.unit}
                  </button>
                </span>
              ) : set.loadMode === "pct" && set.load != null ? (
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                  <span className="tnum text-xs text-muted-foreground">
                    {set.load}%
                  </span>
                  <span className="tnum truncate text-sm font-semibold">
                    {resolvePct(set.load, lib, maxes, row.unit) ?? "—"}
                  </span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  BW
                </span>
              )}

              {/* Result cell — what was done IS the record. A number under
                  target quietly reads amber; no separate miss button. */}
              <Input
                type="text"
                aria-label={`Set ${i + 1} result for ${name}`}
                placeholder={set.target}
                className={cn(
                  "tnum h-8 w-full min-w-0 px-1.5 text-sm",
                  short && "text-warning",
                )}
                value={row.result}
                onChange={(e) => onUpdateSet(i, { result: e.target.value })}
              />

              {/* One-tap log: empty → fill the target; filled → clear */}
              <span className="flex items-center justify-center">
                <button
                  type="button"
                  aria-label={
                    logged
                      ? `Set ${i + 1}: clear logged result`
                      : `Set ${i + 1}: log as written (${set.target})`
                  }
                  aria-pressed={logged}
                  title={logged ? "Clear this set" : "Log the set as written"}
                  onClick={() => onToggleCheck(i, set.target)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                    logged
                      ? short
                        ? "border-warning/50 bg-warning/10 text-warning"
                        : "border-success/50 bg-success/15 text-success"
                      : "border-border bg-surface/60 text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Check className="h-3 w-3" />
                </button>
              </span>
            </div>
          );
        })}
      </div>
      )}
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
/* Video modal — inline player; circuit blocks get a full playlist     */
/* (TrainHeroic model: one video per movement, flip through them).     */
/* ------------------------------------------------------------------ */

function VideoModal({
  lib,
  index,
  onNavigate,
  onClose,
}: {
  lib: LibraryExercise;
  index: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate(index + 1);
      if (e.key === "ArrowLeft") onNavigate(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNavigate, index]);

  const playlist = lib.circuit ?? null;
  const current = playlist ? playlist[Math.min(index, playlist.length - 1)] : null;
  const title = current ? current.name : lib.name;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} demo video`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto scrollbar-slim rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="eyebrow">Exercise demo</span>
            <h3 className="mt-1 truncate text-lg">{title}</h3>
            {playlist ? (
              <p className="text-xs text-muted-foreground">
                Video {Math.min(index, playlist.length - 1) + 1} of{" "}
                {playlist.length} — {lib.name}
                {current ? ` · ${current.prescription}` : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inline player — plays right here, no YouTube hand-off. */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Play className="h-6 w-6 fill-current pl-0.5" />
            </span>
            <span className="px-4 text-center text-xs">
              Coach demo — {title}
            </span>
            <span className="px-4 text-center text-[0.65rem] text-muted-foreground/70">
              Demo build — production streams the clip inline here.
            </span>
          </div>
          {playlist ? (
            <>
              <button
                type="button"
                aria-label="Previous video"
                disabled={index <= 0}
                onClick={() => onNavigate(index - 1)}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next video"
                disabled={index >= playlist.length - 1}
                onClick={() => onNavigate(index + 1)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>

        {/* Playlist — click through every movement in the block. */}
        {playlist ? (
          <ol className="flex flex-col gap-1">
            {playlist.map((item, i) => {
              const active = i === index;
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => onNavigate(i)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      active
                        ? "border-brand/40 bg-brand/10"
                        : "border-border bg-surface/50 hover:bg-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                        active
                          ? "bg-brand text-brand-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Play className="h-2.5 w-2.5 fill-current" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {i + 1}. {item.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.prescription}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : lib.pointsOfPerformance.length > 0 ? (
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

        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
