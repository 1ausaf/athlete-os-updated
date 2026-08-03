import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  MessagesSquare,
  Trophy,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { threadIdForAthlete } from "@/lib/demo/chat";
import {
  athleteById,
  athleteGoals,
  athleteProfileById,
  fmtFullDay,
  fmtRange,
  sessions,
} from "@/lib/demo/data";
import { isAdmin, isStaff } from "@/lib/rbac";

import { NotesPanel } from "./notes-panel";
import {
  AvatarUpload,
  ContactLinksCard,
  DetailsCard,
  FinancialCard,
  FollowUpBanner,
  GoalsMedicalCard,
  NutritionButton,
  TeamManagementCard,
} from "./profile-panels";

/**
 * Round-8 member profile. The header is avatar + name with four MATCHING
 * outline actions (C12); notes live RIGHT under the two 30-day tiles; the
 * left column stacks Details → Goals & Medical History → Latest Personal
 * Records → Contact & Links → Team Management → Upcoming Bookings →
 * Financial (C17/C19/C20).
 */
export default async function StaffAthleteProfilePage({
  params,
}: {
  params: { athleteId: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const athlete = athleteById(params.athleteId);
  if (!athlete) notFound();

  const admin = isAdmin(user);
  const profile = athleteProfileById(athlete.id);

  // P15 — the next 5 sessions this member is on the roster for
  const upcoming = sessions
    .filter((s) => s.roster.some((r) => r.athleteId === athlete.id))
    .sort((a, b) => (a.startsAt > b.startsAt ? 1 : -1))
    .slice(0, 5);

  // P16 — up to 5 latest personal records
  const latestPrs = [...athlete.prs]
    .sort((a, b) => (a.date > b.date ? -1 : 1))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* P1/P3 — avatar + name only; P4 — Assessment · Program · Nutrition · Chat */}
      <PageHeader
        eyebrow="Team Workspace · Member"
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
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/staff/athletes/${athlete.id}/assessment` as Route}>
                <ClipboardCheck className="h-4 w-4" />
                Assessment
              </Link>
            </Button>
            {/* C12 — all four actions share the same outline style */}
            <Button asChild variant="outline" size="sm">
              <Link href={`/staff/athletes/${athlete.id}/program` as Route}>
                <Dumbbell className="h-4 w-4" />
                Program
              </Link>
            </Button>
            <NutritionButton athleteId={athlete.id} initial={athlete.nutrition} />
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/staff/messaging/${threadIdForAthlete(athlete.id)}` as Route}
              >
                <MessagesSquare className="h-4 w-4" />
                Chat
              </Link>
            </Button>
          </>
        }
      />

      {/* Paused follow-up strip */}
      <FollowUpBanner athlete={athlete} />

      {/* P5 — cards stack LEFT; notes live RIGHT under the two stat tiles */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-6">
          {/* C15 — Details; the manage gears + delete are admin-only */}
          <DetailsCard athlete={athlete} dob={profile?.dob} admin={admin} />

          {/* C17 — Goals & Medical History sits directly below Details */}
          <GoalsMedicalCard
            initialGoals={
              athleteGoals[athlete.id] ??
              `Build toward the next ${athlete.sport} season with a full, healthy block.`
            }
            initialPastInjuries={athlete.pastInjuries ?? ""}
            initialLimitations={athlete.currentLimitations ?? ""}
          />

          {/* C20 — Latest Personal Records (up to 5) */}
          <Section icon={Trophy} title="Latest Personal Records">
            {latestPrs.length === 0 ? (
              <Empty>No records logged yet.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {latestPrs.map((pr) => (
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
                        {pr.reps ? ` — ${pr.reps}RM` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fmtFullDay(pr.date)}
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
            )}
          </Section>

          {/* C20 — Contact & Links */}
          <ContactLinksCard athlete={athlete} profile={profile} />

          {/* C20 — Team Management */}
          <TeamManagementCard athlete={athlete} />

          {/* C19 — Upcoming Bookings: each row opens the staff session page */}
          <Section icon={CalendarDays} title="Upcoming Bookings">
            {upcoming.length === 0 ? (
              <Empty>No upcoming bookings.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcoming.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/staff/sessions/${s.id}` as Route}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
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
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* C18 — Financial last; coaches see the status pill only */}
          <FinancialCard athlete={athlete} admin={admin} />
        </div>

        <div className="flex flex-col gap-6">
          {/* P2 — the two 30-day tiles at the top of the right column */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile
              label="Last 30 Days Attendance"
              value={athlete.attendancePct}
              unit="%"
              icon={CalendarDays}
            />
            <StatTile
              label="Last 30 Days Log Rate"
              value={athlete.program.compliancePct}
              unit="%"
              icon={ClipboardList}
              hint="Sessions logged — not just completed"
            />
          </div>

          {/* Notes — composer (with link + @mention buttons) + history */}
          <NotesPanel
            athleteFirstName={athlete.name.split(" ")[0] ?? athlete.name}
            authorName={user.fullName}
            initialNotes={athlete.notes}
          />
        </div>
      </div>
    </div>
  );
}

/* ---- local helpers ---- */

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ClipboardList;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">{title}</h3>
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
