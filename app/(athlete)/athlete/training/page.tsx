import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Dumbbell,
  LayoutDashboard,
  Trophy,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ProgressRing } from "@/components/app/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById, relTime } from "@/lib/demo/data";
import { seasonMeta } from "@/lib/demo/status";
import {
  athleteMaxes,
  exerciseById,
  jordanExerciseHistory,
  jordanProgramDays,
  type LibraryExercise,
} from "@/lib/demo/training";

import { WorkoutLogger } from "./workout-logger";

export default async function AthleteTrainingPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const { program } = athlete;
  const season = seasonMeta[athlete.season];

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
      <PageHeader
        eyebrow="Athlete Portal · Training"
        title="Your next sessions"
        description="Programs run in sequence — finish a day to unlock the next, not by the calendar. Pick the session that fits where you are today."
        actions={
          <>
            <Pill tone={season.tone} dot>
              {athlete.sport} · {season.label}
            </Pill>
            <Button asChild variant="ghost" size="sm" className="no-print">
              <Link href={"/athlete/dashboard" as Route}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="no-print">
              <Link href={"/athlete/sessions" as Route}>
                <CalendarDays className="h-4 w-4" />
                Schedule
              </Link>
            </Button>
          </>
        }
      />

      {/* Compact program strip — the day picker below is the star. */}
      <Card>
        <div className="flex flex-wrap items-center gap-4 p-4 sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold">{program.name}</span>
              <Pill tone="neutral">{program.phase} phase</Pill>
              <Pill tone="brand">
                Day {program.day} of {program.totalDays}
              </Pill>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {athlete.planName} · advance a day when the completed session is
              logged
            </p>
          </div>
          <ProgressRing
            value={program.compliancePct}
            size={72}
            stroke={7}
            label="log rate"
          />
        </div>
      </Card>

      {/* Day picker + interactive logger (client) */}
      <WorkoutLogger
        days={days}
        exercises={exerciseMap}
        history={jordanExerciseHistory}
        maxes={maxes}
      />

      {/* PR history — secondary, collapsed by default */}
      <Card>
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
                  <div className="truncate text-sm font-semibold">{pr.lift}</div>
                  <div className="text-xs text-muted-foreground">
                    {relTime(pr.date)}
                  </div>
                </div>
                <span className="tnum text-sm font-bold">
                  {pr.value}
                  <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                    {pr.unit}
                  </span>
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
