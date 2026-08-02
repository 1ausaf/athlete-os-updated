"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Filter,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { TabBar } from "@/components/app/tab-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  bucketLabel,
  daysSinceLastNote,
  fmtDay,
  statusLabel,
  type Athlete,
  type AthleteStatus,
  type MemberBucket,
} from "@/lib/demo/data";
import {
  assignmentsForAthlete,
  staffMembers,
} from "@/lib/demo/staff";
import {
  trainingGroups,
  type TrainingGroup,
} from "@/lib/demo/training";
import { cn } from "@/lib/utils";

import { programDueMeta } from "./program-due";

/**
 * Round-6 members list: one table for EVERY client — athletes AND teams in
 * the SAME row shape (M1: "Team: {name}" rows carry Type, Program/Manage
 * coaches, Due and Focus like anyone). Two coach dropdowns filter by role
 * (M2), and the "Last Comment" column colors stale rows amber then red (M3).
 * Column order (M6): Client, Focus, Age, Sex, Type, Program, Due, Manage,
 * Last Comment.
 */

const STATUS_TABS: AthleteStatus[] = ["active", "paused", "inactive"];

const STATUS_TONE: Record<AthleteStatus, "success" | "info" | "warning" | "neutral"> = {
  active: "success",
  paused: "warning",
  inactive: "neutral",
};

type SortKey =
  | "name"
  | "focus"
  | "age"
  | "sex"
  | "programming"
  | "management"
  | "membership"
  | "due"
  | "lastNote";
type SortDir = "asc" | "desc";
type TypeFilter = "all" | "athletes" | "teams";
/** M2 — "All Coaches" | "My Clients" | a specific staff id, per coach role. */
type CoachFilter = "all" | "mine" | (string & {});

/** M3 — Last Comment aging: >7 days amber, >14 days red. */
const NOTE_WARN_DAYS = 7;
const NOTE_DANGER_DAYS = 14;

/** A list row is either an athlete or a training team (C13/C15). */
type Row =
  | { kind: "athlete"; a: Athlete }
  | { kind: "team"; g: TrainingGroup };

function roleStaffId(
  athleteId: string,
  role: "programming" | "management",
): string | undefined {
  return assignmentsForAthlete(athleteId).find((a) => a.role === role)?.staffId;
}

function coachOf(athleteId: string, role: "programming" | "management"): string {
  const id = roleStaffId(athleteId, role);
  return staffMembers.find((s) => s.id === id)?.name ?? "—";
}

/** Resolve a coach-filter value to the staff member's display name (M2). */
function filterStaffName(
  v: CoachFilter,
  viewerStaffId: string,
): string | undefined {
  return staffMembers.find((s) => s.id === (v === "mine" ? viewerStaffId : v))
    ?.name;
}

/** Sort value for the Due column: program runway or the follow-up date. */
function dueValue(a: Athlete): number {
  if (a.status === "active") return a.programDueInDays;
  if (a.followUpDate) {
    return Math.round(
      (new Date(a.followUpDate).getTime() - Date.now()) / 86_400_000,
    );
  }
  return 9999;
}

/* --- sort accessors across the mixed athlete/team rows (M1: one shape) --- */
const rowName = (r: Row) =>
  r.kind === "athlete" ? r.a.name : `Team: ${r.g.name}`;
const rowFocus = (r: Row) => (r.kind === "athlete" ? r.a.sport : r.g.focus);
const rowAge = (r: Row) => (r.kind === "athlete" ? r.a.age : -1);
const rowSex = (r: Row) => (r.kind === "athlete" ? r.a.gender : "~");
const rowProgramming = (r: Row) =>
  r.kind === "athlete"
    ? coachOf(r.a.id, "programming")
    : r.g.programmingCoach;
const rowManagement = (r: Row) =>
  r.kind === "athlete" ? coachOf(r.a.id, "management") : r.g.managementCoach;
const rowMembership = (r: Row) =>
  bucketLabel[r.kind === "athlete" ? r.a.bucket : r.g.bucket];
const rowDue = (r: Row) =>
  r.kind === "athlete" ? dueValue(r.a) : r.g.programDueInDays;
const rowLastNote = (r: Row) =>
  r.kind === "athlete" ? daysSinceLastNote(r.a) : 9999;

