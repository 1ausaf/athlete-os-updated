import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Clipboard,
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
  sessions,
  type TrainingSession,
} from "@/lib/demo/data";

import { SessionsList } from "./sessions-list";

export default async function StaffSessionsPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Sessions"
        title="Sessions"
        description="Every semi-private block on the floor — capacity, confirmations and who's on deck, at a glance."
        actions={
          <Button asChild variant="brand" size="sm">
            <Link href={"/staff/sessions/huddle-brief" as Route}>
              <Clipboard className="h-4 w-4" />
              Open huddle brief
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Sessions today"
          value={todaySessions.length}
          icon={CalendarDays}
          hint={`${sessions.length} scheduled this week`}
          accent
        />
        <StatTile
          label="Athletes on deck"
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
    </div>
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
              <span className="text-xs text-muted-foreground">
                {session.type}
              </span>
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

        <CapacityBlock
          rosterLen={session.roster.length}
          capacity={session.capacity}
          fillPct={fillPct}
          confirmed={confirmed}
          pending={pending}
        />

        <div className="flex items-center justify-between gap-3">
          <AvatarStack roster={roster} />
          <Button asChild variant="ghost" size="sm">
            <Link href={`/staff/sessions/${session.id}` as Route}>
              Session detail
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CapacityBlock({
  rosterLen,
  capacity,
  fillPct,
  confirmed,
  pending,
}: {
  rosterLen: number;
  capacity: number;
  fillPct: number;
  confirmed: number;
  pending: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Capacity</span>
        <span className="tnum font-semibold">
          {rosterLen}
          <span className="text-muted-foreground">/{capacity}</span>
        </span>
      </div>
      <Progress
        value={fillPct}
        tone={fillPct >= 100 ? "warning" : "brand"}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill tone="success">{confirmed} confirmed</Pill>
        {pending > 0 ? <Pill tone="warning">{pending} pending</Pill> : null}
        {capacity - rosterLen > 0 ? (
          <Pill tone="neutral">{capacity - rosterLen} open</Pill>
        ) : (
          <Pill tone="warning">Full</Pill>
        )}
      </div>
    </div>
  );
}

function AvatarStack({
  roster,
}: {
  roster: { id: string; initials: string; hue: number; name: string }[];
}) {
  const shown = roster.slice(0, 5);
  const extra = roster.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((a) => (
          <AthleteAvatar
            key={a.id}
            initials={a.initials}
            hue={a.hue}
            size="sm"
            ring
          />
        ))}
      </div>
      {extra > 0 ? (
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          +{extra}
        </span>
      ) : null}
      {roster.length === 0 ? (
        <span className="text-xs text-muted-foreground">No athletes booked</span>
      ) : null}
    </div>
  );
}
