import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clipboard, Clock, MapPin, UserCog } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import {
  athletes,
  athleteById,
  fmtDay,
  fmtTime,
  pastSessions,
  sessions,
  type Athlete,
} from "@/lib/demo/data";
import { seasonMeta } from "@/lib/demo/status";

import { LiveCapacityBar, LiveRosterCount } from "./live-capacity";
import { RosterManager, type RosterAthlete } from "./roster-manager";

interface PageProps {
  params: { sessionId: string };
}

export default async function StaffSessionDetailPage({ params }: PageProps) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  // R6: past-tab rows link here too — resolve history as well as upcoming.
  const session =
    sessions.find((s) => s.id === params.sessionId) ??
    pastSessions.find((s) => s.id === params.sessionId);
  if (!session) notFound();

  const confirmed = session.roster.filter((r) => r.state === "confirmed").length;
  const pending = session.roster.filter((r) => r.state === "pending").length;
  const coachNames = session.coaches?.length
    ? session.coaches
    : [session.coach];

  // Every athlete the add-member picker can offer (C33) — active members
  // plus anyone already booked, serialized down to what the row shows.
  const rosterIds = new Set(session.roster.map((r) => r.athleteId));
  const pool: RosterAthlete[] = athletes
    .filter((a) => a.status === "active" || rosterIds.has(a.id))
    .map((a) => ({
      id: a.id,
      name: a.name,
      initials: a.initials,
      hue: a.hue,
      focus: a.sport,
      age: a.age,
      sex: a.gender,
      plan: a.frequency,
      season: seasonMeta[a.season].label,
      isMinor: a.isMinor,
      injuryFlags: a.injuryFlags,
      billingState: a.billing.state,
    }));

  const waitlist = session.waitlist
    .map((id) => athleteById(id))
    .filter((a): a is Athlete => Boolean(a));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={session.title}
        description={fmtDay(session.startsAt)}
        actions={
          <>
            <Button asChild variant="brand" size="sm">
              <Link
                href={
                  `/staff/sessions/huddle-brief?sessions=${session.id}` as Route
                }
              >
                <Clipboard className="h-4 w-4" />
                Briefings
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={"/staff/sessions" as Route}>
                <ArrowLeft className="h-4 w-4" />
                All bookings
              </Link>
            </Button>
          </>
        }
      />

      {/* B3 — two columns on lg: attendees + waitlist LEFT, summary RIGHT */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="flex flex-col gap-6">
          {/* Attendees — add / remove / approve (C33) + no-show (R29) */}
          <RosterManager
            sessionId={session.id}
            initialRoster={session.roster}
            pool={pool}
          />

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

        {/* Summary — capacity, timing, location, coach, description */}
        <Card className="overflow-hidden bg-brand-sheen">
          <CardContent className="flex flex-col gap-5 p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="brand" dot>
                  <LiveRosterCount
                    sessionId={session.id}
                    seedCount={session.roster.length}
                  />{" "}
                  on deck
                </Pill>
                <span className="text-xs text-muted-foreground">
                  capacity {session.capacity}
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
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
                  {coachNames.join(", ")}
                </span>
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Capacity</span>
                <span className="tnum font-semibold">
                  <LiveRosterCount
                    sessionId={session.id}
                    seedCount={session.roster.length}
                  />
                  <span className="text-muted-foreground">
                    /{session.capacity}
                  </span>
                </span>
              </div>
              <LiveCapacityBar
                sessionId={session.id}
                seedCount={session.roster.length}
                capacity={session.capacity}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill tone="success">{confirmed} confirmed</Pill>
                {pending > 0 ? (
                  <Pill tone="warning">{pending} pending</Pill>
                ) : null}
                {session.waitlist.length > 0 ? (
                  <Pill tone="info">{session.waitlist.length} waitlisted</Pill>
                ) : null}
              </div>
            </div>
            <p className="border-t border-border/60 pt-4 text-sm text-muted-foreground">
              {session.type} block — programmed work with on-floor coaching from{" "}
              {coachNames.join(" and ")}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
