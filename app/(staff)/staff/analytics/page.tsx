import { redirect } from "next/navigation";
import { Activity, ClipboardCheck, Timer, Users, Weight } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { trainingGroups, trainingSummaries } from "@/lib/demo/training";

import { AnalyticsExplorer } from "./analytics-explorer";
import { PrintReportButton } from "./print-button";

const DAY_MS = 86_400_000;

export default async function AnalyticsPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  // Week rollup across every athlete with logged sessions.
  const weekSessions = Object.values(trainingSummaries)
    .flat()
    .filter((s) => Date.now() - new Date(s.date).getTime() < 7 * DAY_MS);
  const weekVolumeKg = weekSessions.reduce((n, s) => n + s.volumeKg, 0);
  const avgDurationMin = weekSessions.length
    ? Math.round(
        weekSessions.reduce((n, s) => n + s.durationMin, 0) /
          weekSessions.length,
      )
    : 0;

  // Group compliance rollup ("3 out of 7 filled it in").
  const complianceFilled = trainingGroups.reduce(
    (n, g) => n + g.compliance.filled,
    0,
  );
  const complianceTotal = trainingGroups.reduce(
    (n, g) => n + g.compliance.total,
    0,
  );
  const compliancePct = complianceTotal
    ? Math.round((complianceFilled / complianceTotal) * 100)
    : 0;

  return (
    <div className="analytics-report flex flex-col gap-6">
      {/* Scoped print tweaks (C36): each panel stays on one page, shadows
          drop, and interactive chrome hides — the report reads clean on
          paper for the athlete. */}
      <style>{`@media print {
        .analytics-report { gap: 0.75rem !important; }
        .analytics-report > * { break-inside: avoid; }
        .analytics-report [class*="shadow"] { box-shadow: none !important; }
        .analytics-report button { display: none !important; }
      }`}</style>
      <PageHeader
        title="Analytics"
        description="Estimated 1RMs, rep-max PRs, session-by-session training summaries and per-member compliance — over any date range. Who's progressing, who's logging, and who's gone quiet."
        actions={
          <div className="flex items-center gap-2">
            <Pill tone="brand" icon={<Activity className="h-3.5 w-3.5" />}>
              Live from training logs
            </Pill>
            <PrintReportButton />
          </div>
        }
      />

      {/* Facility-wide pulse for the week */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Sessions logged"
          value={weekSessions.length}
          icon={ClipboardCheck}
          hint="this week, all athletes"
        />
        <StatTile
          label="Volume this week"
          value={weekVolumeKg.toLocaleString("en-US")}
          unit="kg"
          icon={Weight}
          hint="every exercise, added up"
        />
        <StatTile
          label="Avg session duration"
          value={avgDurationMin}
          unit="min"
          icon={Timer}
          accent
          hint="tracked on every log — TrainHeroic can't show this"
        />
        <StatTile
          label="Group compliance"
          value={`${compliancePct}%`}
          icon={Users}
          hint={`${complianceFilled}/${complianceTotal} sessions filled in`}
        />
      </div>

      {/* Member/Group + exercise explorer: e1RM progression, training summary,
          and — when a group is selected (A5) — compliance + engagement. */}
      <AnalyticsExplorer />

      <p className="text-xs text-muted-foreground">
        Every number on this page derives live from athlete session logs — no
        spreadsheet exports, no tab-hopping between systems.
      </p>
    </div>
  );
}
