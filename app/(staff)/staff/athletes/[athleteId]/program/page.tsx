import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById } from "@/lib/demo/data";
import {
  athleteMaxes,
  exerciseLibrary,
  jordanProgramDays,
} from "@/lib/demo/training";
import { isStaff } from "@/lib/rbac";

import { ProgramBuilder } from "./program-builder";

/**
 * Coach program builder — the TrainHeroic replacement. Server shell only:
 * guards, athlete lookup, and serializable props for the client editor.
 */
export default async function ProgramBuilderPage({
  params,
}: {
  params: { athleteId: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const athlete = athleteById(params.athleteId);
  if (!athlete) notFound();

  const profileHref = `/staff/athletes/${athlete.id}` as Route;
  const duePill =
    athlete.programDueInDays === 0 ? (
      <Pill tone="danger" dot>
        Program update due now
      </Pill>
    ) : athlete.programDueInDays <= 5 ? (
      <Pill tone="warning" dot>
        Due in {athlete.programDueInDays} days
      </Pill>
    ) : (
      <Pill tone="neutral" icon={<CalendarClock className="h-3 w-3" />}>
        {athlete.programDueInDays} days of runway
      </Pill>
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Programming"
        title={
          <span className="flex items-center gap-3">
            <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="lg" />
            {athlete.name}
          </span>
        }
        description={`${athlete.program.name} · ${athlete.program.phase} phase · ${athlete.frequency}`}
        actions={
          <>
            {duePill}
            <Button asChild variant="ghost" size="sm" className="no-print">
              <Link href={profileHref}>
                <ArrowLeft className="h-4 w-4" />
                Profile
              </Link>
            </Button>
          </>
        }
      />

      <ProgramBuilder
        athleteId={athlete.id}
        athleteName={athlete.name}
        isTemplateView={athlete.id !== "ath-jordan"}
        days={jordanProgramDays}
        library={exerciseLibrary}
        maxes={athleteMaxes[athlete.id] ?? athleteMaxes["ath-jordan"] ?? {}}
      />
    </div>
  );
}
