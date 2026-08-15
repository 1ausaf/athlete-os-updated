"use client";

import { Fragment, type ReactNode } from "react";

import { useRosterDelta } from "../roster-delta";

/** One server-rendered athlete card the client can show or hide. */
export interface BriefCardEntry {
  id: string;
  name: string;
  card: ReactNode;
}

/**
 * Round 10 (R32): the briefing's athlete cards follow roster edits made on
 * the session page. The server renders a card for every athlete who COULD
 * be on the session (seed roster + active members); this client component
 * merges the persisted roster delta — added athletes appear, removed ones
 * drop — keeping the list alphabetical.
 */
export function LiveBriefRoster({
  sessionId,
  seedIds,
  entries,
}: {
  sessionId: string;
  /** Athlete ids on the seeded roster. */
  seedIds: string[];
  /** Server-rendered cards for everyone addable to this session. */
  entries: BriefCardEntry[];
}) {
  const delta = useRosterDelta(sessionId);

  const byId = new Map(entries.map((e) => [e.id, e]));
  const ids = new Set(seedIds.filter((id) => !delta.removed.includes(id)));
  for (const id of delta.added) if (byId.has(id)) ids.add(id);

  const rows = [...ids]
    .map((id) => byId.get(id))
    .filter((e): e is BriefCardEntry => Boolean(e))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
        No members booked on this session.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((e) => (
        <Fragment key={e.id}>{e.card}</Fragment>
      ))}
    </div>
  );
}

/** The briefing header's headcount, kept in sync with roster edits (R32). */
export function LiveOnDeckCount({
  sessionId,
  seedCount,
}: {
  sessionId: string;
  seedCount: number;
}) {
  const delta = useRosterDelta(sessionId);
  return <>{Math.max(0, seedCount + delta.added.length - delta.removed.length)}</>;
}
