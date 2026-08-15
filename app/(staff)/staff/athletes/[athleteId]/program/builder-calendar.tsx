"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  CopyPlus,
  Dumbbell,
  GripVertical,
  Home,
  Plus,
  Repeat2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Builder calendar (C17/C18/G5, R27/R28) — Day 1..N slot columns ×    */
/* week rows (no weekday grid, no Rest cells). A slot can hold         */
/* MULTIPLE sessions (Day 1A/1B); every chip lists its movements       */
/* TeamBuildR-style ("A Hip Snatch 3×6"), has a drag handle to move    */
/* it to another slot, and up/down arrows to reorder sessions WITHIN   */
/* the same day. Empty slots read "[+] Add Workout" and create a day.  */
/* ------------------------------------------------------------------ */

export type CalendarPublishState =
  | "completed"
  | "published"
  | "scheduled"
  | "draft";

/** G5 — one compact movement line: slot letter + name + sets×reps. */
export interface BuilderCalendarMove {
  slot: string;
  name: string;
  sets: string;
}

export interface BuilderCalendarDay {
  id: string;
  /** Day slot within the week (Day 1..N) — sequence order, not a weekday. */
  dayNumber: number;
  /** "1" for single sessions, "1A"/"1B" for multi-session days. */
  label: string;
  title: string;
  location: "gym" | "home";
  /** Ordered movement lines shown in the cell (G5). */
  moves: BuilderCalendarMove[];
  state: CalendarPublishState;
}

export interface BuilderCalendarWeek {
  weekNumber: number;
  label?: string;
  days: BuilderCalendarDay[];
}

/** R26 — one glyph + label + tone per state, shared by chips and legend. */
const STATE_META: Record<
  CalendarPublishState,
  { glyph: string; label: string; cls: string }
> = {
  completed: { glyph: "✓", label: "Completed", cls: "text-success" },
  published: { glyph: "●", label: "Published", cls: "text-success" },
  scheduled: { glyph: "◐", label: "Publishes soon", cls: "text-info" },
  draft: { glyph: "○", label: "Draft", cls: "text-warning" },
};

interface DragPayload {
  weekNumber: number;
  dayId: string;
}

/** G8 — right-click context menu anchored at the cursor. */
interface DayMenu {
  x: number;
  y: number;
  weekNumber: number;
  dayId: string;
  dayLabel: string;
}

