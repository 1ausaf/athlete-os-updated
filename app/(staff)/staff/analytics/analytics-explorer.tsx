"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  Layers,
  LogIn,
  Search,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { BarSeries, Sparkline } from "@/components/app/mini-charts";
import { Progress } from "@/components/app/progress";
import { StatTile } from "@/components/app/stat-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { athletes, fmtDay, fmtFullDay, relTime, type Athlete } from "@/lib/demo/data";
import {
  athleteMaxes,
  complianceStats,
  liftHistory,
  prsByRepMax,
  trainingGroups,
  trainingSummaries,
  type LiftPoint,
  type ReferenceMaxEntry,
  type SessionSummary,
  type TrainingGroup,
} from "@/lib/demo/training";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

/** Sentinel for the "All lifts" combobox option (C36). */
const ALL_LIFTS = "__all-lifts__";

const shortDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/** Preset range chips (C21) — default is 1 month. */
const RANGE_PRESETS = [
  { key: "1w", label: "1w", days: 7 },
  { key: "1m", label: "1m", days: 30 },
  { key: "3m", label: "3m", days: 91 },
  { key: "6m", label: "6m", days: 182 },
  { key: "1y", label: "1y", days: 365 },
] as const;

type RangeKey = (typeof RANGE_PRESETS)[number]["key"] | "custom";

/** Athletes that actually have logged training data. */
const athletesWithData: Athlete[] = athletes.filter(
  (a) => (trainingSummaries[a.id] ?? []).length > 0,
);

function liftsFor(athleteId: string): string[] {
  return Object.keys(liftHistory[athleteId] ?? {});
}

