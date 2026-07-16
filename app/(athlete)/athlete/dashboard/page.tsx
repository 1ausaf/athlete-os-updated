import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Dumbbell,
  Home,
  Lock,
  MapPin,
  Megaphone,
  MessagesSquare,
  Salad,
  Trophy,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUserWithProfile } from "@/lib/auth";
import {
  athleteById,
  fmtRange,
  money,
  plans,
  relTime,
  threads,
} from "@/lib/demo/data";
import {
  announcements,
  jordanProgramDays,
  LOCATION_LABEL,
  myBookings,
  nutritionProtocols,
} from "@/lib/demo/training";
import { billingMeta } from "@/lib/demo/status";

export default async function AthleteDashboardPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const firstName = athlete.name.split(" ")[0];

  // Plain "Coaching" bookings — no coach names or session-type jargon.
  const upcoming = myBookings.slice(0, 3);

  const myThreads = threads.filter((t) =>
    t.participants.some((p) => p.id === athlete.id),
  );
  const unread = myThreads.reduce((n, t) => n + t.unread, 0);
  const coachChat = myThreads
    .slice()
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))[0];
  const latestAnnouncement = announcements[0];

  const billing = billingMeta[athlete.billing.state];
  const plan = plans.find((p) => athlete.planName.startsWith(p.name));
  const nextInvoiceAmount =
    athlete.billing.amountDueCents > 0
      ? athlete.billing.amountDueCents
      : (plan?.priceCents ?? 0);
  const nextInvoiceDay = new Date(
    athlete.billing.nextInvoice,
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Nutrition tier — Pro athletes see their protocol; everyone else gets a
  // locked teaser (client: "if they want to unlock, just talk to your coach").
  const hasNutrition = athlete.nutrition === "pro";
  const protocol =
    nutritionProtocols[athlete.id] ?? nutritionProtocols["ath-jordan"];

  // Programs run as a numbered sequence, not a calendar — surface the next
  // three days so athletes always know which one to start (and which remote
  // day to skip when they make it into LPS).
  const nextDays = jordanProgramDays.slice(0, 3);
  const progressPct = Math.round(
    (athlete.program.day / athlete.program.totalDays) * 100,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal"
        title={`Good to see you, ${firstName}.`}
        description="Your program comes first — then sessions, messages, billing and your latest wins."
      />

      {/* Program hero (primary content — FR-02) */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="eyebrow">Your next sessions</span>
            <span className="ml-auto tnum text-xs text-muted-foreground">
              Day {athlete.program.day} of {athlete.program.totalDays} ·{" "}
              {athlete.program.phase}
            </span>
          </div>
          <div>
            <h2 className="text-2xl">{athlete.program.name}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
              Your program runs in sequence — Day 1, Day 2, Day 3 — not by the
              calendar. Start with the day marked up next; if you&apos;re at
              LPS, skip the remote day and jump ahead.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {nextDays.map((day, i) => (
              <Link
                key={day.id}
                href={"/athlete/training" as Route}
                className={
                  i === 0
                    ? "group flex flex-col gap-2 rounded-xl border border-brand/30 bg-brand/5 p-4 transition-colors hover:bg-brand/10"
                    : "group flex flex-col gap-2 rounded-xl border border-border bg-surface/50 p-4 transition-colors hover:bg-accent/50"
                }
              >
                <div className="flex items-center gap-2">
                  <span className="tnum text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Day {day.dayNumber}
                  </span>
                  {i === 0 ? (
                    <Pill tone="brand" dot className="ml-auto">
                      Up next
                    </Pill>
                  ) : (
                    <Pill
                      tone="neutral"
                      icon={
                        day.location === "home" ? (
                          <Home className="h-3 w-3" aria-hidden />
                        ) : (
                          <MapPin className="h-3 w-3" aria-hidden />
                        )
                      }
                      className="ml-auto"
                    >
                      {LOCATION_LABEL[day.location]}
                    </Pill>
                  )}
                </div>
                <div className="text-sm font-semibold leading-snug">
                  {day.title}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground text-pretty">
                  {day.focus}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-brand-ink opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-48 max-w-sm flex-1">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Day {athlete.program.day} of {athlete.program.totalDays}
                </span>
                <span className="tnum font-semibold text-foreground">
                  {progressPct}%
                </span>
              </div>
              <Progress value={progressPct} />
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button asChild variant="brand">
                <Link href={"/athlete/training" as Route}>
                  Start Day {nextDays[0]?.dayNumber ?? athlete.program.day}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={"/athlete/sessions" as Route}>View schedule</Link>
              </Button>
            </div>
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
                {upcoming.map((s) => (
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
                      <div className="truncate text-sm font-semibold">{s.label}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {fmtRange(s.startsAt, s.endsAt)}
                      </div>
                    </div>
                    <Pill tone={s.status === "confirmed" ? "success" : "info"}>
                      {s.status}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Chat + announcements */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <TileHeader
              icon={MessagesSquare}
              title="Chat"
              href={"/athlete/messages" as Route}
              cta="Open"
              badge={unread}
            />
            {coachChat ? (
              <Link
                href={`/athlete/messages/${coachChat.id}` as Route}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {coachChat.participants.find((p) => p.role === "coach")
                    ?.name ?? coachChat.subject}
                  {coachChat.involvesMinor ? (
                    <Pill tone="success" className="ml-auto">
                      Rule of Two
                    </Pill>
                  ) : null}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {coachChat.messages[coachChat.messages.length - 1]?.body}
                </p>
                <span className="text-[0.7rem] text-muted-foreground">
                  {relTime(coachChat.updatedAt)}
                </span>
              </Link>
            ) : (
              <Empty>You&apos;re all caught up.</Empty>
            )}
            {latestAnnouncement ? (
              <Link
                href={"/athlete/messages" as Route}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-surface/30 px-3 py-2.5 transition-colors hover:bg-accent/50"
              >
                <Megaphone
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-xs">
                  <span className="font-semibold">Announcement</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {latestAnnouncement.title}
                  </span>
                </span>
                <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                  {relTime(latestAnnouncement.at)}
                </span>
              </Link>
            ) : null}
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <TileHeader
              icon={CreditCard}
              title="Billing"
              href={"/athlete/billing" as Route}
              cta="Details"
            />
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 p-4">
              <div>
                <Pill tone={billing.tone} dot>
                  {billing.label}
                </Pill>
                <p className="mt-2 text-sm font-semibold">{athlete.planName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Next invoice</p>
                <p className="tnum text-sm font-semibold">
                  {nextInvoiceDay} · {money(nextInvoiceAmount)}
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

        {/* Nutrition — Pro protocol, or a locked teaser (FR round 2) */}
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 p-5">
            <TileHeader
              icon={Salad}
              title="Nutrition"
              href={"/athlete/nutrition" as Route}
              cta="Open"
            />
            {hasNutrition ? (
              <Link
                href={"/athlete/nutrition" as Route}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-4 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {protocol.title}
                    </span>
                    <Pill tone="brand" dot>
                      Pro
                    </Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Weigh-in Mondays, fasted · Updated{" "}
                    {relTime(protocol.updatedAt)}
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            ) : (
              <Link
                href={"/athlete/nutrition" as Route}
                className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface/30 p-4 transition-colors hover:bg-accent/50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Lock className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Nutrition coaching
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Talk to your coach to unlock nutrition coaching.
                  </p>
                </div>
              </Link>
            )}
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
