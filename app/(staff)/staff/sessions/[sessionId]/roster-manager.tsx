"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Plus, UserPlus, UserX, X } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Pill } from "@/components/ui/pill";
import type { BookingState } from "@/lib/demo/data";

import { readRosterDelta, writeRosterDelta } from "../roster-delta";

/** Serializable roster row prepared server-side. */
export interface RosterAthlete {
  id: string;
  name: string;
  initials: string;
  hue: number;
  focus: string;
  age: number;
  sex: "M" | "F";
  /** Booking plan, e.g. "3×/week". */
  plan: string;
  /** Season label, shown right beside the focus. */
  season: string;
  isMinor: boolean;
  injuryFlags: string[];
  billingState: "paid" | "overdue" | "grace" | "pending";
}

interface Entry {
  athleteId: string;
  state: BookingState;
}

/** Two-step removal: 1 = "Remove … ?", 2 = "Are you sure?" (R6 S5). */
type RemovalStage = { id: string; step: 1 | 2 };

/**
 * Round 5 (C33): coaches add + remove clients on a session directly —
 * additions land as pending until approved. Round 6 (S5): the add control is
 * a type-to-search picker, and removing someone takes two distinct
 * confirmations before the booking is actually dropped.
 * Round 10 (R29): each row gets a No-show toggle — past sessions included.
 * Round 10 (R32/R33): every change persists as a localStorage delta and
 * broadcasts, so the capacity count and the Briefing stay in sync.
 */
