"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Filter,
  Mail,
  MailWarning,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  bucketLabel,
  fmtDay,
  statusLabel,
  type Athlete,
  type AthleteStatus,
  type MemberBucket,
} from "@/lib/demo/data";
import {
  assignmentsForAthlete,
  athleteIdsForStaff,
  staffMembers,
} from "@/lib/demo/staff";
import { cn } from "@/lib/utils";

import { programDueMeta } from "./program-due";

/**
 * Round-4 members list — the client slept on the Trello board and killed it:
 * "you don't need the boards… more like the client queue". One table, status
 * tabs (Active / Away / Paused / Inactive), search + coach + checkbox filters,
 * sortable columns, and rows that go STRAIGHT into the full client profile —
 * no card modal in between.
 */

const STATUS_TABS: AthleteStatus[] = ["active", "away", "paused", "inactive"];

const STATUS_TONE: Record<AthleteStatus, "success" | "info" | "warning" | "neutral"> = {
  active: "success",
  away: "info",
  paused: "warning",
  inactive: "neutral",
};

type SortKey = "name" | "sport" | "age" | "due";
type SortDir = "asc" | "desc";

function daysSinceLastNote(a: Athlete): number {
  const last = a.notes[0]?.date;
  if (!last) return 999;
  return Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
}

const STALE_DAYS = 14;

