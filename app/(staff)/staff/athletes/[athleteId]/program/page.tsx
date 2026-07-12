import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Dumbbell, Layers, Target } from "lucide-react";

import { BarSeries } from "@/components/app/mini-charts";
import { PageHeader } from "@/components/app/page-header";
import { Progress, ProgressRing } from "@/components/app/progress";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById, type Athlete } from "@/lib/demo/data";
import { isStaff } from "@/lib/rbac";

import { PrintButton } from "./print-button";

/* ------------------------------------------------------------------ */
/* Local demo program structure (individualized by sport / phase)      */
/* ------------------------------------------------------------------ */

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  intensity: string;
  note?: string;
}
interface TrainingDay {
  label: string;
  focus: string;
  exercises: Exercise[];
}

/** Build a believable weekly template tuned to the athlete's sport & phase. */
function buildWeek(a: Athlete): TrainingDay[] {
  const phase = a.program.phase.toLowerCase();
  const heavy = phase.includes("peak") || phase.includes("realization");
  const accumulation = phase.includes("accumulation");

  // Primary %/RPE prescriptions shift with the phase.
  const mainInt = heavy ? "88–92% 1RM" : accumulation ? "70–75% 1RM" : "80–85% 1RM";
  const mainReps = heavy ? "2–3" : accumulation ? "6–8" : "4–5";
  const mainSets = heavy ? "5" : accumulation ? "4" : "4";

  const power: TrainingDay = {
    label: "Day 1",
    focus: "Lower — Max Strength & Power",
    exercises: [
      { name: "Trap-bar deadlift", sets: mainSets, reps: mainReps, intensity: mainInt, note: "3ct reset" },
      { name: "Front squat", sets: "3", reps: "5", intensity: "RPE 7", note: "tempo 31X1" },
      { name: "Hip thrust", sets: "3", reps: "8", intensity: "RPE 8" },
      { name: "Nordic hamstring", sets: "3", reps: "6", intensity: "bodyweight" },
      { name: "Pallof press", sets: "3", reps: "10/side", intensity: "controlled" },
    ],
  };

  const upper: TrainingDay = {
    label: "Day 2",
    focus: "Upper — Push / Pull",
    exercises: [
      { name: "Bench press", sets: mainSets, reps: mainReps, intensity: mainInt },
      { name: "Weighted chin-up", sets: "4", reps: "5", intensity: "RPE 8" },
      { name: "DB shoulder press", sets: "3", reps: "8", intensity: "RPE 8" },
      { name: "Chest-supported row", sets: "3", reps: "10", intensity: "RPE 7", note: "2ct squeeze" },
      { name: "Band face pull", sets: "3", reps: "15", intensity: "scap health" },
    ],
  };

  const speed: TrainingDay = {
    label: "Day 3",
    focus: "Speed, Plyometrics & Conditioning",
    exercises: [
      { name: "Sprint accelerations", sets: "6", reps: "20yd", intensity: "95%+", note: "full recovery" },
      { name: "Depth jump → broad jump", sets: "4", reps: "3", intensity: "max intent" },
      { name: "Med-ball rotational throw", sets: "4", reps: "4/side", intensity: "max intent" },
      { name: "Single-leg RDL", sets: "3", reps: "8/side", intensity: "RPE 7" },
      { name: "Sled push", sets: "5", reps: "15yd", intensity: "heavy" },
    ],
  };

  const care: TrainingDay = {
    label: "Day 4",
    focus: "Accessory, Arm-Care & Mobility",
    exercises: [
      { name: "Landmine press", sets: "3", reps: "10", intensity: "RPE 7" },
      { name: "Rear-foot split squat", sets: "3", reps: "8/side", intensity: "RPE 7" },
      { name: "Band external rotation", sets: "3", reps: "12/side", intensity: "arm care" },
      { name: "Copenhagen plank", sets: "3", reps: "20s/side", intensity: "controlled" },
      { name: "Breathing + mobility flow", sets: "1", reps: "8 min", intensity: "downregulate" },
    ],
  };

  // Sport-specific bias: which day is emphasized in the copy.
  const rotational = /golf|baseball|volleyball/i.test(a.sport);
  if (rotational) {
    speed.focus = "Rotational Power & Speed";
  }

  // Days per week follows the athlete's frequency (min 3, max 4 templated).
  const target = Math.min(4, Math.max(3, a.frequencyPerWeek));
  const all = [power, upper, speed, care];
  return all.slice(0, target);
}

