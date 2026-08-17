"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  History,
  Home,
  Link2,
  ListOrdered,
  MapPin,
  PencilLine,
  Play,
  Printer,
  Trophy,
  X,
} from "lucide-react";

import { Progress } from "@/components/app/progress";
import { TabBar } from "@/components/app/tab-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { fmtFullDay, type Pr } from "@/lib/demo/data";
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
  type CompletedSession,
  type ExerciseHistory,
  type LibraryExercise,
  type ProgramDay,
  type ProgramExercise,
  type ReferenceMaxEntry,
} from "@/lib/demo/training";
import { cn } from "@/lib/utils";

import { appendSessionFeedback } from "../session-feedback";

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

type Unit = "lb" | "kg";

interface SetLog {
  /** Logged weight, in the unit it was entered/prescribed. Null = BW / %-computed. */
  weight: { value: number; unit: Unit } | null;
  /** Display unit for THIS row — driven by the exercise-level lb⇄kg toggle. */
  unit: Unit;
  /** What the athlete actually did (reps, time, distance…). */
  result: string;
  /** Round 7: the ✗ beside the ✓ — "they hit, they miss". */
  missed?: boolean;
  /** Round 11 (M9): the ✓ confirmed this row — a typed value stays put. */
  confirmed?: boolean;
}

interface WorkoutLoggerProps {
  /** Round 10 (R9): keys the session-feedback → chat queue per athlete. */
  athleteId: string;
  days: ProgramDay[];
  exercises: Record<string, LibraryExercise>;
  history: Record<string, ExerciseHistory>;
  maxes: Record<string, ReferenceMaxEntry>;
  /** Past completed sessions — the "fix a forgotten log" tab (round 5, A2). */
  completed: CompletedSession[];
  /** Personal records — expanded on the training landing page (round 5, A8). */
  prs: Pr[];
  /** Profile-preferred unit — the default for every exercise section (A7). */
  preferredUnit: Unit;
}

const exKey = (dayId: string, slot: string) => `${dayId}:${slot}`;

