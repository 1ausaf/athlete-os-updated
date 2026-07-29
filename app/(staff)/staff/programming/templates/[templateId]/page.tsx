import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Globe, Info } from "lucide-react";

import { ProgramBuilder } from "@/app/(staff)/staff/athletes/[athleteId]/program/program-builder";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import {
  athleteMaxes,
  exerciseLibrary,
  jordanProgramDays,
  programTemplates,
  scaffoldProgram,
  type AthleteProgram,
  type ProgramTemplate,
} from "@/lib/demo/training";
import { isStaff } from "@/lib/rbac";

import { TemplateLabels } from "./template-labels";

/**
 * Master-template editor (C10) — the program builder in TEMPLATE mode.
 * `templateId` "new" scaffolds an empty program from the New-program modal's
 * name/weeks/days query; every other id opens an existing library master.
 */
export default async function TemplateBuilderPage({
  params,
  searchParams,
}: {
  params: { templateId: string };
  searchParams?: { name?: string; weeks?: string; days?: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const isNew = params.templateId === "new";
  let tpl: ProgramTemplate | undefined;
  let program: AthleteProgram;

  if (isNew) {
    const name = searchParams?.name?.trim() || "New program";
    program = scaffoldProgram({
      id: "tpl-new",
      name,
      weeks: Number(searchParams?.weeks) || 4,
      daysPerWeek: Number(searchParams?.days) || 3,
    });
  } else {
    tpl = programTemplates.find((t) => t.id === params.templateId);
    if (!tpl) notFound();
    program = scaffoldProgram({
      id: tpl.id,
      name: tpl.name,
      weeks: tpl.weeks,
      daysPerWeek: tpl.daysPerWeek,
      remoteDays: tpl.remoteDays,
      // Demo: seed days from Jordan's block so the master has real structure.
      seedDays: jordanProgramDays,
    });
  }

  // C25 — real URL per template; back returns to the library tab.
  const backHref = "/staff/programming?tab=programs" as Route;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Programming"
        title={program.name}
        description={
          tpl
            ? `${tpl.level} master · ${tpl.weeks} wk × ${tpl.daysPerWeek} d/wk — ${tpl.description}`
            : `New master template · ${program.weeks.length} wk × ${program.weeks[0]?.days.length ?? 0} d/wk — name it, build it, then copy it onto athletes.`
        }
        actions={
          <>
            {tpl?.remoteDays ? (
              <Pill tone="info" icon={<Globe className="h-3 w-3" />}>
                {tpl.remoteDays}× remote/wk
              </Pill>
            ) : null}
            <Pill tone="brand">Master template</Pill>
            <Button asChild variant="ghost" size="sm" className="no-print">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
                Program library
              </Link>
            </Button>
          </>
        }
      />

      {/* C25 — audience labels live on the template header */}
      <TemplateLabels initial={tpl?.labels ?? []} />

      <p className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/[0.07] px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
        Editing master template — copies onto clients keep their own loads.
        Changes here never touch programs already applied to a client.
      </p>

      <ProgramBuilder
        athleteName={program.name}
        program={program}
        library={exerciseLibrary}
        maxes={athleteMaxes["ath-jordan"] ?? {}}
        mode="template"
      />
    </div>
  );
}
