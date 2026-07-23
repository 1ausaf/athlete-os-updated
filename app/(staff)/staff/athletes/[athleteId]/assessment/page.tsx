import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import {
  assessmentForAthlete,
  blankAssessment,
} from "@/lib/demo/assessment";
import { athleteById, fmtFullDay } from "@/lib/demo/data";
import { isStaff } from "@/lib/rbac";

import { AssessmentEditor } from "./assessment-editor";

/**
 * Coach-side Remapping Assessment for one athlete: view/edit an existing
 * record, or run a fresh one (check-on/check-off during testing — the
 * strength ladders auto-compute, per the client's spreadsheet).
 */
export default async function StaffAssessmentPage({
  params,
}: {
  params: { athleteId: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const athlete = athleteById(params.athleteId);
  if (!athlete) notFound();

  const existing = assessmentForAthlete(athlete.id);
  const assessment = existing ?? blankAssessment(athlete.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Assessment"
        title={`${athlete.name} — Remapping Assessment™`}
        description={
          existing
            ? `Assessed by ${existing.assessedBy} · ${fmtFullDay(existing.date)}. The athlete sees this read-only in their portal.`
            : "Not yet assessed — start below and check things off as you test."
        }
        actions={
          <>
            {existing ? (
              <Pill tone="success" dot>
                Complete
              </Pill>
            ) : (
              <Pill tone="warning" dot>
                Pending
              </Pill>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={`/staff/athletes/${athlete.id}` as Route}>
                ← Profile
              </Link>
            </Button>
          </>
        }
      />

      <AssessmentEditor
        initial={assessment}
        athlete={athlete}
        hasExisting={Boolean(existing)}
      />
    </div>
  );
}
