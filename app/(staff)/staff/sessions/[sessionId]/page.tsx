import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Clipboard,
  Clock,
  MapPin,
  UserCog,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import {
  athleteById,
  fmtDay,
  fmtTime,
  sessions,
  type Athlete,
  type BookingState,
} from "@/lib/demo/data";
import { billingMeta, bookingMeta, seasonMeta } from "@/lib/demo/status";

interface PageProps {
  params: { sessionId: string };
}

export default async function StaffSessionDetailPage({ params }: PageProps) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const session = sessions.find((s) => s.id === params.sessionId);
  if (!session) notFound();

  const confirmed = session.roster.filter((r) => r.state === "confirmed").length;
  const pending = session.roster.filter((r) => r.state === "pending").length;
  const fillPct = Math.round((session.roster.length / session.capacity) * 100);

  const roster = session.roster
    .map((r) => ({ athlete: athleteById(r.athleteId), state: r.state }))
    .filter((r): r is { athlete: Athlete; state: BookingState } =>
      Boolean(r.athlete),
    );

  const waitlist = session.waitlist
    .map((id) => athleteById(id))
    .filter((a): a is Athlete => Boolean(a));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Session"
        title={session.title}
        description={`${fmtDay(session.startsAt)} · ${session.type} block`}
        actions={
          <>
            <Button asChild variant="brand" size="sm">
              <Link href={"/staff/sessions/huddle-brief" as Route}>
                <Clipboard className="h-4 w-4" />
                Open huddle brief
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={"/staff/sessions" as Route}>
                <ArrowLeft className="h-4 w-4" />
                All sessions
              </Link>
            </Button>
          </>
        }
      />

      {/* Header card */}
      <Card className="overflow-hidden bg-brand-sheen">
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="brand" dot>
                  {session.roster.length} on deck
                </Pill>
                <span className="text-xs text-muted-foreground">
                  capacity {session.capacity}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
          </div>
          <div className="max-w-md">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Capacity</span>
              <span className="tnum font-semibold">
                {session.roster.length}
                <span className="text-muted-foreground">
                  /{session.capacity}
                </span>
              </span>
            </div>
            <Progress value={fillPct} tone={fillPct >= 100 ? "warning" : "brand"} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill tone="success">{confirmed} confirmed</Pill>
              {pending > 0 ? <Pill tone="warning">{pending} pending</Pill> : null}
              {session.waitlist.length > 0 ? (
                <Pill tone="info">{session.waitlist.length} waitlisted</Pill>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roster */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg">Roster</h2>
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            {roster.length} athlete{roster.length === 1 ? "" : "s"}
          </span>
        </div>
        {roster.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
            No athletes booked on this session yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {roster.map(({ athlete, state }) => (
              <RosterRow key={athlete.id} athlete={athlete} state={state} />
            ))}
          </div>
        )}
      </section>

      {/* Waitlist */}
      {waitlist.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg">Waitlist</h2>
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              {waitlist.length} waiting
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {waitlist.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3"
              >
                <AthleteAvatar initials={a.initials} hue={a.hue} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.sport} · {a.frequency}
                  </div>
                </div>
                <Pill tone="info">Waitlisted</Pill>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function RosterRow({ athlete, state }: { athlete: Athlete; state: BookingState }) {
  const booking = bookingMeta[state];
  const billing = billingMeta[athlete.billing.state];
  const season = seasonMeta[athlete.season];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-bold">{athlete.name}</span>
              {athlete.isMinor ? <Pill tone="info">Minor</Pill> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {athlete.sport} · {athlete.frequency}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {athlete.program.name} · Day {athlete.program.day}/
              {athlete.program.totalDays} · {athlete.program.phase} phase
            </p>
            {athlete.injuryFlags.map((f) => (
              <span
                key={f}
                className="mt-2 inline-flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-warning"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {f}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
          <Pill tone={booking.tone} dot>
            {booking.label}
          </Pill>
          <Pill tone={billing.tone}>{billing.label}</Pill>
          <Pill tone={season.tone}>{season.label}</Pill>
        </div>
      </CardContent>
    </Card>
  );
}
