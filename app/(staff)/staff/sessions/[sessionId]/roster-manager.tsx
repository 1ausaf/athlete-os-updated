"use client";

import { useState } from "react";
import { AlertTriangle, Check, UserPlus, X } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Pill } from "@/components/ui/pill";
import type { BookingState } from "@/lib/demo/data";

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

/**
 * Round 5 (C33): coaches add + remove clients on a session directly —
 * additions land as pending until approved. Rows are streamlined to two
 * lines; only the flags that change coaching (payment, injury) survive.
 */
export function RosterManager({
  initialRoster,
  pool,
}: {
  initialRoster: Entry[];
  pool: RosterAthlete[];
}) {
  const [roster, setRoster] = useState<Entry[]>(initialRoster);

  const byId = new Map(pool.map((a) => [a.id, a]));
  const rows = roster
    .map((e) => ({ entry: e, athlete: byId.get(e.athleteId) }))
    .filter((r): r is { entry: Entry; athlete: RosterAthlete } =>
      Boolean(r.athlete),
    );

  const available = pool
    .filter((a) => !roster.some((e) => e.athleteId === a.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  function addAthlete(id: string) {
    setRoster((prev) => [...prev, { athleteId: id, state: "pending" }]);
  }

  function removeAthlete(id: string) {
    setRoster((prev) => prev.filter((e) => e.athleteId !== id));
  }

  function approve(id: string) {
    setRoster((prev) =>
      prev.map((e) =>
        e.athleteId === id ? { ...e, state: "confirmed" as BookingState } : e,
      ),
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg">Roster</h2>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          {rows.length} client{rows.length === 1 ? "" : "s"}
        </span>
        {/* Add client → lands as pending until approved */}
        <label className="flex items-center gap-1.5">
          <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden />
          <select
            value=""
            aria-label="Add a client to this session"
            onChange={(e) => {
              if (e.target.value) addAthlete(e.target.value);
            }}
            className="h-8 rounded-md border border-input bg-surface px-2 text-xs font-medium"
          >
            <option value="">Add client…</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
          No clients booked on this session yet — add one above.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ entry, athlete }) => (
            <RosterRow
              key={athlete.id}
              athlete={athlete}
              state={entry.state}
              onApprove={() => approve(athlete.id)}
              onRemove={() => removeAthlete(athlete.id)}
            />
          ))}
        </div>
      )}
      <p className="text-[0.7rem] text-muted-foreground">
        Added clients land as pending — approve to confirm the spot. Saves
        locally in this demo.
      </p>
    </section>
  );
}

function RosterRow({
  athlete,
  state,
  onApprove,
  onRemove,
}: {
  athlete: RosterAthlete;
  state: BookingState;
  onApprove: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-soft">
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
      <div className="flex shrink-0 items-center gap-1.5">
        {state === "pending" ? (
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
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${athlete.name} from this session`}
          title="Remove from session"
          className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
