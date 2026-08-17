import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, ClipboardCheck, StickyNote } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { AssessmentForm } from "@/components/assessment/assessment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireAthleteContext } from "@/lib/demo/session";
import {
  ASSESSMENT_TYPE_LABEL,
  assessmentForAthlete,
  assessmentSummaryById,
  combineAssessmentById,
} from "@/lib/demo/assessment";
import { fmtFullDay } from "@/lib/demo/data";

/**
 * Round 5 (A15): one assessment record. Remapping entries render the full
 * Remapping view (read-only, exactly as the coaches wrote it); combine
 * entries render a clean results table with deltas vs the previous test.
 */
export default async function AthleteAssessmentDetailPage({
  params,
}: {
  params: { assessmentId: string };
}) {
  const { athlete } = requireAthleteContext();
  const summary = assessmentSummaryById(params.assessmentId);
  if (!summary || summary.athleteId !== athlete.id) notFound();

  const backLink = (
    <p className="text-xs text-muted-foreground">
      <Link
        href={"/athlete/assessment" as Route}
        className="underline-offset-4 hover:underline"
      >
        Back to all assessments
      </Link>
    </p>
  );

  /* ---------------- Combine testing: results table + notes ------------- */
  if (summary.type === "combine") {
    const combine = combineAssessmentById(summary.id);
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href={"/athlete/assessment" as Route}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
              All assessments
            </Link>
          </Button>
          <PageHeader
            title={summary.name}
            description={`Performed by ${summary.performedBy} · ${fmtFullDay(summary.date)}.`}
            actions={
              <Pill tone="success" dot>
                Complete
              </Pill>
            }
          />
        </div>

        {combine ? (
          <>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Metric</th>
                      <th className="px-4 py-3 text-right font-medium">Result</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Previous
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {combine.results.map((r) => {
                      const delta =
                        r.value != null && r.previous != null
                          ? Math.round((r.value - r.previous) * 100) / 100
                          : null;
                      // For times (s), lower is better; everything else, higher.
                      const improved =
                        delta != null &&
                        (r.unit === "s" ? delta < 0 : delta > 0);
                      return (
                        <tr key={r.metric}>
                          <td className="px-4 py-3 font-medium">{r.metric}</td>
                          <td className="tnum px-4 py-3 text-right font-semibold">
                            {r.value != null ? `${r.value} ${r.unit}` : "—"}
                          </td>
                          <td className="tnum px-4 py-3 text-right text-muted-foreground">
                            {r.previous != null
                              ? `${r.previous} ${r.unit}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {delta == null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span
                                className={
                                  improved
                                    ? "tnum font-semibold text-success"
                                    : "tnum font-semibold text-muted-foreground"
                                }
                              >
                                {delta > 0 ? "+" : ""}
                                {delta} {r.unit}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {combine.notes ? (
              <Card>
                <CardContent className="flex gap-3 p-5">
                  <StickyNote
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Coach notes
                    </p>
                    <p className="mt-1 text-sm text-pretty">{combine.notes}</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <EmptyRecord />
        )}

        {backLink}
      </div>
    );
  }

  /* ---------------- Remapping: the full existing read-only view --------- */
  const assessment = assessmentForAthlete(athlete.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={"/athlete/assessment" as Route}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            All assessments
          </Link>
        </Button>
        <PageHeader
          title={summary.name}
          description={`Performed by ${summary.performedBy} · ${fmtFullDay(summary.date)}. Your coaches use this to write every block of your program.`}
          actions={
            <Pill tone="success" dot>
              Complete
            </Pill>
          }
        />
      </div>

      {assessment ? (
        <AssessmentForm initial={assessment} athlete={athlete} mode="view" />
      ) : (
        <EmptyRecord />
      )}

      {backLink}
    </div>
  );
}

function EmptyRecord() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface/30 p-10 text-center">
      <ClipboardCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="max-w-sm text-sm text-muted-foreground text-pretty">
        This record hasn&apos;t been filled in yet — once your coach completes
        it, the full breakdown appears here.
      </p>
    </div>
  );
}
