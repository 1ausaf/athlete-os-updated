"use client";

import { useEffect, useState } from "react";

/**
 * Round 10 (R32/R33): roster edits made on a session page persist as a
 * DELTA against the seeded roster — localStorage keyed per session — and
 * broadcast an event so the capacity count and the Briefing pick the
 * change up live, on this page or the next one the coach opens.
 */
export interface RosterDelta {
  /** Athlete ids booked on top of the seed roster. */
  added: string[];
  /** Seeded athlete ids removed from the session. */
  removed: string[];
  /** R29 — athletes flagged as no-shows. */
  noShow: string[];
  /** Pending entries (seed or added) that were approved. */
  approved?: string[];
}

export const ROSTER_CHANGED_EVENT = "aos-roster-changed";

const EMPTY_DELTA: RosterDelta = { added: [], removed: [], noShow: [] };

export function rosterDeltaKey(sessionId: string): string {
  return `aos-roster-delta:${sessionId}`;
}

export function readRosterDelta(sessionId: string): RosterDelta {
  if (typeof window === "undefined") return EMPTY_DELTA;
  try {
    const raw = window.localStorage.getItem(rosterDeltaKey(sessionId));
    if (!raw) return EMPTY_DELTA;
    const parsed = JSON.parse(raw) as Partial<RosterDelta>;
    return {
      added: Array.isArray(parsed.added) ? parsed.added : [],
      removed: Array.isArray(parsed.removed) ? parsed.removed : [],
      noShow: Array.isArray(parsed.noShow) ? parsed.noShow : [],
      approved: Array.isArray(parsed.approved) ? parsed.approved : [],
    };
  } catch {
    return EMPTY_DELTA;
  }
}

export function writeRosterDelta(sessionId: string, delta: RosterDelta): void {
  try {
    window.localStorage.setItem(rosterDeltaKey(sessionId), JSON.stringify(delta));
  } catch {
    /* storage blocked — the in-memory state still drives this page */
  }
  window.dispatchEvent(new Event(ROSTER_CHANGED_EVENT));
}

/**
 * Live view of a session's roster delta: reads localStorage on mount and
 * re-reads whenever a roster-manager broadcasts a change.
 */
export function useRosterDelta(sessionId: string): RosterDelta {
  const [delta, setDelta] = useState<RosterDelta>(EMPTY_DELTA);

  useEffect(() => {
    const sync = () => setDelta(readRosterDelta(sessionId));
    sync();
    window.addEventListener(ROSTER_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ROSTER_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sessionId]);

  return delta;
}
