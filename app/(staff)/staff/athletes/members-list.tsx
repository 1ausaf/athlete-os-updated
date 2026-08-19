"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Filter,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
 * Round-8 members list: one table for EVERY member — individuals AND groups.
 * Groups render as "Group: {name}" rows that count as ONE toward the tab
 * totals; their linked members are hidden from the top level and managed by
 * clicking into the group (round 11, C1 — no nested member rows). Status
 * tabs live in the URL (C8), the coach filters are labeled Program / Manage
 * (C3), and the add buttons are admin-only links to the onboarding pages
 * (C4/C10).
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
/** C6 — All / Individual / Groups. */
type TypeFilter = "all" | "individual" | "groups";
/** M2 — "All Coaches" | "My Members" | a specific staff id, per coach role. */
type CoachFilter = "all" | "mine" | (string & {});

/** M3 — Last Comment aging: >7 days amber, >14 days red. */
const NOTE_WARN_DAYS = 7;
const NOTE_DANGER_DAYS = 14;

/** C11 — the filter panel shows FULL focus names, no abbreviations. */
const FOCUS_FULL_NAME: Record<string, string> = {
  "Olympic WL": "Olympic Weightlifting",
};

function focusDisplay(s: string): string {
  return FOCUS_FULL_NAME[s] ?? s;
}

/** A top-level list row is either an ungrouped member or a group (C9). */
type Row =
  | { kind: "athlete"; a: Athlete }
  | { kind: "group"; g: TrainingGroup };

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

