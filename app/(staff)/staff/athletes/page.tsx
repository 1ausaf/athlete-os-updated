import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  CalendarCheck,
  CalendarClock,
  CreditCard,
  Users,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { StatTile } from "@/components/app/stat-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athletes, type Athlete } from "@/lib/demo/data";
import { isStaff } from "@/lib/rbac";

import { programDueMeta } from "./program-due";
import { RosterFilter } from "./roster-filter";

export default async function StaffAthletesPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const dueSoon = athletes.filter((a) => a.programDueInDays <= 5).length;
  const dueNow = athletes.filter((a) => a.programDueInDays === 0).length;
  const overdue = athletes.filter((a) => a.billing.state === "overdue").length;
  const avgAttendance = Math.round(
    athletes.reduce((sum, a) => sum + a.attendancePct, 0) / athletes.length,
  );

  // The primary operational view: who runs out of program next.
  const byDue = [...athletes].sort(
    (a, b) =>
      a.programDueInDays - b.programDueInDays || a.name.localeCompare(b.name),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Athletes"
        title="Roster"
        description="Run the room off due dates — who needs programming next, then the full member board by bucket. Open a profile to manage the athlete."
      />

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active athletes"
          value={athletes.length}
          icon={Users}
          hint="On your roster"
        />
        <StatTile
          label="Programs due"
          value={dueSoon}
          icon={CalendarClock}
          accent={dueSoon > 0}
          delta={
            dueNow > 0
              ? { value: `${dueNow} due now`, direction: "down" }
              : undefined
          }
          hint="≤ 5 days of program left"
        />
        <StatTile
          label="Overdue billing"
          value={overdue}
          icon={CreditCard}
          delta={
            overdue > 0
              ? { value: "needs attention", direction: "down" }
              : undefined
          }
          hint={overdue === 0 ? "All in good standing" : undefined}
        />
        <StatTile
          label="Avg attendance"
          value={avgAttendance}
          unit="%"
          icon={CalendarCheck}
          hint="Roster mean"
        />
      </div>

      {/* Programming due rail — sorted by days of program left */}
      <Card className="overflow-hidden bg-brand-sheen">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
              <CalendarClock className="h-4 w-4" aria-hidden />
            </span>
            <h3 className="text-base">Programming due</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              Sorted by days of program left — write the next block before it
              runs out
            </span>
          </div>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {byDue.map((a) => (
              <DueCard key={a.id} athlete={a} />
            ))}
          </div>
        </CardContent>
      </Card>

      <RosterFilter athletes={athletes} />
    </div>
  );
}

/** One athlete on the programming-due rail. Links straight to the program. */
function DueCard({ athlete }: { athlete: Athlete }) {
  const due = programDueMeta(athlete.programDueInDays);
  const progressPct = Math.round(
    (athlete.program.day / athlete.program.totalDays) * 100,
  );
  const href = `/staff/athletes/${athlete.id}/program` as Route;

  return (
    <Link
      href={href}
      className="group flex w-[232px] shrink-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-brand/40 hover:bg-accent/40"
    >
      <div className="flex items-center gap-2.5">
        <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="sm" />
        <div className="min-w-0">
          <div className="truncate font-display text-sm font-bold">
            {athlete.name}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {athlete.sport} · {athlete.gender} · {athlete.yearOfBirth}
          </div>
        </div>
      </div>

      <Pill tone={due.tone} dot className="self-start">
        {due.label}
      </Pill>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
          <span className="truncate">{athlete.program.name}</span>
          <span className="tnum shrink-0">
            Day {athlete.program.day}/{athlete.program.totalDays}
          </span>
        </div>
        <Progress
          value={progressPct}
          tone={due.tone === "neutral" ? "brand" : "warning"}
        />
      </div>
    </Link>
  );
}