/** Format a Date for an `<input type="date">` value (local, not UTC). */
function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Compact day distance for stat tiles: "Today", "Tomorrow", "In 2d", "3d ago". */
function compactDay(iso: string): string {
  const target = new Date(iso);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${diff}d`;
  if (diff === -1) return "Yesterday";
  return `${-diff}d ago`;
}

/**
 * Client-side analytics explorer (C21/C22, round-5 C36): pick a CLIENT —
 * an individual or a whole team — a lift (searchable, with "All lifts") and
 * a date range. Every panel follows the selection. Pure local state.
 */
export function AnalyticsExplorer() {
  const defaultAthleteId = athletesWithData[0]?.id ?? "";
  const [clientId, setClientId] = useState(defaultAthleteId);
  const [lift, setLift] = useState(liftsFor(defaultAthleteId)[0] ?? ALL_LIFTS);
  const [rangeKey, setRangeKey] = useState<RangeKey>("1m");
  const [fromInput, setFromInput] = useState(() =>
    toInputDate(new Date(Date.now() - 30 * DAY_MS)),
  );
  const [toInput, setToInput] = useState(() => toInputDate(new Date()));

  // Preset chips write the from–to inputs, so the effective range always
  // derives from the two dates — the inputs double as the range display.
  const { fromMs, toMs } = useMemo(() => {
    const from = new Date(`${fromInput}T00:00:00`).getTime();
    const to = new Date(`${toInput}T23:59:59`).getTime();
    if (Number.isNaN(from) || Number.isNaN(to)) {
      return { fromMs: Date.now() - 30 * DAY_MS, toMs: Date.now() };
    }
    return { fromMs: Math.min(from, to), toMs: Math.max(from, to) };
  }, [fromInput, toInput]);

  const team: TrainingGroup | undefined = trainingGroups.find(
    (g) => g.id === clientId,
  );
  const athlete = team
    ? undefined
    : athletesWithData.find((a) => a.id === clientId);
  const athleteId = athlete?.id ?? "";
  const lifts = athlete ? liftsFor(athlete.id) : [];
  const allLifts = lift === ALL_LIFTS;

  const allPoints: LiftPoint[] =
    athlete && !allLifts ? (liftHistory[athleteId]?.[lift] ?? []) : [];
  const points = allPoints.filter((p) => {
    const t = new Date(p.date).getTime();
    return t >= fromMs && t <= toMs;
  });
  const allSummaries: SessionSummary[] = athlete
    ? (trainingSummaries[athleteId] ?? [])
    : [];
  const summaries = allSummaries.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= fromMs && t <= toMs;
  });
  const stats = athlete ? complianceStats(athleteId, fromMs, toMs) : null;
  const rangeLabel = `${shortDay.format(fromMs)} – ${shortDay.format(toMs)}`;
  const loginLabel =
    stats && new Date(stats.lastLogin).getTime() > Date.now()
      ? "Today"
      : stats
        ? relTime(stats.lastLogin)
        : "";

  function handleClientChange(id: string) {
    setClientId(id);
    if (!trainingGroups.some((g) => g.id === id)) {
      setLift(liftsFor(id)[0] ?? ALL_LIFTS);
    }
  }

  function selectPreset(key: RangeKey, days: number) {
    setRangeKey(key);
    setFromInput(toInputDate(new Date(Date.now() - days * DAY_MS)));
    setToInput(toInputDate(new Date()));
  }

  /* -------------------------------------------------------------- */
  /* Panels (order changes when "All lifts" makes the summary the    */
  /* headline)                                                       */
  /* -------------------------------------------------------------- */

  const summaryCard = athlete ? (
    <Card key="summary">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg">Training summary</h2>
            <p className="text-sm text-muted-foreground">
              {athlete.name} — session-by-session totals over the selected
              range, including how long each one actually took. Click a column
              to sort.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allLifts ? (
              <Pill tone="brand" icon={<Layers className="h-3.5 w-3.5" />}>
                All lifts · headline
              </Pill>
            ) : (
              <Pill tone="brand" icon={<Timer className="h-3.5 w-3.5" />}>
                Duration tracked
              </Pill>
            )}
            <Pill tone="neutral">{rangeLabel}</Pill>
          </div>
        </div>
        {summaries.length > 0 ? (
          <TrainingSummary summaries={summaries} />
        ) : (
          <RangeEmpty
            what="logged sessions"
            hint={`${athlete.name} has ${allSummaries.length} sessions on file — widen the date range to see them.`}
          />
        )}
        <p className="text-xs text-muted-foreground">
          Duration is the column TrainHeroic never showed — LPS logs it
          automatically on every session.
        </p>
      </CardContent>
    </Card>
  ) : null;

  const e1rmCard = athlete ? (
    <Card key="e1rm">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg">Estimated 1RM</h2>
            <p className="text-sm text-muted-foreground">
              {athlete.name}
              {allLifts
                ? " · all lifts"
                : lift
                  ? ` · ${lift}`
                  : " · no tested lifts yet"}{" "}
              — tested sets in the selected range
            </p>
          </div>
          <Pill tone="neutral">{rangeLabel}</Pill>
        </div>
        {allLifts ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center">
            <p className="text-sm font-medium">All lifts selected</p>
            <p className="mx-auto max-w-sm text-xs text-muted-foreground">
              The e1RM curve tracks one lift at a time — the training summary
              above is the headline across every lift. Pick a single lift to
              chart its progression.
            </p>
          </div>
        ) : points.length > 0 ? (
          <LiftProgression
            points={points}
            testedMax={athleteMaxes[athleteId]?.[lift]}
          />
        ) : allPoints.length > 0 ? (
          <RangeEmpty
            what="tested sets"
            hint={`${athlete.name} has ${allPoints.length} tested ${lift} sets on file — widen the date range to see them.`}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <Dumbbell className="h-5 w-5 text-muted-foreground" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">No tested lifts yet</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                {athlete.name} hasn&apos;t logged a tested top set. Once
                testing week lands, the estimated-1RM curve builds itself.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  ) : null;

  const repMaxCard = athlete ? (
    <Card key="repmax">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg">PRs by rep-max</h2>
            <p className="text-sm text-muted-foreground">
              Best single, double, triple, 5 and 10-rep sets on record
              {allLifts ? " for every lift" : lift ? ` for ${lift}` : ""} —
              real dates, not &ldquo;30d ago&rdquo;.
            </p>
          </div>
          <Pill tone="brand" icon={<Trophy className="h-3.5 w-3.5" />}>
            All-time bests
          </Pill>
        </div>
        {allLifts ? (
          <div className="flex flex-col gap-4">
            {lifts.map((l) => (
              <div key={l} className="flex flex-col gap-2">
                <span className="text-sm font-semibold">{l}</span>
                <RepMaxGrid entries={prsByRepMax(l, athleteId)} />
              </div>
            ))}
          </div>
        ) : (
          <RepMaxGrid entries={lift ? prsByRepMax(lift, athleteId) : []} />
        )}
      </CardContent>
    </Card>
  ) : null;

  return (
    <section className="flex flex-col gap-4">
      {/* Controls: client + lift + date range (presets and custom from–to) */}
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="flex w-full flex-col gap-1.5 sm:w-56">
          <label className="text-xs font-medium text-muted-foreground">
            Client
          </label>
          <Select value={clientId} onValueChange={handleClientChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a client" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Athletes</SelectLabel>
                {athletesWithData.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Teams</SelectLabel>
                {trainingGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-64">
          <label className="text-xs font-medium text-muted-foreground">
            Lift
          </label>
          <LiftCombobox
            lifts={lifts}
            value={lift}
            onChange={setLift}
            disabled={Boolean(team)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Date range
          </label>
          {/* gap-4 — the client asked for extra room between the preset
              chips and the from–to inputs */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {RANGE_PRESETS.map(({ key, label, days }) => {
                const active = rangeKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectPreset(key, days)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand text-brand-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={fromInput}
                aria-label="Range start date"
                onChange={(e) => {
                  setFromInput(e.target.value);
                  setRangeKey("custom");
                }}
                className={cn(
                  "h-9 w-[8.75rem]",
                  rangeKey === "custom" && "border-brand/50",
                )}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={toInput}
                aria-label="Range end date"
                onChange={(e) => {
                  setToInput(e.target.value);
                  setRangeKey("custom");
                }}
                className={cn(
                  "h-9 w-[8.75rem]",
                  rangeKey === "custom" && "border-brand/50",
                )}
              />
            </div>
          </div>
        </div>
        {athlete ? (
          <Pill tone="neutral" className="mb-2 ml-auto hidden xl:inline-flex">
            {athlete.program.name} · Day {athlete.program.day}/
            {athlete.program.totalDays}
          </Pill>
        ) : null}
      </div>

      {team ? (
        <>
          <TeamViewCard team={team} rangeLabel={rangeLabel} />
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg">Estimated 1RM</h2>
                <Pill tone="info" icon={<Users className="h-3.5 w-3.5" />}>
                  Team view
                </Pill>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center">
                <p className="text-sm font-medium">
                  Pick an individual client for lift charts
                </p>
                <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                  Lift progressions, rep-max PRs and personal training
                  summaries are per-athlete — team members each log their own
                  numbers against the shared program.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : allLifts ? (
        <>
          {summaryCard}
          {e1rmCard}
          {repMaxCard}
        </>
      ) : (
        <>
          {e1rmCard}
          {repMaxCard}
          {summaryCard}
        </>
      )}

      {/* Compliance (C22): booking, fill-in, last scheduled, last login */}
      {athlete && stats ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <span className="eyebrow">Compliance</span>
              <h2 className="text-lg">Booking &amp; engagement — {athlete.name}</h2>
            </div>
            <Pill tone="neutral">{rangeLabel}</Pill>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Booking compliance"
              value={`${stats.bookingPct}%`}
              icon={CalendarCheck}
              accent
              hint={`${stats.bookedSessions} of ${stats.expectedSessions} expected sessions booked (${athlete.frequency})`}
            />
            <StatTile
              label="Last scheduled"
              value={stats.lastScheduled ? compactDay(stats.lastScheduled) : "None"}
              icon={CalendarClock}
              hint={
                stats.lastScheduled
                  ? fmtDay(stats.lastScheduled)
                  : "no session on the books"
              }
            />
            <StatTile
              label="Fill-in compliance"
              value={`${stats.fillPct}%`}
              icon={ClipboardCheck}
              hint="booked sessions with the log filled in"
            />
            <StatTile
              label="Last login"
              value={loginLabel}
              icon={LogIn}
              hint={fmtDay(stats.lastLogin)}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Lift combobox (C36) — searchable, with an "All lifts" option        */
/* ------------------------------------------------------------------ */

function LiftCombobox({
  lifts,
  value,
  onChange,
  disabled,
}: {
  lifts: string[];
  value: string;
  onChange: (lift: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  if (disabled) {
    return (
      <div className="flex h-9 w-full items-center rounded-md border border-input px-3 text-sm text-muted-foreground opacity-70">
        Team view — no single lift
      </div>
    );
  }

  const display = value === ALL_LIFTS ? "All lifts" : value || "";
  const q = query.trim().toLowerCase();
  const filtered = lifts.filter((l) => l.toLowerCase().includes(q));
  const showAllOption = q.length === 0 || "all lifts".includes(q);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={open ? query : display}
        placeholder="Search lifts…"
        aria-label="Search lifts"
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        className="h-9 pl-8 pr-8"
      />
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label="Lifts"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-raised"
          >
            {showAllOption ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === ALL_LIFTS}
                  onClick={() => pick(ALL_LIFTS)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent",
                    value === ALL_LIFTS && "font-semibold",
                  )}
                >
                  <Layers
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                  All lifts
                  <span className="ml-auto text-[0.65rem] text-muted-foreground">
                    summary headline
                  </span>
                </button>
              </li>
            ) : null}
            {filtered.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l === value}
                  onClick={() => pick(l)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent",
                    l === value && "font-semibold",
                  )}
                >
                  <Dumbbell
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                  {l}
                </button>
              </li>
            ))}
            {filtered.length === 0 && !showAllOption ? (
              <li className="px-2.5 py-2 text-xs text-muted-foreground">
                No lifts match &ldquo;{query}&rdquo;
              </li>
            ) : null}
            <li
              aria-hidden
              className="mt-1 border-t border-border px-2.5 py-1.5 text-[0.65rem] text-muted-foreground"
            >
              Type to search — the production library holds hundreds of lifts.
            </li>
          </ul>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team view (C36 — teams are clients too)                             */
/* ------------------------------------------------------------------ */

function TeamViewCard({
  team,
  rangeLabel,
}: {
  team: TrainingGroup;
  rangeLabel: string;
}) {
  const pct = Math.round((team.compliance.filled / team.compliance.total) * 100);
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg">{team.name}</h2>
            <p className="text-sm text-muted-foreground">
              {team.focus} · {team.program}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="info" icon={<Users className="h-3.5 w-3.5" />}>
              Team view
            </Pill>
            <Pill tone="neutral">{rangeLabel}</Pill>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface/50 p-4">
            <span className="eyebrow">Members</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="tnum font-display text-2xl font-extrabold tracking-tight">
                {team.athleteCount}
              </span>
              <span className="text-sm text-muted-foreground">athletes</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              each logs their own data on the shared program
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface/50 p-4">
            <span className="eyebrow">Group compliance</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="tnum font-display text-2xl font-extrabold tracking-tight">
                {pct}%
              </span>
              <span className="tnum text-sm text-muted-foreground">
                {team.compliance.filled}/{team.compliance.total} filled in
              </span>
            </div>
            <Progress
              value={pct}
              tone={pct >= 60 ? "brand" : "warning"}
              className="mt-2"
            />
          </div>
          <div className="rounded-lg border border-border bg-surface/50 p-4">
            <span className="eyebrow">Last session</span>
            <div className="mt-1.5 text-2xl font-extrabold tracking-tight">
              {relTime(team.lastSession)}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Coaches: {team.coachNames.join(", ")}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Team analytics roll up group compliance — pick an individual member
          from the Client selector for lift charts and personal summaries.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Shared empty state for range-filtered panels                        */
/* ------------------------------------------------------------------ */

function RangeEmpty({ what, hint }: { what: string; hint: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center">
      <p className="text-sm font-medium">No {what} in this range</p>
      <p className="mx-auto max-w-sm text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rep-max grid (shared by single-lift and all-lifts views)            */
/* ------------------------------------------------------------------ */

function RepMaxGrid({
  entries,
}: {
  entries: ReturnType<typeof prsByRepMax>;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-muted-foreground">
        No rep-max history yet — PRs derive automatically from logged tested
        sets.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {entries.map((r) => (
        <div
          key={r.reps}
          className="rounded-lg border border-border bg-surface/50 p-4"
        >
          <span className="eyebrow">{r.reps}-rep max</span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="tnum font-display text-2xl font-extrabold tracking-tight">
              {r.weight}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {r.unit} × {r.reps}
            </span>
          </div>
          <p className="tnum mt-1 text-xs text-muted-foreground">
            {fmtFullDay(r.date)}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lift progression panel body                                         */
/* ------------------------------------------------------------------ */

function LiftProgression({
  points,
  testedMax,
}: {
  points: LiftPoint[];
  testedMax?: ReferenceMaxEntry;
}) {
  const first = points[0];
  const last = points[points.length - 1];
  const best = points.reduce((m, p) => (p.e1rm > m.e1rm ? p : m), first);
  const delta = last.e1rm - first.e1rm;
  const spanWeeks = Math.max(
    1,
    Math.round(
      (new Date(last.date).getTime() - new Date(first.date).getTime()) /
        (7 * DAY_MS),
    ),
  );
  const unit = first.unit;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* Headline stat + trend */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface/50 p-4">
        <div>
          <span className="eyebrow">Current e1RM</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="tnum font-display text-3xl font-extrabold tracking-tight">
              {last.e1rm}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          </div>
          <p
            className={
              delta >= 0
                ? "mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success"
                : "mt-1 inline-flex items-center gap-1 text-xs font-semibold text-destructive"
            }
          >
            {delta >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" aria-hidden />
            )}
            {delta >= 0 ? "+" : ""}
            {delta} {unit} in {spanWeeks} week{spanWeeks === 1 ? "" : "s"}
          </p>
          {testedMax ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Tested max on file: {testedMax.value} {testedMax.unit}
            </p>
          ) : null}
        </div>
        <Sparkline data={points.map((p) => p.e1rm)} width={180} height={56} />
      </div>

      {/* Tested-set history */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Reps</TableHead>
              <TableHead className="text-right">Weight ({unit})</TableHead>
              <TableHead className="text-right">e1RM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...points].reverse().map((p) => (
              <TableRow key={p.date}>
                <TableCell className="text-muted-foreground">
                  {fmtDay(p.date)}
                </TableCell>
                <TableCell className="tnum text-right">{p.reps}</TableCell>
                <TableCell className="tnum text-right">{p.weight}</TableCell>
                <TableCell className="tnum text-right font-semibold">
                  <span className="inline-flex items-center gap-2">
                    {p === best ? <Pill tone="brand">peak</Pill> : null}
                    {p.e1rm}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Training summary panel body — sortable columns (C36)                */
/* ------------------------------------------------------------------ */

type SummarySortKey = "date" | "title" | "reps" | "volume" | "duration";

const SUMMARY_SORTERS: Record<
  SummarySortKey,
  (s: SessionSummary) => number | string
> = {
  date: (s) => new Date(s.date).getTime(),
  title: (s) => s.title.toLowerCase(),
  reps: (s) => s.reps,
  volume: (s) => s.volumeKg,
  duration: (s) => s.durationMin,
};

function TrainingSummary({ summaries }: { summaries: SessionSummary[] }) {
  const [sortKey, setSortKey] = useState<SummarySortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SummarySortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "title" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const sorter = SUMMARY_SORTERS[sortKey];
    const out = [...summaries].sort((a, b) => {
      const va = sorter(a);
      const vb = sorter(b);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [summaries, sortKey, sortDir]);

  // The volume chart wants oldest → newest regardless of table sort.
  const chrono = [...summaries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const totalReps = summaries.reduce((n, s) => n + s.reps, 0);
  const totalVolume = summaries.reduce((n, s) => n + s.volumeKg, 0);
  const avgDuration = summaries.length
    ? Math.round(
        summaries.reduce((n, s) => n + s.durationMin, 0) / summaries.length,
      )
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Volume per session */}
      <div className="rounded-lg border border-border bg-surface/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow">Volume per session (kg)</span>
          <span className="tnum text-xs text-muted-foreground">
            {chrono.length} sessions
          </span>
        </div>
        <BarSeries
          data={chrono.map((s) => s.volumeKg)}
          labels={
            chrono.length <= 14
              ? chrono.map((s) => shortDay.format(new Date(s.date)))
              : undefined
          }
          height={104}
        />
      </div>

      {/* Per-session table — click a header to sort */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <SortableHead
                label="Date"
                sortKey="date"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableHead
                label="Session"
                sortKey="title"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableHead
                label="Reps"
                sortKey="reps"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                className="hidden text-right sm:table-cell"
                align="right"
              />
              <SortableHead
                label="Volume (kg)"
                sortKey="volume"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                className="text-right"
                align="right"
              />
              <SortableHead
                label="Duration"
                sortKey="duration"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                className="text-right"
                align="right"
              />
              <TableHead className="hidden text-right sm:table-cell">
                Blocks
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s) => {
              const [done, prescribed] = s.blocksCompleted.split("/");
              const partial = done !== prescribed;
              return (
                <TableRow key={s.date}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {fmtDay(s.date)}
                  </TableCell>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="tnum hidden text-right sm:table-cell">{s.reps}</TableCell>
                  <TableCell className="tnum text-right font-semibold">
                    {s.volumeKg.toLocaleString("en-US")}
                  </TableCell>
                  <TableCell className="tnum whitespace-nowrap text-right">
                    {s.durationMin} min
                  </TableCell>
                  <TableCell
                    className={
                      partial
                        ? "tnum hidden text-right font-medium text-warning sm:table-cell"
                        : "tnum hidden text-right text-muted-foreground sm:table-cell"
                    }
                  >
                    {s.blocksCompleted}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-muted/50">
              <TableCell colSpan={2} className="text-xs text-muted-foreground">
                Totals · {summaries.length} sessions
              </TableCell>
              <TableCell className="tnum text-right">{totalReps}</TableCell>
              <TableCell className="tnum text-right">
                {totalVolume.toLocaleString("en-US")}
              </TableCell>
              <TableCell className="tnum whitespace-nowrap text-right">
                {avgDuration} min avg
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
  align,
}: {
  label: string;
  sortKey: SummarySortKey;
  current: SummarySortKey;
  dir: "asc" | "desc";
  onSort: (key: SummarySortKey) => void;
  className?: string;
  align?: "right";
}) {
  const active = current === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          align === "right" && "justify-end",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon
          className={cn(
            "h-3 w-3",
            active ? "text-brand-ink" : "text-muted-foreground/60",
          )}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}