export function MembersList({
  athletes,
  viewerStaffId,
}: {
  athletes: Athlete[];
  viewerStaffId: string;
}) {
  const router = useRouter();
  const [list, setList] = useState<Athlete[]>(athletes);
  const [tab, setTab] = useState<AthleteStatus>("active");
  const [query, setQuery] = useState("");
  // M2 — one dropdown per coach role
  const [progFilter, setProgFilter] = useState<CoachFilter>("all");
  const [mgmtFilter, setMgmtFilter] = useState<CoachFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sportChecks, setSportChecks] = useState<Set<string>>(new Set());
  const [bucketChecks, setBucketChecks] = useState<Set<MemberBucket>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [adding, setAdding] = useState(false);

  const focusOptions = useMemo(
    () => Array.from(new Set(list.map((a) => a.sport))).sort(),
    [list],
  );
  const coaches = staffMembers
    .filter((s) => s.role === "coach" || s.role === "coach-manager")
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  /** Athletes matching every filter EXCEPT the status tab (drives CM9 counts). */
  const baseAthletes = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = list;
    if (typeFilter === "teams") return [] as Athlete[];
    if (q) {
      out = out.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.sport.toLowerCase().includes(q) ||
          coachOf(a.id, "programming").toLowerCase().includes(q) ||
          coachOf(a.id, "management").toLowerCase().includes(q),
      );
    }
    // M2 — each dropdown filters its own coach role
    if (progFilter !== "all") {
      const staffId = progFilter === "mine" ? viewerStaffId : progFilter;
      out = out.filter((a) => roleStaffId(a.id, "programming") === staffId);
    }
    if (mgmtFilter !== "all") {
      const staffId = mgmtFilter === "mine" ? viewerStaffId : mgmtFilter;
      out = out.filter((a) => roleStaffId(a.id, "management") === staffId);
    }
    if (sportChecks.size > 0) {
      out = out.filter((a) => sportChecks.has(a.sport));
    }
    if (bucketChecks.size > 0) {
      out = out.filter((a) => bucketChecks.has(a.bucket));
    }
    return out;
  }, [list, typeFilter, query, progFilter, mgmtFilter, sportChecks, bucketChecks, viewerStaffId]);

  /** Teams matching the filters — they live under the Active tab (C13/M1). */
  const baseTeams = useMemo(() => {
    if (typeFilter === "athletes") return [] as TrainingGroup[];
    const q = query.trim().toLowerCase();
    let out = trainingGroups;
    if (q) {
      out = out.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.focus.toLowerCase().includes(q) ||
          g.program.toLowerCase().includes(q) ||
          g.programmingCoach.toLowerCase().includes(q) ||
          g.managementCoach.toLowerCase().includes(q) ||
          g.coachNames.join(" ").toLowerCase().includes(q),
      );
    }
    // M2 — teams match by their Program / Manage coach names
    if (progFilter !== "all") {
      const name = filterStaffName(progFilter, viewerStaffId);
      out = out.filter((g) => g.programmingCoach === name);
    }
    if (mgmtFilter !== "all") {
      const name = filterStaffName(mgmtFilter, viewerStaffId);
      out = out.filter((g) => g.managementCoach === name);
    }
    if (sportChecks.size > 0) {
      out = out.filter((g) =>
        [...sportChecks].some((s) =>
          g.focus.toLowerCase().includes(s.toLowerCase()),
        ),
      );
    }
    // M1 — teams carry a membership Type now, so the bucket filter applies
    if (bucketChecks.size > 0) {
      out = out.filter((g) => bucketChecks.has(g.bucket));
    }
    return out;
  }, [typeFilter, bucketChecks, query, progFilter, mgmtFilter, sportChecks, viewerStaffId]);

  /** CM9 — bracketed tab counts that react to search + filters. */
  const counts = useMemo(() => {
    const c: Record<AthleteStatus, number> = {
      active: baseTeams.length,
      paused: 0,
      inactive: 0,
    };
    for (const a of baseAthletes) c[a.status] += 1;
    return c;
  }, [baseAthletes, baseTeams]);

  const rows = useMemo(() => {
    const out: Row[] = baseAthletes
      .filter((a) => a.status === tab)
      .map((a) => ({ kind: "athlete", a }) as Row);
    if (tab === "active") {
      for (const g of baseTeams) out.push({ kind: "team", g });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((x, y) => {
      switch (sortKey) {
        case "name":
          return dir * rowName(x).localeCompare(rowName(y));
        case "focus":
          return dir * rowFocus(x).localeCompare(rowFocus(y));
        case "age":
          return dir * (rowAge(x) - rowAge(y));
        case "sex":
          return dir * rowSex(x).localeCompare(rowSex(y));
        case "programming":
          return dir * rowProgramming(x).localeCompare(rowProgramming(y));
        case "management":
          return dir * rowManagement(x).localeCompare(rowManagement(y));
        case "membership":
          return dir * rowMembership(x).localeCompare(rowMembership(y));
        case "due":
          return dir * (rowDue(x) - rowDue(y));
        case "lastNote":
          return dir * (rowLastNote(x) - rowLastNote(y));
      }
    });
    return out;
  }, [baseAthletes, baseTeams, tab, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleCheck<T>(set: Set<T>, value: T, apply: (next: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }

  /** Inactive members can be removed entirely (client: "completely removes"). */
  function deleteAthlete(id: string) {
    setList((prev) => prev.filter((a) => a.id !== id));
  }

  function addAthlete(name: string, sport: string, yob: number) {
    const id = `ath-new-${Date.now()}`;
    const initials = name
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const member: Athlete = {
      id,
      slug: id,
      name,
      initials: initials || "??",
      hue: (name.length * 47) % 360,
      sport: sport || "General",
      age: Math.max(0, new Date().getFullYear() - yob),
      isMinor: new Date().getFullYear() - yob < 18,
      yearOfBirth: yob,
      gender: "M",
      bucket: "in-gym",
      status: "active",
      programDueInDays: 14,
      nutrition: "none",
      coach: "Unassigned",
      planName: "Onboarding",
      frequency: "—",
      frequencyPerWeek: 0,
      bookedThisWeek: 0,
      billing: { state: "pending", amountDueCents: 0, nextInvoice: new Date().toISOString() },
      program: { name: "Onboarding", day: 0, totalDays: 0, phase: "Assessment", block: "—", compliancePct: 0 },
      attendancePct: 0,
      injuryFlags: [],
      season: "off-season",
      reminders: ["New client — run the onboarding checklist"],
      guardians: [],
      lastActive: new Date().toISOString(),
      notes: [],
      prs: [],
    };
    setList((prev) => [member, ...prev]);
    setAdding(false);
  }

  const filterCount = sportChecks.size + bucketChecks.size;

  return (
    <div className="flex flex-col gap-4">
      {/* Status tabs — shared line style (CM2) with reactive counts (CM9) */}
      <TabBar
        tabs={STATUS_TABS.map((s) => ({
          value: s,
          label: statusLabel[s],
          count: counts[s],
        }))}
        active={tab}
        onSelect={setTab}
        right={
          <Button variant="brand" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        }
      />

      {/* Search + filters */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            placeholder="Search name, focus, or coach…"
            className="border-border/60 bg-surface pl-8"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          aria-label="Filter by client type"
          className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm"
        >
          <option value="all">All clients</option>
          <option value="athletes">Athletes</option>
          <option value="teams">Teams</option>
        </select>
        {/* M2 — one dropdown per coach role: Programming + Management */}
        {(
          [
            {
              label: "Programming Coach",
              value: progFilter,
              set: setProgFilter,
            },
            {
              label: "Management Coach",
              value: mgmtFilter,
              set: setMgmtFilter,
            },
          ] as const
        ).map(({ label, value, set }) => (
          <label key={label} className="grid gap-0.5">
            <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <select
              value={value}
              onChange={(e) => set(e.target.value)}
              aria-label={`Filter by ${label.toLowerCase()}`}
              className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm"
            >
              <option value="all">All Coaches</option>
              <option value="mine">My Clients</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <div className="relative">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-md border border-input bg-surface px-2.5 text-sm font-medium transition-colors",
              filterCount > 0
                ? "border-brand/40 text-brand-ink"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {filterCount > 0 ? (
              <span className="tnum rounded-full bg-brand/10 px-1.5 text-[0.65rem] font-bold text-brand-ink">
                {filterCount}
              </span>
            ) : null}
          </button>
          {filtersOpen ? (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={() => setFiltersOpen(false)}
              />
              <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-border bg-popover p-3 shadow-raised">
                <p className="eyebrow mb-1.5">Focus</p>
                <div className="grid grid-cols-2 gap-x-2">
                  {focusOptions.map((s) => (
                    <label
                      key={s}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={sportChecks.has(s)}
                        onChange={() =>
                          toggleCheck(sportChecks, s, setSportChecks)
                        }
                        className="h-3.5 w-3.5 accent-[hsl(var(--brand))]"
                      />
                      {s}
                    </label>
                  ))}
                </div>
                <p className="eyebrow mb-1.5 mt-3">Membership</p>
                <div className="flex flex-col">
                  {(Object.keys(bucketLabel) as MemberBucket[]).map((b) => (
                    <label
                      key={b}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={bucketChecks.has(b)}
                        onChange={() =>
                          toggleCheck(bucketChecks, b, setBucketChecks)
                        }
                        className="h-3.5 w-3.5 accent-[hsl(var(--brand))]"
                      />
                      {bucketLabel[b]}
                    </label>
                  ))}
                </div>
                {filterCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSportChecks(new Set());
                      setBucketChecks(new Set());
                    }}
                    className="mt-2 text-xs font-medium text-brand-ink underline-offset-2 hover:underline"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Add-client inline form */}
      {adding ? (
        <AddMemberForm
          focusOptions={focusOptions}
          onAdd={addAthlete}
          onCancel={() => setAdding(false)}
        />
      ) : null}

      {/* The list — every column sortable (CM3) */}
      <div className="overflow-x-auto rounded-xl border border-border scrollbar-slim">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              {/* M5/M6 — renamed + reordered: … Type, Program, Due, Manage, Last Comment */}
              <SortHeader label="Client" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <SortHeader label="Focus" active={sortKey === "focus"} dir={sortDir} onClick={() => toggleSort("focus")} />
              <SortHeader label="Age" active={sortKey === "age"} dir={sortDir} onClick={() => toggleSort("age")} />
              <SortHeader label="Sex" active={sortKey === "sex"} dir={sortDir} onClick={() => toggleSort("sex")} />
              <SortHeader label="Type" active={sortKey === "membership"} dir={sortDir} onClick={() => toggleSort("membership")} />
              <SortHeader label="Program" active={sortKey === "programming"} dir={sortDir} onClick={() => toggleSort("programming")} />
              <SortHeader
                label={tab === "active" ? "Due" : "Follow up"}
                active={sortKey === "due"}
                dir={sortDir}
                onClick={() => toggleSort("due")}
              />
              <SortHeader label="Manage" active={sortKey === "management"} dir={sortDir} onClick={() => toggleSort("management")} />
              <SortHeader
                label="Last Comment"
                active={sortKey === "lastNote"}
                dir={sortDir}
                onClick={() => toggleSort("lastNote")}
              />
              {tab === "inactive" ? (
                <th className="w-10 px-3 py-2.5" aria-label="Actions" />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.kind === "athlete" ? (
                <MemberRow
                  key={row.a.id}
                  athlete={row.a}
                  tab={tab}
                  onOpen={() =>
                    router.push(`/staff/athletes/${row.a.id}` as Route)
                  }
                  onDelete={() => deleteAthlete(row.a.id)}
                />
              ) : (
                <TeamRow
                  key={row.g.id}
                  group={row.g}
                  onOpen={() =>
                    router.push(`/staff/teams/${row.g.id}` as Route)
                  }
                />
              ),
            )}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  No {statusLabel[tab].toLowerCase()} members
                  {query ||
                  filterCount > 0 ||
                  progFilter !== "all" ||
                  mgmtFilter !== "all" ||
                  typeFilter !== "all"
                    ? " match the filters."
                    : "."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Status semantics helper line */}
      <p className="text-xs text-muted-foreground text-pretty">
        {tab === "active"
          ? "Click a client to open their full profile — teams open the team profile with roster and contacts."
          : tab === "paused"
            ? "Paused members keep their login — no programs run. The follow-up date is the retention call that brings them back."
            : "Inactive accounts are disabled (no login) but the record is kept. Delete only when it should be gone for good."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th
      className="px-3 py-2.5"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wide transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  );
}

/** "Last Comment" cell — days since the last coach note. M3: >7 days amber,
 *  >14 days red, same urgency ramp as the due-now chip. */
function LastNoteCell({ days, isTeam }: { days: number; isTeam?: boolean }) {
  return (
    <td className="tnum px-3 py-2.5">
      {days >= 999 ? (
        isTeam ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          // Never commented is worse than 14 days — same red as due-now (M3).
          <span
            className="text-xs font-semibold text-destructive"
            title="No comment on file yet"
          >
            Never
          </span>
        )
      ) : (
        <span
          className={cn(
            days > NOTE_DANGER_DAYS
              ? "font-semibold text-destructive"
              : days > NOTE_WARN_DAYS && "font-semibold text-warning",
          )}
          title={
            days > NOTE_DANGER_DAYS
              ? "No comment in over 14 days"
              : days > NOTE_WARN_DAYS
                ? "No comment in over 7 days"
                : undefined
          }
        >
          {days}d
        </span>
      )}
    </td>
  );
}

function MemberRow({
  athlete,
  tab,
  onOpen,
  onDelete,
}: {
  athlete: Athlete;
  tab: AthleteStatus;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const due = programDueMeta(athlete.programDueInDays);

  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/40"
    >
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-2.5">
          <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-semibold">
              {athlete.name}
            </span>
            <span className="block text-xs text-muted-foreground">
              {athlete.planName}
            </span>
          </span>
        </span>
      </td>
      <td className="px-3 py-2.5">{athlete.sport}</td>
      <td className="tnum px-3 py-2.5">{athlete.age}</td>
      <td className="px-3 py-2.5">{athlete.gender}</td>
      <td className="px-3 py-2.5">
        <Pill tone="neutral">{bucketLabel[athlete.bucket]}</Pill>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {coachOf(athlete.id, "programming")}
      </td>
      <td className="px-3 py-2.5">
        {tab === "active" ? (
          <Pill tone={due.tone} dot>
            {athlete.programDueInDays <= 0
              ? "Due NOW"
              : `${athlete.programDueInDays}d`}
          </Pill>
        ) : athlete.followUpDate ? (
          <Pill tone={STATUS_TONE[athlete.status]} icon={<CalendarClock className="h-3 w-3" />}>
            {fmtDay(athlete.followUpDate)}
          </Pill>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {coachOf(athlete.id, "management")}
      </td>
      <LastNoteCell days={daysSinceLastNote(athlete)} />
      {tab === "inactive" ? (
        <td className="px-3 py-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete ${athlete.name}'s record entirely? This can't be undone.`)) {
                onDelete();
              }
            }}
            title="Delete this record entirely"
            aria-label={`Delete ${athlete.name}`}
            className="rounded p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      ) : null}
    </tr>
  );
}

/** A team-as-client row (M1) — the SAME columns as an athlete row: name shows
 *  "Team: {name}", plus Type, Program/Manage coaches and the Due chip. */
function TeamRow({
  group,
  onOpen,
}: {
  group: TrainingGroup;
  onOpen: () => void;
}) {
  const due = programDueMeta(group.programDueInDays);

  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/40"
    >
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-2.5">
          <AthleteAvatar initials={group.initials} hue={group.hue} size="sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-semibold">
              Team: {group.name}
            </span>
            <span className="block text-xs text-muted-foreground">
              {group.planName}
            </span>
          </span>
        </span>
      </td>
      <td className="px-3 py-2.5">{group.focus}</td>
      <td className="px-3 py-2.5 text-muted-foreground">—</td>
      <td className="px-3 py-2.5 text-muted-foreground">—</td>
      <td className="px-3 py-2.5">
        <Pill tone="neutral">{bucketLabel[group.bucket]}</Pill>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {group.programmingCoach}
      </td>
      <td className="px-3 py-2.5">
        <Pill tone={due.tone} dot>
          {group.programDueInDays <= 0
            ? "Due NOW"
            : `${group.programDueInDays}d`}
        </Pill>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {group.managementCoach}
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-muted-foreground">—</span>
      </td>
    </tr>
  );
}

const ADD_NEW = "__add-new__";

function AddMemberForm({
  focusOptions,
  onAdd,
  onCancel,
}: {
  focusOptions: string[];
  onAdd: (name: string, sport: string, yob: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [yob, setYob] = useState("");
  const canAdd = name.trim().length > 1;
  const resolvedFocus = focus === ADD_NEW ? customFocus.trim() : focus;

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-brand/30 bg-brand/[0.03] p-3">
      <div className="grid gap-1">
        <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
          Full name
        </span>
        <Input
          autoFocus
          value={name}
          className="h-9 w-52"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
          Focus
        </span>
        {/* C5: pick from existing values — no free-text typos */}
        <select
          value={focus}
          aria-label="Focus"
          onChange={(e) => setFocus(e.target.value)}
          className="h-9 w-40 rounded-md border border-input bg-surface px-2 text-sm"
        >
          <option value="">Select focus…</option>
          {focusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={ADD_NEW}>+ Add new…</option>
        </select>
      </div>
      {focus === ADD_NEW ? (
        <div className="grid gap-1">
          <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
            New focus
          </span>
          <Input
            value={customFocus}
            placeholder="e.g. Weight loss"
            className="h-9 w-36"
            onChange={(e) => setCustomFocus(e.target.value)}
          />
        </div>
      ) : null}
      <div className="grid gap-1">
        <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
          Year of birth
        </span>
        <Input
          value={yob}
          inputMode="numeric"
          className="h-9 w-24"
          onChange={(e) => setYob(e.target.value)}
        />
      </div>
      <Button
        variant="brand"
        size="sm"
        disabled={!canAdd}
        onClick={() =>
          onAdd(name.trim(), resolvedFocus, Number(yob) || new Date().getFullYear() - 16)
        }
      >
        Add Member
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <span className="ml-auto text-xs text-muted-foreground">
        New members land in Active, ready for onboarding.
      </span>
    </div>
  );
}
