import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, Clock, MapPin, UserCog } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById, fmtRange, sessions } from "@/lib/demo/data";
import { bookingMeta } from "@/lib/demo/status";

import { SessionBookForm } from "./session-book-form";

export default async function AthleteSessionsPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;

  const mine = sessions.filter((s) =>
    s.roster.some((r) => r.athleteId === athlete.id),
  );
  const mineIds = new Set(mine.map((s) => s.id));
  const available = sessions.filter((s) => !mineIds.has(s.id));

  const overdue = athlete.billing.state === "overdue";
  const weekFull = athlete.bookedThisWeek >= athlete.frequencyPerWeek;
  const freqPct = Math.round(
    (athlete.bookedThisWeek / athlete.frequencyPerWeek) * 100,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Schedule"
        title="Sessions"
        description="Book inside your plan cadence. Bookings are held to your weekly frequency and pause automatically if your account goes past due."
        actions={
          <Pill tone={weekFull ? "success" : "brand"} dot>
            {athlete.bookedThisWeek} of {athlete.frequencyPerWeek} this week
          </Pill>
        }
      />

      {/* Plan-frequency meter */}
      <Card className="bg-brand-sheen">
        <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-brand-ink" aria-hidden />
              <span className="eyebrow">Weekly cadence</span>
            </div>
            <span className="text-sm">
              <span className="tnum font-bold">{athlete.bookedThisWeek}</span>
              <span className="text-muted-foreground">
                {" "}
                of {athlete.frequencyPerWeek} sessions booked · {athlete.frequency}
              </span>
            </span>
          </div>
          <Progress value={freqPct} tone={weekFull ? "success" : "brand"} />
          <p className="text-xs text-muted-foreground text-pretty">
            {overdue
              ? "Booking is paused while your balance is past due — clear it from Billing to resume."
              : weekFull
                ? "You've hit your plan frequency for the week. Nice work — extra spots open next week."
                : `You can book ${athlete.frequencyPerWeek - athlete.bookedThisWeek} more this week.`}
          </p>
        </CardContent>
      </Card>

      {/* Your upcoming sessions */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg">Your upcoming sessions</h2>
          <Pill tone="neutral">{mine.length}</Pill>
        </div>
        {mine.length === 0 ? (
          <Empty>No sessions booked yet. Grab a spot below.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((s) => {
              const entry = s.roster.find((r) => r.athleteId === athlete.id);
              const meta = bookingMeta[entry?.state ?? "available"];
              return (
                <Card key={s.id}>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{s.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {fmtRange(s.startsAt, s.endsAt)}
                        </div>
                      </div>
                      <Pill tone={meta.tone} dot>
                        {meta.label}
                      </Pill>
                    </div>
                    <SessionMeta
                      coach={s.coach}
                      location={s.location}
                      capacity={s.capacity}
                      taken={s.roster.length}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Available to book */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg">Available to book</h2>
          <Pill tone="neutral">{available.length}</Pill>
        </div>
        {available.length === 0 ? (
          <Empty>You&apos;re on every open session this week.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {available.map((s) => {
              const atCapacity = s.roster.length >= s.capacity;
              return (
                <Card key={s.id}>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{s.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {fmtRange(s.startsAt, s.endsAt)}
                        </div>
                      </div>
                      <Pill tone={atCapacity ? "warning" : "neutral"}>
                        {atCapacity ? "At capacity" : "Open"}
                      </Pill>
                    </div>
                    <SessionMeta
                      coach={s.coach}
                      location={s.location}
                      capacity={s.capacity}
                      taken={s.roster.length}
                    />
                    <div className="flex justify-end">
                      <SessionBookForm
                        atCapacity={atCapacity}
                        overdue={overdue}
                        weekFull={weekFull}
                        frequencyPerWeek={athlete.frequencyPerWeek}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        <Link
          href={"/athlete/dashboard" as Route}
          className="underline-offset-4 hover:underline"
        >
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}

function SessionMeta({
  coach,
  location,
  capacity,
  taken,
}: {
  coach: string;
  location: string;
  capacity: number;
  taken: number;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        <span className="tnum">
          {taken}/{capacity} on roster
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" />
        {location}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <UserCog className="h-3.5 w-3.5" />
        {coach}
      </span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}