/* --- sort accessors across the mixed member/group rows (one shape) --- */
const rowName = (r: Row) =>
  r.kind === "athlete" ? r.a.name : `Group: ${r.g.name}`;
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
  admin,
  initialStatus,
}: {
  athletes: Athlete[];
  viewerStaffId: string;
  /** C4/C10/C11/C15 — add buttons + filter management are admin-only. */
  admin: boolean;
  /** C8 — seeded from ?status= so tab links are shareable. */
  initialStatus: AthleteStatus;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [list, setList] = useState<Athlete[]>(athletes);
  const [tab, setTab] = useState<AthleteStatus>(initialStatus);
  const [query, setQuery] = useState("");
  // C3 — one dropdown per coach role: Program + Manage
  const [progFilter, setProgFilter] = useState<CoachFilter>("all");
  const [mgmtFilter, setMgmtFilter] = useState<CoachFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sportChecks, setSportChecks] = useState<Set<string>>(new Set());
  const [bucketChecks, setBucketChecks] = useState<Set<MemberBucket>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Round 11 (M1): Back/Forward must restore the tab — pushes alone desync
  // when the component stays mounted, so the tab derives from the URL.
  useEffect(() => {
    const s = searchParams.get("status");
    setTab(
      STATUS_TABS.includes(s as AthleteStatus) ? (s as AthleteStatus) : "active",
    );
  }, [searchParams]);

  const focusOptions = useMemo(
    () => Array.from(new Set(list.map((a) => a.sport))).sort(),
    [list],
  );
  const coaches = staffMembers
    .filter((s) => s.role === "coach" || s.role === "coach-manager")
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  /** Members matching every filter EXCEPT the status tab (drives the counts). */
  const baseAthletes = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = list;
    if (typeFilter === "groups") return [] as Athlete[];
    if (q) {
      out = out.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.sport.toLowerCase().includes(q) ||
          coachOf(a.id, "programming").toLowerCase().includes(q) ||
          coachOf(a.id, "management").toLowerCase().includes(q),
      );
    }
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

  /** Groups matching the filters — they live under the Active tab. */
  const baseGroups = useMemo(() => {
    if (typeFilter === "individual") return [] as TrainingGroup[];
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
          g.coachNames.join(" ").toLowerCase().includes(q) ||
          // C9 — searching a nested member keeps their group visible
          list.some(
            (a) =>
              g.memberAthleteIds.includes(a.id) &&
              a.name.toLowerCase().includes(q),
          ),
      );
    }
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
    if (bucketChecks.size > 0) {
      out = out.filter((g) => bucketChecks.has(g.bucket));
    }
    return out;
  }, [typeFilter, bucketChecks, query, progFilter, mgmtFilter, sportChecks, viewerStaffId, list]);

  /** C9/C1 — ids of members belonging to a VISIBLE group: they hide from the
   *  top-level list (manage them inside the group); a filtered-out group
   *  releases its members back to the top level so they never vanish. */
  const nestedIds = useMemo(() => {
    const s = new Set<string>();
    for (const g of baseGroups) for (const id of g.memberAthleteIds) s.add(id);
    return s;
  }, [baseGroups]);

  /** Bracketed tab counts — a group counts as ONE; nested members don't (C9). */
  const counts = useMemo(() => {
    const c: Record<AthleteStatus, number> = {
      active: baseGroups.length,
      paused: 0,
      inactive: 0,
    };
    for (const a of baseAthletes) {
      if (!nestedIds.has(a.id)) c[a.status] += 1;
    }
    return c;
  }, [baseAthletes, baseGroups, nestedIds]);

  /** Top-level rows only — grouped members are managed inside the group (C1). */
  const rows = useMemo(() => {
    const out: Row[] = baseAthletes
      .filter((a) => a.status === tab && !nestedIds.has(a.id))
      .map((a) => ({ kind: "athlete", a }) as Row);
    if (tab === "active") {
      for (const g of baseGroups) out.push({ kind: "group", g });
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
  }, [baseAthletes, baseGroups, nestedIds, tab, sortKey, sortDir]);

  /** C8 — tab changes write a unique, shareable URL; round 11 (M1): push a
   *  history entry (built off the current pathname) so Back walks tabs. */
  function selectTab(next: AthleteStatus) {
    if (next === tab) return;
    setTab(next);
    router.push(`${pathname}?status=${next}` as Route, { scroll: false });
  }

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

  const filterCount = sportChecks.size + bucketChecks.size;

  return (
    <div className="flex flex-col gap-4">
      {/* Status tabs — URL-backed (C8); add buttons admin-only (C4/C10) */}
      <TabBar
        tabs={STATUS_TABS.map((s) => ({
          value: s,
          label: statusLabel[s],
          count: counts[s],
        }))}
        active={tab}
        onSelect={selectTab}
        right={
          admin ? (
            <div className="flex items-center gap-1.5">
              <Button asChild variant="brand" size="sm">
                <Link href={"/staff/athletes/new" as Route}>
                  <Plus className="h-4 w-4" />
                  Add Member
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={"/staff/athletes/new-group" as Route}>
                  <Users className="h-4 w-4" />
                  Add Group
                </Link>
              </Button>
            </div>
          ) : undefined
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
        {/* C6 — All / Individual / Groups */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          aria-label="Filter by member type"
          className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm"
        >
          <option value="all">All</option>
          <option value="individual">Individual</option>
          <option value="groups">Groups</option>
        </select>
        {/* C3 — the coach-role dropdowns are labeled Program / Manage */}
        {(
          [
            {
              label: "Program",
              value: progFilter,
              set: setProgFilter,
            },
            {
              label: "Manage",
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
              aria-label={`Filter by ${label.toLowerCase()} coach`}
              className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm"
            >
              <option value="all">All Coaches</option>
              <option value="mine">My Members</option>
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
              {/* C11 — wide panel: Focus in 3 columns, Membership in 2 */}
              <div className="absolute left-0 top-full z-50 mt-1.5 w-[28rem] max-w-[calc(100vw-3rem)] rounded-xl border border-border bg-popover p-4 shadow-raised">
                <p className="eyebrow mb-1.5">Focus</p>
                <div className="grid grid-cols-2 gap-x-2 sm:grid-cols-3">
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
                      {focusDisplay(s)}
                    </label>
                  ))}
                </div>
                <p className="eyebrow mb-1.5 mt-3">Membership</p>
                <div className="grid grid-cols-2 gap-x-2">
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
                {/* C11 — option lists are curated by admins */}
                <p className="mt-3 border-t border-border/60 pt-2 text-[0.7rem] text-muted-foreground">
                  Filters are managed by admins.
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* The list — every column sortable; groups are single rows that open
          the group profile where members are managed (C1) */}
      <div className="overflow-x-auto rounded-xl border border-border scrollbar-slim">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              {/* Round 13 (S1): the name column stays put while the table
                  scrolls sideways on phones — opaque bg so rows slide under */}
              <SortHeader
                label="Member"
                active={sortKey === "name"}
                dir={sortDir}
                onClick={() => toggleSort("name")}
                className="max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:bg-muted"
              />
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
                <GroupRow
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
          ? "Click a member to open their full profile — groups open the group profile with members and contacts."
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
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th
      className={cn("px-3 py-2.5", className)}
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
function LastNoteCell({ days, isGroup }: { days: number; isGroup?: boolean }) {
  return (
    <td className="tnum px-3 py-2.5">
      {days >= 999 ? (
        isGroup ? (
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
  // R17 — members with current limitations get an amber accent so coaches
  // spot return-to-play state at a glance.
  const limited = Boolean(athlete.currentLimitations);

  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/40"
    >
      {/* Round 13 (S1): sticky name cell on phones; avatar + plan line are
          desktop-only so the column stays narrow */}
      <td
        className={cn(
          "px-3 py-2.5 max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:bg-background",
          limited && "border-l-2 border-l-warning",
        )}
      >
        <span className="flex items-center gap-2.5">
          <AthleteAvatar
            initials={athlete.initials}
            hue={athlete.hue}
            size="sm"
            className="hidden sm:inline-flex"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-semibold">
              {athlete.name}
              {limited ? (
                <span
                  title="Limited — see return-to-play notes"
                  aria-label="Limited — see return-to-play notes"
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                />
              ) : null}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
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

/** A group row (C5/C1) — same columns as a member row: "Group: {name}", plus
 *  Type, Program/Manage coaches and the Due chip. Clicking opens the group
 *  profile, where members are managed. */
function GroupRow({
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
      {/* Round 13 (S1): same sticky/mobile treatment as member rows */}
      <td className="px-3 py-2.5 max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:bg-background">
        <span className="flex items-center gap-2.5">
          <AthleteAvatar
            initials={group.initials}
            hue={group.hue}
            size="sm"
            className="hidden sm:inline-flex"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-semibold">
              Group: {group.name}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
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
      {/* Round 11 (C1): no member expander — a placeholder cell keeps the
          Last Comment column aligned; members are managed inside the group */}
      <td className="px-3 py-2.5">
        <span className="text-xs text-muted-foreground">—</span>
      </td>
    </tr>
  );
}
