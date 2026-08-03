"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Dumbbell,
  GripVertical,
  Home,
  Info,
  LayoutList,
  Library,
  Link2,
  Link2Off,
  ListChecks,
  Minus,
  Pencil,
  Plus,
  Repeat2,
  Search,
  Trash2,
  Undo2,
  Video,
  X,
} from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";

import { VideoModal } from "@/components/app/video-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  LOCATION_LABEL,
  SECTION_COLORS,
  jordanProgramDays,
  kgToLb,
  lbToKg,
  programTemplates,
  scaffoldProgram,
  type AthleteProgram,
  type LibraryExercise,
  type LoadMode,
  type ProgramDay,
  type ProgramSection,
  type ProgramTemplate,
  type ReferenceMaxEntry,
  type RepMode,
  type SectionColor,
} from "@/lib/demo/training";
import { cn } from "@/lib/utils";

import {
  BuilderCalendar,
  type BuilderCalendarMove,
  type BuilderCalendarWeek,
} from "./builder-calendar";

/* ------------------------------------------------------------------ */
/* Editable state model — units live PER SET, like TrainHeroic         */
/* ------------------------------------------------------------------ */

interface EdSet {
  target: string;
  /** Load as an input string; "" = blank — the athlete fills it in. */
  load: string;
  /** Per-set unit: kg for set 1, lb for set 2 is fully supported. */
  unit: LoadMode;
}

interface EdExercise {
  uid: string;
  exerciseId: string;
  instructions: string;
  /** C16 — per-program note; "" falls back to the library's points. */
  noteOverride: string;
  repMode: RepMode;
  sets: EdSet[];
  /** True when this exercise is supersetted with the NEXT one in the section. */
  linkNext: boolean;
}

interface EdSection {
  uid: string;
  title: string;
  /** C21 — coach-picked accent color. */
  color?: SectionColor;
  exercises: EdExercise[];
}

interface EdDay {
  id: string;
  dayNumber: number;
  /** C17 — "1A"/"1B" when a day holds multiple sessions. */
  dayLabel?: string;
  title: string;
  location: "gym" | "home";
  focus: string;
  published: boolean;
  sections: EdSection[];
}

interface EdWeek {
  weekNumber: number;
  /** C25 — coach-renamed week ("Deload", "Test week"…). */
  label?: string;
  days: EdDay[];
}

let uidCounter = 0;
const uid = () => `ed-${++uidCounter}`;

function sectionsToEd(sections: ProgramSection[]): EdSection[] {
  return sections.map((s) => {
    const exercises = s.exercises.map((e, i) => {
      const grp = e.slot.replace(/\d+$/, "");
      const next = s.exercises[i + 1];
      const nextGrp = next ? next.slot.replace(/\d+$/, "") : null;
      return {
        uid: uid(),
        exerciseId: e.exerciseId,
        instructions: e.instructions ?? "",
        noteOverride: e.noteOverride ?? "",
        repMode: e.repMode,
        sets: e.sets.map((set) => ({
          target: set.target,
          load: set.load == null ? "" : String(set.load),
          unit: set.loadMode,
        })),
        linkNext: nextGrp !== null && nextGrp === grp && /\d$/.test(e.slot),
      } satisfies EdExercise;
    });
    return { uid: uid(), title: s.title, color: s.color, exercises };
  });
}

function toEditable(program: AthleteProgram): EdWeek[] {
  return program.weeks.map((w) => ({
    weekNumber: w.weekNumber,
    days: relabelDays(
      w.days.map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        dayLabel: d.dayLabel,
        title: d.title,
        location: d.location,
        focus: d.focus,
        published: d.published ?? true,
        sections: sectionsToEd(d.sections),
      })),
    ),
  }));
}

/**
 * Display slots: chained `linkNext` exercises share a letter (D1/D2/D3…).
 * `spans` carries each exercise's group size so triples can be labeled
 * "Superset ×3". `letterOffset` keeps lettering continuous across the whole
 * session, like TrainHeroic (Warm-up = A, next block starts at B, …).
 */
function computeSlots(
  exercises: EdExercise[],
  letterOffset: number,
): { slots: string[]; spans: number[]; groups: number } {
  const slots: string[] = [];
  const spans: number[] = [];
  let letterIdx = letterOffset;
  let i = 0;
  while (i < exercises.length) {
    let span = 1;
    while (i + span - 1 < exercises.length - 1 && exercises[i + span - 1].linkNext) {
      span++;
    }
    const letter = String.fromCharCode(65 + (letterIdx % 26));
    for (let k = 0; k < span; k++) {
      slots.push(span === 1 ? letter : `${letter}${k + 1}`);
      spans.push(span);
    }
    letterIdx++;
    i += span;
  }
  return { slots, spans, groups: letterIdx - letterOffset };
}

const UNIT_OPTIONS: { value: LoadMode; label: string }[] = [
  { value: "lb", label: "lb" },
  { value: "kg", label: "kg" },
  { value: "pct", label: "%" },
  { value: "bw", label: "BW" },
];

const DEFAULT_TARGET: Record<RepMode, string> = {
  reps: "8",
  time: "0:30",
  distance: "20 m",
  height: "24 in",
  cal: "10",
  watts: "250",
  velocity: "0.8 m/s",
};

const DEFAULT_SECTION_TITLES = ["Warm-up", "Strength", "Accessory"];

/** Legacy title-based hues — used until the coach picks a color (C21). */
const SECTION_HUES: Record<string, number> = {
  "Warm-up": 200,
  "Speed Strength": 25,
  Strength: 210,
  Activation: 160,
  Accessory: 265,
  "Injury Prevention": 285,
  Circuit: 330,
  Speed: 350,
};
function sectionHue(title: string): number {
  return SECTION_HUES[title] ?? 210;
}

const SECTION_COLOR_CSS: Record<SectionColor, string> = {
  neutral: "hsl(215 15% 55%)",
  red: "hsl(0 72% 50%)",
  orange: "hsl(25 85% 50%)",
  green: "hsl(150 65% 40%)",
  blue: "hsl(210 80% 50%)",
  purple: "hsl(270 65% 55%)",
};

function sectionAccent(section: EdSection): string {
  return section.color
    ? SECTION_COLOR_CSS[section.color]
    : `hsl(${sectionHue(section.title)} 72% 48%)`;
}

/** Convert a numeric load string between units where that makes sense. */
function convertLoad(load: string, from: LoadMode, to: LoadMode): string {
  if (load === "") return load;
  const n = Number(load);
  if (Number.isNaN(n)) return load;
  if (from === "lb" && to === "kg") return String(lbToKg(n));
  if (from === "kg" && to === "lb") return String(kgToLb(n));
  return load;
}

/**
 * C17 — keep session labels consistent: a weekday with one session shows
 * plain "Day N"; with several it becomes "1A"/"1B"/"1C". Days sort by
 * weekday, sessions keep their insertion order within it.
 */
function relabelDays(days: EdDay[]): EdDay[] {
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const counts = new Map<number, number>();
  for (const d of sorted) counts.set(d.dayNumber, (counts.get(d.dayNumber) ?? 0) + 1);
  const seen = new Map<number, number>();
  return sorted.map((d) => {
    const total = counts.get(d.dayNumber) ?? 1;
    if (total <= 1) {
      return d.dayLabel == null ? d : { ...d, dayLabel: undefined };
    }
    const idx = seen.get(d.dayNumber) ?? 0;
    seen.set(d.dayNumber, idx + 1);
    const label = `${d.dayNumber}${String.fromCharCode(65 + idx)}`;
    return d.dayLabel === label ? d : { ...d, dayLabel: label };
  });
}

/* ------------------------------------------------------------------ */
/* Publish scheduling (C16) — "5:00 AM, N days in advance"             */
/* ------------------------------------------------------------------ */

