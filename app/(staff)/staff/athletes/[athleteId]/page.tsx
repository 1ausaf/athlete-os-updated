import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import {
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  MessagesSquare,
  Salad,
  Trophy,
} from "lucide-react";

import { AvatarUpload } from "@/components/app/avatar-upload";
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
  pastSessions,
  sessions,
} from "@/lib/demo/data";
import { isAdmin, isStaff } from "@/lib/rbac";

import { NotesPanel } from "./notes-panel";
import { RemindersCard } from "./reminders-card";
import {
  ContactLinksCard,
  DetailsCard,
  FinancialCard,
  FollowUpBanner,
  GoalsMedicalCard,
  ParentAccountsCard,
  TeamManagementCard,
} from "./profile-panels";

/**
 * Round-8 member profile. The header is avatar + name with four MATCHING
 * outline actions (C12; round 12: Nutrition links to its own page, N4); notes
 * live RIGHT under the two 30-day tiles; the left column stacks Details →
 * Attendance (round 12, N1/N2: one card — bookings + past days) → Goals &
 * Medical History → Latest Personal Records → Contact & Links → Parent &
 * Guardian Accounts (round 11, A2/A3) → Team Management → Financial →
 * Alerts & Reminders (R15).
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

  // P16 — up to 5 latest personal records
  const latestPrs = [...athlete.prs]
    .sort((a, b) => (a.date > b.date ? -1 : 1))
    .slice(0, 5);

  // Round 12 (N1/N2) — ONE Attendance card: the NEXT 4 confirmed bookings
  // (soonest first) then the LAST 3 past days — completed = attended, pending
  // in the past = no-show — every row in the date-badge booking style.
  const attendance = [
    ...sessions
      .filter((s) =>
        s.roster.some(
          (r) => r.athleteId === athlete.id && r.state === "confirmed",
        ),
      )
      .sort((a, b) => (a.startsAt > b.startsAt ? 1 : -1))
      .slice(0, 4)
      .map((s) => ({
        id: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        title: s.title,
        state: "upcoming" as const,
      })),
    ...pastSessions
      .filter((s) =>
        s.roster.some(
          (r) =>
            r.athleteId === athlete.id &&
            (r.state === "completed" || r.state === "pending"),
        ),
      )
      .sort((a, b) => (a.startsAt > b.startsAt ? -1 : 1))
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        title: s.title,
        state:
          s.roster.find((r) => r.athleteId === athlete.id)?.state ===
          "completed"
            ? ("attended" as const)
            : ("noshow" as const),
      })),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* P1/P3 — avatar + name only; P4 — Assessment · Program · Nutrition · Chat */}
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <AvatarUpload
              initials={athlete.initials}
              hue={athlete.hue}
              name={athlete.name}
              storageKey={`aos-avatar-${athlete.id}`}
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
            {/* Round 12 (N4) — Nutrition opens its own page now */}
            <Button asChild variant="outline" size="sm">
              <Link href={`/staff/athletes/${athlete.id}/nutrition` as Route}>
                <Salad className="h-4 w-4" />
                Nutrition
              </Link>
            </Button>
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

          {/* Round 12 (N1/N2) — ONE Attendance card: next 4 bookings + last
              3 past days, date-badge rows with status pills; every row opens
              the session page (it resolves history too). */}
          <Section icon={CalendarCheck2} title="Attendance">
            {attendance.length === 0 ? (
              <Empty>No bookings on file yet.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {attendance.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/staff/sessions/${row.id}` as Route}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
                    >
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-center">
                        <span className="text-[0.6rem] uppercase text-muted-foreground">
                          {new Date(row.startsAt).toLocaleDateString("en-US", {
                            month: "short",
                          })}
                        </span>
                        <span className="tnum text-sm font-bold leading-none">
                          {new Date(row.startsAt).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {row.title}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {fmtRange(row.startsAt, row.endsAt)}
                        </div>
                      </div>
                      {row.state === "attended" ? (
                        <Pill tone="success" dot>
                          Attended
                        </Pill>
                      ) : row.state === "noshow" ? (
                        <Pill tone="danger" dot>
                          No Showed
                        </Pill>
                      ) : (
                        <Pill tone="info" dot>
                          Upcoming
                        </Pill>
                      )}
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[0.7rem] text-muted-foreground text-pretty">
              Attendance comes from bookings; the training summary logs when
              the athlete logs.
            </p>
          </Section>

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

          {/* Round 11 (A2/A3) — parent logins + member/parent password resets */}
          <ParentAccountsCard athlete={athlete} profile={profile} admin={admin} />

          {/* C20 — Team Management */}
          <TeamManagementCard athlete={athlete} />

          {/* C18 — Financial; coaches see the status pill only */}
          <FinancialCard athlete={athlete} admin={admin} />

          {/* R15 — Alerts & Reminders close the left column */}
          <RemindersCard
            athleteId={athlete.id}
            seedReminders={athlete.reminders}
          />
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
