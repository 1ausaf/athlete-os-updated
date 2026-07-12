import type { PillTone } from "@/components/ui/pill";

/**
 * Shared phrasing + tone for "days of program left" — the client runs their
 * roster off programming due dates (Trello card due dates), so the same
 * urgency scale shows up on the roster rail, the roster rows and the profile.
 *
 *  0 days  → due NOW (danger)
 * ≤5 days  → running out (warning)
 *  else    → healthy (neutral)
 */
export interface ProgramDueMeta {
  label: string;
  tone: PillTone;
}

/** Rail / roster phrasing: "Program update due NOW" · "4 days of program left". */
export function programDueMeta(days: number): ProgramDueMeta {
  if (days <= 0) return { label: "Program update due NOW", tone: "danger" };
  const label = `${days} day${days === 1 ? "" : "s"} of program left`;
  return { label, tone: days <= 5 ? "warning" : "neutral" };
}

/** Profile phrasing: "Program update due NOW" · "Program update due in 6 days". */
export function programDueLong(days: number): ProgramDueMeta {
  if (days <= 0) return { label: "Program update due NOW", tone: "danger" };
  const label = `Program update due in ${days} day${days === 1 ? "" : "s"}`;
  return { label, tone: days <= 5 ? "warning" : "neutral" };
}
