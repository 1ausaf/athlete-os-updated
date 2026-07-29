import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Contact,
  Dumbbell,
  Phone,
  UserCog,
  Users,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { Progress } from "@/components/app/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById, fmtDay, type Athlete } from "@/lib/demo/data";
import { STAFF_ROLE_LABEL, staffByName } from "@/lib/demo/staff";
import { trainingGroupById } from "@/lib/demo/training";
import { isStaff } from "@/lib/rbac";

/**
 * Team profile (round 5, C13): teams are clients too. Mirrors the client's
 * Trello team cards — roster of linked member profiles, team contacts
 * (current + past), the coach group and the one shared program.
 */
export default async function StaffTeamProfilePage({
  params,
}: {
  params: { teamId: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const group = trainingGroupById(params.teamId);
  if (!group) notFound();

  const members = group.memberAthleteIds
    .map((id) => athleteById(id))
    .filter((a): a is Athlete => Boolean(a))
    .sort((a, b) => a.name.localeCompare(b.name));

  const coaches = group.coachNames.map((name) => ({
    name,
    staff: staffByName(name),
  }));

  const activeContacts = group.contacts.filter((c) => c.active);
  const pastContacts = group.contacts.filter((c) => !c.active);
  const compliancePct = Math.round(
    (group.compliance.filled / Math.max(1, group.compliance.total)) * 100,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Team"
        title={
          <span className="flex items-center gap-3">
            <AthleteAvatar initials={group.initials} hue={group.hue} size="xl" />
            {group.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <Pill tone="info" icon={<Users className="h-3 w-3" />}>
              Team · {group.athleteCount} athletes
            </Pill>
            <Pill tone="neutral">{group.focus}</Pill>
            <Pill tone="brand">{group.program}</Pill>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="flex -space-x-2">
                {coaches.map(({ name, staff }) =>
                  staff ? (
                    <AthleteAvatar
                      key={name}
                      initials={staff.initials}
                      hue={staff.hue}
                      size="sm"
                      ring
                    />
                  ) : null,
                )}
              </span>
              {group.coachNames.join(" · ")}
            </span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="brand" size="sm">
              <Link href={"/staff/programming" as Route}>
                <Dumbbell className="h-4 w-4" />
                Open program
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={"/staff/athletes" as Route}>
                <ArrowLeft className="h-4 w-4" />
                All members
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Left — roster + contacts */}
        <div className="flex flex-col gap-6">
          {/* Roster */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base">Roster</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {group.athleteCount} athletes — {members.length} with linked
                  AOS profiles
                </span>
              </div>
              {members.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
                  No linked AOS profiles yet — all {group.athleteCount} athletes
                  train under the shared team program.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {members.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/staff/athletes/${a.id}` as Route}
                        className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:border-brand/40"
                      >
                        <AthleteAvatar
                          initials={a.initials}
                          hue={a.hue}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {a.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {a.sport} · {a.age} · {a.gender}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[0.7rem] text-muted-foreground">
                The rest of the roster trains under the shared program without
                individual AOS profiles — link a profile any time to track an
                athlete individually.
              </p>
            </CardContent>
          </Card>

          {/* Contacts — current first, past under a muted group */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2">
                <Contact className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base">Contacts</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {activeContacts.map((c) => (
                  <li
                    key={c.email}
                    className="rounded-lg border border-border bg-surface/50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{c.name}</span>
                      <Pill tone="success">{c.role}</Pill>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </span>
                      <span className="font-mono">{c.email}</span>
                    </p>
                  </li>
                ))}
              </ul>
              {pastContacts.length > 0 ? (
                <div>
                  <span className="eyebrow">Past contacts</span>
                  <ul className="mt-2 flex flex-col gap-2">
                    {pastContacts.map((c) => (
                      <li
                        key={c.email}
                        className="rounded-lg border border-dashed border-border bg-muted/30 p-3 opacity-70"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium">{c.name}</span>
                          <Pill tone="neutral">{c.role}</Pill>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="font-mono">{c.phone}</span>
                          <span className="font-mono">{c.email}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Right — shared program + coaches */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base">Shared program</h3>
              </div>
              <p className="text-sm font-semibold">{group.program}</p>
              <p className="text-xs text-muted-foreground text-pretty">
                One program — every athlete logs their own data.
              </p>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Logged this week
                  </span>
                  <span className="tnum font-semibold">
                    {group.compliance.filled}
                    <span className="text-muted-foreground">
                      /{group.compliance.total}
                    </span>
                  </span>
                </div>
                <Progress value={compliancePct} />
              </div>
              <p className="text-xs text-muted-foreground">
                Last team session {fmtDay(group.lastSession)}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={"/staff/programming" as Route}>
                  <Dumbbell className="h-4 w-4" />
                  Open in Programming
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base">Coaches</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {coaches.map(({ name, staff }) => (
                  <li
                    key={name}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3"
                  >
                    {staff ? (
                      <AthleteAvatar
                        initials={staff.initials}
                        hue={staff.hue}
                        size="sm"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {staff?.title ?? "Coach"}
                      </span>
                    </span>
                    {staff ? (
                      <Pill tone="neutral">
                        {STAFF_ROLE_LABEL[staff.role]}
                      </Pill>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="text-[0.7rem] text-muted-foreground">
                Teams carry several coaches — all of them see the team in their
                queue and chat.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
