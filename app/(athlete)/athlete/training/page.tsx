import { PageHeader } from "@/components/app/page-header";
import { requireAthleteContext } from "@/lib/demo/session";
import { athleteProfileById } from "@/lib/demo/data";
import {
  athleteMaxes,
  completedSessions,
  exerciseById,
  jordanExerciseHistory,
  programDaysFor,
  type LibraryExercise,
} from "@/lib/demo/training";

import { NoProgramNotice } from "../status-notice";
import { WorkoutLogger } from "./workout-logger";

export default async function AthleteTrainingPage() {
  const { athlete } = requireAthleteContext();

  // Away/paused members keep their login — but no program runs (round 4).
  if (athlete.status !== "active" || athlete.program.totalDays === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Training"
          description="Your program history stays right here for when you're back."
        />
        <NoProgramNotice athlete={athlete} />
      </div>
    );
  }

  // Assemble serializable props for the client logger — always the SELECTED
  // athlete's days (round 5, P7: Maya's portal used to show Jordan's program).
  const days = programDaysFor(athlete.id);
  const exerciseMap: Record<string, LibraryExercise> = {};
  for (const day of days) {
    for (const section of day.sections) {
      for (const ex of section.exercises) {
        const lib = exerciseById(ex.exerciseId);
        if (lib) exerciseMap[ex.exerciseId] = lib;
      }
    }
  }
  const maxes = athleteMaxes[athlete.id] ?? {};
  // Exercise history is seeded for Jordan only — never leak his numbers into
  // another athlete's log.
  const history = athlete.id === "ath-jordan" ? jordanExerciseHistory : {};
  // The profile's preferred unit is the default for every exercise section in
  // the logger (round 5, A7) — each section can still be flipped on the floor.
  const preferredUnit = athleteProfileById(athlete.id)?.preferredUnit ?? "lb";

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print">
        <PageHeader title="Training" />
      </div>

      {/* Tabs (published / past) + logger + expanded PRs (client) */}
      <WorkoutLogger
        athleteId={athlete.id}
        days={days}
        exercises={exerciseMap}
        history={history}
        maxes={maxes}
        completed={athlete.id === "ath-jordan" ? completedSessions : []}
        prs={athlete.prs}
        preferredUnit={preferredUnit}
      />
    </div>
  );
}