export function RosterManager({
  sessionId,
  initialRoster,
  pool,
}: {
  sessionId: string;
  initialRoster: Entry[];
  pool: RosterAthlete[];
}) {
  const [roster, setRoster] = useState<Entry[]>(initialRoster);
  const [noShow, setNoShow] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [removal, setRemoval] = useState<RemovalStage | null>(null);
  // Skip persisting until the stored delta has been replayed on mount.
  const hydrated = useRef(false);

  // R32/R33 — replay the persisted delta over the seeded roster on mount,
  // so edits survive navigating to the Briefing and back.
  useEffect(() => {
    const delta = readRosterDelta(sessionId);
    const approved = new Set(delta.approved ?? []);
    setRoster(() => {
      const kept = initialRoster
        .filter((e) => !delta.removed.includes(e.athleteId))
        .map((e) =>
          e.state === "pending" && approved.has(e.athleteId)
            ? { ...e, state: "confirmed" as BookingState }
            : e,
        );
      const added: Entry[] = delta.added
        .filter((id) => !kept.some((e) => e.athleteId === id))
        .map((id) => ({
          athleteId: id,
          state: (approved.has(id) ? "confirmed" : "pending") as BookingState,
        }));
      return [...kept, ...added];
    });
    setNoShow(new Set(delta.noShow));
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Recompute the delta vs the seed roster and persist + broadcast it.
  useEffect(() => {
    if (!hydrated.current) return;
    const seedIds = new Set(initialRoster.map((e) => e.athleteId));
    const seedPending = new Set(
      initialRoster.filter((e) => e.state === "pending").map((e) => e.athleteId),
    );
    const currentIds = new Set(roster.map((e) => e.athleteId));
    writeRosterDelta(sessionId, {
      added: roster
        .filter((e) => !seedIds.has(e.athleteId))
        .map((e) => e.athleteId),
      removed: [...seedIds].filter((id) => !currentIds.has(id)),
      noShow: [...noShow].filter((id) => currentIds.has(id)),
      approved: roster
        .filter(
          (e) =>
            e.state === "confirmed" &&
            (seedPending.has(e.athleteId) || !seedIds.has(e.athleteId)),
        )
        .map((e) => e.athleteId),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, noShow, sessionId]);

  const byId = new Map(pool.map((a) => [a.id, a]));
  const rows = roster
    .map((e) => ({ entry: e, athlete: byId.get(e.athleteId) }))
    .filter((r): r is { entry: Entry; athlete: RosterAthlete } =>
      Boolean(r.athlete),
    );

  const available = pool
    .filter((a) => !roster.some((e) => e.athleteId === a.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  // S5: type-to-filter — empty query lists everyone still addable.
  const matches = available.filter((a) =>
    a.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function addAthlete(id: string) {
    setRoster((prev) => [...prev, { athleteId: id, state: "pending" }]);
    setQuery("");
    setSearchOpen(false);
  }

  function removeAthlete(id: string) {
    setRoster((prev) => prev.filter((e) => e.athleteId !== id));
    setNoShow((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setRemoval(null);
  }

  function approve(id: string) {
    setRoster((prev) =>
      prev.map((e) =>
        e.athleteId === id ? { ...e, state: "confirmed" as BookingState } : e,
      ),
    );
  }

  /** R29 — flip an athlete's no-show flag (works on past sessions too). */
  function toggleNoShow(id: string) {
    setNoShow((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg">Attendees</h2>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          {rows.length} member{rows.length === 1 ? "" : "s"}
        </span>

        {/* S5: searchable add — type to filter, click a result to book.
            min-w-0 + basis-full below sm keeps it inside a 375px viewport. */}
        <div className="relative min-w-0 max-sm:basis-full">
          <label className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-input bg-surface px-2 focus-within:border-brand/50">
            <UserPlus
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
              placeholder="Add member — type to search"
              aria-label="Search members to add to this session"
              className="w-48 min-w-0 max-w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground max-sm:w-full"
            />
          </label>
          {searchOpen ? (
            <div className="absolute right-0 top-9 z-20 max-h-64 w-72 overflow-auto rounded-lg border border-border bg-card p-1 shadow-raised">
              {matches.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-muted-foreground">
                  {available.length === 0
                    ? "Everyone is already on this session."
                    : `No members match “${query}”`}
                </p>
              ) : (
                matches.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    // preventDefault keeps the input focused so blur doesn't
                    // close the list before the click lands.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addAthlete(a.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface"
                  >
                    <AthleteAvatar
                      initials={a.initials}
                      hue={a.hue}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">
                        {a.name}
                      </span>
                      <span className="block truncate text-[0.68rem] text-muted-foreground">
                        {a.focus} · {a.plan}
                      </span>
                    </span>
                    <Plus
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
          No members booked on this session yet — add one above.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ entry, athlete }) => (
            <RosterRow
              key={athlete.id}
              athlete={athlete}
              state={entry.state}
              noShow={noShow.has(athlete.id)}
              removalStep={removal?.id === athlete.id ? removal.step : 0}
              onApprove={() => approve(athlete.id)}
              onToggleNoShow={() => toggleNoShow(athlete.id)}
              onRemoveStart={() => setRemoval({ id: athlete.id, step: 1 })}
              onRemoveAdvance={() => setRemoval({ id: athlete.id, step: 2 })}
              onRemoveConfirm={() => removeAthlete(athlete.id)}
              onRemoveCancel={() => setRemoval(null)}
            />
          ))}
        </div>
      )}
      <p className="text-[0.7rem] text-muted-foreground">
        Added members land as pending — approve to confirm the spot. Changes
        update the capacity count and the Briefing. Saves locally in this
        demo.
      </p>
    </section>
  );
}

function RosterRow({
  athlete,
  state,
  noShow,
  removalStep,
  onApprove,
  onToggleNoShow,
  onRemoveStart,
  onRemoveAdvance,
  onRemoveConfirm,
  onRemoveCancel,
}: {
  athlete: RosterAthlete;
  state: BookingState;
  /** R29 — flagged as a no-show for this session. */
  noShow: boolean;
  /** 0 = not removing, 1 = first confirm, 2 = final confirm. */
  removalStep: 0 | 1 | 2;
  onApprove: () => void;
  onToggleNoShow: () => void;
  onRemoveStart: () => void;
  onRemoveAdvance: () => void;
  onRemoveConfirm: () => void;
  onRemoveCancel: () => void;
}) {
  return (
    // flex-wrap: the action cluster drops below the identity on phones so a
    // row's min-content never exceeds a 375px viewport (R10 mobile pass).
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-soft">
      <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="md" />
      <div className="min-w-0 flex-1">
        {/* Line 1 — name + the flags that matter on the floor */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold">{athlete.name}</span>
          {athlete.billingState === "overdue" ? (
            <Pill tone="danger">Payment overdue</Pill>
          ) : athlete.billingState === "pending" ? (
            <Pill tone="warning">Payment pending</Pill>
          ) : null}
          {athlete.injuryFlags.length > 0 ? (
            <Pill
              tone="warning"
              icon={<AlertTriangle className="h-3 w-3" />}
              className="max-w-[220px]"
            >
              <span className="truncate">{athlete.injuryFlags[0]}</span>
            </Pill>
          ) : null}
        </div>
        {/* Line 2 — focus (season right beside it) · age · sex · plan */}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {athlete.focus} · {athlete.season} · {athlete.age} · {athlete.sex} ·{" "}
          {athlete.plan}
        </p>
      </div>

      {removalStep > 0 ? (
        // S5: two distinct confirmations before the booking is dropped.
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <span className="max-w-[240px] text-right text-xs font-medium text-destructive">
            {removalStep === 1
              ? `Remove ${athlete.name} from this session?`
              : "Are you sure? Their spot will be released."}
          </span>
          <button
            type="button"
            onClick={removalStep === 1 ? onRemoveAdvance : onRemoveConfirm}
            className="flex h-7 items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            {removalStep === 1 ? "Remove" : "Yes, remove"}
          </button>
          <button
            type="button"
            onClick={onRemoveCancel}
            className="flex h-7 items-center rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {noShow ? (
            // R29 — the no-show flag outranks the booking state on the row.
            <Pill tone="danger" dot>
              No-show
            </Pill>
          ) : state === "pending" ? (
            <>
              <Pill tone="warning" dot>
                Pending
              </Pill>
              <button
                type="button"
                onClick={onApprove}
                className="flex h-7 items-center gap-1 rounded-md border border-success/40 bg-success/10 px-2 text-xs font-semibold text-success transition-colors hover:bg-success/20"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
            </>
          ) : state === "waitlisted" ? (
            <Pill tone="info">Waitlisted</Pill>
          ) : (
            <Pill tone="success" dot>
              Confirmed
            </Pill>
          )}
          {/* R29 — toggle a no-show; matters most on past sessions. */}
          <button
            type="button"
            onClick={onToggleNoShow}
            aria-pressed={noShow}
            title={
              noShow
                ? `Clear ${athlete.name}'s no-show`
                : `Mark ${athlete.name} as a no-show`
            }
            className={
              noShow
                ? "flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface"
                : "flex h-7 items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
            }
          >
            <UserX className="h-3.5 w-3.5" />
            {noShow ? "Clear no-show" : "No-show"}
          </button>
          <button
            type="button"
            onClick={onRemoveStart}
            aria-label={`Remove ${athlete.name} from this session`}
            title="Remove from session"
            className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
