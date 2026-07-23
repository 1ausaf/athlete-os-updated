import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { AssessmentForm } from "@/components/assessment/assessment-form";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { assessmentForAthlete } from "@/lib/demo/assessment";
import { athleteById, fmtFullDay } from "@/lib/demo/data";

/**
 * The athlete's Remapping Assessment — read-only. Coaches run the assessment
 * on the floor and fill it in from the staff side; the athlete sees the full
 * record here, exactly as written.
 */
export default async function AthleteAssessmentPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const assessment = assessmentForAthlete(athlete.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Assessment"
        title="Remapping Assessment™"
        description={
          assessment
            ? `Assessed by ${assessment.assessedBy} · ${fmtFullDay(assessment.date)}. Your coaches use this to write every block of your program.`
            : "Your assessment hasn't been run yet — it's the first session of your onboarding."
        }
        actions={
          assessment ? (
            <Pill tone="success" dot>
              Complete
            </Pill>
          ) : (
            <Pill tone="neutral" dot>
              Not yet assessed
            </Pill>
          )
        }
      />

      {assessment ? (
        <AssessmentForm initial={assessment} athlete={athlete} mode="view" />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface/30 p-10 text-center">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="max-w-sm text-sm text-muted-foreground text-pretty">
            Once your coach runs the Remapping Assessment, the full breakdown —
            movement, flexibility, strength ratios and performance — appears
            here.
          </p>
        </div>
      )}
    </div>
  );
}
