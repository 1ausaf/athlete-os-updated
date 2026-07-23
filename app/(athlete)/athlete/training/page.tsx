import { ChevronDown, Trophy } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireAthleteContext } from "@/lib/demo/session";
import { fmtFullDay } from "@/lib/demo/data";
import {
  athleteMaxes,
  exerciseById,
  jordanExerciseHistory,
  jordanProgramDays,
  type LibraryExercise,
} from "@/lib/demo/training";

import { WorkoutLogger } from "./workout-logger";

export default async function AthleteTrainingPage() {
  const { athlete } = requireAthleteContext();
  const { program } = athlete;

  // Assemble serializable props for the client logger.
  const days = jordanProgramDays;
  const exerciseMap: Record<string, LibraryExercise> = {};
  for (const day of days) {
    for (const section of day.sections) {
      for (const ex of section.exercises) {
        const lib = exerciseById(ex.exerciseId);
        if (lib) exerciseMap[ex.exerciseId] = lib;
      }
    }
  }
  const maxes = athleteMaxes[athlete.id] ?? athleteMaxes["ath-jordan"] ?? {};

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print">
        <PageHeader
          eyebrow="Athlete Portal · Training"
          title="Your next sessions"
          description="Programs run in sequence — finish a day to unlock the next, not by the calendar. Pick the session that fits where you are today."
        />
      </div>

      {/* Day picker + interactive logger (client) */}
      <WorkoutLogger
        days={days}
        exercises={exerciseMap}
        history={jordanExerciseHistory}
        maxes={maxes}
      />

      {/* PR history — secondary, collapsed by default */}
      <Card className="no-print">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 [&::-webkit-details-marker]:hidden">
            <Trophy className="h-5 w-5 text-brand-ink" aria-hidden />
            <h3 className="text-base">Personal records</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {athlete.prs.length} on file
            </span>
            <ChevronDown
              className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <ul className="flex flex-col gap-2 px-5 pb-5">
            {athlete.prs.map((pr) => (
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
        </details>
      </Card>
    </div>
  );
}