export default async function StaffAthleteProgramPage({
  params,
}: {
  params: { athleteId: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const athlete = athleteById(params.athleteId);
  if (!athlete) notFound();

  const week = buildWeek(athlete);
  const progressPct = Math.round(
    (athlete.program.day / athlete.program.totalDays) * 100,
  );

  // Demo: log rate over last 8 sessions (oldest → newest), trending toward
  // the athlete's current compliance figure.
  const base = athlete.program.compliancePct;
  const logRate = [
    base - 14,
    base - 9,
    base - 11,
    base - 4,
    base - 6,
    base - 2,
    base - 3,
    base,
  ].map((v) => Math.max(40, Math.min(100, v)));

  const profileHref = `/staff/athletes/${athlete.id}` as Route;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Program"
        title={`${athlete.name} — individualized program`}
        description={`${athlete.program.name}. Periodized, completion-based — the athlete advances when logged sessions post, not by the calendar.`}
        actions={
          <>
            <PrintButton />
            <Button asChild variant="ghost" size="sm" className="no-print">
              <Link href={profileHref}>
                <ChevronLeft className="h-4 w-4" />
                Back to profile
              </Link>
            </Button>
          </>
        }
      />

      {/* Program hero */}
      <Card className="overflow-hidden bg-brand-sheen">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="brand" dot>
                {athlete.program.phase} phase
              </Pill>
              <Pill tone="neutral">{athlete.program.block}</Pill>
              <Pill tone="info">{athlete.frequency}</Pill>
            </div>
            <h2 className="text-2xl">{athlete.program.name}</h2>
            <div className="max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Block progress</span>
                <span className="tnum font-semibold">
                  Day {athlete.program.day} / {athlete.program.totalDays}
                </span>
              </div>
              <Progress value={progressPct} />
            </div>
          </div>
          <div className="flex items-center justify-center md:pl-6">
            <ProgressRing
              value={athlete.program.compliancePct}
              size={132}
              stroke={10}
              label="log rate"
            />
          </div>
        </CardContent>
      </Card>

      {/* Snapshot tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Block progress"
          value={progressPct}
          unit="%"
          icon={Target}
          hint={`Day ${athlete.program.day} of ${athlete.program.totalDays}`}
        />
        <StatTile
          label="Log compliance"
          value={athlete.program.compliancePct}
          unit="%"
          icon={Layers}
          hint="Last 8 sessions"
        />
        <StatTile
          label="Training days"
          value={`${week.length}×`}
          unit="/week"
          icon={Dumbbell}
          hint={athlete.frequency}
        />
      </div>

      {/* Weekly program table */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg">Weekly plan</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {week.map((day) => (
            <Card key={day.label} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-2 border-b border-border bg-surface/50 px-4 py-3">
                  <div>
                    <span className="eyebrow">{day.label}</span>
                    <h4 className="text-sm font-semibold">{day.focus}</h4>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/10 text-brand-ink">
                    <Dumbbell className="h-4 w-4" />
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exercise</TableHead>
                      <TableHead className="w-14 text-center">Sets</TableHead>
                      <TableHead className="w-16 text-center">Reps</TableHead>
                      <TableHead className="w-28 text-right">%/RPE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {day.exercises.map((ex) => (
                      <TableRow key={ex.name}>
                        <TableCell className="font-medium">
                          {ex.name}
                          {ex.note ? (
                            <span className="block text-xs text-muted-foreground">
                              {ex.note}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="tnum text-center">
                          {ex.sets}
                        </TableCell>
                        <TableCell className="tnum text-center">
                          {ex.reps}
                        </TableCell>
                        <TableCell className="tnum text-right text-muted-foreground">
                          {ex.intensity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Log-rate trend */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Log rate — last 8 sessions</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              trending to {athlete.program.compliancePct}%
            </span>
          </div>
          <BarSeries
            data={logRate}
            labels={["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]}
            height={120}
          />
          <p className="text-xs text-muted-foreground">
            Adherence to prescribed sessions. The program only advances a day
            when a session is logged — this is the coach&apos;s early-warning
            signal for drift.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
