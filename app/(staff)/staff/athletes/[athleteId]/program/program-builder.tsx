"use client";

import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardPaste,
  Copy,
  Dumbbell,
  GripVertical,
  Home,
  Info,
  LayoutList,
  Library,
  Link2,
  Link2Off,
  Minus,
  Plus,
  Repeat2,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { VideoModal } from "@/components/app/video-modal";
import { ProgramCalendar, type CalendarWeekRow } from "@/components/program/program-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  LOCATION_LABEL,
  kgToLb,
  lbToKg,
  type AthleteProgram,
  type LibraryExercise,
  type LoadMode,
  type ReferenceMaxEntry,
  type RepMode,
} from "@/lib/demo/training";
import { cn } from "@/lib/utils";

import { PrintButton } from "./print-button";

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
  repMode: RepMode;
  sets: EdSet[];
  /** True when this exercise is supersetted with the NEXT one in the section. */
  linkNext: boolean;
}

interface EdSection {
  title: string;
  exercises: EdExercise[];
}

interface EdDay {
  id: string;
  dayNumber: number;
  title: string;
  location: "gym" | "home";
  focus: string;
  published: boolean;
  sections: EdSection[];
}

interface EdWeek {
  weekNumber: number;
  days: EdDay[];
}

let uidCounter = 0;
const uid = () => `ed-${++uidCounter}`;

