import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ClipboardCheck, Plus, Timer } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import {
  ASSESSMENT_TYPE_LABEL,
  assessmentForAthlete,
  assessmentSummariesFor,
  blankAssessment,
  combineAssessmentById,
  type CombineResult,
} from "@/lib/demo/assessment";
import { athleteById, fmtFullDay } from "@/lib/demo/data";
import { isStaff } from "@/lib/rbac";

import { AssessmentEditor } from "./assessment-editor";
import { CombinePanel } from "./combine-panel";

/**
 * Round 5 (C37): the athlete's assessment record is a LIST of assessments of
 * different TYPES — "the Remapping is one type, but we can build multiple
 * different types… think of this as a way to create combines." Coaches start
 * a new one of either type; each entry opens its own record. (A dynamic
 * assessment builder is phase 2 — the client's call.)
 */

const BLANK_COMBINE: CombineResult[] = [
  { metric: "Vertical Jump", value: null, unit: "in" },
  { metric: "Broad Jump", value: null, unit: "in" },
  { metric: "10-Yard Sprint", value: null, unit: "s" },
  { metric: "40-Yard Sprint", value: null, unit: "s" },
  { metric: "Pro Agility (5-10-5)", value: null, unit: "s" },
  { metric: "Push-ups (max)", value: null, unit: "reps" },
  { metric: "Chin-ups (max)", value: null, unit: "reps" },
];

export default async function StaffAssessmentPage({
  params,
  searchParams,
}: {
  params: { athleteId: string };
  searchParams?: { open?: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const athlete = athleteById(params.athleteId);
  if (!athlete) notFound();

  const summaries = assessmentSummariesFor(athlete.id);
  const open = searchParams?.open;
  const base = `/staff/athletes/${athlete.id}/assessment`;

  /* ---------------- Remapping (existing editor) ---------------- */
  if (open === "remapping" || summaries.find((s) => s.id === open)?.type === "remapping") {
    const existing = assessmentForAthlete(athlete.id);
    const assessment = existing ?? blankAssessment(athlete.id);
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
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
                <Link href={base as Route}>← All assessments</Link>
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

  /* ---------------- Combine (view existing / start new) ---------------- */
  if (open === "combine" || open?.includes("combine")) {
    const record = open && open !== "combine" ? combineAssessmentById(open) : undefined;
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={`${athlete.name} — Combine Testing`}
          description={
            record
              ? `Performed by ${record.performedBy} · ${fmtFullDay(record.date)}. Deltas compare against the previous testing day.`
              : "New testing day — key results in as you run each test."
          }
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href={base as Route}>← All assessments</Link>
            </Button>
          }
        />
        {/* C14 — assessment editors run full-width like other pages */}
        <CombinePanel
          initialResults={record ? record.results : BLANK_COMBINE}
          initialNotes={record ? record.notes : ""}
          editable={!record}
        />
      </div>
    );
  }

  /* ---------------- The list + start menu ---------------- */
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${athlete.name} — Assessments`}
        description="Every assessment on file — yearly Remapping plus combine testing days. Start a new one when it's time to retest."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/staff/athletes/${athlete.id}` as Route}>← Profile</Link>
          </Button>
        }
      />

      {/* Start a new assessment — one button per type (C37). R22: two types
          stay as two buttons; once a THIRD assessment type exists this row
          becomes a single "Start assessment…" dropdown. */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="brand" size="sm">
          <Link href={`${base}?open=remapping` as Route}>
            <Plus className="h-4 w-4" />
            Start Remapping Assessment™
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}?open=combine` as Route}>
            <Plus className="h-4 w-4" />
            Start Combine testing
          </Link>
        </Button>
      </div>

      <div className="flex max-w-3xl flex-col gap-3">
        {summaries.map((s) => (
          <Link
            key={s.id}
            href={`${base}?open=${s.id}` as Route}
            className="group"
          >
            <Card className="transition-colors group-hover:border-brand/40">
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-ink">
                  {s.type === "remapping" ? (
                    <ClipboardCheck className="h-5 w-5" />
                  ) : (
                    <Timer className="h-5 w-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ASSESSMENT_TYPE_LABEL[s.type]} · {s.performedBy} ·{" "}
                    {fmtFullDay(s.date)}
                  </span>
                </span>
                {s.status === "complete" ? (
                  <Pill tone="success" dot>
                    Complete
                  </Pill>
                ) : (
                  <Pill tone="warning" dot>
                    Pending
                  </Pill>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {summaries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No assessments on file yet — start one above.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
