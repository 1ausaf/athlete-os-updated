import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  Timer,
  Users,
  Weight,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { StatTile } from "@/components/app/stat-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { athletes, relTime } from "@/lib/demo/data";
import { trainingGroups, trainingSummaries } from "@/lib/demo/training";

import { AnalyticsExplorer } from "./analytics-explorer";
import { PrintReportButton } from "./print-button";

const DAY_MS = 86_400_000;
/** Athletes quiet longer than this get flagged — their old system let people drift to "last login: 100+ days". */
const STALE_AFTER_DAYS = 5;

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

  // Engagement: stale-first so dormant athletes surface before they go quiet.
  // Active members only — away/paused/inactive don't belong here (R4).
  const engagement = athletes
    .filter((a) => a.status === "active")
    .map((a) => ({
      athlete: a,
      daysSince: Math.floor(
        (Date.now() - new Date(a.lastActive).getTime()) / DAY_MS,
      ),
    }))
    .sort((a, b) => b.daysSince - a.daysSince);
  const staleCount = engagement.filter(
    (e) => e.daysSince > STALE_AFTER_DAYS,
  ).length;

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
        eyebrow="Staff Workspace · Performance"
        title="Analytics"
        description="Estimated 1RMs, rep-max PRs, session-by-session training summaries and per-client compliance — over any date range. Who's progressing, who's logging, and who's gone quiet."
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

      {/* Athlete + lift explorer: e1RM progression and training summary */}
      <AnalyticsExplorer />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Group compliance */}
        <Card>
          <CardContent className="flex h-full flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg">Group compliance</h2>
                <p className="text-sm text-muted-foreground">
                  Who filled in their session this week, team by team.
                </p>
              </div>
              <Pill tone={compliancePct >= 70 ? "success" : "warning"} dot>
                {compliancePct}% filled in
              </Pill>
            </div>
            <div className="flex flex-col gap-3">
              {trainingGroups.map((g) => {
                const pct = Math.round(
                  (g.compliance.filled / g.compliance.total) * 100,
                );
                return (
                  <div
                    key={g.id}
                    className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface/50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{g.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {g.program} · {g.athleteCount} athletes
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        last session {relTime(g.lastSession)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={pct}
                        tone={pct >= 60 ? "brand" : "warning"}
                        className="flex-1"
                      />
                      <span className="tnum text-sm font-semibold">
                        {g.compliance.filled}/{g.compliance.total}
                      </span>
                      <span className="tnum w-9 text-right text-xs text-muted-foreground">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Engagement */}
        <Card>
          <CardContent className="flex h-full flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg">Engagement</h2>
                <p className="text-sm text-muted-foreground">
                  Days since each athlete was last active — stale first, so
                  nobody drifts to &ldquo;last login: 100+ days&rdquo;.
                </p>
              </div>
              {staleCount > 0 ? (
                <Pill
                  tone="warning"
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                >
                  {staleCount} needs follow-up
                </Pill>
              ) : (
                <Pill tone="success" dot>
                  all engaged
                </Pill>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {engagement.map(({ athlete: a, daysSince }) => {
                const stale = daysSince > STALE_AFTER_DAYS;
                return (
                  <div
                    key={a.id}
                    className={
                      stale
                        ? "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-warning/40 bg-warning/[0.06] p-3"
                        : "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-surface/50 p-3"
                    }
                  >
                    <AthleteAvatar
                      initials={a.initials}
                      hue={a.hue}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/staff/athletes/${a.id}` as Route}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {a.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.sport} · {a.program.compliancePct}% log rate
                      </p>
                    </div>
                    <span className="tnum shrink-0 text-xs text-muted-foreground">
                      {relTime(a.lastActive)}
                    </span>
                    {stale ? (
                      <Pill
                        tone="warning"
                        icon={<AlertTriangle className="h-3 w-3" />}
                      >
                        needs follow-up
                      </Pill>
                    ) : (
                      <Pill tone={daysSince <= 1 ? "success" : "neutral"} dot>
                        {daysSince <= 1 ? "active" : "quiet"}
                      </Pill>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Every number on this page derives live from athlete session logs — no
        spreadsheet exports, no tab-hopping between systems.
      </p>
    </div>
  );
}