export function BuilderCalendar({
  weeks,
  mode = "athlete",
  activeDayId,
  onSelectDay,
  onMoveDay,
  onReorderSession,
  onAddDay,
  onCopyDay,
  onDuplicateDay,
  onRepeatWeek,
}: {
  weeks: BuilderCalendarWeek[];
  /** R26 — template mode never shows the Completed state or legend entry. */
  mode?: "athlete" | "template";
  activeDayId?: string;
  onSelectDay: (weekNumber: number, dayId: string) => void;
  /** C18 — a chip was dragged onto another slot. */
  onMoveDay: (
    fromWeekNumber: number,
    dayId: string,
    toWeekNumber: number,
    toDayNumber: number,
  ) => void;
  /** G5 — move a session up/down within its own day cell. */
  onReorderSession: (weekNumber: number, dayId: string, dir: -1 | 1) => void;
  /** R28 — an empty "[+] Add Workout" slot was clicked. */
  onAddDay: (weekNumber: number, dayNumber: number) => void;
  /** G8 — right-click actions on a day chip. */
  onCopyDay: (weekNumber: number, dayId: string) => void;
  onDuplicateDay: (weekNumber: number, dayId: string) => void;
  onRepeatWeek: (weekNumber: number) => void;
}) {
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [over, setOver] = useState<{ weekNumber: number; dayNumber: number } | null>(
    null,
  );
  const [menu, setMenu] = useState<DayMenu | null>(null);

  // G8 — Escape closes the context menu (click-away is the backdrop).
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  function handleDrop(toWeekNumber: number, toDayNumber: number) {
    if (drag) onMoveDay(drag.weekNumber, drag.dayId, toWeekNumber, toDayNumber);
    setDrag(null);
    setOver(null);
  }

  // R27 — columns are Day 1..N, N = the program's days per week (the widest
  // week drives it so every session always has a column).
  const slotCount = Math.max(
    1,
    ...weeks.map((w) => w.days.reduce((m, d) => Math.max(m, d.dayNumber), 0)),
  );
  // R25 — slots keep a real minimum width so "3 × 5" never gets cut.
  const gridTemplate = {
    gridTemplateColumns: `3.5rem repeat(${slotCount}, minmax(10rem, 1fr))`,
  };

  // R26 — legend: Completed (athlete programs only) + the publish states.
  const legendStates: CalendarPublishState[] =
    mode === "template"
      ? ["published", "scheduled", "draft"]
      : ["completed", "published", "scheduled", "draft"];

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="overflow-x-auto scrollbar-slim p-3">
          <div className="min-w-fit">
            {/* Day-slot header — Day 1..N, no weekdays (R27) */}
            <div className="grid gap-1.5" style={gridTemplate}>
              <span aria-hidden />
              {Array.from({ length: slotCount }, (_, i) => (
                <span
                  key={i}
                  className="px-1 text-center text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Day {i + 1}
                </span>
              ))}
            </div>

            {/* One row per week */}
            {weeks.map((week) => (
              <div
                key={week.weekNumber}
                className="mt-1.5 grid gap-1.5"
                style={gridTemplate}
              >
                <span
                  className="flex items-center justify-center rounded-lg bg-muted px-1 text-center text-xs font-bold text-muted-foreground"
                  title={week.label}
                >
                  {week.label ? week.label : `Wk ${week.weekNumber}`}
                </span>
                {Array.from({ length: slotCount }, (_, slotIdx) => {
                  const dayNumber = slotIdx + 1;
                  const sessions = week.days.filter(
                    (d) => d.dayNumber === dayNumber,
                  );
                  const isOver =
                    drag != null &&
                    over?.weekNumber === week.weekNumber &&
                    over.dayNumber === dayNumber;
                  return (
                    <div
                      key={dayNumber}
                      onDragOver={(ev) => {
                        if (!drag) return;
                        ev.preventDefault();
                        ev.dataTransfer.dropEffect = "move";
                        setOver({ weekNumber: week.weekNumber, dayNumber });
                      }}
                      onDragLeave={() =>
                        setOver((prev) =>
                          prev?.weekNumber === week.weekNumber &&
                          prev.dayNumber === dayNumber
                            ? null
                            : prev,
                        )
                      }
                      onDrop={(ev) => {
                        ev.preventDefault();
                        handleDrop(week.weekNumber, dayNumber);
                      }}
                      className={cn(
                        "flex min-h-[5.5rem] flex-col gap-1.5 rounded-lg",
                        isOver &&
                          "ring-2 ring-brand ring-offset-2 ring-offset-background",
                      )}
                    >
                      {sessions.length === 0 ? (
                        /* R28 — empty slot: no "Rest", add a workout instead */
                        <button
                          type="button"
                          onClick={() => onAddDay(week.weekNumber, dayNumber)}
                          title={`Add a workout — Day ${dayNumber}, Week ${week.weekNumber}`}
                          className="flex min-h-[5.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 text-[0.7rem] font-semibold text-muted-foreground/70 transition-colors hover:border-border hover:bg-accent hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          Add Workout
                        </button>
                      ) : (
                        sessions.map((day, sessionIdx) => {
                          const isActive = day.id === activeDayId;
                          const isDragging = drag?.dayId === day.id;
                          const stateMeta = STATE_META[day.state];
                          return (
                            <div
                              key={day.id}
                              // G8 — right-click opens the day actions menu
                              onContextMenu={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                setMenu({
                                  x: ev.clientX,
                                  y: ev.clientY,
                                  weekNumber: week.weekNumber,
                                  dayId: day.id,
                                  dayLabel: day.label,
                                });
                              }}
                              className={cn(
                                "flex min-h-[5.5rem] flex-1 items-stretch rounded-lg border transition-colors",
                                isActive
                                  ? "border-brand/40 bg-brand/10"
                                  : "border-border bg-surface/50 hover:bg-accent",
                                isDragging && "opacity-40",
                              )}
                            >
                              {/* C18 — drag handle: click and drag to move */}
                              <span
                                draggable
                                role="button"
                                aria-label={`Drag Day ${day.label} to another day slot`}
                                title="Drag to move this session to another day slot"
                                onDragStart={(ev) => {
                                  ev.dataTransfer.effectAllowed = "move";
                                  ev.dataTransfer.setData("text/plain", day.id);
                                  setDrag({
                                    weekNumber: week.weekNumber,
                                    dayId: day.id,
                                  });
                                }}
                                onDragEnd={() => {
                                  setDrag(null);
                                  setOver(null);
                                }}
                                className="flex w-5 shrink-0 cursor-grab items-center justify-center rounded-l-lg text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectDay(week.weekNumber, day.id)
                                }
                                title={`Open Day ${day.label} — ${day.title} in the builder`}
                                className="flex min-w-0 flex-1 flex-col gap-1 p-2 pl-0.5 text-left"
                              >
                                <span className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">
                                  {day.location === "home" ? (
                                    <Home className="h-3 w-3" />
                                  ) : (
                                    <Dumbbell className="h-3 w-3" />
                                  )}
                                  Day {day.label}
                                  {/* R26 — state glyph: ✓/●/◐/○ */}
                                  <span
                                    className={cn(
                                      "ml-auto shrink-0 text-[0.7rem] leading-none",
                                      stateMeta.cls,
                                    )}
                                    title={stateMeta.label}
                                  >
                                    {stateMeta.glyph}
                                  </span>
                                </span>
                                <span className="line-clamp-1 text-xs font-semibold leading-tight">
                                  {day.title}
                                </span>
                                {/* G5/G7 — EVERY movement listed; lines wrap
                                    instead of truncating so sets×reps always
                                    show in full (R25) */}
                                {day.moves.length > 0 ? (
                                  <span className="flex flex-col">
                                    {day.moves.map((m, i) => (
                                      <span
                                        key={`${day.id}-m${i}`}
                                        className="break-words text-[0.65rem] leading-[1.35] text-muted-foreground"
                                        title={`${m.slot} ${m.name} ${m.sets}`}
                                      >
                                        <span className="font-bold text-foreground/80">
                                          {m.slot}
                                        </span>{" "}
                                        {m.name}{" "}
                                        <span className="tnum whitespace-nowrap">
                                          {m.sets}
                                        </span>
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  <span className="text-[0.65rem] text-muted-foreground/60">
                                    No movements yet
                                  </span>
                                )}
                              </button>
                              {/* G5 — reorder sessions within the same day */}
                              {sessions.length > 1 ? (
                                <span className="flex shrink-0 flex-col items-center justify-center gap-0.5 pr-1">
                                  <button
                                    type="button"
                                    aria-label={`Move Day ${day.label} earlier in the day`}
                                    title="Move this session up within the day"
                                    disabled={sessionIdx === 0}
                                    onClick={() =>
                                      onReorderSession(
                                        week.weekNumber,
                                        day.id,
                                        -1,
                                      )
                                    }
                                    className="rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                                  >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Move Day ${day.label} later in the day`}
                                    title="Move this session down within the day"
                                    disabled={sessionIdx === sessions.length - 1}
                                    onClick={() =>
                                      onReorderSession(week.weekNumber, day.id, 1)
                                    }
                                    className="rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* R26 — legend: ✓ Completed · ● Published · ◐ Publishes soon · ○ Draft */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {legendStates.map((state) => (
          <span key={state} className="flex items-center gap-1.5">
            <span
              className={cn("text-sm leading-none", STATE_META[state].cls)}
              aria-hidden
            >
              {STATE_META[state].glyph}
            </span>
            {STATE_META[state].label}
          </span>
        ))}
        <span className="ml-auto">
          Click a day to open it · right-click for actions · drag the handle to
          another slot · arrows reorder sessions within a day.
        </span>
      </div>

      {/* G8 — right-click context menu: click-away or Escape closes it */}
      {menu ? (
        <>
          <button
            type="button"
            aria-label="Close day menu"
            onClick={() => setMenu(null)}
            onContextMenu={(ev) => {
              ev.preventDefault();
              setMenu(null);
            }}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            aria-label={`Day ${menu.dayLabel} actions`}
            className="fixed z-50 w-56 rounded-xl border border-border bg-card p-1.5 shadow-raised"
            style={{
              top: Math.min(menu.y, window.innerHeight - 170),
              left: Math.min(menu.x, window.innerWidth - 240),
            }}
          >
            <p className="px-2.5 pb-1 pt-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
              Day {menu.dayLabel} · Wk {menu.weekNumber}
            </p>
            <ContextMenuItem
              icon={Copy}
              label="Copy day"
              hint="To the cross-client clipboard"
              onClick={() => {
                onCopyDay(menu.weekNumber, menu.dayId);
                setMenu(null);
              }}
            />
            <ContextMenuItem
              icon={CopyPlus}
              label="Duplicate day"
              hint="Adds a second session in this day slot"
              onClick={() => {
                onDuplicateDay(menu.weekNumber, menu.dayId);
                setMenu(null);
              }}
            />
            <ContextMenuItem
              icon={Repeat2}
              label="Repeat week forward"
              hint={`Copies Week ${menu.weekNumber} across the later weeks`}
              onClick={() => {
                onRepeatWeek(menu.weekNumber);
                setMenu(null);
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

/** One row of the right-click menu (G8). */
function ContextMenuItem({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint ? (
          <span className="block text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}
