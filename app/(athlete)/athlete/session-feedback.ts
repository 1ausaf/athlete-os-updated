/**
 * Round 10 (R9): the post-workout "How did the session go?" feedback hops
 * from the logger into the athlete's team chat. In the demo the bridge is a
 * tiny localStorage queue — the logger appends, the Messages page merges the
 * entries into the thread on load as athlete-sent messages.
 */

export interface SessionFeedbackEntry {
  /** Full chat body, e.g. `Session Feedback: Felt strong today.` */
  body: string;
  /** ISO timestamp the feedback was sent. */
  at: string;
}

export const sessionFeedbackKey = (athleteId: string) =>
  `aos-session-feedback:${athleteId}`;

/** Read the queued feedback messages for an athlete (client-only; safe on corrupt storage). */
export function readSessionFeedback(athleteId: string): SessionFeedbackEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(sessionFeedbackKey(athleteId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SessionFeedbackEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as SessionFeedbackEntry).body === "string" &&
        typeof (e as SessionFeedbackEntry).at === "string",
    );
  } catch {
    return [];
  }
}

/** Append one feedback message to the athlete's queue. */
export function appendSessionFeedback(
  athleteId: string,
  body: string,
): SessionFeedbackEntry {
  const entry: SessionFeedbackEntry = { body, at: new Date().toISOString() };
  try {
    const next = [...readSessionFeedback(athleteId), entry];
    window.localStorage.setItem(
      sessionFeedbackKey(athleteId),
      JSON.stringify(next),
    );
  } catch {
    // Storage unavailable — the flash still confirms; the demo moves on.
  }
  return entry;
}
