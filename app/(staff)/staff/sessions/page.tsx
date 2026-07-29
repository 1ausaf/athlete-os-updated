import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Clipboard,
  History,
  MapPin,
  UserCog,
  Users,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import {
  athleteById,
  fmtDay,
  fmtTime,
  nextSession,
  pastSessions,
  sessions,
  type TrainingSession,
} from "@/lib/demo/data";
import { cn } from "@/lib/utils";

import { ComingVsCoach } from "./coming-vs-coach";
import { SessionsList } from "./sessions-list";

export default async function StaffSessionsPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const view = searchParams?.view === "past" ? "past" : "upcoming";

  const today = new Date().toDateString();
  const todaySessions = sessions.filter(
    (s) => new Date(s.startsAt).toDateString() === today,
  );
  const athletesOnDeck = todaySessions.reduce((n, s) => n + s.roster.length, 0);
  const waitlisted = sessions.reduce((n, s) => n + s.waitlist.length, 0);

  // Group sessions by calendar day, preserving chronological order. The
  // featured next-up session is EXCLUDED here — the client flagged seeing it
  // twice ("I don't know why there's two, it should be just one").
  const groups: { day: string; label: string; items: TrainingSession[] }[] = [];
  for (const s of sessions) {
    if (s.id === nextSession.id) continue;
    const key = new Date(s.startsAt).toDateString();
    let group = groups.find((g) => g.day === key);
    if (!group) {
      group = { day: key, label: fmtDay(s.startsAt), items: [] };
      groups.push(group);
    }
    group.items.push(s);
  }

  // Past sessions grouped newest-first ("go back in the past sessions").
  const pastGroups: { day: string; label: string; items: TrainingSession[] }[] =
    [];
  for (const s of [...pastSessions].sort((a, b) =>
    a.startsAt > b.startsAt ? -1 : 1,
  )) {
    const key = new Date(s.startsAt).toDateString();
    let group = pastGroups.find((g) => g.day === key);
    if (!group) {
      group = { day: key, label: fmtDay(s.startsAt), items: [] };
      pastGroups.push(group);
    }
    group.items.push(s);
  }
  const attendedTotal = pastSessions.reduce(
    (n, s) => n + s.roster.filter((r) => r.state === "completed").length,
    0,
  );
  const rosteredTotal = pastSessions.reduce((n, s) => n + s.roster.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Sessions"
        title="Sessions"
        description="Every semi-private block on the floor — who's coming, which coach has it, and the history behind it."
        actions={
          <Button asChild variant="brand" size="sm">
            <Link href={"/staff/sessions/huddle-brief" as Route}>
              <Clipboard className="h-4 w-4" />
              Open huddle brief
            </Link>
          </Button>
        }
      />

      {/* Upcoming / Past tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <TabLink
          href={"/staff/sessions" as Route}
          active={view === "upcoming"}
          label="Upcoming"
          count={sessions.length}
        />
        <TabLink
          href={"/staff/sessions?view=past" as Route}
          active={view === "past"}
          label="Past"
          count={pastSessions.length}
        />
      </div>

      {view === "upcoming" ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Sessions today"
              value={todaySessions.length}
              icon={CalendarDays}
              hint={`${sessions.length} scheduled this week`}
              accent
            />
            <StatTile
              label="Clients on deck"
              value={athletesOnDeck}
              icon={Users}
              hint="across today's blocks"
            />
            <StatTile
              label="Waitlisted"
              value={waitlisted}
              icon={Clock}
              hint="awaiting an open spot"
            />
          </div>

          {/* Featured next session */}
          <FeaturedSession session={nextSession} />

          {/* Later sessions — multi-select for a combined huddle brief */}
          <SessionsList groups={groups} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Past sessions"
              value={pastSessions.length}
              icon={History}
              hint="last 7 days shown"
              accent
            />
            <StatTile
              label="Attendance"
              value={`${attendedTotal}/${rosteredTotal}`}
              icon={CheckCircle2}
              hint="attended vs rostered"
            />
            <StatTile
              label="No-shows"
              value={rosteredTotal - attendedTotal}
              icon={Users}
              hint="flag repeat offenders in notes"
            />
          </div>

          {pastGroups.map((group) => (
            <section key={group.day} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg">{group.label}</h2>
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  {group.items.length} session
                  {group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((s) => (
                  <PastSessionCard key={s.id} session={s} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  label,
  count,
}: {
  href: Route;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "border-brand text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "tnum rounded-full px-1.5 text-[0.65rem] font-bold",
          active ? "bg-brand/10 text-brand-ink" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

function rosterStats(session: TrainingSession) {
  const confirmed = session.roster.filter((r) => r.state === "confirmed").length;
  const pending = session.roster.filter((r) => r.state === "pending").length;
  const fillPct = Math.round((session.roster.length / session.capacity) * 100);
  return { confirmed, pending, fillPct };
}

function FeaturedSession({ session }: { session: TrainingSession }) {
  const { confirmed, pending, fillPct } = rosterStats(session);
  const roster = session.roster
    .map((r) => athleteById(r.athleteId))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <Card className="overflow-hidden bg-brand-sheen">
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="brand" dot>
                Next up
              </Pill>
            </div>
            <h2 className="mt-2 text-2xl text-balance">{session.title}</h2>
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
          <Button asChild variant="brand">
            <Link href={"/staff/sessions/huddle-brief" as Route}>
              <Clipboard className="h-4 w-4" />
              Open huddle brief
            </Link>
          </Button>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Capacity</span>
            <span className="tnum font-semibold">
              {session.roster.length}
              <span className="text-muted-foreground">/{session.capacity}</span>
            </span>
          </div>
          <Progress value={fillPct} tone={fillPct >= 100 ? "warning" : "brand"} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone="success">{confirmed} confirmed</Pill>
            {pending > 0 ? <Pill tone="warning">{pending} pending</Pill> : null}
            {session.capacity - session.roster.length > 0 ? (
              <Pill tone="neutral">
                {session.capacity - session.roster.length} open
              </Pill>
            ) : (
              <Pill tone="warning">Full</Pill>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <ComingVsCoach
            roster={roster}
            coachName={session.coach}
          />
          <Button asChild variant="ghost" size="sm">
            <Link href={`/staff/sessions/${session.id}` as Route}>
              Open session
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PastSessionCard({ session }: { session: TrainingSession }) {
  const roster = session.roster
    .map((r) => ({
      athlete: athleteById(r.athleteId),
      attended: r.state === "completed",
    }))
    .filter(
      (r): r is { athlete: NonNullable<ReturnType<typeof athleteById>>; attended: boolean } =>
        Boolean(r.athlete),
    );
  const attended = roster.filter((r) => r.attended);
  const missed = roster.filter((r) => !r.attended);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base">{session.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fmtTime(session.startsAt)}–{fmtTime(session.endsAt)} ·{" "}
              {session.location}
            </p>
          </div>
          <Pill tone={missed.length > 0 ? "warning" : "success"}>
            {attended.length}/{roster.length} attended
          </Pill>
        </div>

        <ComingVsCoach
          roster={attended.map((r) => r.athlete)}
          coachName={session.coach}
          comingLabel="Attended"
        />

        {missed.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            No-show: {missed.map((r) => r.athlete.name).join(", ")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
