import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById, type Athlete } from "@/lib/demo/data";
import { trainingGroupById } from "@/lib/demo/training";
import { isStaff } from "@/lib/rbac";

import { GroupAssessmentTable } from "./group-assessment";

/**
 * Round 10 (R23) — the GROUP assessment page: one testing-day table across
 * the group's linked member athletes (Vertical Jump, Broad Jump, 10-Yard,
 * 5-10-5 Pro Agility, 40-Yard). Blanks are allowed by design.
 */
export default async function StaffGroupAssessmentPage({
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
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => ({
      id: a.id,
      name: a.name,
      initials: a.initials,
      hue: a.hue,
      age: a.age,
      sport: a.sport,
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Group: ${group.name} — Assessment`}
        description="One testing day across the whole group — key results in as you run each test."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/staff/teams/${group.id}` as Route}>
              ← Group profile
            </Link>
          </Button>
        }
      />
      <GroupAssessmentTable groupId={group.id} members={members} />
    </div>
  );
}
