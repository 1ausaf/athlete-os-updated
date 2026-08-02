import { redirect } from "next/navigation";
import type { Route } from "next";
import { ClipboardList, Dumbbell, ListChecks } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { TabLinkBar } from "@/components/app/tab-bar";
import { requireUserWithProfile } from "@/lib/auth";
import {
  circuitLibrary,
  exerciseLibrary,
  LIBRARY_TOTALS,
  programTemplates,
} from "@/lib/demo/training";
import { isStaff } from "@/lib/rbac";

import { CircuitLibrary } from "./circuit-library";
import { ExerciseLibrary } from "./exercise-library";
import { ProgramLibrary } from "./program-library";

type LibraryTab = "programs" | "circuits" | "exercises";

/**
 * G1 — Programming is libraries only: the client queue is gone (Members owns
 * due-tracking now). Three libraries, each at a real ?tab= URL with the
 * red-line tab style (G2).
 */
export default async function ProgrammingPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const tab: LibraryTab = ["programs", "circuits", "exercises"].includes(
    searchParams?.tab ?? "",
  )
    ? (searchParams!.tab as LibraryTab)
    : "programs";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace"
        title="Programming"
        description="Build and maintain the Program, Circuit and Exercise Libraries — master templates and reusable blocks live here. Client due-tracking lives in Members."
      />

      {/* Library scale */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Program Library"
          value={LIBRARY_TOTALS.programs}
          icon={ClipboardList}
          hint={`${programTemplates.length} master templates shown`}
        />
        <StatTile
          label="Circuit Library"
          value={LIBRARY_TOTALS.circuits}
          icon={ListChecks}
          hint={`${circuitLibrary.length} shown in this demo`}
        />
        <StatTile
          label="Exercise Library"
          value={LIBRARY_TOTALS.exercises}
          icon={Dumbbell}
          hint={`${exerciseLibrary.length} curated samples in this demo`}
        />
      </div>

      {/* G2 — the app-wide red-line tab style, URL-routed */}
      <TabLinkBar
        tabs={[
          {
            href: "/staff/programming?tab=programs" as Route,
            label: "Program Library",
            active: tab === "programs",
          },
          {
            href: "/staff/programming?tab=circuits" as Route,
            label: "Circuit Library",
            active: tab === "circuits",
          },
          {
            href: "/staff/programming?tab=exercises" as Route,
            label: "Exercise Library",
            active: tab === "exercises",
          },
        ]}
      />

      {tab === "programs" ? <ProgramLibrary /> : null}
      {tab === "circuits" ? <CircuitLibrary /> : null}
      {tab === "exercises" ? <ExerciseLibrary /> : null}
    </div>
  );
}
