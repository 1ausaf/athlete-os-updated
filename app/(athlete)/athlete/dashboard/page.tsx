import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Dumbbell,
  MessagesSquare,
  Trophy,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Progress, ProgressRing } from "@/components/app/progress";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUserWithProfile } from "@/lib/auth";
import {
  athleteById,
  fmtRange,
  money2,
  relTime,
  sessions,
  threads,
} from "@/lib/demo/data";
import { billingMeta } from "@/lib/demo/status";

export default async function AthleteDashboardPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const firstName = athlete.name.split(" ")[0];

  const upcoming = sessions
    .filter((s) => s.roster.some((r) => r.athleteId === athlete.id))
    .slice(0, 3);

  const myThreads = threads.filter((t) =>
    t.participants.some((p) => p.id === athlete.id),
  );
  const unread = myThreads.reduce((n, t) => n + t.unread, 0);
  const latestThread = myThreads
    .slice()
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))[0];

  const billing = billingMeta[athlete.billing.state];
  const progressPct = Math.round(
    (athlete.program.day / athlete.program.totalDays) * 100,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal"
        title={`Good to see you, ${firstName}.`}
        description="Your program comes first — then sessions, messages, billing and your latest wins."
        actions={
          <Pill tone={athlete.season === "in-season" ? "brand" : "neutral"} dot>
            {athlete.sport} · {athlete.season}
          </Pill>
        }
      />

      {/* Program hero (primary content — FR-02) */}
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
                <Dumbbell className="h-5 w-5" />
              </span>
              <span className="eyebrow">Today&apos;s training</span>
            </div>
            <div>
              <h2 className="text-2xl">{athlete.program.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Day {athlete.program.day} of {athlete.program.totalDays} ·{" "}
                {athlete.program.phase} phase. You advance when completed sessions
                are logged — not by the calendar.
              </p>
            </div>
            <div className="max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Block progress</span>
                <span className="tnum font-semibold text-foreground">
                  {progressPct}%
                </span>
              </div>
              <Progress value={progressPct} />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="brand">
                <Link href={"/athlete/training" as Route}>
                  Open today&apos;s session
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={"/athlete/sessions" as Route}>View schedule</Link>
              </Button>
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
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming sessions */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <TileHeader
              icon={CalendarDays}
              title="Upcoming sessions"
              href={"/athlete/sessions" as Route}
              cta="Book"
            />
            {upcoming.length === 0 ? (
              <Empty>No upcoming bookings yet.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcoming.map((s) => {
                  const entry = s.roster.find((r) => r.athleteId === athlete.id);
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3"
                    >
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-center">
                        <span className="text-[0.6rem] uppercase text-muted-foreground">
                          {new Date(s.startsAt).toLocaleDateString("en-US", {
                            month: "short",
                          })}
                        </span>
                        <span className="tnum text-sm font-bold leading-none">
                          {new Date(s.startsAt).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {s.title}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {fmtRange(s.startsAt, s.endsAt)} · {s.coach}
                        </div>
                      </div>
                      <Pill
                        tone={
                          entry?.state === "confirmed"
                            ? "success"
                            : entry?.state === "waitlisted"
                              ? "info"
                              : "warning"
                        }
                      >
                        {entry?.state ?? "—"}
                      </Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <TileHeader
              icon={MessagesSquare}
              title="Messages"
              href={"/athlete/messages" as Route}
              cta="Inbox"
              badge={unread}
            />
            {latestThread ? (
              <Link
                href={`/athlete/messages/${latestThread.id}` as Route}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {latestThread.subject}
                  {latestThread.involvesMinor ? (
                    <Pill tone="success" className="ml-auto">
                      Rule of Two
                    </Pill>
                  ) : null}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {latestThread.messages[latestThread.messages.length - 1]?.body}
                </p>
                <span className="text-[0.7rem] text-muted-foreground">
                  {relTime(latestThread.updatedAt)}
                </span>
              </Link>
            ) : (
              <Empty>You&apos;re all caught up.</Empty>
            )}
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <TileHeader
              icon={CreditCard}
              title="Billing status"
              href={"/athlete/billing" as Route}
              cta="Details"
            />
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 p-4">
              <div>
                <Pill tone={billing.tone} dot>
                  {billing.label}
                </Pill>
                <p className="mt-2 text-sm font-semibold">{athlete.planName}</p>
                <p className="text-xs text-muted-foreground">
                  {athlete.billing.amountDueCents > 0
                    ? `${money2(athlete.billing.amountDueCents)} due`
                    : "No balance due"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Next invoice</p>
                <p className="tnum text-sm font-semibold">
                  {new Date(athlete.billing.nextInvoice).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PRs */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <TileHeader
              icon={Trophy}
              title="PRs & accolades"
              href={"/athlete/training" as Route}
              cta="History"
            />
            <ul className="flex flex-col gap-2">
              {athlete.prs.slice(0, 3).map((pr) => (
                <li
                  key={pr.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/10 text-brand-ink">
                    <Trophy className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{pr.lift}</div>
                    <div className="text-xs text-muted-foreground">
                      {relTime(pr.date)}
                    </div>
                  </div>
                  <span className="tnum text-sm font-bold">
                    {pr.value}
                    <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                      {pr.unit}
                    </span>
                  </span>
                  {pr.isNew ? <Pill tone="brand">New</Pill> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TileHeader({
  icon: Icon,
  title,
  href,
  cta,
  badge,
}: {
  icon: typeof CalendarDays;
  title: string;
  href: Route;
  cta: string;
  badge?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      <h3 className="text-base">{title}</h3>
      {badge ? <Pill tone="brand">{badge} new</Pill> : null}
      <Button asChild variant="ghost" size="sm" className="ml-auto">
        <Link href={href}>
          {cta}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
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
