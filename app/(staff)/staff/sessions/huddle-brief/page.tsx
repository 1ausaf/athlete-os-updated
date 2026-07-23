import Link from "next/link";
import type { Route } from "next";
import {
  AlertTriangle,
  CakeSlice,
  Clock,
  MapPin,
  Printer,
  ShieldAlert,
  Trophy,
  UserCog,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { RichTextView } from "@/components/app/rich-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  athleteById,
  fmtTime,
  nextSession,
  relTime,
  sessions,
  type Athlete,
  type TrainingSession,
} from "@/lib/demo/data";
import { billingMeta, seasonMeta } from "@/lib/demo/status";

export default function HuddleBriefPage({
  searchParams,
}: {
  searchParams?: { sessions?: string };
}) {
  // Multi-session briefs: coaches huddle once for two or three back-to-back
  // blocks (8:15 for the 8:30 + 10:00, 3:45 for the 4/5:30/7 o'clock) — pass
  // ?sessions=id1,id2 to stack them. Defaults to the next session only.
  const requested = (searchParams?.sessions ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const selected =
    requested.length > 0
      ? sessions.filter((s) => requested.includes(s.id))
      : [nextSession];
  const briefSessions = selected.length > 0 ? selected : [nextSession];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Sessions"
        title={
          briefSessions.length > 1
            ? `Huddle brief — ${briefSessions.length} sessions`
            : "Huddle brief"
        }
        description="The 60-second read before you walk on the floor — every athlete on deck, one screen, zero tab-hopping."
        actions={
          <>
            <Button variant="outline" size="sm" className="no-print">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button asChild variant="ghost" size="sm" className="no-print">
              <Link href={"/staff/sessions" as Route}>Back to sessions</Link>
            </Button>
          </>
        }
      />

      {briefSessions.map((session) => (
        <SessionBrief key={session.id} session={session} />
      ))}

      <p className="text-xs text-muted-foreground no-print">
        Aggregated live from sessions, memberships, notes, billing and PRs — the
        four tools coaches used to open by hand, on one screen.
      </p>
    </div>
  );
}

function SessionBrief({ session }: { session: TrainingSession }) {
  const roster = session.roster
    .map((r) => ({ athlete: athleteById(r.athleteId), state: r.state }))
    .filter((r): r is { athlete: Athlete; state: typeof r.state } =>
      Boolean(r.athlete),
    );

  const flags = {
    billing: roster.filter((r) => r.athlete.billing.state === "overdue").length,
    injuries: roster.filter((r) => r.athlete.injuryFlags.length > 0).length,
    reminders: roster.reduce((n, r) => n + r.athlete.reminders.length, 0),
  };

  return (
    <section className="flex flex-col gap-4">
      {/* Session context + open loops */}
      <Card className="overflow-hidden bg-brand-sheen">
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Pill tone="brand" dot>
                  {roster.length} on deck
                </Pill>
                <span className="text-xs text-muted-foreground">
                  capacity {session.capacity}
                </span>
              </div>
              <h2 className="mt-2 text-2xl">{session.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {fmtTime(session.startsAt)}–{fmtTime(session.endsAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {session.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserCog className="h-4 w-4" />
                  {session.coach}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <OpenLoop
                tone="danger"
                icon={ShieldAlert}
                count={flags.billing}
                label="billing"
              />
              <OpenLoop
                tone="warning"
                icon={AlertTriangle}
                count={flags.injuries}
                label="injury"
              />
              <OpenLoop
                tone="brand"
                icon={CakeSlice}
                count={flags.reminders}
                label="to note"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-athlete briefs */}
      <div className="flex flex-col gap-4">
        {roster.map(({ athlete, state }) => (
          <AthleteBrief key={athlete.id} athlete={athlete} state={state} />
        ))}
      </div>
    </section>
  );
}

function OpenLoop({
  tone,
  icon: Icon,
  count,
  label,
}: {
  tone: "danger" | "warning" | "brand";
  icon: typeof AlertTriangle;
  count: number;
  label: string;
}) {
  const color =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-brand-ink";
  return (
    <div className="flex min-w-[68px] flex-col items-center rounded-lg border border-border bg-surface/70 px-3 py-2 text-center">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="tnum mt-1 text-lg font-bold leading-none">{count}</span>
      <span className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function AthleteBrief({
  athlete,
  state,
}: {
  athlete: Athlete;
  state: string;
}) {
  const billing = billingMeta[athlete.billing.state];
  const season = seasonMeta[athlete.season];
  const lastNote = athlete.notes[0];
  const progressPct = Math.round(
    (athlete.program.day / athlete.program.totalDays) * 100,
  );

  return (
    <Card>
      <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* Left: identity + status */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-bold">{athlete.name}</span>
                {athlete.isMinor ? <Pill tone="info">Minor</Pill> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {athlete.sport} · {athlete.frequency}
                {"  "}
                <span className="text-muted-foreground/60">·</span> Booking:{" "}
                {state}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill tone={billing.tone} dot>
                  {billing.label}
                </Pill>
                <Pill tone={season.tone}>{season.label}</Pill>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium">
                {athlete.program.name}
              </span>
              <span className="tnum text-muted-foreground">
                Day {athlete.program.day}/{athlete.program.totalDays}
              </span>
            </div>
            <Progress value={progressPct} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {athlete.program.phase} phase · {athlete.program.compliancePct}% log rate
            </p>
          </div>

          {/* Flags + reminders */}
          <div className="flex flex-col gap-1.5">
            {athlete.injuryFlags.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-warning"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {f}
              </span>
            ))}
            {athlete.reminders.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-2 rounded-md border border-brand/25 bg-brand/[0.07] px-2.5 py-1.5 text-xs font-medium text-brand-ink"
              >
                <CakeSlice className="h-3.5 w-3.5 shrink-0" />
                {r}
              </span>
            ))}
            {/* Every PR from the last 7 days, listed out (client feedback) */}
            {athlete.prs
              .filter(
                (p) =>
                  Date.now() - new Date(p.date).getTime() <
                  7 * 24 * 60 * 60 * 1000,
              )
              .map((pr) => (
                <span
                  key={pr.id}
                  className="inline-flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success"
                >
                  <Trophy className="h-3.5 w-3.5 shrink-0" />
                  PR this week · {pr.lift} {pr.value} {pr.unit}
                  {pr.reps ? ` × ${pr.reps}` : ""}
                </span>
              ))}
          </div>
        </div>

        {/* Right: latest note */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface/50 p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Latest note</span>
            {lastNote ? (
              <span className="text-xs text-muted-foreground">
                {lastNote.coach} · {relTime(lastNote.date)}
              </span>
            ) : null}
          </div>
          {lastNote ? (
            <RichTextView html={lastNote.body} className="text-foreground/90" />
          ) : (
            <p className="text-sm text-muted-foreground">
              No note yet — flagged for follow-up.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