function coachOf(athleteId: string, role: "programming" | "management"): string {
  const id = assignmentsForAthlete(athleteId).find((a) => a.role === role)?.staffId;
  return staffMembers.find((s) => s.id === id)?.name ?? "—";
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
  const [coachFilter, setCoachFilter] = useState<string>("all");
  const [sportChecks, setSportChecks] = useState<Set<string>>(new Set());
  const [bucketChecks, setBucketChecks] = useState<Set<MemberBucket>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [digestOpen, setDigestOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const sports = useMemo(
    () => Array.from(new Set(list.map((a) => a.sport))).sort(),
    [list],
  );
  const coaches = staffMembers.filter((s) => s.role === "coach");

  const counts = useMemo(() => {
    const c: Record<AthleteStatus, number> = {
      active: 0,
      away: 0,
      paused: 0,
      inactive: 0,
    };
    for (const a of list) c[a.status] += 1;
    return c;
  }, [list]);

  const stale = useMemo(
    () =>
      list.filter(
        (a) => a.status === "active" && daysSinceLastNote(a) >= STALE_DAYS,
      ),
    [list],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = list.filter((a) => a.status === tab);
    if (q) {
      out = out.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.sport.toLowerCase().includes(q) ||
          coachOf(a.id, "programming").toLowerCase().includes(q) ||
          coachOf(a.id, "management").toLowerCase().includes(q),
      );
    }
    if (coachFilter !== "all") {
      const staffId = coachFilter === "mine" ? viewerStaffId : coachFilter;
      const ids = athleteIdsForStaff(staffId);
      out = out.filter((a) => ids.has(a.id));
    }
    if (sportChecks.size > 0) {
      out = out.filter((a) => sportChecks.has(a.sport));
    }
    if (bucketChecks.size > 0) {
      out = out.filter((a) => bucketChecks.has(a.bucket));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    out = out.slice().sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "sport":
          return dir * a.sport.localeCompare(b.sport);
        case "age":
          return dir * (a.age - b.age);
        case "due":
          return dir * (dueValue(a) - dueValue(b));
      }
    });
    return out;
  }, [list, tab, query, coachFilter, sportChecks, bucketChecks, sortKey, sortDir, viewerStaffId]);

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
      reminders: ["New member — run the onboarding checklist"],
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
      {/* Status tabs — the client-queue pattern the client asked for */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            aria-pressed={tab === s}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
              tab === s
                ? "border-brand text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {statusLabel[s]}
            <span
              className={cn(
                "tnum rounded-full px-1.5 text-[0.65rem] font-bold",
                tab === s
                  ? "bg-brand/10 text-brand-ink"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {counts[s]}
            </span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-1.5">
          {stale.length > 0 ? (
            <button
              type="button"
              onClick={() => setDigestOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2.5 text-xs font-medium text-warning transition-colors hover:bg-warning/15"
            >
              <MailWarning className="h-3.5 w-3.5" />
              {stale.length} need attention
            </button>
          ) : null}
          <Button variant="brand" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add member
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            placeholder="Search name, sport, or coach…"
            className="border-border/60 bg-surface pl-8"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={coachFilter}
          onChange={(e) => setCoachFilter(e.target.value)}
          aria-label="Filter by coach"
          className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm"
        >
          <option value="all">All coaches</option>
          <option value="mine">Only my athletes</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
                <p className="eyebrow mb-1.5">Sport</p>
                <div className="grid grid-cols-2 gap-x-2">
                  {sports.map((s) => (
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

      {/* Add-member inline form (O2 kept from the board) */}
      {adding ? (
        <AddMemberForm onAdd={addAthlete} onCancel={() => setAdding(false)} />
      ) : null}

      {/* The list — sortable like the exercise library */}
      <div className="overflow-x-auto rounded-xl border border-border scrollbar-slim">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <SortHeader label="Athlete" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <SortHeader label="Sport" active={sortKey === "sport"} dir={sortDir} onClick={() => toggleSort("sport")} />
              <SortHeader label="Age" active={sortKey === "age"} dir={sortDir} onClick={() => toggleSort("age")} />
              <th className="px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Gender
              </th>
              <th className="px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Programming coach
              </th>
              <th className="px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Management coach
              </th>
              <th className="px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Membership
              </th>
              <SortHeader
                label={tab === "active" ? "Program due" : "Follow up"}
                active={sortKey === "due"}
                dir={sortDir}
                onClick={() => toggleSort("due")}
              />
              {tab === "inactive" ? (
                <th className="w-10 px-3 py-2.5" aria-label="Actions" />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <MemberRow
                key={a.id}
                athlete={a}
                tab={tab}
                onOpen={() =>
                  router.push(`/staff/athletes/${a.id}` as Route)
                }
                onDelete={() => deleteAthlete(a.id)}
                stale={a.status === "active" && daysSinceLastNote(a) >= STALE_DAYS}
              />
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  No {statusLabel[tab].toLowerCase()} members
                  {query || filterCount > 0 || coachFilter !== "all"
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
          ? "Click a member to open their full profile — notes, checklists, program, billing, everything."
          : tab === "away"
            ? "Away members keep their login and profile — no programs run. The follow-up date is when to reach out for their return."
            : tab === "paused"
              ? "Paused memberships carry a follow-up due date — the retention call that brings them back."
              : "Inactive accounts are disabled (no login) but the record is kept. Delete only when it should be gone for good."}
      </p>

      {digestOpen ? (
        <DigestModal stale={stale} onClose={() => setDigestOpen(false)} />
      ) : null}
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

function MemberRow({
  athlete,
  tab,
  stale,
  onOpen,
  onDelete,
}: {
  athlete: Athlete;
  tab: AthleteStatus;
  stale: boolean;
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
              {athlete.isMinor ? <Pill tone="info">Minor</Pill> : null}
              {stale ? (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-warning"
                  title="No note in 14+ days"
                />
              ) : null}
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
      <td className="px-3 py-2.5 text-muted-foreground">
        {coachOf(athlete.id, "programming")}
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {coachOf(athlete.id, "management")}
      </td>
      <td className="px-3 py-2.5">
        <Pill tone="neutral">{bucketLabel[athlete.bucket]}</Pill>
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

function AddMemberForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, sport: string, yob: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [yob, setYob] = useState("");
  const canAdd = name.trim().length > 1;

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
          Sport
        </span>
        <Input
          value={sport}
          className="h-9 w-36"
          onChange={(e) => setSport(e.target.value)}
        />
      </div>
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
          onAdd(name.trim(), sport.trim(), Number(yob) || new Date().getFullYear() - 16)
        }
      >
        Add member
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <span className="ml-auto text-xs text-muted-foreground">
        New members land in Active with the onboarding checklist ready.
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inactivity digest — kept from the board (C3), active members only   */
/* ------------------------------------------------------------------ */

function DigestModal({
  stale,
  onClose,
}: {
  stale: Athlete[];
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm md:py-12"
      role="dialog"
      aria-modal="true"
      aria-label="Member inactivity report"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-raised"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border bg-surface/60 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  AOS Reports{" "}
                  <span className="font-normal text-muted-foreground">
                    &lt;reports@lpsathletic.com&gt;
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  to coaches · daily at 6:00 AM
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close report">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <h3 className="text-lg font-bold text-destructive">
            Member Inactivity Report
          </h3>
          <p className="text-sm text-muted-foreground">
            The following active members have not received a note in the last{" "}
            {STALE_DAYS} days.
          </p>
          <ul className="flex flex-col gap-1">
            {stale.map((a) => {
              const coaches = assignmentsForAthlete(a.id)
                .map((as) => staffMembers.find((s) => s.id === as.staffId)?.name)
                .filter(Boolean);
              return (
                <li key={a.id} className="text-sm">
                  <span className="font-semibold">
                    {a.name} [{a.sport}, {a.gender}, {a.yearOfBirth}]
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {coaches.length > 0 ? coaches.join(", ") : "Unassigned"} ·{" "}
                    {daysSinceLastNote(a)}d quiet
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">
            In production this digest emails every coach automatically — here
            it&apos;s simulated from the live member list.
          </p>
        </div>
      </div>
    </div>
  );
}
