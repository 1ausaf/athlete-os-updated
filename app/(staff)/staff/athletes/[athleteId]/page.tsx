import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Dumbbell,
  IdCard,
  MessagesSquare,
  ShieldCheck,
  Target,
  Trophy,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import {
  athleteById,
  athleteGoals,
  athleteProfileById,
  bucketLabel,
  fmtDay,
  fmtRange,
  money2,
  relTime,
  sessions,
  statusLabel,
  type Athlete,
} from "@/lib/demo/data";
import { billingMeta, seasonMeta } from "@/lib/demo/status";
import { isStaff } from "@/lib/rbac";

import { programDueLong } from "../program-due";
import { NotesPanel } from "./notes-panel";
import {
  AvatarUpload,
  ChecklistsCard,
  CoachesCard,
  CompactProgramCard,
  DetailsCard,
  FollowUpBanner,
  GoalsCard,
  LinkChips,
  StatusCard,
} from "./profile-panels";

export default async function StaffAthleteProfilePage({
  params,
}: {
  params: { athleteId: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const athlete = athleteById(params.athleteId);
  if (!athlete) notFound();

  const billing = billingMeta[athlete.billing.state];
  const season = seasonMeta[athlete.season];

  const upcoming = sessions
    .filter((s) => s.roster.some((r) => r.athleteId === athlete.id))
    .sort((a, b) => (a.startsAt > b.startsAt ? 1 : -1));

  const programHref = `/staff/athletes/${athlete.id}/program` as Route;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Athlete"
        title={
          <span className="flex items-center gap-3">
            <AvatarUpload
              initials={athlete.initials}
              hue={athlete.hue}
              name={athlete.name}
            />
            {athlete.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <Pill tone="neutral">
              {athlete.sport} · {athlete.gender} · {athlete.yearOfBirth}
            </Pill>
            {athlete.isMinor ? <Pill tone="info">Minor</Pill> : null}
            <Pill
              tone={
                athlete.status === "active"
                  ? "success"
                  : athlete.status === "paused"
                    ? "warning"
                    : "neutral"
              }
              dot
            >
              {statusLabel[athlete.status]}
            </Pill>
            <Pill tone={season.tone}>{season.label}</Pill>
            <Pill tone={billing.tone} dot>
              {billing.label}
            </Pill>
            <span className="text-xs text-muted-foreground">
              {athlete.coach} · active {relTime(athlete.lastActive)}
            </span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="brand" size="sm">
              <Link href={programHref}>
                <Dumbbell className="h-4 w-4" />
                View program
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={"/staff/messaging" as Route}>
                <MessagesSquare className="h-4 w-4" />
                Message
              </Link>
            </Button>
          </>
        }
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Attendance"
          value={athlete.attendancePct}
          unit="%"
          icon={CalendarDays}
        />
        <StatTile
          label="Log rate"
          value={athlete.program.compliancePct}
          unit="%"
          icon={ClipboardList}
          hint="Sessions logged — not just completed"
        />
        <StatTile
          label="Program day"
          value={`${athlete.program.day}/${athlete.program.totalDays}`}
          icon={Dumbbell}
          hint={`${athlete.program.phase} phase`}
        />
        <StatTile
          label="Plan"
          value={athlete.planName.split(" — ")[0] ?? athlete.planName}
          icon={CreditCard}
          hint={
            athlete.billing.amountDueCents > 0
              ? `${money2(athlete.billing.amountDueCents)} due`
              : "No balance due"
          }
        />
      </div>

      {/* Away/paused follow-up strip */}
      <FollowUpBanner athlete={athlete} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Left column — notes are the centerpiece ("this side is perfect") */}
        <div className="flex flex-col gap-6">
          <NotesPanel
            athleteFirstName={athlete.name.split(" ")[0] ?? athlete.name}
            authorName={user.fullName}
            initialNotes={athlete.notes}
          />

          {/* Checklists — moved here from the retired card modal */}
          <ChecklistsCard athlete={athlete} />

          {/* PRs */}
          <Section icon={Trophy} title="Personal records">
            <ul className="flex flex-col gap-2">
              {athlete.prs.map((pr) => (
                <li
                  key={pr.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/10 text-brand-ink">
                    <Trophy className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {pr.lift}
                    </div>
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
          </Section>
        </div>

        {/* Right column — status, details, compact program, record, coaches */}
        <div className="flex flex-col gap-6">
          <StatusCard athlete={athlete} />
          <DetailsCard athlete={athlete} />
          <CompactProgramCard athlete={athlete} />
          <GoalsCard
            initialGoal={
              athleteGoals[athlete.id] ??
              `Build toward the next ${athlete.sport} season with a full, healthy block.`
            }
          />
          <MemberRecord athlete={athlete} programHref={programHref} />
          <CoachesCard athlete={athlete} />

          {/* Financial — the plan tile's detail, on the record itself */}
          <Section icon={CreditCard} title="Financial">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 p-3">
                <span className="font-medium">{athlete.planName}</span>
                <Pill tone={billing.tone} dot>
                  {billing.label}
                </Pill>
              </div>
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>Next invoice</span>
                <span className="tnum font-semibold text-foreground">
                  {fmtDay(athlete.billing.nextInvoice)}
                </span>
              </div>
              {athlete.billing.amountDueCents > 0 ? (
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                  <span>Outstanding</span>
                  <span className="tnum font-semibold text-destructive">
                    {money2(athlete.billing.amountDueCents)}
                  </span>
                </div>
              ) : null}
              <p className="px-1 text-[0.7rem] text-muted-foreground">
                Mark paid / cancel lives in Billing — Square handles cards.
              </p>
            </div>
          </Section>

          {/* Injury flags */}
          {athlete.injuryFlags.length > 0 ? (
            <Section icon={AlertTriangle} title="Injury flags">
              <div className="flex flex-col gap-2">
                {athlete.injuryFlags.map((f) => (
                  <div
                    key={f}
                    className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm font-medium text-warning"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Reminders */}
          <Section icon={BellRing} title="Reminders">
            {athlete.reminders.length === 0 ? (
              <Empty>No open reminders.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {athlete.reminders.map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-2 rounded-lg border border-brand/25 bg-brand/[0.07] p-3 text-sm font-medium text-brand-ink"
                  >
                    <BellRing className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Upcoming sessions */}
          <Section icon={CalendarDays} title="Upcoming sessions">
            {upcoming.length === 0 ? (
              <Empty>No upcoming bookings.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcoming.map((s) => {
                  const entry = s.roster.find(
                    (r) => r.athleteId === athlete.id,
                  );
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
                          {fmtRange(s.startsAt, s.endsAt)}
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
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ---- member record (the Trello-card mirror) ---- */

function MemberRecord({
  athlete,
  programHref,
}: {
  athlete: Athlete;
  programHref: Route;
}) {
  const due = programDueLong(athlete.programDueInDays);
  const profile = athleteProfileById(athlete.id);

  return (
    <Section icon={IdCard} title="Contact & links">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={due.tone} dot>
            {due.label}
          </Pill>
        </div>

        {/* Contact info — synced from the athlete's own profile */}
        <div>
          <span className="eyebrow">Contact info</span>
          {profile ? (
            <div className="mt-2 flex flex-col gap-1 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {athlete.name}
                </span>{" "}
                · <span className="font-mono text-xs">{profile.phone}</span> ·{" "}
                <span className="font-mono text-xs">{profile.email}</span>
              </p>
              {profile.instagram || profile.hudl ? (
                <p className="text-xs text-muted-foreground">
                  {profile.instagram ? `Instagram ${profile.instagram}` : ""}
                  {profile.instagram && profile.hudl ? " · " : ""}
                  {profile.hudl ? `HUDL ${profile.hudl}` : ""}
                </p>
              ) : null}
              {profile.guardian ? (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {profile.guardian.name}
                  </span>{" "}
                  · {profile.guardian.relation} ·{" "}
                  <span className="font-mono text-xs">
                    {profile.guardian.phone}
                  </span>{" "}
                  ·{" "}
                  <span className="font-mono text-xs">
                    {profile.guardian.email}
                  </span>
                </p>
              ) : null}
              <p className="text-[0.7rem] text-muted-foreground">
                Synced from the member&apos;s profile — they keep it current.
              </p>
            </div>
          ) : athlete.guardians.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {athlete.guardians.map((g) => (
                <li
                  key={g.email}
                  className="rounded-lg border border-border bg-surface/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{g.name}</span>
                    <Pill tone="success">{g.relation}</Pill>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {g.email}
                  </p>
                </li>
              ))}
            </ul>
          ) : athlete.isMinor ? (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm font-medium text-warning">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Minor with no guardian on file — add one to satisfy Rule of Two
                before messaging.
              </span>
            </div>
          ) : (
            <p className="mt-2 rounded-lg border border-dashed border-border bg-surface/30 p-3 text-sm text-muted-foreground">
              No profile on file yet.
            </p>
          )}
        </div>

        {/* Links — in-app + their external stack */}
        <div>
          <span className="eyebrow">Links</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={programHref}>
                <Dumbbell className="h-4 w-4" />
                Program
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/staff/athletes/${athlete.id}/assessment` as Route}>
                <ClipboardCheck className="h-4 w-4" />
                Assessment
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={"/staff/messaging" as Route}>
                <MessagesSquare className="h-4 w-4" />
                Chat
              </Link>
            </Button>
          </div>
          <div className="mt-2">
            <LinkChips athleteId={athlete.id} />
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---- local helpers ---- */

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof ClipboardList;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">{title}</h3>
          {hint ? (
            <span className="ml-auto text-xs text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}
