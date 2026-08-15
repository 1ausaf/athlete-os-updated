"use client";

import { Progress } from "@/components/app/progress";

import { useRosterDelta } from "../roster-delta";

/**
 * Round 10 (R33): the summary card's headcount follows roster edits live —
 * seed count + additions − removals, re-read whenever the roster manager
 * broadcasts a change.
 */
export function LiveRosterCount({
  sessionId,
  seedCount,
}: {
  sessionId: string;
  seedCount: number;
}) {
  const delta = useRosterDelta(sessionId);
  return <>{Math.max(0, seedCount + delta.added.length - delta.removed.length)}</>;
}

/** The capacity bar, driven by the same live count (R33). */
export function LiveCapacityBar({
  sessionId,
  seedCount,
  capacity,
}: {
  sessionId: string;
  seedCount: number;
  capacity: number;
}) {
  const delta = useRosterDelta(sessionId);
  const count = Math.max(0, seedCount + delta.added.length - delta.removed.length);
  const pct = Math.round((count / Math.max(1, capacity)) * 100);
  return <Progress value={pct} tone={pct >= 100 ? "warning" : "brand"} />;
}
