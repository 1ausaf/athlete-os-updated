"use client";

import { Dumbbell, Home } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Calendar overview (C17) — the whole block at a glance:              */
/* Mon–Sun columns × week rows, one cell per training day.             */
/* ------------------------------------------------------------------ */

export type CalendarPublishState = "published" | "scheduled" | "draft";

export interface CalendarDayCell {
  id: string;
  /** 1..7 → Monday..Sunday (weekly sequence restarts Monday). */
  dayNumber: number;
  title: string;
  location: "gym" | "home";
  movements: number;
  state: CalendarPublishState;
}

export interface CalendarWeekRow {
  weekNumber: number;
  days: CalendarDayCell[];
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

export function ProgramCalendar({
  weeks,
  activeDayId,
  onSelectDay,
}: {
  weeks: CalendarWeekRow[];
  activeDayId?: string;
  onSelectDay: (weekNumber: number, dayId: string) => void;
}) {
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
                <span className="flex items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                  Wk {week.weekNumber}
                </span>
                {WEEKDAYS.map((wd, wdIdx) => {
                  const day = week.days.find((d) => d.dayNumber === wdIdx + 1);
                  if (!day) {
                    return (
                      <div
                        key={wd}
                        className="flex min-h-[4.5rem] items-center justify-center rounded-lg border border-dashed border-border/70 text-[0.65rem] text-muted-foreground/50"
                      >
                        Rest
                      </div>
                    );
                  }
                  const isActive = day.id === activeDayId;
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => onSelectDay(week.weekNumber, day.id)}
                      title={`Open Day ${day.dayNumber} — ${day.title} in the builder`}
                      className={cn(
                        "flex min-h-[4.5rem] flex-col gap-1 rounded-lg border p-2 text-left transition-colors",
                        isActive
                          ? "border-brand/40 bg-brand/10"
                          : "border-border bg-surface/50 hover:bg-accent",
                      )}
                    >
                      <span className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">
                        {day.location === "home" ? (
                          <Home className="h-3 w-3" />
                        ) : (
                          <Dumbbell className="h-3 w-3" />
                        )}
                        Day {day.dayNumber}
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
        <span className="ml-auto">Click a day to open it in the builder.</span>
      </div>
    </div>
  );
}
