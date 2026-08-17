/**
 * Round 11 (A4): one managed session-type list for the whole app.
 *
 * Staff manage the list (add / rename / delete — round 10) and now each
 * type's COLOR and DESCRIPTION too. The athlete booking page reads the same
 * store so the chips ("Coaching", "Master Coaching"…) render in the managed
 * color and the info popover shows the managed description.
 *
 * Storage is localStorage (demo depth). Round 10 stored a plain string[];
 * loadSessionTypes migrates that shape transparently.
 */

export type SessionTypeTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "destructive";

export interface SessionTypeMeta {
  name: string;
  tone: SessionTypeTone;
  description: string;
}

export const SESSION_TYPES_KEY = "aos-session-types";
export const SESSION_TYPES_EVENT = "aos-session-types-changed";

/** Tone → swatch class for the manage-popover color picker. */
export const SESSION_TYPE_TONES: { tone: SessionTypeTone; label: string }[] = [
  { tone: "neutral", label: "Grey" },
  { tone: "brand", label: "Red" },
  { tone: "info", label: "Blue" },
  { tone: "success", label: "Green" },
  { tone: "warning", label: "Amber" },
  { tone: "destructive", label: "Crimson" },
];

export const DEFAULT_SESSION_TYPE_META: SessionTypeMeta[] = [
  {
    name: "Coaching",
    tone: "neutral",
    description:
      "Semi-private coached block — you follow your own individualized program with a coach on the floor.",
  },
  {
    name: "Master Coaching",
    tone: "brand",
    description:
      "Small-group session led by a head coach — advanced loading, technical priority on the platforms.",
  },
  {
    name: "Weightlifting Team",
    tone: "info",
    description:
      "Competitive Olympic weightlifting squad training — snatch and clean & jerk focus with meet prep.",
  },
  {
    name: "Semi-Private",
    tone: "success",
    description: "2–4 athletes per coach, scheduled by the front desk.",
  },
  {
    name: "Team",
    tone: "warning",
    description: "Group and team blocks booked by the coaching staff.",
  },
  {
    name: "1:1",
    tone: "success",
    description: "Private one-on-one coaching session.",
  },
  {
    name: "Online",
    tone: "neutral",
    description: "Remote check-in or video coaching call.",
  },
];

function isMeta(value: unknown): value is SessionTypeMeta {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SessionTypeMeta).name === "string" &&
    typeof (value as SessionTypeMeta).tone === "string"
  );
}

/** Read the managed list; migrates the round-10 string[] shape in place. */
export function loadSessionTypes(): SessionTypeMeta[] {
  if (typeof window === "undefined") return DEFAULT_SESSION_TYPE_META;
  try {
    const raw = window.localStorage.getItem(SESSION_TYPES_KEY);
    if (!raw) return DEFAULT_SESSION_TYPE_META;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_SESSION_TYPE_META;
    }
    if (parsed.every((p) => typeof p === "string")) {
      return (parsed as string[]).map(
        (name) =>
          DEFAULT_SESSION_TYPE_META.find((m) => m.name === name) ?? {
            name,
            tone: "neutral" as const,
            description: "",
          },
      );
    }
    const metas = parsed
      .filter(isMeta)
      .map((m) => ({ ...m, description: m.description ?? "" }));
    return metas.length > 0 ? metas : DEFAULT_SESSION_TYPE_META;
  } catch {
    return DEFAULT_SESSION_TYPE_META;
  }
}

export function saveSessionTypes(list: SessionTypeMeta[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_TYPES_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(SESSION_TYPES_EVENT));
}

export function sessionTypeMetaFor(
  name: string,
  list?: SessionTypeMeta[],
): SessionTypeMeta | undefined {
  return (list ?? DEFAULT_SESSION_TYPE_META).find((m) => m.name === name);
}
