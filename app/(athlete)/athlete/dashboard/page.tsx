import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Dumbbell,
  Home,
  MapPin,
  Megaphone,
  MessagesSquare,
  Trophy,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAthleteContext } from "@/lib/demo/session";
import { teamChannelFor } from "@/lib/demo/chat";
import {
  fmtFullDay,
  fmtRange,
  money,
  plans,
  relTime,
} from "@/lib/demo/data";
import {
  announcements,
  programDaysFor,
  LOCATION_LABEL,
  myBookings,
} from "@/lib/demo/training";
import { billingMeta } from "@/lib/demo/status";

import { NoProgramNotice } from "../status-notice";

/** The shape the "next sessions" cards need — real program day or placeholder. */
interface NextDayCard {
  id: string;
  dayNumber: number;
  title: string;
  focus: string;
  location: "gym" | "home";
}

export default async function AthleteDashboardPage() {
  const { athlete } = requireAthleteContext();
  const firstName = athlete.name.split(" ")[0];

  // Plain "Coaching" bookings — no coach names or session-type jargon.
  const upcoming = myBookings.slice(0, 3);

  // Per-athlete channel (round 5, B2/P7: a parent managing Maya used to see
  // Jordan's chat here) — preview always shows the true latest messages.
  const channel = teamChannelFor(athlete.id);
  const latestMessages = channel.messages.slice(-3);
  const unread = channel.unread;
  const topAnnouncements = announcements.slice(0, 3);

  const billing = billingMeta[athlete.billing.state];
  const plan = plans.find((p) => athlete.planName.startsWith(p.name));
  const nextInvoiceAmount =
    athlete.billing.amountDueCents > 0
      ? athlete.billing.amountDueCents
      : (plan?.priceCents ?? 0);
  const nextInvoiceDay = new Date(
    athlete.billing.nextInvoice,
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Programs run as a numbered sequence, not a calendar — surface the next
  // three days so athletes always know which one to start.
  // Round 5 (B2/P7 bug fix): the cards come from the SELECTED athlete's own
  // published days, so the banner and the cards always agree — and the same
  // days appear on their Training page.
  const ownDays = programDaysFor(athlete.id);
  const nextDays: NextDayCard[] = ownDays.slice(0, 3).map((d) => ({
    id: d.id,
    dayNumber: d.dayNumber,
    title: d.title,
    focus: d.focus,
    location: d.location,
  }));
  const progressPct = Math.round(
    (athlete.program.day / Math.max(1, athlete.program.totalDays)) * 100,
  );

  // Away/paused members keep their portal — but no program runs (round 4).
  const hasProgram =
    athlete.status === "active" && athlete.program.totalDays > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal"
        title={`Good to see you, ${firstName}.`}
        description="Facility news and your chat up top — then training, sessions, wins and billing."
      />

      {!hasProgram ? <NoProgramNotice athlete={athlete} /> : null}

      {/* 1 · Announcements  +  2 · Chat (round 5, A1 order) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <TileHeader
              icon={Megaphone}
              title="Announcements"
              href={"/athlete/messages" as Route}
              cta="All news"
            />
            {topAnnouncements.length === 0 ? (
              <Empty>No announcements right now.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {topAnnouncements.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={"/athlete/messages" as Route}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-surface/50 px-3 py-2.5 transition-colors hover:bg-accent/50"
                    >
                      <Megaphone
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {a.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {a.author}
                        </span>
                      </span>
                      <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                        {relTime(a.at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <TileHeader
              icon={MessagesSquare}
              title="Chat"
              href={"/athlete/messages" as Route}
              cta="Open"
              badge={unread}
            />
            {latestMessages.length === 0 ? (
              <Empty>No messages yet — say hi to your coaching staff.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {latestMessages.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={"/athlete/messages" as Route}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-surface/50 px-3 py-2.5 transition-colors hover:bg-accent/50"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 truncate text-xs font-semibold">
                          {m.senderName}
                        </span>
                        <span className="ml-auto shrink-0 text-[0.7rem] text-muted-foreground">
                          {relTime(m.at)}
                        </span>
                      </span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {m.body ||
                          (m.attachments?.length ? "Sent an attachment" : "")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3 · Next training sessions (program hero) */}
      {hasProgram ? (
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
            {/* Round 7: one CTA — "view schedule is not the schedule for
                training… it's just start session". */}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button asChild variant="brand">
                <Link href={"/athlete/training" as Route}>
                  Start session
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>
      ) : null}

      {/* 4 · Upcoming booked sessions  +  5 · PRs  +  6 · Billing (last) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <TileHeader
              icon={CalendarDays}
              title="Upcoming sessions"
              href={"/athlete/sessions" as Route}
              cta="Manage"
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
                      {fmtFullDay(pr.date)}
                    </div>
                  </div>
                  <span className="tnum text-sm font-bold">
                    {pr.value}
                    <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                      {pr.unit}
                    </span>
                    {pr.reps ? (
                      <span className="ml-1 text-xs font-semibold text-muted-foreground">
                        × {pr.reps}
                      </span>
                    ) : null}
                  </span>
                  {pr.isNew ? <Pill tone="brand">New</Pill> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Billing stays LAST (round 5, A1) */}
        <Card className="lg:col-span-2">
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