function toEditable(program: AthleteProgram): EdWeek[] {
  return program.weeks.map((w) => ({
    weekNumber: w.weekNumber,
    days: w.days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      title: d.title,
      location: d.location,
      focus: d.focus,
      published: d.published ?? true,
      sections: d.sections.map((s) => {
        const exercises = s.exercises.map((e, i) => {
          const grp = e.slot.replace(/\d+$/, "");
          const next = s.exercises[i + 1];
          const nextGrp = next ? next.slot.replace(/\d+$/, "") : null;
          return {
            uid: uid(),
            exerciseId: e.exerciseId,
            instructions: e.instructions ?? "",
            repMode: e.repMode,
            sets: e.sets.map((set) => ({
              target: set.target,
              load: set.load == null ? "" : String(set.load),
              unit: set.loadMode,
            })),
            linkNext: nextGrp !== null && nextGrp === grp && /\d$/.test(e.slot),
          } satisfies EdExercise;
        });
        return { title: s.title, exercises };
      }),
    })),
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

/** TrainHeroic paints each block type its own color — same idea, fixed hues. */
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

/** Convert a numeric load string between units where that makes sense. */
function convertLoad(load: string, from: LoadMode, to: LoadMode): string {
  if (load === "") return load;
  const n = Number(load);
  if (Number.isNaN(n)) return load;
  if (from === "lb" && to === "kg") return String(lbToKg(n));
  if (from === "kg" && to === "lb") return String(kgToLb(n));
  return load;
}

/* ------------------------------------------------------------------ */
/* Publish scheduling (C16) — "5:00 AM, N days in advance"             */
/* ------------------------------------------------------------------ */

type AutoPublishRule = AthleteProgram["autoPublish"];

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
/* Cross-athlete day clipboard (C15) — survives navigation             */
/* ------------------------------------------------------------------ */

const CLIPBOARD_KEY = "aos-day-clipboard";

interface DayClipboard {
  v: 1;
  sourceAthleteName: string;
  dayTitle: string;
  dayNumber: number;
  sections: EdSection[];
}

function readClipboard(): DayClipboard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLIPBOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DayClipboard;
    if (
      parsed == null ||
      parsed.v !== 1 ||
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

/** Deep-clone sections with fresh uids (paste / repeat-week). */
function cloneSections(sections: EdSection[]): EdSection[] {
  return (JSON.parse(JSON.stringify(sections)) as EdSection[]).map((s) => ({
    ...s,
    exercises: s.exercises.map((e) => ({ ...e, uid: uid() })),
  }));
}

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
}) {
  const [weeks, setWeeks] = useState<EdWeek[]>(() => toEditable(program));
  const [activeWeekNo, setActiveWeekNo] = useState(
    () => program.weeks[0]?.weekNumber ?? 1,
  );
  const [activeDayId, setActiveDayId] = useState(
    () => program.weeks[0]?.days[0]?.id ?? "",
  );
  const [view, setView] = useState<"builder" | "calendar">("builder");
  const [autoPub, setAutoPub] = useState<AutoPublishRule>(program.autoPublish);
  const [autoPubOpen, setAutoPubOpen] = useState(false);
  const [clipboard, setClipboard] = useState<DayClipboard | null>(null);
  const [picker, setPicker] = useState<{ sectionIdx: number } | null>(null);
  const [video, setVideo] = useState<LibraryExercise | null>(null);
  const [drag, setDrag] = useState<{ sectionIdx: number; exIdx: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    sectionIdx: number;
    exIdx: number;
  } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The clipboard lives in localStorage so a day copied on Jordan's builder
  // can be pasted on Maya's — read it once the client mounts.
  useEffect(() => {
    setClipboard(readClipboard());
  }, []);

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

  /* ---- week / day selection ---- */

  function selectWeek(week: EdWeek) {
    setActiveWeekNo(week.weekNumber);
    const match =
      week.days.find((d) => d.dayNumber === active?.dayNumber) ?? week.days[0];
    if (match) setActiveDayId(match.id);
  }

  /* ---- toolbar actions ---- */

  function copyDay() {
    const payload: DayClipboard = {
      v: 1,
      sourceAthleteName: athleteName,
      dayTitle: active!.title,
      dayNumber: active!.dayNumber,
      sections: active!.sections,
    };
    try {
      window.localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(payload));
    } catch {
      // Storage blocked — the in-memory clipboard below still covers this tab.
    }
    setClipboard(payload);
    say(`Copied Day ${active!.dayNumber} — open any athlete's builder and paste.`);
  }

  function pasteDay() {
    const clip = readClipboard() ?? clipboard;
    if (!clip) return;
    patchDay(active!.id, (d) => ({ ...d, sections: cloneSections(clip.sections) }));
    say(
      clip.sourceAthleteName === athleteName
        ? `Pasted Day ${clip.dayNumber} onto Day ${active!.dayNumber}.`
        : `Pasted Day ${clip.dayNumber} from ${clip.sourceAthleteName}.`,
    );
  }

  function repeatWeek() {
    const source = activeWeek!;
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

  function saveToLibrary() {
    say(`Saved "${athleteName} — current block" to the program library.`);
  }

  function togglePublish() {
    patchDay(active!.id, (d) => ({ ...d, published: !d.published }));
    say(
      active!.published
        ? `Day ${active!.dayNumber} unpublished — hidden from the athlete.`
        : `Day ${active!.dayNumber} published — visible to the athlete.`,
    );
  }

  /* ---- exercise/set actions ---- */

  function addSet(sectionIdx: number, exUid: string) {
    patchExercise(sectionIdx, exUid, (e) => ({
      ...e,
      sets: [
        ...e.sets,
        e.sets[e.sets.length - 1] ?? { target: "8", load: "", unit: "lb" },
      ],
    }));
  }

  function removeSet(sectionIdx: number, exUid: string) {
    patchExercise(sectionIdx, exUid, (e) =>
      e.sets.length <= 1 ? e : { ...e, sets: e.sets.slice(0, -1) },
    );
  }

  function removeExercise(sectionIdx: number, exUid: string) {
    patchDay(active!.id, (d) => ({
      ...d,
      sections: d.sections.map((s, si) =>
        si === sectionIdx
          ? { ...s, exercises: s.exercises.filter((e) => e.uid !== exUid) }
          : s,
      ),
    }));
  }

  function toggleLink(sectionIdx: number, exUid: string) {
    patchExercise(sectionIdx, exUid, (e) => ({ ...e, linkNext: !e.linkNext }));
  }

  /** Drag-handle reorder (C14) — move within the same section. */
  function moveExercise(sectionIdx: number, from: number, to: number) {
    if (from === to) return;
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

  const calendarWeeks: CalendarWeekRow[] = weeks.map((w) => ({
    weekNumber: w.weekNumber,
    days: w.days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      title: d.title,
      location: d.location,
      movements: d.sections.reduce((n, s) => n + s.exercises.length, 0),
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

      {/* Week tabs + Builder/Calendar view toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {weeks.map((w) => {
          const live = w.days.filter((d) => d.published).length;
          return (
            <button
              key={w.weekNumber}
              type="button"
              onClick={() => selectWeek(w)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors",
                w.weekNumber === activeWeek.weekNumber
                  ? "border-brand/40 bg-brand/10 text-foreground"
                  : "border-border bg-surface/50 text-muted-foreground hover:bg-accent",
              )}
            >
              Week {w.weekNumber}
              <span className="tnum text-[0.65rem] font-medium text-muted-foreground">
                {mode === "template"
                  ? `${w.days.length}d`
                  : `${live}/${w.days.length} live`}
              </span>
            </button>
          );
        })}

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
          <ProgramCalendar
            weeks={calendarWeeks}
            activeDayId={active.id}
            onSelectDay={(weekNumber, dayId) => {
              setActiveWeekNo(weekNumber);
              setActiveDayId(dayId);
              setView("builder");
            }}
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
        </>
      ) : (
        <>
          {/* Day tabs */}
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
                  onClick={() => setActiveDayId(d.id)}
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
                  Day {d.dayNumber}
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
                    : "Copy a day first — the clipboard works across athletes"
                }
              >
                <ClipboardPaste className="h-4 w-4" />
                Paste{clipboard ? ` Day ${clipboard.dayNumber}` : ""}
              </Button>
              <Button variant="outline" size="sm" onClick={repeatWeek}>
                <Repeat2 className="h-4 w-4" />
                Repeat week forward
              </Button>
              <Button variant="outline" size="sm" onClick={saveToLibrary}>
                <Library className="h-4 w-4" />
                Save to library
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
                <PrintButton />
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

          {/* Day meta */}
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl">
              Week {activeWeek.weekNumber} · Day {active.dayNumber} —{" "}
              {active.title}
            </h2>
            <Pill tone={active.location === "home" ? "info" : "brand"}>
              {LOCATION_LABEL[active.location]}
            </Pill>
            <span className="text-sm text-muted-foreground">{active.focus}</span>
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
              const hue = sectionHue(section.title);
              return (
                <section key={section.title} className="flex flex-col gap-2.5">
                  {/* TrainHeroic-style colored block header */}
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-1 rounded-full"
                      style={{ background: `hsl(${hue} 75% 52%)` }}
                    />
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: `hsl(${hue} 70% 52%)` }}
                    >
                      {section.title}
                    </span>
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
                                    title="Remove exercise"
                                    onClick={() => removeExercise(sectionIdx, ex.uid)}
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

                              {/* Footer: % reference · points of performance · set +/- */}
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
                                {def && def.pointsOfPerformance.length > 0 ? (
                                  <details className="group min-w-0">
                                    <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                                      Points of performance
                                      <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                                      {def.pointsOfPerformance.map((p) => (
                                        <li key={p}>— {p}</li>
                                      ))}
                                    </ul>
                                  </details>
                                ) : null}
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

      {/* Inline exercise demo (C14) — no more new-tab hand-off */}
      {video ? <VideoModal lib={video} onClose={() => setVideo(null)} /> : null}
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
