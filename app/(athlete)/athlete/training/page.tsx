import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, Dumbbell, LayoutDashboard, Trophy } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Progress, ProgressRing } from "@/components/app/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById, relTime } from "@/lib/demo/data";
import { seasonMeta } from "@/lib/demo/status";

import { WorkoutLogger } from "./workout-logger";

export default async function AthleteTrainingPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const { program } = athlete;
  const progressPct = Math.round((program.day / program.totalDays) * 100);
  const season = seasonMeta[athlete.season];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Training"
        title="Today's training"
        description="Your individualized periodized program, logged set by set. Advance a day when your completed session is logged — not by the calendar."
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

      {/* Current program hero */}
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
                <Dumbbell className="h-5 w-5" />
              </span>
              <span className="eyebrow">Current program</span>
            </div>
            <div>
              <h2 className="text-2xl">{program.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                Day {program.day} of {program.totalDays}
                <span className="text-muted-foreground/50">·</span>
                <Pill tone="neutral">{program.phase} phase</Pill>
                <Pill tone="brand">{program.block}</Pill>
                <span className="text-muted-foreground/50">·</span>
                {athlete.planName}
              </p>
            </div>
            <div className="max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Block progress</span>
                <span className="tnum font-semibold text-foreground">
                  {progressPct}%
                </span>
              </div>
              <Progress value={progressPct} />
            </div>
          </div>
          <div className="flex items-center justify-center md:pl-6">
            <ProgressRing
              value={program.compliancePct}
              size={132}
              stroke={10}
              label="log rate"
            />
          </div>
        </div>
      </Card>

      {/* Interactive workout logger (client) */}
      <WorkoutLogger />

      {/* PR history */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand-ink" aria-hidden />
            <h3 className="text-base">Personal records</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {athlete.prs.length} on file
            </span>
          </div>
          <ul className="flex flex-col gap-2">
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
                  </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
