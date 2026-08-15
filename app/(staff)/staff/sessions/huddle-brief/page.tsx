import Link from "next/link";
import type { Route } from "next";
import {
  AlertTriangle,
  CakeSlice,
  Clock,
  MapPin,
  ShieldAlert,
  Trophy,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { RichTextView } from "@/components/app/rich-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  athleteById,
  athletes,
  fmtTime,
  nextSession,
  relTime,
  sessions,
  type Athlete,
  type TrainingSession,
} from "@/lib/demo/data";
import { staffByName } from "@/lib/demo/staff";

import { LiveBriefRoster, LiveOnDeckCount } from "./live-roster";

export default function HuddleBriefPage({
  searchParams,
}: {
  searchParams?: { sessions?: string };
}) {
  // Multi-session briefings: coaches huddle once for two or three back-to-back
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
        eyebrow="Team Workspace · Bookings"
        title={
          briefSessions.length > 1
            ? `Briefings — ${briefSessions.length} sessions`
            : "Briefings"
        }
        description="The 60-second read before you walk on the floor — every athlete on deck, one screen, zero tab-hopping."
        actions={
          <Button asChild variant="ghost" size="sm" className="no-print">
            <Link href={"/staff/sessions" as Route}>Back to bookings</Link>
          </Button>
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
  // C34: alphabetical — coaches scan the briefing like a class list.
  const roster = session.roster
    .map((r) => ({ athlete: athleteById(r.athleteId), state: r.state }))
    .filter((r): r is { athlete: Athlete; state: typeof r.state } =>
      Boolean(r.athlete),
    )
    .sort((a, b) => a.athlete.name.localeCompare(b.athlete.name));

  // R8 (B4): the coaches working this session, alphabetical, headline the
  // briefing — plus count tiles for PRs, birthdays, limited and billing.
  const coachNames = [...(session.coaches ?? [session.coach])].sort((a, b) =>
    a.localeCompare(b),
  );
  const flags = {
    prs: roster.reduce((n, r) => n + recentPrs(r.athlete).length, 0),
    birthdays: roster.reduce(
      (n, r) => n + r.athlete.reminders.filter(isBirthdayReminder).length,
      0,
    ),
    limitations: roster.filter((r) => Boolean(r.athlete.currentLimitations))
      .length,
    billing: roster.filter((r) => r.athlete.billing.state === "overdue").length,
  };

  // R32 — server-render a card for everyone who could be on this session
  // (seed roster + active members); the client merges roster edits in.
  const rosterIds = new Set(session.roster.map((r) => r.athleteId));
  const briefPool = athletes.filter(
    (a) => a.status === "active" || rosterIds.has(a.id),
  );

  return (
    <section className="flex flex-col gap-4">
      {/* Session context + open loops */}
      <Card className="overflow-hidden bg-brand-sheen">
        <CardContent className="flex flex-col gap-5 p-6">
          {/* B4 — who's working the floor, alphabetical */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 pb-4">
            <span className="eyebrow">Coaches on this session</span>
            {coachNames.map((name) => {
              const staff = staffByName(name);
              return (
                <span key={name} className="inline-flex items-center gap-2">
                  {staff ? (
                    <AthleteAvatar
                      initials={staff.initials}
                      hue={staff.hue}
                      size="sm"
                      ring
                    />
                  ) : null}
                  <span className="text-sm font-semibold">{name}</span>
                </span>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Pill tone="brand" dot>
                  <LiveOnDeckCount
                    sessionId={session.id}
                    seedCount={roster.length}
                  />{" "}
                  on deck
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
              </div>
            </div>
            <div className="flex gap-2">
              <OpenLoop
                tone="success"
                icon={Trophy}
                count={flags.prs}
                label="PRs"
              />
              <OpenLoop
                tone="brand"
                icon={CakeSlice}
                count={flags.birthdays}
                label="birthdays"
              />
              <OpenLoop
                tone="warning"
                icon={AlertTriangle}
                count={flags.limitations}
                label="limited"
              />
              <OpenLoop
                tone="danger"
                icon={ShieldAlert}
                count={flags.billing}
                label="billing"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-athlete briefs — the client merges roster edits live (R32) */}
      <LiveBriefRoster
        sessionId={session.id}
        seedIds={roster.map(({ athlete }) => athlete.id)}
        entries={briefPool.map((a) => ({
          id: a.id,
          name: a.name,
          card: <AthleteBrief athlete={a} />,
        }))}
      />
    </section>
  );
}

function OpenLoop({
  tone,
  icon: Icon,
  count,
  label,
}: {
  tone: "danger" | "warning" | "brand" | "success";
  icon: typeof AlertTriangle;
  count: number;
  label: string;
}) {
  const color =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
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

/** "PR · 385 lb Trap-bar — 6 days ago" (C34: real days, not "this week"). */
function daysAgo(iso: string): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000),
  );
  if (days === 0) return "today";
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** S6: birthdays are the only reminder type that survives on the briefing. */
function isBirthdayReminder(reminder: string): boolean {
  return /birthday/i.test(reminder);
}

/** PRs set within the last 7 days. */
function recentPrs(athlete: Athlete) {
  return athlete.prs.filter(
    (p) => Date.now() - new Date(p.date).getTime() < 7 * 86_400_000,
  );
}

/**
 * R8 (B4) — identity line, top-right of every card:
 * "16 | Male | Hockey | 3×/week | In Good Standing | In-Season".
 */
const BILLING_IDENTITY: Record<Athlete["billing"]["state"], string> = {
  paid: "In Good Standing",
  overdue: "Billing Overdue",
  grace: "Grace Period",
  pending: "Payment Pending",
};

const SEASON_IDENTITY: Record<Athlete["season"], string> = {
  "in-season": "In-Season",
  "off-season": "Off-Season",
};

function identityLine(athlete: Athlete): string {
  return [
    String(athlete.age),
    athlete.gender === "M" ? "Male" : "Female",
    athlete.sport,
    athlete.frequency,
    BILLING_IDENTITY[athlete.billing.state],
    SEASON_IDENTITY[athlete.season],
  ].join(" | ");
}

function AthleteBrief({ athlete }: { athlete: Athlete }) {
  const lastNote = athlete.notes[0];
  const birthdays = athlete.reminders.filter(isBirthdayReminder);
  const prs = recentPrs(athlete);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        {/* Identity left — the full identity line top-right (B4) */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="lg" />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-display text-lg font-bold">{athlete.name}</span>
              {athlete.isMinor ? <Pill tone="info">Minor</Pill> : null}
            </div>
          </div>
          <span className="tnum text-right text-xs font-semibold text-muted-foreground">
            {identityLine(athlete)}
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          {/* Left: last-30-day stats, then limitations + the only alerts left */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <BriefStat
                label="Last 30 Days Attendance"
                value={athlete.attendancePct}
              />
              <BriefStat
                label="Last 30 Days Log Rate"
                value={athlete.program.compliancePct}
              />
            </div>

            {athlete.currentLimitations || birthdays.length > 0 || prs.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {/* B4 — the injuries strip is row-sized now, right under the
                    two Last-30-Days stats */}
                {athlete.currentLimitations ? (
                  <span className="inline-flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-warning">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <span className="font-bold uppercase tracking-wide">
                        Current injuries / limitations:
                      </span>{" "}
                      <span className="text-foreground/90">
                        {athlete.currentLimitations}
                      </span>
                    </span>
                  </span>
                ) : null}
                {birthdays.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-2 rounded-md border border-brand/25 bg-brand/[0.07] px-2.5 py-1.5 text-xs font-medium text-brand-ink"
                  >
                    <CakeSlice className="h-3.5 w-3.5 shrink-0" />
                    {r}
                  </span>
                ))}
                {prs.map((pr) => (
                  <span
                    key={pr.id}
                    className="inline-flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success"
                  >
                    <Trophy className="h-3.5 w-3.5 shrink-0" />
                    PR · {pr.value} {pr.unit} {pr.lift}
                    {pr.reps ? ` × ${pr.reps}` : ""} — {daysAgo(pr.date)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Right: latest note (with its "Next:" line — loved) */}
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
        </div>
      </CardContent>
    </Card>
  );
}

/** Small labeled percentage box — the two "Last 30 Days" numbers (S6). */
function BriefStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 px-3 py-2">
      <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="tnum mt-0.5 text-lg font-bold leading-none">{value}%</div>
    </div>
  );
}
