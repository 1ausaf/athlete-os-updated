import { redirect } from "next/navigation";
import { CalendarClock, ClipboardList, Dumbbell, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { StatTile } from "@/components/app/stat-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUserWithProfile } from "@/lib/auth";
import { athletes, relTime } from "@/lib/demo/data";
import {
  exerciseLibrary,
  LIBRARY_TOTALS,
  programTemplates,
  trainingGroups,
} from "@/lib/demo/training";
import { isStaff } from "@/lib/rbac";

import { ClientQueue } from "./client-queue";
import { ExerciseLibrary } from "./exercise-library";
import { ProgramLibrary } from "./program-library";

export default async function ProgrammingPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const dueNow = athletes.filter((a) => a.programDueInDays === 0).length;
  const dueSoon = athletes.filter((a) => a.programDueInDays <= 5).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace"
        title="Programming"
        description="Write, copy and publish training — the client queue tells you whose program runs out next, the libraries hold every exercise and master template."
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
          <TabsTrigger value="queue">Client queue</TabsTrigger>
          <TabsTrigger value="programs">Program library</TabsTrigger>
          <TabsTrigger value="exercises">Exercise library</TabsTrigger>
        </TabsList>

        {/* 1 — programming queue (athletes + teams, coach filter) */}
        <TabsContent value="queue" className="mt-4">
          <ClientQueue viewerId={user.id} />
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
