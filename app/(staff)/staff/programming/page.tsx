import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, ClipboardList, Dumbbell, Users } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUserWithProfile } from "@/lib/auth";
import { athletes, bucketLabel, relTime, type Athlete } from "@/lib/demo/data";
import {
  exerciseLibrary,
  LIBRARY_TOTALS,
  programTemplates,
  trainingGroups,
} from "@/lib/demo/training";
import { isStaff } from "@/lib/rbac";

import { ExerciseLibrary } from "./exercise-library";
import { ProgramLibrary } from "./program-library";

/** Runway pill for the programming queue — 0 days = a program is due now. */
function runwayPill(days: number) {
  if (days === 0)
    return (
      <Pill tone="danger" dot>
        Due now
      </Pill>
    );
  if (days <= 5)
    return (
      <Pill tone="warning" dot>
        Due in {days}d
      </Pill>
    );
  return <Pill tone="neutral">{days}d runway</Pill>;
}

export default async function ProgrammingPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const queue = [...athletes].sort(
    (a, b) => a.programDueInDays - b.programDueInDays,
  );
  const dueNow = athletes.filter((a) => a.programDueInDays === 0).length;
  const dueSoon = athletes.filter((a) => a.programDueInDays <= 5).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace"
        title="Programming"
        description="Write, copy and publish training — the athlete queue tells you whose program runs out next, the libraries hold every exercise and master template."
      />

      {/* Library scale + workload */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Exercise library"
          value={LIBRARY_TOTALS.exercises}
          icon={Dumbbell}
          hint={`${exerciseLibrary.length} curated samples in this demo`}
        />
        <StatTile
          label="Program library"
          value={LIBRARY_TOTALS.programs}
          icon={ClipboardList}
          hint={`${programTemplates.length} master templates shown`}
        />
        <StatTile
          label="Teams programmed"
          value={LIBRARY_TOTALS.teams}
          icon={Users}
          hint={`${trainingGroups.length} groups active this week`}
        />
        <StatTile
          label="Updates due"
          value={dueNow}
          icon={CalendarClock}
          accent
          hint={`${dueSoon} athletes inside 5 days of runway`}
        />
      </div>

      <Tabs defaultValue="queue">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="queue">Athlete queue</TabsTrigger>
          <TabsTrigger value="programs">Program library</TabsTrigger>
          <TabsTrigger value="exercises">Exercise library</TabsTrigger>
        </TabsList>

        {/* 1 — programming queue */}
        <TabsContent value="queue" className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Sorted by program runway — an athlete hits zero when their last
            published day is trained. Write the next block before they run out.
          </p>
          {queue.map((a) => (
            <QueueRow key={a.id} athlete={a} />
          ))}
        </TabsContent>

        {/* 2 — master programs */}
        <TabsContent value="programs" className="mt-4">
          <ProgramLibrary />
        </TabsContent>

        {/* 3 — exercise library + editor */}
        <TabsContent value="exercises" className="mt-4">
          <ExerciseLibrary />
        </TabsContent>
      </Tabs>

      {/* 4 — groups strip (shared-program teams) */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <span className="eyebrow">Groups</span>
            <h2 className="text-lg">Teams on shared programs</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            One program, many athletes — individual loads still auto-scale to
            each athlete&apos;s maxes.
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {trainingGroups.map((g) => {
            const pct = Math.round((g.compliance.filled / g.compliance.total) * 100);
            return (
              <Card key={g.id}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{g.name}</span>
                    <Pill tone="neutral" icon={<Users className="h-3 w-3" />}>
                      {g.athleteCount}
                    </Pill>
                  </div>
                  <p className="text-xs text-muted-foreground">{g.program}</p>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">This week</span>
                      <span className="tnum font-semibold">
                        {g.compliance.filled}/{g.compliance.total} filled
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      tone={pct >= 70 ? "success" : pct >= 50 ? "brand" : "warning"}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last session {relTime(g.lastSession)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function QueueRow({ athlete }: { athlete: Athlete }) {
  const builderHref = `/staff/athletes/${athlete.id}/program` as Route;
  const progressPct = Math.round(
    (athlete.program.day / athlete.program.totalDays) * 100,
  );

  return (
    <Card>
      <CardContent className="grid items-center gap-4 p-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_auto_auto]">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-bold">{athlete.name}</span>
              <Pill tone="neutral">{bucketLabel[athlete.bucket]}</Pill>
            </div>
            <p className="text-sm text-muted-foreground">
              {athlete.sport} · {athlete.coach}
            </p>
          </div>
        </div>

        {/* Current program */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="truncate font-medium">{athlete.program.name}</span>
            <span className="tnum shrink-0 text-muted-foreground">
              Day {athlete.program.day}/{athlete.program.totalDays}
            </span>
          </div>
          <Progress value={progressPct} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {athlete.program.phase} phase · {athlete.frequency}
          </p>
        </div>

        {/* Runway */}
        <div className="md:justify-self-end">{runwayPill(athlete.programDueInDays)}</div>

        {/* Action */}
        <Button asChild variant="outline" size="sm" className="md:justify-self-end">
          <Link href={builderHref}>Open builder</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
