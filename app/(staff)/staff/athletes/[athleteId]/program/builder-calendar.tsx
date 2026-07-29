"use client";

import { useState } from "react";
import { Dumbbell, GripVertical, Home } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Builder calendar (C17/C18) — Mon–Sun columns × week rows. A cell    */
/* can hold MULTIPLE sessions (Day 1A/1B) and every chip has a drag    */
/* handle: drop it on another cell to move the session.                */
/* ------------------------------------------------------------------ */

export type CalendarPublishState = "published" | "scheduled" | "draft";

export interface BuilderCalendarDay {
  id: string;
  /** 1..7 → Monday..Sunday (weekly sequence restarts Monday). */
  dayNumber: number;
  /** "1" for single sessions, "1A"/"1B" for multi-session days. */
  label: string;
  title: string;
  location: "gym" | "home";
  movements: number;
  state: CalendarPublishState;
}

export interface BuilderCalendarWeek {
  weekNumber: number;
  label?: string;
  days: BuilderCalendarDay[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATE_DOT: Record<CalendarPublishState, string> = {
  published: "bg-success",
  scheduled: "bg-info",
  draft: "bg-warning",
};

const STATE_LABEL: Record<CalendarPublishState, string> = {
  published: "Published",
  scheduled: "Auto-publish queued",
  draft: "Draft",
};

interface DragPayload {
  weekNumber: number;
  dayId: string;
}

export function BuilderCalendar({
  weeks,
  activeDayId,
  onSelectDay,
  onMoveDay,
}: {
  weeks: BuilderCalendarWeek[];
  activeDayId?: string;
  onSelectDay: (weekNumber: number, dayId: string) => void;
  /** C18 — a chip was dragged onto another cell. */
  onMoveDay: (
    fromWeekNumber: number,
    dayId: string,
    toWeekNumber: number,
    toDayNumber: number,
  ) => void;
}) {
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [over, setOver] = useState<{ weekNumber: number; dayNumber: number } | null>(
    null,
  );

  function handleDrop(toWeekNumber: number, toDayNumber: number) {
    if (drag) onMoveDay(drag.weekNumber, drag.dayId, toWeekNumber, toDayNumber);
    setDrag(null);
    setOver(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="overflow-x-auto scrollbar-slim p-3">
          <div className="min-w-[720px]">
            {/* Weekday header */}
            <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-1.5">
              <span aria-hidden />
              {WEEKDAYS.map((wd) => (
                <span
                  key={wd}
                  className="px-1 text-center text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {wd}
                </span>
              ))}
            </div>

            {/* One row per week */}
            {weeks.map((week) => (
              <div
                key={week.weekNumber}
                className="mt-1.5 grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-1.5"
              >
                <span
                  className="flex items-center justify-center rounded-lg bg-muted px-1 text-center text-xs font-bold text-muted-foreground"
                  title={week.label}
                >
                  {week.label ? week.label : `Wk ${week.weekNumber}`}
                </span>
                {WEEKDAYS.map((wd, wdIdx) => {
                  const dayNumber = wdIdx + 1;
                  const sessions = week.days.filter(
                    (d) => d.dayNumber === dayNumber,
                  );
                  const isOver =
                    drag != null &&
                    over?.weekNumber === week.weekNumber &&
                    over.dayNumber === dayNumber;
                  return (
                    <div
                      key={wd}
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
                        "flex min-h-[4.5rem] flex-col gap-1.5 rounded-lg",
                        sessions.length === 0 &&
                          "items-center justify-center border border-dashed border-border/70",
                        isOver &&
                          "ring-2 ring-brand ring-offset-2 ring-offset-background",
                      )}
                    >
                      {sessions.length === 0 ? (
                        <span className="text-[0.65rem] text-muted-foreground/50">
                          Rest
                        </span>
                      ) : (
                        sessions.map((day) => {
                          const isActive = day.id === activeDayId;
                          const isDragging = drag?.dayId === day.id;
                          return (
                            <div
                              key={day.id}
                              className={cn(
                                "flex min-h-[4.5rem] flex-1 items-stretch rounded-lg border transition-colors",
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
                                aria-label={`Drag Day ${day.label} to another weekday`}
                                title="Drag to move this session to another day"
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
                                  <span
                                    className={cn(
                                      "ml-auto h-1.5 w-1.5 shrink-0 rounded-full",
                                      STATE_DOT[day.state],
                                    )}
                                    title={STATE_LABEL[day.state]}
                                  />
                                </span>
                                <span className="line-clamp-2 text-xs font-semibold leading-tight">
                                  {day.title}
                                </span>
                                <span className="tnum mt-auto text-[0.65rem] text-muted-foreground">
                                  {day.movements}{" "}
                                  {day.movements === 1 ? "movement" : "movements"}
                                </span>
                              </button>
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {(Object.keys(STATE_DOT) as CalendarPublishState[]).map((state) => (
          <span key={state} className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", STATE_DOT[state])} />
            {STATE_LABEL[state]}
          </span>
        ))}
        <span className="ml-auto">
          Click a day to open it · drag the handle to move it to another cell.
        </span>
      </div>
    </div>
  );
}