function buildInitialLogs(
  days: ProgramDay[],
  defaultUnit: Unit,
): Record<string, SetLog[]> {
  const out: Record<string, SetLog[]> = {};
  for (const day of days) {
    for (const section of day.sections) {
      for (const ex of section.exercises) {
        out[exKey(day.id, ex.slot)] = ex.sets.map((s) => ({
          weight:
            (s.loadMode === "lb" || s.loadMode === "kg") && s.load != null
              ? { value: s.load, unit: s.loadMode }
              : null,
          unit: defaultUnit,
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

/** Display a logged weight in the row's current unit (live lb⇄kg swap). */
function weightInUnit(w: SetLog["weight"], unit: Unit): string {
  if (w == null) return "";
  if (w.unit === unit) return String(w.value);
  return String(w.unit === "lb" ? lbToKg(w.value) : kgToLb(w.value));
}

/** Resolve "60%" against the exercise's mother lift, numerically, in the display unit. */
function resolvePctValue(
  pct: number,
  lib: LibraryExercise | undefined,
  maxes: Record<string, ReferenceMaxEntry>,
  unit: Unit,
): number | null {
  const ref = lib?.referenceMax ? maxes[lib.referenceMax] : undefined;
  if (!ref) return null;
  return convertRaw((ref.value * pct) / 100, ref.unit, unit);
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
/* Main component — landing (tabs + PRs) or a single open workout      */
/* ------------------------------------------------------------------ */

type LandingTab = "published" | "past";

/** Round 8 (M19): Completed Workouts range chips — 30 days is the default. */
type CompletedRange = "30d" | "3m" | "1y" | "all";
const COMPLETED_RANGES: {
  key: CompletedRange;
  label: string;
  days: number | null;
}[] = [
  { key: "30d", label: "Last 30 Days", days: 30 },
  { key: "3m", label: "Last 3 Months", days: 92 },
  { key: "1y", label: "Last Year", days: 365 },
  { key: "all", label: "All", days: null },
];

export function WorkoutLogger({
  athleteId,
  days,
  exercises,
  history,
  maxes,
  completed,
  prs,
  preferredUnit,
}: WorkoutLoggerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Round 7 (R7-3): the tab lives in the URL so views are copy-pasteable.
  const [tab, setTab] = useState<LandingTab>(() =>
    searchParams.get("tab") === "past" ? "past" : "published",
  );

  // Round 11 (M1): URLs build on the current pathname — the parent persona
  // browses this page under /parent/*, which the middleware must keep.
  const listUrl = (t: LandingTab) =>
    t === "past" ? `${pathname}?tab=past` : pathname;
  const workoutUrl = (t: LandingTab, dayId: string) =>
    t === "past"
      ? `${pathname}?tab=past&workout=${dayId}`
      : `${pathname}?workout=${dayId}`;

  /** Round 11 (M1): PUSH a history entry so Back works — no-op pushes skipped. */
  function pushUrl(url: string) {
    const qs = searchParams.toString();
    const current = qs ? `${pathname}?${qs}` : pathname;
    if (url === current) return;
    router.push(url as Route, { scroll: false });
  }

  function selectTab(t: LandingTab) {
    if (t === tab) return;
    setTab(t);
    pushUrl(listUrl(t));
  }
  /** Round 8 (M18): sessions completed locally — the Completed tab's list. */
  const [localCompleted, setLocalCompleted] =
    useState<CompletedSession[]>(completed);
  /** Days completed THIS visit — they read green in Upcoming (M18). */
  const [completedDayIds, setCompletedDayIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  /** Round 8 (M19): Completed Workouts range filter — 30 days default. */
  const [completedRange, setCompletedRange] = useState<CompletedRange>("30d");
  const visibleCompleted = useMemo(() => {
    const rangeDays =
      COMPLETED_RANGES.find((r) => r.key === completedRange)?.days ?? null;
    if (rangeDays == null) return localCompleted;
    const cutoff = Date.now() - rangeDays * 86_400_000;
    return localCompleted.filter(
      (s) => new Date(s.completedOn).getTime() >= cutoff,
    );
  }, [localCompleted, completedRange]);
  /** Round 11 (M4): Upcoming paginates — the next 5 rows, +5 per Show more. */
  const [upcomingLimit, setUpcomingLimit] = useState(5);
  useEffect(() => {
    setUpcomingLimit(5);
  }, [tab]);
  /** Day ids with ANY completed session on record (seeded or this visit). */
  const completedEver = useMemo(
    () => new Set(localCompleted.map((s) => s.dayId)),
    [localCompleted],
  );
  /**
   * Upcoming = days never completed. Days completed THIS visit stay visible
   * so they read green in place (M18) until the list reloads.
   */
  const upcomingDays = useMemo(
    () =>
      days.filter((d) => !completedEver.has(d.id) || completedDayIds.has(d.id)),
    [days, completedEver, completedDayIds],
  );
  /** Success flash on the landing page after Complete Session (M18). */
  const [landingFlash, setLandingFlash] = useState<string | null>(null);
  const landingFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Round 10 (R1): PRs live in state, seeded from props — completing a
   * session with a new best updates the panel immediately ("New" pill).
   */
  const [prList, setPrList] = useState<Pr[]>(prs);
  /** Round 10 (R9): the skippable "How did the session go?" dialog. */
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    if (!feedbackOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFeedbackOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedbackOpen]);
  /**
   * Which workout is open. Null = the landing page (tabs + PR panel). When
   * opened from the Past tab we keep the session so the header can flag
   * "Editing a completed session" (A2 — fix forgotten/wrong entries).
   * Round 8 (M12): the open workout lives in the URL (?workout=dayId).
   */
  const [open, setOpen] = useState<{
    dayId: string;
    completedSession: CompletedSession | null;
  } | null>(() => {
    const w = searchParams.get("workout");
    if (w && days.some((d) => d.id === w)) {
      return {
        dayId: w,
        completedSession: completed.find((c) => c.dayId === w) ?? null,
      };
    }
    return null;
  });

  /** Round 11 (M6): true when THIS session pushed the open workout URL. */
  const openedByPush = useRef(false);

  /**
   * Round 8 (M12) / Round 11 (M6): opening a workout PUSHES a history entry
   * that keeps the current tab in the URL — Edit from Completed pushes
   * ?tab=past&workout=X, so browser Back lands on the list you came from.
   */
  function openWorkout(dayId: string, completedSession: CompletedSession | null) {
    setOpen({ dayId, completedSession });
    openedByPush.current = true;
    pushUrl(workoutUrl(tab, dayId));
  }

  function closeWorkout() {
    if (openedByPush.current) {
      // We pushed this workout open — Back returns to the exact list view.
      openedByPush.current = false;
      router.back();
    } else {
      // Deep-link arrival (e.g. a dashboard ?workout= link) — push the list.
      setOpen(null);
      pushUrl(listUrl(tab));
    }
  }

  // Round 11 (M1/M6): Back/Forward must restore the view — pushing alone
  // desyncs state, so tab + open workout re-derive from the URL on change.
  useEffect(() => {
    setTab(searchParams.get("tab") === "past" ? "past" : "published");
    const w = searchParams.get("workout");
    if (w && days.some((d) => d.id === w)) {
      setOpen((prev) =>
        prev?.dayId === w
          ? prev
          : {
              dayId: w,
              completedSession:
                localCompleted.find((c) => c.dayId === w) ?? null,
            },
      );
    } else {
      openedByPush.current = false;
      setOpen(null);
    }
    // localCompleted is read fresh but only the URL triggers this sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, days]);
  const [logs, setLogs] = useState<Record<string, SetLog[]>>(() =>
    buildInitialLogs(days, preferredUnit),
  );
  const [video, setVideo] = useState<{ lib: LibraryExercise; index: number } | null>(
    null,
  );
  /** Per-movement completion for circuit blocks (the warm-up). */
  const [circuitDone, setCircuitDone] = useState<Record<string, boolean[]>>({});

  /**
   * Round 11 (M13): autosave — in-progress logging survives Back/refresh.
   * Restore runs AFTER mount (an initializer would break SSR hydration);
   * saves only start once the restore has run, so it never clobbers storage.
   */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const storedLogs: Record<string, SetLog[]> = {};
      const storedCircuit: Record<string, boolean[]> = {};
      for (const day of days) {
        const raw = window.localStorage.getItem(
          `aos-workout-log:${athleteId}:${day.id}`,
        );
        if (!raw) continue;
        const parsed = JSON.parse(raw) as {
          logs?: Record<string, SetLog[]>;
          circuit?: Record<string, boolean[]>;
        };
        for (const [key, rows] of Object.entries(parsed.logs ?? {})) {
          if (Array.isArray(rows)) storedLogs[key] = rows;
        }
        for (const [key, items] of Object.entries(parsed.circuit ?? {})) {
          if (Array.isArray(items)) storedCircuit[key] = items;
        }
      }
      if (Object.keys(storedLogs).length > 0) {
        setLogs((prev) => {
          const next = { ...prev };
          for (const [key, rows] of Object.entries(storedLogs)) {
            const base = next[key];
            if (!base) continue;
            next[key] = base.map((row, i) => {
              const s = rows[i];
              return s && typeof s === "object" ? { ...row, ...s } : row;
            });
          }
          return next;
        });
      }
      if (Object.keys(storedCircuit).length > 0) {
        setCircuitDone((prev) => ({ ...storedCircuit, ...prev }));
      }
      const rawCompleted = window.localStorage.getItem(
        `aos-completed-local:${athleteId}`,
      );
      if (rawCompleted) {
        const parsed = JSON.parse(rawCompleted) as CompletedSession[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalCompleted(parsed);
          // A deep-linked open workout picks up its restored session too.
          setOpen((prev) =>
            prev && prev.completedSession == null
              ? {
                  ...prev,
                  completedSession:
                    parsed.find((c) => c.dayId === prev.dayId) ?? null,
                }
              : prev,
          );
        }
      }
    } catch {
      // Corrupt storage never blocks the logger — start fresh.
    }
    setHydrated(true);
  }, [athleteId, days]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      for (const day of days) {
        const prefix = `${day.id}:`;
        const dayLogs: Record<string, SetLog[]> = {};
        const dayCircuit: Record<string, boolean[]> = {};
        for (const [key, rows] of Object.entries(logs)) {
          if (key.startsWith(prefix)) dayLogs[key] = rows;
        }
        for (const [key, items] of Object.entries(circuitDone)) {
          if (key.startsWith(prefix)) dayCircuit[key] = items;
        }
        window.localStorage.setItem(
          `aos-workout-log:${athleteId}:${day.id}`,
          JSON.stringify({ logs: dayLogs, circuit: dayCircuit }),
        );
      }
    } catch {
      // Quota/private mode — logging still works for this visit.
    }
  }, [hydrated, logs, circuitDone, athleteId, days]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        `aos-completed-local:${athleteId}`,
        JSON.stringify(localCompleted),
      );
    } catch {
      // Quota/private mode — the Completed list still works for this visit.
    }
  }, [hydrated, localCompleted, athleteId]);

  /** "Everything saves automatically" — flashes on each logged change. */
  const [savedFlash, setSavedFlash] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDay = open ? days.find((d) => d.id === open.dayId) ?? null : null;

  function flashSaved() {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSavedFlash(true);
    savedTimer.current = setTimeout(() => setSavedFlash(false), 1800);
  }

  const circuitFor = (ex: ProgramExercise): CircuitItem[] | undefined =>
    exercises[ex.exerciseId]?.circuit;

  /**
   * Round 5 (A6): ANY logged set marks the whole exercise section done —
   * "if they hit a max we stop them; as long as one is done, the section is
   * done." Circuits (warm-up movement lists) still want every movement.
   */
  const isDone = (key: string, circuitLen?: number): boolean => {
    if (circuitLen) {
      const items = circuitDone[key] ?? [];
      return items.length >= circuitLen && items.slice(0, circuitLen).every(Boolean);
    }
    const rows = logs[key] ?? [];
    // A missed set was still attempted — it counts as logged (round 7).
    return rows.length > 0 && rows.some((r) => r.result.trim() !== "" || r.missed);
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

  function flashLanding(text: string) {
    if (landingFlashTimer.current) clearTimeout(landingFlashTimer.current);
    setLandingFlash(text);
    landingFlashTimer.current = setTimeout(() => setLandingFlash(null), 8000);
  }

  /** Every set with a result (or a marked miss) + every checked circuit item. */
  function countLoggedSets(day: ProgramDay): number {
    let n = 0;
    for (const section of day.sections) {
      for (const ex of section.exercises) {
        const key = exKey(day.id, ex.slot);
        const circuit = circuitFor(ex);
        if (circuit) {
          n += (circuitDone[key] ?? []).filter(Boolean).length;
        } else {
          n += (logs[key] ?? []).filter(
            (r) => r.result.trim() !== "" || r.missed,
          ).length;
        }
      }
    }
    return n;
  }

  /**
   * Round 10 (R1 bug fix): completing a session scans the logged weights —
   * any logged weight × reps that beats the PR on file for that lift
   * (matched on the library exercise name, case-insensitive: "Trap-bar
   * Deadlift" ↔ "Trap-bar deadlift") updates the Personal Records panel
   * immediately. Log 400 on the trap-bar and the PRs read 400 · "New".
   */
  function scanForPrs(day: ProgramDay): number {
    let next = prList;
    let updates = 0;
    for (const section of day.sections) {
      for (const ex of section.exercises) {
        const lib = exercises[ex.exerciseId];
        if (!lib || lib.circuit) continue;
        const liftName = lib.name.trim().toLowerCase();
        for (const row of logs[exKey(day.id, ex.slot)] ?? []) {
          // Only sets that were actually done with a weight on the bar count.
          if (row.weight == null || row.missed || row.result.trim() === "")
            continue;
          const parsedReps = parseInt(row.result, 10);
          const repCount =
            Number.isFinite(parsedReps) && parsedReps > 0
              ? parsedReps
              : undefined;
          // Weight PRs only — jumps (in) and sprints (s) never match a load.
          const matches = next.filter(
            (p) =>
              (p.unit === "lb" || p.unit === "kg") &&
              p.lift.trim().toLowerCase() === liftName,
          );
          if (matches.length === 0) continue;
          const inRowUnit = (p: Pr) =>
            convertRaw(p.value, p.unit as Unit, row.unit);
          const rowValue =
            row.weight.unit === row.unit
              ? row.weight.value
              : convertRaw(row.weight.value, row.weight.unit, row.unit);
          // Prefer the same-rep-count PR (1RM vs 3RM…); otherwise the lift's best.
          const sameReps = matches.find((p) => p.reps === repCount);
          const benchmark =
            sameReps ??
            matches.reduce((a, b) => (inRowUnit(a) >= inRowUnit(b) ? a : b));
          if (rowValue <= inRowUnit(benchmark)) continue;
          const entry: Pr = {
            id: sameReps?.id ?? `pr-local-${lib.id}-${repCount ?? "max"}`,
            lift: benchmark.lift,
            value: rowValue,
            unit: row.unit,
            reps: repCount,
            date: new Date().toISOString(),
            isNew: true,
          };
          next = sameReps
            ? next.map((p) => (p.id === sameReps.id ? entry : p))
            : [entry, ...next];
          updates += 1;
        }
      }
    }
    if (updates > 0) setPrList(next);
    return updates;
  }

  /**
   * Round 8 (M18): the bottom "Complete Session" button — moves the workout
   * into Completed Workouts and returns to the landing tabs. Until it's
   * pressed, the workout stays in Upcoming. Round 10: it also refreshes PRs
   * (R1) and opens the skippable session-feedback dialog (R9).
   */
  function completeSession() {
    if (!activeDay) return;
    const setsLogged = countLoggedSets(activeDay);
    const prUpdates = scanForPrs(activeDay);
    const entry: CompletedSession = {
      dayId: activeDay.id,
      dayNumber: activeDay.dayNumber,
      title: activeDay.title,
      completedOn: new Date().toISOString(),
      summary: `${setsLogged} ${setsLogged === 1 ? "set" : "sets"}`,
    };
    setLocalCompleted((prev) => [entry, ...prev]);
    setCompletedDayIds((prev) => new Set([...prev, activeDay.id]));
    closeWorkout();
    flashLanding(
      `Day ${activeDay.dayNumber} — ${activeDay.title} completed — it moved to Completed Workouts.${
        prUpdates > 0
          ? ` ${prUpdates === 1 ? "1 personal record" : `${prUpdates} personal records`} updated — see Personal Records below.`
          : ""
      }`,
    );
    setFeedbackText("");
    setFeedbackOpen(true);
  }

  /** Round 10 (R9): send the session feedback into the team chat. */
  function sendSessionFeedback() {
    const text = feedbackText.trim();
    if (text === "") return;
    appendSessionFeedback(athleteId, `Session Feedback: ${text}`);
    setFeedbackOpen(false);
    setFeedbackText("");
    flashLanding("Feedback sent to your coaching staff.");
  }

  function updateSet(key: string, idx: number, patch: Partial<SetLog>) {
    setLogs((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((row, i) =>
        i === idx ? { ...row, ...patch } : row,
      ),
    }));
    flashSaved();
  }

  /**
   * Round 11 (M7): the warm-up circuit completes as a unit — tapping ANY
   * movement's ✓ marks the whole block done; tapping a done block clears it.
   */
  function toggleCircuitItem(key: string, _idx: number, len: number) {
    setCircuitDone((prev) => {
      const items = prev[key] ?? [];
      const allDone =
        items.length >= len && items.slice(0, len).every(Boolean);
      return { ...prev, [key]: Array.from({ length: len }, () => !allDone) };
    });
    flashSaved();
  }

  /**
   * Round 5 (A7): the exercise-section lb⇄kg toggle — flips EVERY set in
   * that section ("different gym areas use different plates"). The default
   * comes from the athlete profile's preferred unit.
   */
  function setSectionUnit(key: string, u: Unit) {
    setLogs((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((row) => ({ ...row, unit: u })),
    }));
  }

  /**
   * One-tap set logging — Round 11 (M9): ✓ on an empty box autofills the
   * target; ✓ on a typed value KEEPS the value and confirms it; a second ✓
   * un-logs the set (clearing is the undo). The ✗ alone marks a miss.
   */
  function toggleSetCheck(key: string, idx: number, target: string) {
    flashSaved();
    setLogs((prev) => {
      const rows = prev[key] ?? [];
      return {
        ...prev,
        [key]: rows.map((row, i) => {
          if (i !== idx) return row;
          if (row.result.trim() === "")
            return { ...row, result: target, confirmed: true, missed: false };
          if (row.confirmed)
            return { ...row, result: "", confirmed: false, missed: false };
          return { ...row, confirmed: true, missed: false };
        }),
      };
    });
  }

  /** Round 7: the ✗ — mark a set missed (tap again to clear). */
  function toggleSetMiss(key: string, idx: number) {
    flashSaved();
    setLogs((prev) => {
      const rows = prev[key] ?? [];
      return {
        ...prev,
        [key]: rows.map((row, i) => {
          if (i !== idx) return row;
          const missed = !row.missed;
          return {
            ...row,
            missed,
            ...(missed ? { result: "", confirmed: false } : null),
          };
        }),
      };
    });
  }

  /* -------------------------------------------------- Landing view */

  if (!open || !activeDay) {
    return (
      <>
        {landingFlash ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/[0.08] p-3"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
            <p className="min-w-0 flex-1 text-sm text-pretty">{landingFlash}</p>
            <button
              type="button"
              onClick={() => setLandingFlash(null)}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <TabBar<LandingTab>
          tabs={[
            { value: "published", label: "Upcoming Workouts" },
            {
              value: "past",
              label: "Completed Workouts",
              count: localCompleted.length,
            },
          ]}
          active={tab}
          onSelect={selectTab}
        />

        {tab === "published" ? (
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ListOrdered className="h-5 w-5 text-brand-ink" aria-hidden />
                    <h3 className="text-base">Program</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground text-pretty">
                    Sessions run in order — day one, day two, day three,
                    restarting each week. At LPS on a remote day? Skip ahead
                    and do the next LPS session instead.
                  </p>
                </div>
              </div>

              {/* Round 7: same row format as Past Completed Sessions — just
                  "Day N — Title" + where it happens. No movement counts, no
                  focus copy. */}
              {upcomingDays.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
                  Every workout is completed — find them under Completed
                  Workouts.
                </p>
              ) : (
              <ul className="flex flex-col gap-2">
                {/* Round 11 (M4): only the next 5 upcoming rows render */}
                {upcomingDays.slice(0, upcomingLimit).map((day) => {
                  const p = dayProgress(day);
                  const completedNow = completedDayIds.has(day.id);
                  const complete =
                    completedNow || (p.total > 0 && p.done >= p.total);
                  // Up next = the first never-completed day of the FULL program.
                  const upNext =
                    days.find((d) => !completedEver.has(d.id))?.id === day.id;
                  return (
                    <li
                      key={day.id}
                      className={cn(
                        "flex flex-wrap items-center gap-3 rounded-lg border p-3",
                        complete
                          ? "border-success/40 bg-success/[0.06]"
                          : "border-border bg-surface/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                          complete
                            ? "bg-success/10 text-success"
                            : "bg-brand/10 text-brand-ink",
                        )}
                      >
                        {complete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Dumbbell className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold">
                            Day {day.dayNumber} — {day.title}
                          </span>
                          {completedNow ? (
                            <Pill tone="success" dot>
                              Completed
                            </Pill>
                          ) : upNext ? (
                            <Pill tone="brand" dot>
                              Up next
                            </Pill>
                          ) : null}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          {day.location === "gym" ? (
                            <MapPin className="h-3 w-3" aria-hidden />
                          ) : (
                            <Home className="h-3 w-3" aria-hidden />
                          )}
                          {LOCATION_LABEL[day.location]}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={
                          upNext && !completedNow ? "brand" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          openWorkout(
                            day.id,
                            completedNow
                              ? localCompleted.find(
                                  (c) => c.dayId === day.id,
                                ) ?? null
                              : null,
                          )
                        }
                      >
                        {completedNow ? (
                          <>
                            <PencilLine className="h-3.5 w-3.5" aria-hidden />
                            Edit Workout
                          </>
                        ) : (
                          "Start Workout"
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
              )}
              {upcomingDays.length > upcomingLimit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-center"
                  onClick={() => setUpcomingLimit((n) => n + 5)}
                >
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  Show more ({upcomingDays.length - upcomingLimit})
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-brand-ink" aria-hidden />
                    <h3 className="text-base">Completed Workouts</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground text-pretty">
                    Forgot to log a set, or entered the wrong unit? Open any
                    completed workout and fix the entries — everything stays
                    editable.
                  </p>
                </div>
                {/* Round 8 (M19): range chips — 30 days default */}
                <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
                  {COMPLETED_RANGES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      aria-pressed={completedRange === r.key}
                      onClick={() => setCompletedRange(r.key)}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                        completedRange === r.key
                          ? "bg-brand text-brand-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {visibleCompleted.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
                  {localCompleted.length === 0
                    ? "No completed workouts yet — finish an upcoming workout and it lands here."
                    : "Nothing in this range — try a longer one."}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visibleCompleted.map((s, i) => {
                    const dayExists = days.some((d) => d.id === s.dayId);
                    return (
                      <li
                        key={`${s.dayId}-${s.completedOn}-${i}`}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface/50 p-3"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            Day {s.dayNumber} — {s.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Completed {fmtFullDay(s.completedOn)} · {s.summary}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!dayExists}
                          onClick={() => openWorkout(s.dayId, s)}
                        >
                          <PencilLine className="h-3.5 w-3.5" aria-hidden />
                          Edit Workout
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Personal records — fully expanded on the landing page (A8).
            Round 10 (R7): #pr anchor — the dashboard PR & Accolades tile
            deep-links straight down to this section. */}
        <Card id="pr" className="scroll-mt-24">
          <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand-ink" aria-hidden />
            <h3 className="text-base">Personal Records</h3>
            <span className="ml-auto tnum text-xs text-muted-foreground">
              {prList.length} on file
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {prList.map((pr) => (
              <li
                key={pr.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand/10 text-brand-ink">
                  <Trophy className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {pr.lift}
                    {pr.reps ? (
                      <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                        {pr.reps === 1 ? "1-rep max" : `${pr.reps}-rep max`}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtFullDay(pr.date)}
                  </div>
                </div>
                <span className="tnum text-sm font-bold">
                  {pr.value}
                  <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                    {pr.unit}
                  </span>
                  {pr.reps ? (
                    <span className="ml-1 text-xs font-semibold text-muted-foreground">
                      × {pr.reps}
                    </span>
                  ) : null}
                </span>
                {pr.isNew ? <Pill tone="brand">New</Pill> : null}
              </li>
            ))}
          </ul>
          </CardContent>
        </Card>

        {/* Round 10 (R9): skippable session feedback — posts into the team
            chat as "Session Feedback: …" so every coach sees it. */}
        {feedbackOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Session feedback"
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
            onClick={() => setFeedbackOpen(false)}
          >
            <div
              className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="eyebrow">Session feedback</span>
                  <h3 className="mt-1 text-lg">How did the session go?</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
                    A quick note lands in your chat so the whole coaching
                    staff sees it — or skip it, no pressure.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(false)}
                  aria-label="Skip feedback"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Textarea
                autoFocus
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Felt strong today — top set moved fast, shoulder felt fine…"
                aria-label="How did the session go?"
              />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFeedbackOpen(false)}
                >
                  Skip
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  disabled={feedbackText.trim() === ""}
                  onClick={sendSessionFeedback}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Send to Chat
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  /* -------------------------------------------------- Open workout */

  const editingCompleted = open.completedSession;

  return (
    <>
      {/* No day-picker strip once a workout is open (A3) — just a way back. */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={closeWorkout}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          All workouts
        </Button>
        {editingCompleted ? (
          <Pill tone="info" icon={<PencilLine className="h-3 w-3" />}>
            Editing a completed session ·{" "}
            {fmtFullDay(editingCompleted.completedOn)}
          </Pill>
        ) : null}
      </div>

      {/* -------------------------------------------------- Session logger */}
      <Card className="print-flat session-print overflow-hidden">
        <CardContent className="print-tight flex flex-col gap-5 p-5 sm:p-6">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="no-print"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print Workout
              </Button>
            </div>
          </div>

          <div>
            {/* Round 8 (M13): "Workout Progress" as a percentage */}
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Workout Progress</span>
              <span className="tnum font-semibold text-foreground">
                {completionPct}%
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
                        defaultUnit={preferredUnit}
                        maxes={maxes}
                        inSuperset
                        isLastInGroup={i === group.exercises.length - 1}
                        circuitState={
                          circuitDone[exKey(activeDay.id, ex.slot)] ?? []
                        }
                        onToggleCircuitItem={(idx, len) =>
                          toggleCircuitItem(exKey(activeDay.id, ex.slot), idx, len)
                        }
                        onUpdateSet={(idx, patch) =>
                          updateSet(exKey(activeDay.id, ex.slot), idx, patch)
                        }
                        onToggleCheck={(idx, target) =>
                          toggleSetCheck(exKey(activeDay.id, ex.slot), idx, target)
                        }
                        onToggleMiss={(idx) =>
                          toggleSetMiss(exKey(activeDay.id, ex.slot), idx)
                        }
                        onSetUnit={(u) =>
                          setSectionUnit(exKey(activeDay.id, ex.slot), u)
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
                  defaultUnit={preferredUnit}
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
                  onToggleMiss={(idx) =>
                    toggleSetMiss(
                      exKey(activeDay.id, group.exercises[0]!.slot),
                      idx,
                    )
                  }
                  onSetUnit={(u) =>
                    setSectionUnit(
                      exKey(activeDay.id, group.exercises[0]!.slot),
                      u,
                    )
                  }
                  onOpenVideo={(lib, index) => setVideo({ lib, index })}
                />
              ),
            )}
          </div>

          <p className="text-xs text-muted-foreground text-pretty">
            Log what you actually did, set by set — tap the check to log the
            set as written, or type what you got. One logged set counts the
            whole exercise done, so a stopped-after-the-max day still reads
            right. Your coach sees everything.
          </p>

          {/* Round 8 (M18): Complete Session moves the workout to Completed
              Workouts — until then it stays in Upcoming. */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="min-w-0 flex-1 text-xs text-muted-foreground text-pretty">
              {editingCompleted
                ? "Edits save as you go — head back whenever you're done."
                : "Done for the day? Completing moves this workout into Completed Workouts."}
            </p>
            {editingCompleted ? (
              <Button
                type="button"
                variant="outline"
                onClick={closeWorkout}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back to Completed Workouts
              </Button>
            ) : (
              <Button type="button" variant="brand" onClick={completeSession}>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Complete Session
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Round 8 (M15): print ~2pt smaller than round 5 so a full day fits
          comfortably; the ✓/✗ mark controls never print (their grid column
          collapses too), while the Last/Best history + % ref-max lines DO
          print. Scoped to .session-print — staff print paths untouched. */}
      <style>{`
        @media print {
          .session-print { font-size: 9px; }
          .session-print .print-tight { padding: 0.5rem !important; gap: 0.5rem !important; }
          .session-print h3 { font-size: 10px !important; }
          .session-print .text-lg { font-size: 10px !important; }
          .session-print .text-base { font-size: 9px !important; }
          .session-print .text-sm { font-size: 8.5px !important; }
          .session-print .text-xs { font-size: 7.5px !important; }
          .session-print .eyebrow { font-size: 6.5px !important; }
          .session-print .p-4 { padding: 0.35rem 0.5rem !important; }
          .session-print .py-2 { padding-top: 0.15rem !important; padding-bottom: 0.15rem !important; }
          .session-print .gap-3 { gap: 0.35rem !important; }
          .session-print .gap-5 { gap: 0.45rem !important; }
          .session-print .print-set-row { padding-top: 1px !important; padding-bottom: 1px !important; }
          .session-print .print-set-row input { height: 1rem !important; font-size: 7.5px !important; }
          .session-print .rounded-xl { border-radius: 0.4rem !important; }
          .session-print .print-set-head,
          .session-print .print-set-row { grid-template-columns: 1.25rem 3rem minmax(0,1.6fr) minmax(0,1fr) !important; }
        }
      `}</style>

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

/**
 * Round 11 (M11): rewrite every "@ N lb|kg" fragment of a history summary
 * into the active section unit, with the same rounding the ref-max line uses
 * (whole lb, half-kg steps).
 */
function summaryInUnit(summary: string, unit: Unit): string {
  return summary.replace(
    /@\s*([0-9]+(?:\.[0-9]+)?)\s*(lb|kg)\b/gi,
    (_m, num: string, u: string) =>
      `@ ${convertRaw(parseFloat(num), u.toLowerCase() as Unit, unit)} ${unit}`,
  );
}

/** First "@ N lb|kg" weight inside a history summary — the seeded best. */
function summaryWeight(summary: string): { value: number; unit: Unit } | null {
  const m = /@\s*([0-9]+(?:\.[0-9]+)?)\s*(lb|kg)\b/i.exec(summary);
  return m
    ? { value: parseFloat(m[1]!), unit: m[2]!.toLowerCase() as Unit }
    : null;
}

/**
 * Round 11 (M12): "15 yd" → number for the input + unit for a suffix label.
 * Null when the target carries no trailing unit text ("0:30", plain reps).
 */
function splitTarget(target: string): { value: string; unit: string } | null {
  const m = /^([0-9]+(?:\.[0-9]+)?)\s*([a-z\/]+.*)$/i.exec(target.trim());
  return m ? { value: m[1]!, unit: m[2]! } : null;
}

function ExerciseBlock({
  ex,
  lib,
  hist,
  rows,
  done,
  defaultUnit,
  maxes,
  inSuperset = false,
  isLastInGroup = true,
  circuitState,
  onToggleCircuitItem,
  onUpdateSet,
  onToggleCheck,
  onToggleMiss,
  onSetUnit,
  onOpenVideo,
}: {
  ex: ProgramExercise;
  lib: LibraryExercise | undefined;
  hist: ExerciseHistory | undefined;
  rows: SetLog[];
  done: boolean;
  /** Fallback unit for unseeded rows — the athlete's preferred unit. */
  defaultUnit: Unit;
  maxes: Record<string, ReferenceMaxEntry>;
  inSuperset?: boolean;
  isLastInGroup?: boolean;
  circuitState: boolean[];
  onToggleCircuitItem: (idx: number, len: number) => void;
  onUpdateSet: (idx: number, patch: Partial<SetLog>) => void;
  onToggleCheck: (idx: number, target: string) => void;
  /** Round 7: the ✗ beside the ✓ — mark the set missed. */
  onToggleMiss: (idx: number) => void;
  /** The section-level lb⇄kg toggle (A7) — flips every set in this block. */
  onSetUnit: (u: Unit) => void;
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
  const usesWeight = ex.sets.some(
    (s) => s.loadMode === "lb" || s.loadMode === "kg" || s.loadMode === "pct",
  );
  const refEntry = lib?.referenceMax ? maxes[lib.referenceMax] : undefined;
  /** The whole section shares one display unit (A7). */
  const sectionUnit: Unit = rows[0]?.unit ?? defaultUnit;

  /**
   * Round 11 (M10): live best — a set logged right now can beat the seeded
   * best. Pure render-time derivation from the rows, so un-checking a set
   * reverts the line automatically. Complete Session still runs scanForPrs.
   */
  const seededBest = hist ? summaryWeight(hist.bestSummary) : null;
  let liveBest: { weight: number; unit: Unit; reps?: number } | null = null;
  for (const row of rows) {
    if (row.weight == null || row.missed || row.result.trim() === "") continue;
    if (
      liveBest == null ||
      convertRaw(row.weight.value, row.weight.unit, "lb") >
        convertRaw(liveBest.weight, liveBest.unit, "lb")
    ) {
      const parsedReps = parseInt(row.result, 10);
      liveBest = {
        weight: row.weight.value,
        unit: row.weight.unit,
        reps:
          Number.isFinite(parsedReps) && parsedReps > 0
            ? parsedReps
            : undefined,
      };
    }
  }
  const livePr =
    seededBest != null &&
    liveBest != null &&
    convertRaw(liveBest.weight, liveBest.unit, seededBest.unit) >
      seededBest.value;

  const body = (
    // Desktop + print run two columns — exercise info left, the set table
    // right — so long programs stay short on screen and on paper (A10).
    <div className="print-two-col min-w-0 flex-1 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] md:items-start md:gap-x-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{name}</span>
            {/* Round 8 (M16): circuit blocks drop the block-level play button
                — every movement row carries its own. */}
            {lib?.videoUrl && !lib.circuit ? (
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
            {hist?.isRecentPr || livePr ? (
              <Pill tone="brand" icon={<Trophy className="h-3 w-3" />}>
                PR
              </Pill>
            ) : null}
            {/* Round 8 (M17): no "Done" pill — the green block state says it */}
          </div>
          {ex.instructions ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ex.instructions}
            </p>
          ) : null}
          {hist ? (
            // Round 8 (M15): Last/Best PRINTS — coaches want it on paper.
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <History className="h-3 w-3" aria-hidden />
              {/* Round 11 (M11): Last/Best follow the section's lb⇄kg toggle;
                  (M10): a live best from today's checked sets shows in place. */}
              <span>
                Last ({daysAgo(hist.lastDate)}):{" "}
                <span className="tnum font-semibold text-foreground">
                  {summaryInUnit(hist.lastSummary, sectionUnit)}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>
                Best:{" "}
                <span className="tnum font-semibold text-foreground">
                  {livePr && liveBest
                    ? `${liveBest.reps ?? 1} @ ${convertRaw(
                        liveBest.weight,
                        liveBest.unit,
                        sectionUnit,
                      )} ${sectionUnit}`
                    : summaryInUnit(hist.bestSummary, sectionUnit)}
                </span>
              </span>
            </p>
          ) : null}
          {usesPct && lib?.referenceMax && refEntry ? (
            // Round 7 (R7-7): the note follows the section's lb⇄kg toggle so
            // "this part shows the right measurements" when units flip.
            // Round 8 (M15): the % / ref-max line PRINTS too.
            <p className="mt-1 text-xs text-muted-foreground">
              Loads are % of{" "}
              <span className="font-semibold text-foreground">
                {lib.referenceMax}
              </span>{" "}
              — ref max{" "}
              <span className="tnum font-semibold text-foreground">
                {refEntry.unit === sectionUnit
                  ? refEntry.value
                  : convertRaw(refEntry.value, refEntry.unit, sectionUnit)}{" "}
                {sectionUnit}
              </span>
            </p>
          ) : null}
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          {/* Per-section lb⇄kg toggle (A7) — defaults from the profile unit */}
          {usesWeight && !lib?.circuit ? (
            <span
              role="group"
              aria-label={`${name}: weight unit for this section`}
              title="Flips every set in this section between lb and kg"
              className="no-print flex items-center rounded-md border border-border bg-surface/60 p-0.5"
            >
              {(["lb", "kg"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={sectionUnit === u}
                  onClick={() => onSetUnit(u)}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[0.62rem] font-bold uppercase transition-colors",
                    sectionUnit === u
                      ? "bg-brand text-brand-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {u}
                </button>
              ))}
            </span>
          ) : null}
          {/* Round 7: the section-level check is gone — the per-set ✓/✗
              marks are the record, and the Done pill derives from them. */}
        </span>
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
                {/* ✓ mark control (A5) — Round 11 (M7): one tap completes the
                    whole circuit block; a second tap clears it. */}
                <button
                  type="button"
                  aria-pressed={itemDone}
                  aria-label={
                    itemDone
                      ? `${item.name}: block complete — tap to undo`
                      : `${item.name}: mark the whole block complete`
                  }
                  title={
                    itemDone
                      ? "Block complete — tap to undo"
                      : "Mark the whole block complete"
                  }
                  onClick={() => lib?.circuit && onToggleCircuitItem(i, lib.circuit.length)}
                  className={cn(
                    "no-print flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                    itemDone
                      ? "border-success/50 bg-success/15 text-success"
                      : "border-border bg-surface/60 text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
      <div className="mt-3 md:mt-0">
        <div className="print-set-head grid grid-cols-[1.25rem_3rem_minmax(0,1.6fr)_minmax(0,1fr)_3.5rem] items-center gap-x-2 pb-1 text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Set</span>
          <span className="text-center">Target</span>
          <span>
            {weightHeader}
            {usesWeight ? (
              <span className="tnum ml-1 normal-case text-muted-foreground/80">
                ({sectionUnit})
              </span>
            ) : null}
          </span>
          <span>{resultHeader}</span>
          <span aria-hidden className="no-print" />
        </div>
        {ex.sets.map((set, i) => {
          const row: SetLog =
            rows[i] ?? { weight: null, unit: defaultUnit, result: "" };
          const logged = row.result.trim() !== "";
          const missed = Boolean(row.missed);
          // Round 11 (M12): unit targets ("15 yd") — the box holds ONLY the
          // number; the unit renders as a suffix label beside the input.
          const targetParts = splitTarget(set.target);
          return (
            <div
              key={i}
              className="print-set-row grid grid-cols-[1.25rem_3rem_minmax(0,1.6fr)_minmax(0,1fr)_3.5rem] items-center gap-x-2 border-t border-border/60 py-1.5"
            >
              <span className="tnum text-xs font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className="tnum truncate text-center text-xs font-semibold">
                {set.target}
              </span>

              {/* Weight cell — editable; unit follows the section toggle */}
              {set.loadMode === "lb" || set.loadMode === "kg" ? (
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
              ) : set.loadMode === "pct" && set.load != null ? (
                /* Round 10 (R8 bug fix): the computed % load is EDITABLE —
                   prefilled from the ref max, typing overrides it (the bar
                   was heavier/lighter than the math). The % hint stays. */
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="tnum shrink-0 text-xs text-muted-foreground">
                    {set.load}%
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    aria-label={`Set ${i + 1} weight for ${name} in ${row.unit} — prescribed ${set.load}%, editable`}
                    className="tnum h-8 w-full min-w-0 px-1.5 text-sm font-semibold"
                    value={
                      row.weight != null
                        ? weightInUnit(row.weight, row.unit)
                        : resolvePctValue(set.load, lib, maxes, row.unit) ?? ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        onUpdateSet(i, { weight: null });
                        return;
                      }
                      const n = Number(v);
                      if (!Number.isNaN(n)) {
                        onUpdateSet(i, {
                          weight: { value: n, unit: row.unit },
                        });
                      }
                    }}
                  />
                </span>
              ) : (
                /* Round 10 (R8 bug fix): BW rows take an optional added load
                   — weighted vests, chains, a plate on the lap. Empty = just
                   bodyweight. */
                <span className="flex min-w-0 items-center gap-1">
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                    BW
                  </span>
                  <span
                    aria-hidden
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    +
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder="load"
                    aria-label={`Set ${i + 1} added load for ${name} in ${row.unit} — optional, on top of bodyweight`}
                    className="tnum h-8 w-full min-w-0 px-1.5 text-sm font-semibold"
                    value={
                      row.weight != null ? weightInUnit(row.weight, row.unit) : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        onUpdateSet(i, { weight: null });
                        return;
                      }
                      const n = Number(v);
                      if (!Number.isNaN(n)) {
                        onUpdateSet(i, {
                          weight: { value: n, unit: row.unit },
                        });
                      }
                    }}
                  />
                </span>
              )}

              {/* Result cell — what was done IS the record. Round 11 (M8): a
                  filled result is logged, whatever the number — only the
                  explicit ✗ marks a miss (a miss is an attempt, in red). */}
              {targetParts ? (
                <span className="flex min-w-0 items-center gap-1">
                  <Input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Set ${i + 1} result for ${name} in ${targetParts.unit}`}
                    placeholder={missed ? "Missed" : targetParts.value}
                    className={cn(
                      "tnum h-8 w-full min-w-0 px-1.5 text-sm",
                      missed &&
                        "border-destructive/50 placeholder:text-destructive/70",
                    )}
                    value={row.result}
                    onChange={(e) => onUpdateSet(i, { result: e.target.value })}
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {targetParts.unit}
                  </span>
                </span>
              ) : (
                <Input
                  type="text"
                  aria-label={`Set ${i + 1} result for ${name}`}
                  placeholder={missed ? "Missed" : set.target}
                  className={cn(
                    "tnum h-8 w-full min-w-0 px-1.5 text-sm",
                    missed && "border-destructive/50 placeholder:text-destructive/70",
                  )}
                  value={row.result}
                  onChange={(e) => onUpdateSet(i, { result: e.target.value })}
                />
              )}

              {/* Round 7: ✓ hit + ✗ miss, side by side. Never printed (M15). */}
              <span className="no-print flex items-center justify-center gap-1">
                {/* Round 11 (M9): ✓ confirms a typed value instead of
                    clearing it; only a second ✓ on a confirmed set un-logs. */}
                <button
                  type="button"
                  aria-label={
                    row.confirmed
                      ? `Set ${i + 1}: un-log this set`
                      : logged
                        ? `Set ${i + 1}: confirm the typed result`
                        : `Set ${i + 1}: hit — log as written (${set.target})`
                  }
                  aria-pressed={logged}
                  title={
                    row.confirmed
                      ? "Logged — tap to undo"
                      : logged
                        ? "Confirm this result"
                        : "Hit — log the set as written"
                  }
                  onClick={() =>
                    onToggleCheck(
                      i,
                      // M12: unit targets autofill ONLY the number.
                      targetParts ? targetParts.value : set.target,
                    )
                  }
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                    logged
                      ? "border-success/50 bg-success/15 text-success"
                      : "border-border bg-surface/60 text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label={
                    missed
                      ? `Set ${i + 1}: clear the miss`
                      : `Set ${i + 1}: mark missed`
                  }
                  aria-pressed={missed}
                  title={missed ? "Missed — tap to clear" : "Miss"}
                  onClick={() => onToggleMiss(i)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                    missed
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-border bg-surface/60 text-muted-foreground hover:bg-accent",
                  )}
                >
                  <X className="h-3 w-3" />
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
