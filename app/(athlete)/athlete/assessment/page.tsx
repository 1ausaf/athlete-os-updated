import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, ClipboardCheck, UserRound } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { requireAthleteContext } from "@/lib/demo/session";
import {
  ASSESSMENT_TYPE_LABEL,
  assessmentSummariesFor,
} from "@/lib/demo/assessment";
import { fmtFullDay } from "@/lib/demo/data";

/**
 * Round 5 (A15): the assessment page is a LIST — the yearly Remapping plus
 * combine testing days — and each entry opens its own record. Coaches run
 * assessments on the floor; athletes see every record here, read-only.
 */
export default async function AthleteAssessmentPage() {
  const { athlete } = requireAthleteContext();
  const summaries = assessmentSummariesFor(athlete.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Assessment"
        title="Assessments"
        description="Every assessment on file — the yearly Remapping and combine testing days. Open one to see the full record your coaches program from."
        actions={
          <Pill tone="neutral" dot>
            <span className="tnum">{summaries.length} on file</span>
          </Pill>
        }
      />

      {summaries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface/30 p-10 text-center">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="max-w-sm text-sm text-muted-foreground text-pretty">
            No assessments yet — the Remapping Assessment is the first session
            of your onboarding. Once your coach runs it, the full record
            appears here.
          </p>
        </div>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {summaries.map((s) => {
              const inner = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
                    <ClipboardCheck className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {s.name}
                      </span>
                      <Pill tone={s.type === "remapping" ? "brand" : "info"}>
                        {ASSESSMENT_TYPE_LABEL[s.type]}
                      </Pill>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-3 w-3" aria-hidden />
                        Performed by {s.performedBy}
                      </span>
                      <span aria-hidden>·</span>
                      <span className="tnum">{fmtFullDay(s.date)}</span>
                    </span>
                  </span>
                  {s.status === "complete" ? (
                    <Pill tone="success" dot>
                      Complete
                    </Pill>
                  ) : (
                    <Pill tone="neutral" dot>
                      Pending
                    </Pill>
                  )}
                </>
              );

              // Pending rows aren't clickable — there's nothing to open yet.
              if (s.status !== "complete") {
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 p-4 opacity-70"
                  >
                    {inner}
                  </li>
                );
              }
              return (
                <li key={s.id}>
                  <Link
                    href={`/athlete/assessment/${s.id}` as Route}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/40"
                  >
                    {inner}
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