type AutoPublishRule = AthleteProgram["autoPublish"];

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CAL_WEEKDAY = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${hour < 12 ? "AM" : "PM"}`;
}

/** Monday 00:00 of the current week — week 1 of the block is "this week". */
function mondayOfThisWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

type PublishState =
  | { kind: "published"; label: string }
  | { kind: "scheduled"; label: string }
  | { kind: "draft"; label: string };

/**
 * Day N of week W trains on Monday + offset; auto-publish fires `daysAhead`
 * days before that at `hour`. Fires within the coming week → the day shows
 * as scheduled ("Publishes Thu 5:00 AM"); farther out (or already past) →
 * plain Draft until the schedule reaches it or the coach publishes by hand.
 */
function publishState(
  weekNumber: number,
  dayNumber: number,
  published: boolean,
  auto: AutoPublishRule,
): PublishState {
  if (published) return { kind: "published", label: "Published" };
  if (auto.enabled) {
    const publishAt = mondayOfThisWeek();
    publishAt.setDate(
      publishAt.getDate() + (weekNumber - 1) * 7 + (dayNumber - 1) - auto.daysAhead,
    );
    publishAt.setHours(auto.hour, 0, 0, 0);
    const untilMs = publishAt.getTime() - Date.now();
    if (untilMs > 0 && untilMs <= 7 * 24 * 60 * 60 * 1000) {
      return {
        kind: "scheduled",
        label: `Publishes ${WEEKDAY_SHORT[publishAt.getDay()]} ${hourLabel(auto.hour)}`,
      };
    }
  }
  return { kind: "draft", label: "Draft" };
}

/* ------------------------------------------------------------------ */
/* Cross-athlete clipboards (C15/C21) — survive navigation             */
/* ------------------------------------------------------------------ */

const CLIPBOARD_KEY = "aos-day-clipboard";
const SECTION_CLIPBOARD_KEY = "aos-section-clipboard";

interface DayClipboard {
  v: 2;
  sourceAthleteName: string;
  dayTitle: string;
  dayNumber: number;
  sections: EdSection[];
}

interface SectionClipboard {
  v: 1;
  sourceName: string;
  title: string;
  color?: SectionColor;
  exercises: EdExercise[];
}

function readClipboard(): DayClipboard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLIPBOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DayClipboard;
    if (
      parsed == null ||
      parsed.v !== 2 ||
      typeof parsed.sourceAthleteName !== "string" ||
      !Array.isArray(parsed.sections)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readSectionClipboard(): SectionClipboard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SECTION_CLIPBOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SectionClipboard;
    if (
      parsed == null ||
      parsed.v !== 1 ||
      typeof parsed.title !== "string" ||
      !Array.isArray(parsed.exercises)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Deep-clone exercises with fresh uids (paste / duplicate / repeat-week). */
function cloneExercises(list: EdExercise[]): EdExercise[] {
  return (JSON.parse(JSON.stringify(list)) as EdExercise[]).map((e) => ({
    ...e,
    uid: uid(),
  }));
}

/** Deep-clone sections with fresh uids. */
function cloneSections(sections: EdSection[]): EdSection[] {
  return sections.map((s) => ({
    ...s,
    uid: uid(),
    exercises: cloneExercises(s.exercises),
  }));
}

const blankSections = () =>
  DEFAULT_SECTION_TITLES.map(
    (title): EdSection => ({ uid: uid(), title, exercises: [] }),
  );

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ProgramBuilder({
  athleteName,
  isTemplateView = false,
  program,
  library,
  maxes,
  mode = "athlete",
  initialWeek,
  initialDay,
}: {
  athleteId?: string;
  athleteName: string;
  /** Non-Jordan athletes reuse the same block structure as a demo template. */
  isTemplateView?: boolean;
  program: AthleteProgram;
  library: LibraryExercise[];
  maxes: Record<string, ReferenceMaxEntry>;
  /** "template" = editing a master template — no per-athlete publish controls. */
  mode?: "athlete" | "template";
  /** G9 — deep link (?week=2&day=…): open this week/day on mount. */
  initialWeek?: number;
  initialDay?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [weeks, setWeeks] = useState<EdWeek[]>(() => toEditable(program));
  // G9 — honor a ?week=/&day= deep link when it points at a real week/day.
  const [activeWeekNo, setActiveWeekNo] = useState(() =>
    initialWeek && program.weeks.some((w) => w.weekNumber === initialWeek)
      ? initialWeek
      : program.weeks[0]?.weekNumber ?? 1,
  );
  const [activeDayId, setActiveDayId] = useState(() => {
    const weekNo =
      initialWeek && program.weeks.some((w) => w.weekNumber === initialWeek)
        ? initialWeek
        : program.weeks[0]?.weekNumber ?? 1;
    const week = program.weeks.find((w) => w.weekNumber === weekNo);
    if (initialDay && week?.days.some((d) => d.id === initialDay)) {
      return initialDay;
    }
    return week?.days[0]?.id ?? "";
  });
  const [view, setView] = useState<"builder" | "calendar">("builder");
  const [autoPub, setAutoPub] = useState<AutoPublishRule>(program.autoPublish);
  const [autoPubOpen, setAutoPubOpen] = useState(false);
  const [weekMenuOpen, setWeekMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [sectionEdit, setSectionEdit] = useState<number | null>(null);
  const [libPick, setLibPick] = useState<"section" | "day" | "program" | null>(null);
  const [clipboard, setClipboard] = useState<DayClipboard | null>(null);
  const [sectionClip, setSectionClip] = useState<SectionClipboard | null>(null);
  const [picker, setPicker] = useState<{ sectionIdx: number } | null>(null);
  const [video, setVideo] = useState<LibraryExercise | null>(null);
  const [drag, setDrag] = useState<{ sectionIdx: number; exIdx: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    sectionIdx: number;
    exIdx: number;
  } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** G6 — pending destructive action; nothing deletes without a confirm. */
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    body: string;
    onConfirm: () => void;
  } | null>(null);
  /** G6 — Save to Library asks save-as-new vs overwrite. */
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  /** G6 — undo history: previous `weeks` states, capped at 25. */
  const historyRef = useRef<{ stack: EdWeek[][]; lastKey: string | null }>({
    stack: [],
    lastKey: null,
  });
  const [historyLen, setHistoryLen] = useState(0);
  /** G6 — subtle "Auto-saved" flash whenever the program changes. */
  const [autoSaved, setAutoSaved] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<{
    weeks: EdWeek[];
    autoPub: AutoPublishRule;
  } | null>(null);

  // Clipboards live in localStorage so a day/section copied on Jordan's
  // builder can be pasted on Maya's — read them once the client mounts.
  useEffect(() => {
    setClipboard(readClipboard());
    setSectionClip(readSectionClipboard());
  }, []);

  // G6 — every edit auto-saves (local demo state); say so in the UI.
  useEffect(() => {
    const prev = lastSavedRef.current;
    lastSavedRef.current = { weeks, autoPub };
    if (!prev || (prev.weeks === weeks && prev.autoPub === autoPub)) return;
    setAutoSaved(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => setAutoSaved(false), 1800);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [weeks, autoPub]);

  // G9 — the URL mirrors the selection (?week=2&day=…) so week/day views are
  // shareable deep links. Other params (e.g. the New-program name/weeks/days)
  // are preserved; router.replace keeps history clean.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("week") === String(activeWeekNo) &&
      params.get("day") === (activeDayId || null)
    ) {
      return;
    }
    params.set("week", String(activeWeekNo));
    if (activeDayId) params.set("day", activeDayId);
    else params.delete("day");
    router.replace(`${pathname}?${params.toString()}` as Route, {
      scroll: false,
    });
  }, [activeWeekNo, activeDayId, pathname, router]);

  const activeWeek =
    weeks.find((w) => w.weekNumber === activeWeekNo) ?? weeks[0];
  const active =
    activeWeek?.days.find((d) => d.id === activeDayId) ?? activeWeek?.days[0];
  const libById = useMemo(() => new Map(library.map((e) => [e.id, e])), [library]);

  function say(msg: string) {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(msg);
    flashTimer.current = setTimeout(() => setFlash(null), 2600);
  }

  /* ---- undo history (G6) ---- */

  /**
   * Record the current program state before a change. Deletes, moves,
   * pastes and renames all snapshot; passing a `mergeKey` collapses a
   * burst of keystrokes on the same field into ONE undo step.
   */
  function snapshot(mergeKey?: string) {
    const h = historyRef.current;
    if (mergeKey && h.lastKey === mergeKey) return;
    h.stack.push(weeks);
    if (h.stack.length > 25) h.stack.shift();
    h.lastKey = mergeKey ?? null;
    setHistoryLen(h.stack.length);
  }

  function undo() {
    const h = historyRef.current;
    const prev = h.stack.pop();
    if (!prev) return;
    h.lastKey = null;
    setHistoryLen(h.stack.length);
    setWeeks(prev);
    // Re-anchor the selection — the restored state may not contain it.
    const wk = prev.find((w) => w.weekNumber === activeWeekNo) ?? prev[0];
    if (wk) {
      setActiveWeekNo(wk.weekNumber);
      const day = wk.days.find((d) => d.id === activeDayId) ?? wk.days[0];
      setActiveDayId(day?.id ?? "");
    }
    say("Undid the last change.");
  }

  const undoRef = useRef(undo);
  undoRef.current = undo;

  // Ctrl+Z / Cmd+Z while the builder is mounted (text fields keep their
  // native undo — the shortcut only fires outside inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey) return;
      if (e.key.toLowerCase() !== "z") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      undoRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function patchDay(dayId: string, fn: (d: EdDay) => EdDay) {
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        days: w.days.map((d) => (d.id === dayId ? fn(d) : d)),
      })),
    );
  }

  if (!active || !activeWeek) return null;

  function patchExercise(
    sectionIdx: number,
    exUid: string,
    fn: (e: EdExercise) => EdExercise,
  ) {
    patchDay(active!.id, (d) => ({
      ...d,
      sections: d.sections.map((s, si) =>
        si === sectionIdx
          ? { ...s, exercises: s.exercises.map((e) => (e.uid === exUid ? fn(e) : e)) }
          : s,
      ),
    }));
  }

  function patchSet(
    sectionIdx: number,
    exUid: string,
    setIdx: number,
    fn: (s: EdSet) => EdSet,
  ) {
    patchExercise(sectionIdx, exUid, (e) => ({
      ...e,
      sets: e.sets.map((s, i) => (i === setIdx ? fn(s) : s)),
    }));
  }

  function patchSection(sectionIdx: number, fn: (s: EdSection) => EdSection) {
    patchDay(active!.id, (d) => ({
      ...d,
      sections: d.sections.map((s, si) => (si === sectionIdx ? fn(s) : s)),
    }));
  }

  /* ---- week / day selection ---- */

  function selectWeek(week: EdWeek) {
    setActiveWeekNo(week.weekNumber);
    setWeekMenuOpen(false);
    setSectionEdit(null);
    const match =
      week.days.find((d) => d.dayNumber === active?.dayNumber) ?? week.days[0];
    if (match) setActiveDayId(match.id);
  }

  /* ---- week management (C19/C26) ---- */

  const renumberWeeks = (ws: EdWeek[]): EdWeek[] =>
    ws.map((w, i) => ({ ...w, weekNumber: i + 1 }));

  function addWeek() {
    const last = weeks[weeks.length - 1];
    const skeleton =
      last && last.days.length > 0
        ? last.days.map((d) => ({
            dayNumber: d.dayNumber,
            title: d.title,
            location: d.location,
          }))
        : [{ dayNumber: 1, title: "Day 1", location: "gym" as const }];
    const days: EdDay[] = relabelDays(
      skeleton.map((d) => ({
        id: uid(),
        dayNumber: d.dayNumber,
        title: d.title,
        location: d.location,
        focus: "New week — add movements",
        published: false,
        sections: blankSections(),
      })),
    );
    const week: EdWeek = { weekNumber: weeks.length + 1, days };
    snapshot();
    setWeeks((prev) => renumberWeeks([...prev, week]));
    setActiveWeekNo(weeks.length + 1);
    setActiveDayId(days[0]?.id ?? "");
    say(
      `Week ${weeks.length + 1} added — long blocks welcome, 12–16 weeks stay navigable.`,
    );
  }

  function duplicateWeek() {
    const src = activeWeek!;
    const copy: EdWeek = {
      weekNumber: 0,
      label: src.label ? `${src.label} (copy)` : undefined,
      days: src.days.map((d) => ({
        ...d,
        id: uid(),
        published: false,
        sections: cloneSections(d.sections),
      })),
    };
    snapshot();
    setWeeks((prev) => {
      const idx = prev.findIndex((w) => w.weekNumber === src.weekNumber);
      return renumberWeeks([
        ...prev.slice(0, idx + 1),
        copy,
        ...prev.slice(idx + 1),
      ]);
    });
    setActiveWeekNo(src.weekNumber + 1);
    setActiveDayId(copy.days[0]?.id ?? "");
    setWeekMenuOpen(false);
    say(`Week ${src.weekNumber} duplicated — change the reps, keep the rest.`);
  }

  function deleteWeek() {
    if (weeks.length <= 1) {
      say("A program needs at least one week.");
      return;
    }
    const no = activeWeek!.weekNumber;
    snapshot();
    const remaining = renumberWeeks(weeks.filter((w) => w.weekNumber !== no));
    setWeeks(remaining);
    const next = remaining[Math.min(no - 1, remaining.length - 1)];
    setActiveWeekNo(next.weekNumber);
    setActiveDayId(next.days[0]?.id ?? "");
    setWeekMenuOpen(false);
    say(`Week ${no} deleted — later weeks renumbered.`);
  }

  /** G6 — deleting a week asks first, like every destructive action. */
  function requestDeleteWeek() {
    if (weeks.length <= 1) {
      say("A program needs at least one week.");
      return;
    }
    const wk = activeWeek!;
    setWeekMenuOpen(false);
    setConfirmAction({
      title: `Delete ${wk.label ?? `Week ${wk.weekNumber}`}?`,
      body: `Every day and movement in ${
        wk.label ?? `Week ${wk.weekNumber}`
      } is removed and later weeks renumber. Undo (Ctrl+Z) can bring it back.`,
      onConfirm: deleteWeek,
    });
  }

  function renameWeek(label: string) {
    const no = activeWeek!.weekNumber;
    snapshot(`rename-week-${no}`);
    setWeeks((prev) =>
      prev.map((w) =>
        w.weekNumber === no ? { ...w, label: label || undefined } : w,
      ),
    );
  }

  /* ---- day management (C17/C19) ---- */

  function addDay() {
    const used = new Set(activeWeek!.days.map((d) => d.dayNumber));
    let n = 1;
    while (n <= 7 && used.has(n)) n++;
    const dayNumber = Math.min(n, 7);
    const newDay: EdDay = {
      id: uid(),
      dayNumber,
      title: `Day ${dayNumber}`,
      location: "gym",
      focus: "New day — add movements",
      published: false,
      sections: blankSections(),
    };
    const weekNo = activeWeek!.weekNumber;
    snapshot();
    setWeeks((prev) =>
      prev.map((w) =>
        w.weekNumber === weekNo
          ? { ...w, days: relabelDays([...w.days, newDay]) }
          : w,
      ),
    );
    setActiveDayId(newDay.id);
    say(`Day added to Week ${weekNo}.`);
  }

  /** C17 — Day 1 becomes Day 1A/1B: weightlifters train up to 3×/day. */
  function addSession() {
    const siblings = activeWeek!.days.filter(
      (d) => d.dayNumber === active!.dayNumber,
    );
    const letter = String.fromCharCode(65 + siblings.length);
    const newDay: EdDay = {
      id: uid(),
      dayNumber: active!.dayNumber,
      title: active!.title,
      location: active!.location,
      focus: "Second session — add movements",
      published: false,
      sections: blankSections(),
    };
    const weekNo = activeWeek!.weekNumber;
    snapshot();
    setWeeks((prev) =>
      prev.map((w) =>
        w.weekNumber === weekNo
          ? { ...w, days: relabelDays([...w.days, newDay]) }
          : w,
      ),
    );
    setActiveDayId(newDay.id);
    say(
      `Session ${active!.dayNumber}${letter} added — Day ${active!.dayNumber} is now a multi-session day.`,
    );
  }

  function removeActiveDay() {
    if (activeWeek!.days.length <= 1) {
      say("A week needs at least one day.");
      return;
    }
    const removed = active!;
    const weekNo = activeWeek!.weekNumber;
    snapshot();
    const remaining = relabelDays(
      activeWeek!.days.filter((d) => d.id !== removed.id),
    );
    setWeeks((prev) =>
      prev.map((w) => (w.weekNumber === weekNo ? { ...w, days: remaining } : w)),
    );
    setActiveDayId(remaining[0]?.id ?? "");
    say(`Day ${removed.dayLabel ?? removed.dayNumber} removed from Week ${weekNo}.`);
  }

  /** G6 — deleting a day asks first. */
  function requestRemoveActiveDay() {
    if (activeWeek!.days.length <= 1) {
      say("A week needs at least one day.");
      return;
    }
    const d = active!;
    setConfirmAction({
      title: `Delete Day ${d.dayLabel ?? d.dayNumber} — ${d.title}?`,
      body: `Every section and movement in this day is removed from Week ${
        activeWeek!.weekNumber
      }. Undo (Ctrl+Z) can bring it back.`,
      onConfirm: removeActiveDay,
    });
  }

  /** C18 — a calendar chip was dropped on another cell. */
  function moveCalendarDay(
    fromWeekNo: number,
    dayId: string,
    toWeekNo: number,
    toDayNumber: number,
  ) {
    const srcWeek = weeks.find((w) => w.weekNumber === fromWeekNo);
    const moved = srcWeek?.days.find((d) => d.id === dayId);
    if (!moved) return;
    if (fromWeekNo === toWeekNo && moved.dayNumber === toDayNumber) return;
    snapshot();
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.weekNumber !== fromWeekNo && w.weekNumber !== toWeekNo) return w;
        let days = w.days;
        if (w.weekNumber === fromWeekNo) days = days.filter((d) => d.id !== dayId);
        if (w.weekNumber === toWeekNo)
          days = [...days, { ...moved, dayNumber: toDayNumber }];
        return { ...w, days: relabelDays(days) };
      }),
    );
    say(
      `${moved.title} moved to ${CAL_WEEKDAY[toDayNumber - 1]}${
        toWeekNo !== fromWeekNo ? `, Week ${toWeekNo}` : ""
      }.`,
    );
  }

  /** G5 — reorder sessions WITHIN the same day (1A/1B/1C swap places). */
  function reorderSession(weekNo: number, dayId: string, dir: -1 | 1) {
    const week = weeks.find((w) => w.weekNumber === weekNo);
    const day = week?.days.find((d) => d.id === dayId);
    if (!week || !day) return;
    const siblings = week.days
      .map((d, i) => ({ d, i }))
      .filter((x) => x.d.dayNumber === day.dayNumber);
    const pos = siblings.findIndex((x) => x.d.id === dayId);
    const target = pos + dir;
    if (pos < 0 || target < 0 || target >= siblings.length) return;
    snapshot();
    const days = [...week.days];
    const from = siblings[pos].i;
    const to = siblings[target].i;
    [days[from], days[to]] = [days[to], days[from]];
    setWeeks((prev) =>
      prev.map((w) =>
        w.weekNumber === weekNo ? { ...w, days: relabelDays(days) } : w,
      ),
    );
    say(
      `Day ${day.dayNumber} sessions reordered — labels re-lettered ${day.dayNumber}A/${day.dayNumber}B.`,
    );
  }

  /* ---- toolbar actions ---- */

  /** Copy a specific day (G8 — also reachable from the calendar menu). */
  function copyDayById(weekNo: number, dayId: string) {
    const day = weeks
      .find((w) => w.weekNumber === weekNo)
      ?.days.find((d) => d.id === dayId);
    if (!day) return;
    const payload: DayClipboard = {
      v: 2,
      sourceAthleteName: athleteName,
      dayTitle: day.title,
      dayNumber: day.dayNumber,
      sections: day.sections,
    };
    try {
      window.localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(payload));
    } catch {
      // Storage blocked — the in-memory clipboard below still covers this tab.
    }
    setClipboard(payload);
    say(`Copied Day ${day.dayLabel ?? day.dayNumber} — open any client's builder and paste.`);
  }

  function copyDay() {
    copyDayById(activeWeek!.weekNumber, active!.id);
  }

  /** G8 — clone a day in place: it becomes another session on its weekday. */
  function duplicateDay(weekNo: number, dayId: string) {
    const week = weeks.find((w) => w.weekNumber === weekNo);
    const src = week?.days.find((d) => d.id === dayId);
    if (!week || !src) return;
    const copy: EdDay = {
      ...src,
      id: uid(),
      published: false,
      sections: cloneSections(src.sections),
    };
    snapshot();
    setWeeks((prev) =>
      prev.map((w) =>
        w.weekNumber === weekNo
          ? { ...w, days: relabelDays([...w.days, copy]) }
          : w,
      ),
    );
    say(
      `Day ${src.dayLabel ?? src.dayNumber} duplicated — now ${src.dayNumber}A/${src.dayNumber}B on ${CAL_WEEKDAY[src.dayNumber - 1]}.`,
    );
  }

  function pasteDay() {
    const clip = readClipboard() ?? clipboard;
    if (!clip) return;
    snapshot();
    patchDay(active!.id, (d) => ({ ...d, sections: cloneSections(clip.sections) }));
    say(
      clip.sourceAthleteName === athleteName
        ? `Pasted Day ${clip.dayNumber} onto Day ${active!.dayNumber}.`
        : `Pasted Day ${clip.dayNumber} from ${clip.sourceAthleteName}.`,
    );
  }

  /** Repeat a week forward (G8 — also reachable from the calendar menu). */
  function repeatWeekFrom(weekNo: number) {
    const source = weeks.find((w) => w.weekNumber === weekNo);
    if (!source) return;
    snapshot();
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.weekNumber <= source.weekNumber) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            const src = source.days.find((s) => s.dayNumber === d.dayNumber);
            if (!src) return d;
            return {
              ...d,
              title: src.title,
              location: src.location,
              focus: src.focus,
              sections: cloneSections(src.sections),
            };
          }),
        };
      }),
    );
    say(
      `Week ${source.weekNumber} copied forward across the remaining weeks — publish states untouched.`,
    );
  }

  function repeatWeek() {
    repeatWeekFrom(activeWeek!.weekNumber);
  }

  /** G6 — Save to Library asks: new program or overwrite this one. */
  function saveToLibrary(saveMode: "new" | "overwrite") {
    setSaveDialogOpen(false);
    say(
      saveMode === "new"
        ? `Saved "${program.name} (copy)" to the Program Library as a new program.`
        : `"${program.name}" overwritten in the Program Library.`,
    );
  }

  function togglePublish() {
    patchDay(active!.id, (d) => ({ ...d, published: !d.published }));
    say(
      active!.published
        ? `Day ${active!.dayNumber} unpublished — hidden from the athlete.`
        : `Day ${active!.dayNumber} published — visible to the athlete.`,
    );
  }

  /* ---- section management (C21) ---- */

  function duplicateSection(sectionIdx: number) {
    snapshot();
    patchDay(active!.id, (d) => {
      const src = d.sections[sectionIdx];
      const copy = { ...cloneSections([src])[0], title: `${src.title} (copy)` };
      const sections = [...d.sections];
      sections.splice(sectionIdx + 1, 0, copy);
      return { ...d, sections };
    });
    say("Section duplicated below.");
  }

  function deleteSection(sectionIdx: number) {
    const title = active!.sections[sectionIdx]?.title ?? "Section";
    setSectionEdit(null);
    snapshot();
    patchDay(active!.id, (d) => ({
      ...d,
      sections: d.sections.filter((_, si) => si !== sectionIdx),
    }));
    say(`"${title}" deleted.`);
  }

  /** G6 — deleting a section asks first. */
  function requestDeleteSection(sectionIdx: number) {
    const s = active!.sections[sectionIdx];
    if (!s) return;
    setConfirmAction({
      title: `Delete section "${s.title}"?`,
      body: `Its ${s.exercises.length} ${
        s.exercises.length === 1 ? "exercise is" : "exercises are"
      } removed from this day. Undo (Ctrl+Z) can bring it back.`,
      onConfirm: () => deleteSection(sectionIdx),
    });
  }

  function copySection(sectionIdx: number) {
    const s = active!.sections[sectionIdx];
    const payload: SectionClipboard = {
      v: 1,
      sourceName: athleteName,
      title: s.title,
      color: s.color,
      exercises: s.exercises,
    };
    try {
      window.localStorage.setItem(SECTION_CLIPBOARD_KEY, JSON.stringify(payload));
    } catch {
      // Storage blocked — in-memory clipboard still covers this tab.
    }
    setSectionClip(payload);
    say(`Section "${s.title}" copied — paste it into any day, on any client.`);
  }

  function pasteSection() {
    const clip = readSectionClipboard() ?? sectionClip;
    if (!clip) return;
    const section: EdSection = {
      uid: uid(),
      title: clip.title,
      color: clip.color,
      exercises: cloneExercises(clip.exercises),
    };
    snapshot();
    patchDay(active!.id, (d) => ({ ...d, sections: [...d.sections, section] }));
    setAddMenuOpen(false);
    say(
      clip.sourceName === athleteName
        ? `Section "${clip.title}" pasted.`
        : `Section "${clip.title}" pasted from ${clip.sourceName}.`,
    );
  }

  function moveSection(sectionIdx: number, dir: -1 | 1) {
    const to = sectionIdx + dir;
    if (to < 0 || to >= active!.sections.length) return;
    snapshot();
    patchDay(active!.id, (d) => {
      const sections = [...d.sections];
      const [s] = sections.splice(sectionIdx, 1);
      sections.splice(to, 0, s);
      return { ...d, sections };
    });
    setSectionEdit(to);
  }

  function addBlankSection() {
    const idx = active!.sections.length;
    snapshot();
    patchDay(active!.id, (d) => ({
      ...d,
      sections: [...d.sections, { uid: uid(), title: "New section", exercises: [] }],
    }));
    setAddMenuOpen(false);
    setSectionEdit(idx);
    say("Blank section added — name it and pick a color.");
  }

  /* ---- add from library (C22) ---- */

  function addExerciseFromMenu() {
    setAddMenuOpen(false);
    if (active!.sections.length === 0) {
      patchDay(active!.id, (d) => ({
        ...d,
        sections: [{ uid: uid(), title: "New section", exercises: [] }],
      }));
      setPicker({ sectionIdx: 0 });
    } else {
      setPicker({ sectionIdx: active!.sections.length - 1 });
    }
  }

  function importSection(tpl: ProgramTemplate, section: ProgramSection) {
    const ed = sectionsToEd([section])[0];
    snapshot();
    patchDay(active!.id, (d) => ({ ...d, sections: [...d.sections, ed] }));
    setLibPick(null);
    say(`"${section.title}" added from ${tpl.name}.`);
  }

  function importDay(tpl: ProgramTemplate, day: ProgramDay) {
    snapshot();
    patchDay(active!.id, (d) => ({
      ...d,
      title: day.title,
      location: day.location,
      focus: day.focus,
      sections: sectionsToEd(day.sections),
    }));
    setLibPick(null);
    say(`Day replaced with "${day.title}" from ${tpl.name}.`);
  }

  function applyProgram(tpl: ProgramTemplate, applyMode: "fresh" | "append") {
    const scaffold = scaffoldProgram({
      id: `lib-${tpl.id}-${Date.now()}`,
      name: tpl.name,
      weeks: tpl.weeks,
      daysPerWeek: tpl.daysPerWeek,
      remoteDays: tpl.remoteDays,
      seedDays: jordanProgramDays,
    });
    const newWeeks = toEditable(scaffold);
    snapshot();
    if (applyMode === "fresh") {
      setWeeks(newWeeks);
      setActiveWeekNo(1);
      setActiveDayId(newWeeks[0]?.days[0]?.id ?? "");
      say(`${tpl.name} applied — restarted at Week 1.`);
    } else {
      const combined = renumberWeeks([...weeks, ...newWeeks]);
      setWeeks(combined);
      const firstNew = combined[weeks.length];
      setActiveWeekNo(firstNew?.weekNumber ?? 1);
      setActiveDayId(firstNew?.days[0]?.id ?? "");
      say(`${tpl.name} appended after Week ${weeks.length}.`);
    }
    setLibPick(null);
  }

  /* ---- exercise/set actions ---- */

  function addSet(sectionIdx: number, exUid: string) {
    snapshot(`sets-${exUid}`);
    patchExercise(sectionIdx, exUid, (e) => ({
      ...e,
      sets: [
        ...e.sets,
        e.sets[e.sets.length - 1] ?? { target: "8", load: "", unit: "lb" },
      ],
    }));
  }

  function removeSet(sectionIdx: number, exUid: string) {
    snapshot(`sets-${exUid}`);
    patchExercise(sectionIdx, exUid, (e) =>
      e.sets.length <= 1 ? e : { ...e, sets: e.sets.slice(0, -1) },
    );
  }

  function removeExercise(sectionIdx: number, exUid: string) {
    snapshot();
    patchDay(active!.id, (d) => ({
      ...d,
      sections: d.sections.map((s, si) =>
        si === sectionIdx
          ? { ...s, exercises: s.exercises.filter((e) => e.uid !== exUid) }
          : s,
      ),
    }));
  }

  /** G6 — deleting an exercise asks first. */
  function requestRemoveExercise(
    sectionIdx: number,
    exUid: string,
    name: string,
  ) {
    setConfirmAction({
      title: `Remove ${name}?`,
      body: "Its sets and notes come off this day. Undo (Ctrl+Z) can bring it back.",
      onConfirm: () => removeExercise(sectionIdx, exUid),
    });
  }

  function toggleLink(sectionIdx: number, exUid: string) {
    snapshot();
    patchExercise(sectionIdx, exUid, (e) => ({ ...e, linkNext: !e.linkNext }));
  }

  /** Drag-handle reorder (C14) — move within the same section. */
  function moveExercise(sectionIdx: number, from: number, to: number) {
    if (from === to) return;
    snapshot();
    patchDay(active!.id, (d) => ({
      ...d,
      sections: d.sections.map((s, si) => {
        if (si !== sectionIdx) return s;
        const list = [...s.exercises];
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        return { ...s, exercises: list };
      }),
    }));
  }

  function handleDrop(sectionIdx: number, exIdx: number) {
    if (drag && drag.sectionIdx === sectionIdx) {
      moveExercise(sectionIdx, drag.exIdx, exIdx);
    }
    setDrag(null);
    setDropTarget(null);
  }

  function addExercise(sectionIdx: number, lib: LibraryExercise) {
    snapshot();
    patchDay(active!.id, (d) => ({
      ...d,
      sections: d.sections.map((s, si) =>
        si === sectionIdx
          ? {
              ...s,
              exercises: [
                ...s.exercises,
                {
                  uid: uid(),
                  exerciseId: lib.id,
                  instructions: "",
                  noteOverride: "",
                  repMode: lib.defaultRepMode,
                  sets: Array.from({ length: 3 }, () => ({
                    target: DEFAULT_TARGET[lib.defaultRepMode],
                    load: "",
                    unit: lib.defaultLoadMode,
                  })),
                  linkNext: false,
                },
              ],
            }
          : s,
      ),
    }));
    setPicker(null);
    say(`${lib.name} added to ${active!.sections[sectionIdx].title}.`);
  }

  const activeState = publishState(
    activeWeek.weekNumber,
    active.dayNumber,
    active.published,
    autoPub,
  );

  /** G5 — compact "A Hip Snatch 3×6" lines for a calendar cell. */
  function dayMoves(d: EdDay): BuilderCalendarMove[] {
    const moves: BuilderCalendarMove[] = [];
    let letterOffset = 0;
    for (const s of d.sections) {
      const { slots, groups } = computeSlots(s.exercises, letterOffset);
      letterOffset += groups;
      s.exercises.forEach((ex, i) => {
        moves.push({
          slot: slots[i] ?? "?",
          name: libById.get(ex.exerciseId)?.name ?? ex.exerciseId,
          sets: `${ex.sets.length}×${ex.sets[0]?.target ?? "—"}`,
        });
      });
    }
    return moves;
  }

  const calendarWeeks: BuilderCalendarWeek[] = weeks.map((w) => ({
    weekNumber: w.weekNumber,
    label: w.label,
    days: w.days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      label: d.dayLabel ?? String(d.dayNumber),
      title: d.title,
      location: d.location,
      moves: dayMoves(d),
      state:
        mode === "template"
          ? ("draft" as const)
          : publishState(w.weekNumber, d.dayNumber, d.published, autoPub).kind,
    })),
  }));

  return (
    <div className="flex flex-col gap-5">
      {mode === "athlete" && isTemplateView ? (
        <p className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/[0.07] px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
          Demo note: this athlete&apos;s builder shows the same block structure as
          Jordan&apos;s — in production every athlete has their own program while
          the editor works identically.
        </p>
      ) : null}

      {/* Week tabs (C19 — every week stays clickable) + view toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {weeks.map((w) => {
          const live = w.days.filter((d) => d.published).length;
          const isActive = w.weekNumber === activeWeek.weekNumber;
          return (
            <span key={w.weekNumber} className="relative flex items-stretch">
              <button
                type="button"
                onClick={() => selectWeek(w)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "rounded-r-none border-r-0 border-brand/40 bg-brand/10 text-foreground"
                    : "border-border bg-surface/50 text-muted-foreground hover:bg-accent",
                )}
              >
                {w.label ?? `Week ${w.weekNumber}`}
                <span className="tnum text-[0.65rem] font-medium text-muted-foreground">
                  {mode === "template"
                    ? `${w.days.length}d`
                    : `${live}/${w.days.length} live`}
                </span>
              </button>
              {isActive ? (
                <button
                  type="button"
                  aria-label={`Week ${w.weekNumber} options`}
                  aria-expanded={weekMenuOpen}
                  onClick={() => setWeekMenuOpen((o) => !o)}
                  className="flex items-center rounded-r-lg border border-l-0 border-brand/40 bg-brand/10 px-1.5 text-foreground transition-colors hover:bg-brand/20 no-print"
                >
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      weekMenuOpen && "rotate-180",
                    )}
                  />
                </button>
              ) : null}

              {/* Week menu (C19/C25/C26) — rename, duplicate, delete */}
              {isActive && weekMenuOpen ? (
                <div className="absolute left-0 top-full z-40 mt-1.5 w-64 rounded-xl border border-border bg-card p-2 shadow-raised">
                  <label
                    htmlFor="week-name"
                    className="block px-1 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Week name
                  </label>
                  <Input
                    id="week-name"
                    value={activeWeek.label ?? ""}
                    placeholder={`Week ${activeWeek.weekNumber}`}
                    onChange={(e) => renameWeek(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="mt-1.5 flex flex-col">
                    <AddMenuItem
                      icon={CopyPlus}
                      label="Duplicate week"
                      hint="Copy what they did, then change the reps"
                      onClick={duplicateWeek}
                    />
                    <AddMenuItem
                      icon={Plus}
                      label="Add day to this week"
                      onClick={() => {
                        addDay();
                        setWeekMenuOpen(false);
                      }}
                    />
                    <AddMenuItem
                      icon={Trash2}
                      label="Delete week…"
                      hint="Asks to confirm before anything is removed"
                      danger
                      onClick={requestDeleteWeek}
                    />
                  </div>
                </div>
              ) : null}
            </span>
          );
        })}

        {/* C19/C26 — grow the block after creation */}
        <button
          type="button"
          onClick={addWeek}
          title="Add a week to the end of the block"
          className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground no-print"
        >
          <Plus className="h-3.5 w-3.5" />
          Week
        </button>

        <div className="ml-auto flex items-center rounded-lg border border-border bg-surface/50 p-0.5">
          <button
            type="button"
            onClick={() => setView("builder")}
            aria-pressed={view === "builder"}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
              view === "builder"
                ? "bg-brand/10 text-brand-ink"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Builder
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            aria-pressed={view === "calendar"}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
              view === "calendar"
                ? "bg-brand/10 text-brand-ink"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <>
          <BuilderCalendar
            weeks={calendarWeeks}
            activeDayId={active.id}
            onSelectDay={(weekNumber, dayId) => {
              setActiveWeekNo(weekNumber);
              setActiveDayId(dayId);
              setView("builder");
            }}
            onMoveDay={moveCalendarDay}
            onReorderSession={reorderSession}
            // G8 — right-click day actions
            onCopyDay={copyDayById}
            onDuplicateDay={duplicateDay}
            onRepeatWeek={repeatWeekFrom}
          />
          {mode === "athlete" ? (
            <p className="text-xs text-muted-foreground">
              Auto-publish:{" "}
              {autoPub.enabled
                ? `${hourLabel(autoPub.hour)}, ${autoPub.daysAhead} days in advance`
                : "off — publish each day by hand"}
              .
            </p>
          ) : null}
          {flash ? (
            <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success animate-fade-up">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {flash}
            </p>
          ) : null}
        </>
      ) : (
        <>
          {/* Day tabs — dayLabel renders 1A/1B for multi-session days (C17) */}
          <div className="flex flex-wrap gap-2">
            {activeWeek.days.map((d) => {
              const st = publishState(
                activeWeek.weekNumber,
                d.dayNumber,
                d.published,
                autoPub,
              );
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setActiveDayId(d.id);
                    setSectionEdit(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors",
                    d.id === active.id
                      ? "border-brand/40 bg-brand/10 text-foreground"
                      : "border-border bg-surface/50 text-muted-foreground hover:bg-accent",
                  )}
                >
                  {d.location === "home" ? (
                    <Home className="h-3.5 w-3.5" />
                  ) : (
                    <Dumbbell className="h-3.5 w-3.5" />
                  )}
                  Day {d.dayLabel ?? d.dayNumber}
                  {mode === "athlete" ? (
                    <span
                      title={st.label}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        st.kind === "published"
                          ? "bg-success"
                          : st.kind === "scheduled"
                            ? "bg-info"
                            : "bg-warning",
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
            <button
              type="button"
              onClick={addDay}
              title="Add a day to this week"
              className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground no-print"
            >
              <Plus className="h-3.5 w-3.5" />
              Day
            </button>
          </div>

          {/* Toolbar */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-3">
              <Button variant="outline" size="sm" onClick={copyDay}>
                <Copy className="h-4 w-4" />
                Copy day
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={pasteDay}
                disabled={!clipboard}
                title={
                  clipboard
                    ? `Paste Day ${clipboard.dayNumber} from ${clipboard.sourceAthleteName}`
                    : "Copy a day first — the clipboard works across clients"
                }
              >
                <ClipboardPaste className="h-4 w-4" />
                Paste{clipboard ? ` Day ${clipboard.dayNumber}` : ""}
              </Button>
              <Button variant="outline" size="sm" onClick={repeatWeek}>
                <Repeat2 className="h-4 w-4" />
                Repeat week forward
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
              >
                <Library className="h-4 w-4" />
                Save to Library
              </Button>
              {/* G6 — undo the last delete/move/rename (Ctrl+Z works too) */}
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={historyLen === 0}
                title="Undo the last change (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>
              {mode === "athlete" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoPubOpen((o) => !o)}
                  aria-expanded={autoPubOpen}
                  className={cn(autoPubOpen && "border-brand/40 bg-brand/10")}
                >
                  <CalendarClock className="h-4 w-4" />
                  Auto-publish:{" "}
                  {autoPub.enabled
                    ? `${hourLabel(autoPub.hour)}, ${autoPub.daysAhead} days in advance`
                    : "off"}
                </Button>
              ) : null}
              <span className="ml-auto flex flex-wrap items-center gap-2">
                {/* G6 — the auto-save question, answered in-UI */}
                <span
                  aria-live="polite"
                  className={cn(
                    "flex items-center gap-1 text-[0.65rem] font-medium transition-opacity",
                    autoSaved
                      ? "text-success opacity-100"
                      : "text-muted-foreground/70 opacity-70",
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {autoSaved ? "Auto-saved" : "Edits auto-save"}
                </span>
                {mode === "athlete" ? (
                  <>
                    <Button
                      variant={active.published ? "secondary" : "brand"}
                      size="sm"
                      onClick={togglePublish}
                    >
                      {active.published ? "Unpublish" : "Publish"}
                    </Button>
                    <Pill
                      tone={
                        activeState.kind === "published"
                          ? "success"
                          : activeState.kind === "scheduled"
                            ? "info"
                            : "warning"
                      }
                      dot
                    >
                      {activeState.label}
                    </Pill>
                  </>
                ) : null}
              </span>
            </CardContent>
          </Card>

          {/* Auto-publish settings (C16) — the client's real TrainHeroic rule */}
          {mode === "athlete" && autoPubOpen ? (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="eyebrow">Auto-publish</span>
                    <p className="text-sm font-semibold">
                      {autoPub.enabled
                        ? `Auto-publish: ${hourLabel(autoPub.hour)}, ${autoPub.daysAhead} days in advance`
                        : "Auto-publish is off — publish each day by hand"}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoPub.enabled}
                    aria-label="Toggle auto-publish"
                    onClick={() =>
                      setAutoPub((p) => ({ ...p, enabled: !p.enabled }))
                    }
                    className={cn(
                      "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                      autoPub.enabled ? "bg-success" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-all",
                        autoPub.enabled ? "left-[18px]" : "left-0.5",
                      )}
                    />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label
                    htmlFor="auto-pub-days"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Publish each day
                  </label>
                  <select
                    id="auto-pub-days"
                    value={autoPub.daysAhead}
                    disabled={!autoPub.enabled}
                    onChange={(ev) =>
                      setAutoPub((p) => ({
                        ...p,
                        daysAhead: Number(ev.target.value),
                      }))
                    }
                    className="h-8 rounded-md border border-border bg-surface px-1.5 text-xs font-semibold focus-visible:outline-none disabled:opacity-50"
                  >
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} days
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-medium text-muted-foreground">
                    in advance, at
                  </span>
                  <span className="tnum rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold">
                    {hourLabel(autoPub.hour)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    — fixed publish time for the whole gym.
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Days you publish or unpublish by hand stay that way — the
                  schedule only fills in the rest, so athletes never see a
                  session more than {autoPub.daysAhead} days out.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {flash ? (
            <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success animate-fade-up">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {flash}
            </p>
          ) : null}

          {/* Day meta — title is click-to-rename (C25) */}
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex min-w-0 flex-1 basis-72 items-center gap-2 text-xl">
              <span className="whitespace-nowrap">
                Week {activeWeek.weekNumber} · Day{" "}
                {active.dayLabel ?? active.dayNumber} —
              </span>
              <input
                value={active.title}
                onChange={(ev) => {
                  snapshot(`rename-day-${active.id}`);
                  patchDay(active.id, (d) => ({ ...d, title: ev.target.value }));
                }}
                aria-label="Rename this day"
                title="Click to rename this day"
                className="min-w-32 flex-1 rounded-md border border-transparent bg-transparent px-1 font-display text-xl font-bold transition-colors hover:border-border focus-visible:border-border focus-visible:outline-none"
              />
            </h2>
            <Pill tone={active.location === "home" ? "info" : "brand"}>
              {LOCATION_LABEL[active.location]}
            </Pill>
            <span className="text-sm text-muted-foreground">{active.focus}</span>
            <span className="ml-auto flex items-center gap-1.5 no-print">
              {/* C17 — Day 1A/1B/1C */}
              <Button
                variant="outline"
                size="sm"
                onClick={addSession}
                title={`Add another session to Day ${active.dayNumber} — 1A/1B/1C`}
              >
                <Plus className="h-3.5 w-3.5" />
                Session
              </Button>

              {/* C22 — day-level add menu */}
              <span className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddMenuOpen((o) => !o)}
                  aria-expanded={addMenuOpen}
                  className={cn(addMenuOpen && "border-brand/40 bg-brand/10")}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      addMenuOpen && "rotate-180",
                    )}
                  />
                </Button>
                {addMenuOpen ? (
                  <div className="absolute right-0 top-full z-40 mt-1.5 w-64 rounded-xl border border-border bg-card p-1.5 shadow-raised">
                    <AddMenuItem
                      icon={Dumbbell}
                      label="Exercise from library"
                      hint="Search the full exercise library"
                      onClick={addExerciseFromMenu}
                    />
                    <AddMenuItem
                      icon={Plus}
                      label="Blank section"
                      hint="Name it, color it, fill it"
                      onClick={addBlankSection}
                    />
                    <AddMenuItem
                      icon={LayoutList}
                      label="Section from library"
                      hint="Pick a program → day → section"
                      onClick={() => {
                        setAddMenuOpen(false);
                        setLibPick("section");
                      }}
                    />
                    <AddMenuItem
                      icon={CalendarDays}
                      label="Day from library"
                      hint="Replaces this day's blocks"
                      onClick={() => {
                        setAddMenuOpen(false);
                        setLibPick("day");
                      }}
                    />
                    <AddMenuItem
                      icon={Library}
                      label="Program from library"
                      hint="Apply a whole master template"
                      onClick={() => {
                        setAddMenuOpen(false);
                        setLibPick("program");
                      }}
                    />
                    <AddMenuItem
                      icon={ClipboardPaste}
                      label={
                        sectionClip
                          ? `Paste section — "${sectionClip.title}"`
                          : "Paste section"
                      }
                      hint={
                        sectionClip
                          ? `Copied from ${sectionClip.sourceName}`
                          : "Copy a section first — works across clients"
                      }
                      disabled={!sectionClip}
                      onClick={pasteSection}
                    />
                  </div>
                ) : null}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Remove this day — asks to confirm"
                aria-label="Remove this day"
                disabled={activeWeek.days.length <= 1}
                onClick={requestRemoveActiveDay}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </div>

          {/* Sections — slot letters run continuously across the session */}
          {(() => {
            let letterOffset = 0;
            return active.sections.map((section, sectionIdx) => {
              const { slots, spans, groups } = computeSlots(
                section.exercises,
                letterOffset,
              );
              letterOffset += groups;
              const accent = sectionAccent(section);
              return (
                <section key={section.uid} className="flex flex-col gap-2.5">
                  {/* C20 — just the name + color dot (+ edit pencil) */}
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: accent }}
                    />
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: accent }}
                    >
                      {section.title}
                    </span>
                    <button
                      type="button"
                      aria-label={`Edit section ${section.title}`}
                      title="Rename, recolor, move, duplicate or delete this section"
                      onClick={() =>
                        setSectionEdit((prev) =>
                          prev === sectionIdx ? null : sectionIdx,
                        )
                      }
                      className={cn(
                        "text-muted-foreground transition-colors hover:text-foreground no-print",
                        sectionEdit === sectionIdx && "text-brand-ink",
                      )}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-7 no-print"
                      onClick={() => setPicker({ sectionIdx })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add exercise
                    </Button>
                  </div>

                  {/* C21 — section editor: rename, color, move, copy… */}
                  {sectionEdit === sectionIdx ? (
                    <Card className="border-brand/30 no-print">
                      <CardContent className="flex flex-col gap-3 p-3.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Input
                            value={section.title}
                            onChange={(ev) => {
                              snapshot(`rename-section-${section.uid}`);
                              patchSection(sectionIdx, (s) => ({
                                ...s,
                                title: ev.target.value,
                              }));
                            }}
                            aria-label="Section name"
                            className="h-8 w-48 text-sm"
                          />
                          <span className="flex items-center gap-1.5">
                            {SECTION_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                aria-label={`Section color ${c}`}
                                title={c}
                                onClick={() => {
                                  snapshot(`color-${section.uid}`);
                                  patchSection(sectionIdx, (s) => ({
                                    ...s,
                                    color: c,
                                  }));
                                }}
                                className={cn(
                                  "h-5 w-5 rounded-full transition-transform hover:scale-110",
                                  section.color === c
                                    ? "ring-2 ring-brand ring-offset-2 ring-offset-card"
                                    : "ring-1 ring-border",
                                )}
                                style={{ background: SECTION_COLOR_CSS[c] }}
                              />
                            ))}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-7 w-7"
                            aria-label="Close section editor"
                            onClick={() => setSectionEdit(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            disabled={sectionIdx === 0}
                            onClick={() => moveSection(sectionIdx, -1)}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                            Move up
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            disabled={sectionIdx === active.sections.length - 1}
                            onClick={() => moveSection(sectionIdx, 1)}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                            Move down
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => duplicateSection(sectionIdx)}
                          >
                            <CopyPlus className="h-3.5 w-3.5" />
                            Duplicate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            title="Copy this section — paste it into another day or another client's program"
                            onClick={() => copySection(sectionIdx)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy section
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            title="Delete this section — asks to confirm"
                            onClick={() => requestDeleteSection(sectionIdx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}

                  <div className="flex flex-col gap-2">
                    {section.exercises.map((ex, exIdx) => {
                      const def = libById.get(ex.exerciseId);
                      const slot = slots[exIdx] ?? "?";
                      const span = spans[exIdx] ?? 1;
                      const inSuperset = /\d$/.test(slot);
                      const isGroupStart = inSuperset && slot.endsWith("1");
                      const prevLinked =
                        exIdx > 0 && section.exercises[exIdx - 1].linkNext;
                      const setCount = ex.sets.length;
                      const usesPct = ex.sets.some((s) => s.unit === "pct");
                      const refMax = def?.referenceMax
                        ? maxes[def.referenceMax]
                        : undefined;
                      const hasOverride = ex.noteOverride.trim().length > 0;
                      const isDragging =
                        drag?.sectionIdx === sectionIdx && drag.exIdx === exIdx;
                      const isDropTarget =
                        drag != null &&
                        !isDragging &&
                        dropTarget?.sectionIdx === sectionIdx &&
                        dropTarget.exIdx === exIdx;

                      return (
                        <div
                          key={ex.uid}
                          className="relative"
                          onDragOver={(ev) => {
                            if (drag && drag.sectionIdx === sectionIdx) {
                              ev.preventDefault();
                              ev.dataTransfer.dropEffect = "move";
                              setDropTarget({ sectionIdx, exIdx });
                            }
                          }}
                          onDrop={(ev) => {
                            ev.preventDefault();
                            handleDrop(sectionIdx, exIdx);
                          }}
                        >
                          {prevLinked ? (
                            <span className="absolute -top-2 left-12 h-2 w-0.5 bg-brand/60" />
                          ) : null}
                          <Card
                            className={cn(
                              inSuperset && "border-brand/25",
                              prevLinked && "rounded-t-none",
                              ex.linkNext && "rounded-b-none border-b-0",
                              isDragging && "opacity-40",
                              isDropTarget &&
                                "ring-2 ring-brand ring-offset-2 ring-offset-background",
                            )}
                          >
                            <CardContent className="flex flex-col gap-2.5 p-3.5 sm:p-4">
                              {/* Header: grip + slot letter + name + video + actions */}
                              <div className="flex items-start gap-2.5">
                                <span
                                  draggable
                                  role="button"
                                  aria-label={`Drag to reorder ${def?.name ?? ex.exerciseId}`}
                                  title="Drag to reorder"
                                  onDragStart={(ev) => {
                                    ev.dataTransfer.effectAllowed = "move";
                                    ev.dataTransfer.setData("text/plain", ex.uid);
                                    setDrag({ sectionIdx, exIdx });
                                  }}
                                  onDragEnd={() => {
                                    setDrag(null);
                                    setDropTarget(null);
                                  }}
                                  className="mt-1.5 flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing no-print"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </span>
                                <span
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-display text-sm font-extrabold",
                                    inSuperset
                                      ? "bg-brand/15 text-brand-ink"
                                      : "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {slot}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold leading-tight">
                                      {def?.name ?? ex.exerciseId}
                                    </span>
                                    {def?.videoUrl || def?.circuit ? (
                                      <button
                                        type="button"
                                        onClick={() => setVideo(def)}
                                        className="text-muted-foreground transition-colors hover:text-brand-ink no-print"
                                        aria-label={`Watch ${def.name} demo video`}
                                        title={`Watch ${def.name} demo video`}
                                      >
                                        <Video className="h-4 w-4" />
                                      </button>
                                    ) : null}
                                    {isGroupStart ? (
                                      <Pill
                                        tone="brand"
                                        icon={<Link2 className="h-3 w-3" />}
                                      >
                                        {span >= 3 ? `Superset ×${span}` : "Superset"}
                                      </Pill>
                                    ) : null}
                                  </div>
                                  {/* Exercise instructions — italic, TrainHeroic-style */}
                                  <input
                                    value={ex.instructions}
                                    placeholder="Exercise instructions…"
                                    className="mt-0.5 w-full bg-transparent text-xs italic text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none"
                                    onChange={(ev) =>
                                      patchExercise(sectionIdx, ex.uid, (e) => ({
                                        ...e,
                                        instructions: ev.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <span className="flex shrink-0 items-center no-print">
                                  {/* R8 (G4) — circuit blocks save back to the
                                      Circuit Library */}
                                  {def?.circuit ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      title="Save to Circuit Library"
                                      aria-label={`Save ${def.name} to the Circuit Library`}
                                      onClick={() =>
                                        say(
                                          `"${def.name}" saved to the Circuit Library — find it under Programming → Circuit Library.`,
                                        )
                                      }
                                    >
                                      <ListChecks className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                  {exIdx < section.exercises.length - 1 ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      title={
                                        ex.linkNext
                                          ? "Unlink superset with next exercise"
                                          : "Link as superset with next exercise — chain three for a triple"
                                      }
                                      onClick={() => toggleLink(sectionIdx, ex.uid)}
                                    >
                                      {ex.linkNext ? (
                                        <Link2Off className="h-4 w-4" />
                                      ) : (
                                        <Link2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  ) : null}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    title="Remove exercise — asks to confirm"
                                    onClick={() =>
                                      requestRemoveExercise(
                                        sectionIdx,
                                        ex.uid,
                                        def?.name ?? ex.exerciseId,
                                      )
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </span>
                              </div>

                              {/* Prescription grid — no horizontal scroll, mobile-safe */}
                              <div className="flex flex-col gap-1">
                                <div className="grid grid-cols-[2rem_1fr_1.4fr] items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                                  <span className="tnum">{setCount}×</span>
                                  <span>
                                    {ex.repMode === "reps"
                                      ? "Reps"
                                      : ex.repMode === "time"
                                        ? "Time"
                                        : ex.repMode === "distance"
                                          ? "Distance"
                                          : ex.repMode === "height"
                                            ? "Height"
                                            : ex.repMode === "watts"
                                              ? "Watts"
                                              : ex.repMode === "velocity"
                                                ? "Velocity"
                                                : "Calories"}
                                  </span>
                                  <span>Load · unit per set</span>
                                </div>

                                {ex.sets.map((set, setIdx) => (
                                  <div
                                    key={setIdx}
                                    className="grid grid-cols-[2rem_1fr_1.4fr] items-center gap-2"
                                  >
                                    <span className="tnum text-xs font-bold text-muted-foreground">
                                      {setIdx + 1}
                                    </span>
                                    <Input
                                      value={set.target}
                                      className="tnum h-8 min-w-0"
                                      onChange={(ev) =>
                                        patchSet(sectionIdx, ex.uid, setIdx, (s) => ({
                                          ...s,
                                          target: ev.target.value,
                                        }))
                                      }
                                    />
                                    <span className="flex min-w-0 items-center gap-1.5">
                                      {set.unit === "bw" ? (
                                        <span className="flex h-8 flex-1 items-center rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground">
                                          Bodyweight
                                        </span>
                                      ) : (
                                        <Input
                                          value={set.load}
                                          placeholder="—"
                                          className="tnum h-8 min-w-0 flex-1"
                                          onChange={(ev) =>
                                            patchSet(sectionIdx, ex.uid, setIdx, (s) => ({
                                              ...s,
                                              load: ev.target.value,
                                            }))
                                          }
                                        />
                                      )}
                                      <select
                                        value={set.unit}
                                        aria-label={`Set ${setIdx + 1} load unit`}
                                        className="h-8 shrink-0 rounded-md border border-border bg-surface px-1.5 text-xs font-semibold focus-visible:outline-none"
                                        onChange={(ev) => {
                                          const next = ev.target.value as LoadMode;
                                          patchSet(sectionIdx, ex.uid, setIdx, (s) => ({
                                            ...s,
                                            load: convertLoad(s.load, s.unit, next),
                                            unit: next,
                                          }));
                                        }}
                                      >
                                        {UNIT_OPTIONS.map((o) => (
                                          <option key={o.value} value={o.value}>
                                            {o.label}
                                          </option>
                                        ))}
                                      </select>
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Footer: % reference · instructions override · set +/- */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                {usesPct && def?.referenceMax ? (
                                  <span className="text-xs text-muted-foreground">
                                    % of{" "}
                                    <span className="font-semibold text-foreground">
                                      {def.referenceMax}
                                    </span>
                                    {refMax
                                      ? ` — ref max ${refMax.value} ${refMax.unit}`
                                      : " — no ref max on file"}
                                  </span>
                                ) : null}
                                {/* C16 — library default vs custom note */}
                                <details className="group min-w-0 flex-1 basis-52">
                                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                                    Instructions
                                    {hasOverride ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-1.5 py-px text-[0.65rem] font-semibold text-brand-ink">
                                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                                        Custom note
                                      </span>
                                    ) : null}
                                    <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                                  </summary>
                                  <div className="mt-1.5 flex flex-col gap-1.5 no-print">
                                    <Textarea
                                      rows={2}
                                      value={ex.noteOverride}
                                      placeholder={
                                        def && def.pointsOfPerformance.length > 0
                                          ? def.pointsOfPerformance.join("\n")
                                          : "No library notes — write instructions for this exercise."
                                      }
                                      aria-label={`Instructions for ${def?.name ?? ex.exerciseId}`}
                                      onChange={(ev) =>
                                        patchExercise(sectionIdx, ex.uid, (e) => ({
                                          ...e,
                                          noteOverride: ev.target.value,
                                        }))
                                      }
                                      className="text-xs"
                                    />
                                    {hasOverride ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          patchExercise(sectionIdx, ex.uid, (e) => ({
                                            ...e,
                                            noteOverride: "",
                                          }))
                                        }
                                        className="self-start text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                                      >
                                        Reset to library default
                                      </button>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">
                                        Showing the library default — typing writes
                                        a custom note for this program only.
                                      </p>
                                    )}
                                  </div>
                                </details>
                                <span className="ml-auto flex items-center gap-1 no-print">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => removeSet(sectionIdx, ex.uid)}
                                    disabled={ex.sets.length <= 1}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                    Set
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => addSet(sectionIdx, ex.uid)}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Set
                                  </Button>
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                    {section.exercises.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
                        No exercises in this block yet — add one from the library.
                      </p>
                    ) : null}
                  </div>
                </section>
              );
            });
          })()}
        </>
      )}

      {/* Exercise picker modal */}
      {picker ? (
        <ExercisePicker
          library={library}
          sectionTitle={active.sections[picker.sectionIdx]?.title ?? ""}
          onClose={() => setPicker(null)}
          onPick={(lib) => addExercise(picker.sectionIdx, lib)}
        />
      ) : null}

      {/* Library pick modal (C22) — section / day / whole program */}
      {libPick ? (
        <LibraryPickModal
          kind={libPick}
          onClose={() => setLibPick(null)}
          onPickSection={importSection}
          onPickDay={importDay}
          onApplyProgram={applyProgram}
        />
      ) : null}

      {/* Inline exercise demo (C14) — no more new-tab hand-off */}
      {video ? <VideoModal lib={video} onClose={() => setVideo(null)} /> : null}

      {/* G6 — every destructive action confirms first */}
      {confirmAction ? (
        <ConfirmDialog
          title={confirmAction.title}
          body={confirmAction.body}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            const action = confirmAction;
            setConfirmAction(null);
            action.onConfirm();
          }}
        />
      ) : null}

      {/* G6 — Save to Library: new program vs overwrite */}
      {saveDialogOpen ? (
        <SaveToLibraryDialog
          programName={program.name}
          onCancel={() => setSaveDialogOpen(false)}
          onConfirm={saveToLibrary}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm dialog (G6) — one consistent gate for every delete          */
/* ------------------------------------------------------------------ */

function ConfirmDialog({
  title,
  body,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <Card className="relative z-10 w-full max-w-sm">
        <CardContent className="flex flex-col gap-3 p-5">
          <h3 className="text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{body}</p>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Save-to-Library dialog (G6) — save as new vs overwrite              */
/* ------------------------------------------------------------------ */

function SaveToLibraryDialog({
  programName,
  onCancel,
  onConfirm,
}: {
  programName: string;
  onCancel: () => void;
  onConfirm: (mode: "new" | "overwrite") => void;
}) {
  const [mode, setMode] = useState<"new" | "overwrite">("new");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Save to Library"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <Card className="relative z-10 w-full max-w-sm">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="eyebrow">Program Library</span>
              <h3 className="text-lg">Save to Library</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {(
              [
                {
                  value: "new",
                  title: "Save as a new program",
                  hint: `Adds "${programName} (copy)" to the Program Library — the original stays untouched.`,
                },
                {
                  value: "overwrite",
                  title: `Overwrite "${programName}"`,
                  hint: "Replaces the library master with this version. Copies already on clients keep their own loads.",
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                  mode === opt.value
                    ? "border-brand/40 bg-brand/10"
                    : "border-border bg-surface/50 hover:bg-accent",
                )}
              >
                <input
                  type="radio"
                  name="save-mode"
                  value={opt.value}
                  checked={mode === opt.value}
                  onChange={() => setMode(opt.value)}
                  className="mt-0.5 accent-[hsl(var(--brand))]"
                />
                <span>
                  <span className="block text-sm font-semibold">{opt.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {opt.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="brand" size="sm" onClick={() => onConfirm(mode)}>
              {mode === "new" ? "Save as new" : "Overwrite"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small menu item used by the week + add menus                        */
/* ------------------------------------------------------------------ */

function AddMenuItem({
  icon: Icon,
  label,
  hint,
  danger = false,
  disabled = false,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent",
        danger && "text-destructive",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          danger ? "text-destructive" : "text-muted-foreground",
        )}
      />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint ? (
          <span className="block text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Library pick modal (C22) — template → day → section drill-down      */
/* ------------------------------------------------------------------ */

const PICK_TITLE: Record<"section" | "day" | "program", string> = {
  section: "Add section from library",
  day: "Add day from library",
  program: "Apply program from library",
};

function LibraryPickModal({
  kind,
  onClose,
  onPickSection,
  onPickDay,
  onApplyProgram,
}: {
  kind: "section" | "day" | "program";
  onClose: () => void;
  onPickSection: (tpl: ProgramTemplate, section: ProgramSection) => void;
  onPickDay: (tpl: ProgramTemplate, day: ProgramDay) => void;
  onApplyProgram: (tpl: ProgramTemplate, mode: "fresh" | "append") => void;
}) {
  const [tpl, setTpl] = useState<ProgramTemplate | null>(null);
  const [day, setDay] = useState<ProgramDay | null>(null);
  const [applyMode, setApplyMode] = useState<"fresh" | "append">("append");

  // Demo: template days are scaffolded from the seed block, like the editor.
  const tplDays = useMemo<ProgramDay[]>(() => {
    if (!tpl) return [];
    return (
      scaffoldProgram({
        id: `pick-${tpl.id}`,
        name: tpl.name,
        weeks: 1,
        daysPerWeek: tpl.daysPerWeek,
        remoteDays: tpl.remoteDays,
        seedDays: jordanProgramDays,
      }).weeks[0]?.days ?? []
    );
  }, [tpl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={PICK_TITLE[kind]}
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-raised"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base">{PICK_TITLE[kind]}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {tpl
                ? day
                  ? `${tpl.name} · Day ${day.dayNumber} — pick a section`
                  : kind === "program"
                    ? tpl.name
                    : `${tpl.name} — pick a day`
                : "Pick a master program"}
            </p>
          </div>
          {tpl ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (day ? setDay(null) : setTpl(null))}
            >
              Back
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-slim p-2">
          {/* Step 1 — template */}
          {!tpl
            ? programTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTpl(t)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Library className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {t.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.level} · {t.weeks} wk × {t.daysPerWeek}{" "}
                      {t.daysPerWeek === 1 ? "day" : "days"}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-muted-foreground" />
                </button>
              ))
            : null}

          {/* Program mode — confirm where it lands (same care as C24) */}
          {tpl && kind === "program" ? (
            <div className="flex flex-col gap-2 p-2">
              {(
                [
                  {
                    value: "fresh",
                    title: "Start as a new program (Week 1)",
                    hint: "Replaces every current week — the block restarts.",
                  },
                  {
                    value: "append",
                    title: "Append after the current weeks",
                    hint: "Keeps the current block — this program continues where it ends.",
                  },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                    applyMode === opt.value
                      ? "border-brand/40 bg-brand/10"
                      : "border-border bg-surface/50 hover:bg-accent",
                  )}
                >
                  <input
                    type="radio"
                    name="lib-apply-mode"
                    value={opt.value}
                    checked={applyMode === opt.value}
                    onChange={() => setApplyMode(opt.value)}
                    className="mt-0.5 accent-[hsl(var(--brand))]"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{opt.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
              <div className="flex justify-end border-t border-border pt-3">
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => onApplyProgram(tpl, applyMode)}
                >
                  Apply
                </Button>
              </div>
            </div>
          ) : null}

          {/* Step 2 — day */}
          {tpl && kind !== "program" && !day
            ? tplDays.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => (kind === "day" ? onPickDay(tpl, d) : setDay(d))}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      Day {d.dayNumber} — {d.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {d.sections.length}{" "}
                      {d.sections.length === 1 ? "section" : "sections"} ·{" "}
                      {d.sections.reduce((n, s) => n + s.exercises.length, 0)}{" "}
                      movements
                    </span>
                  </span>
                  {kind === "section" ? (
                    <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-muted-foreground" />
                  ) : (
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))
            : null}

          {/* Step 3 — section */}
          {tpl && kind === "section" && day
            ? day.sections.map((s, i) => (
                <button
                  key={`${s.title}-${i}`}
                  type="button"
                  onClick={() => onPickSection(tpl, s)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <LayoutList className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {s.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.exercises.length}{" "}
                      {s.exercises.length === 1 ? "exercise" : "exercises"}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exercise picker                                                     */
/* ------------------------------------------------------------------ */

function ExercisePicker({
  library,
  sectionTitle,
  onClose,
  onPick,
}: {
  library: LibraryExercise[];
  sectionTitle: string;
  onClose: () => void;
  onPick: (e: LibraryExercise) => void;
}) {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    library.forEach((e) =>
      e.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [library]);

  const results = library.filter((e) => {
    if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (tags.size > 0 && !e.tags.some((t) => tags.has(t))) return false;
    return true;
  });

  function toggleTag(tag: string) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add exercise"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-raised"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base">Add exercise — {sectionTitle}</h3>
            <p className="text-xs text-muted-foreground">
              {results.length} of {library.length} shown · full library holds 658
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              placeholder="Search exercises…"
              className="pl-8"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  tags.has(tag)
                    ? "border-brand/40 bg-brand/10 text-brand-ink"
                    : "border-border bg-surface/50 text-muted-foreground hover:bg-accent",
                )}
              >
                {tag} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-slim p-2">
          {results.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onPick(e)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{e.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {e.tags.join(" · ")}
                  {e.referenceMax ? ` · ref: ${e.referenceMax}` : ""}
                </span>
              </span>
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
          {results.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nothing matches — clear a filter or create a new exercise from the
              Programming library.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
