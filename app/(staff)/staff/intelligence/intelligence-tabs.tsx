"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
} from "lucide-react";

import { TabBar } from "@/components/app/tab-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { relTime, threads } from "@/lib/demo/data";
import {
  assignedStaffIds,
  staffById,
  staffMembers,
} from "@/lib/demo/staff";
import { overdueTaskCounts, TASKS_EVENT } from "@/lib/demo/tasks";
import { cn } from "@/lib/utils";

export type IntelligenceTab = "members" | "staff";

/** Serializable retention row prepared server-side (coach assignments). */
export interface MemberIntelRow {
  id: string;
  name: string;
  programCoach: string;
  managementCoach: string;
  attendancePct: number;
  /** % of booked sessions whose training log was actually filled in. */
  logRatePct: number;
  /** ISO timestamp of the member's last activity. */
  lastLogin: string;
}

/** Round 19: per-coach workload row for the owner's Staff tab. */
export interface StaffIntelRow {
  id: string;
  name: string;
  title: string;
  /** Members this coach programs for / how many of those programs are past due. */
  programCount: number;
  programOverdue: number;
  manageCount: number;
  licensesExpired: boolean;
}

/**
 * Last-login resolved from THIS bundle's seed copy, so the hours were
 * generated in the same timezone they're formatted in — the stamp reads
 * right on server and client alike. "" = never logged in.
 */
function lastLoginOf(staffId: string): string {
  return staffById(staffId)?.lastLogin ?? "";
}

type MemberSortKey = "attendance" | "logRate" | "lastLogin";
type StaffSortKey =
  | "name"
  | "program"
  | "manage"
  | "chat"
  | "tasks"
  | "licenses"
  | "lastLogin";

/** Round 18 (D14): risk ramp — <60 red, 60–79 amber, 80+ calm. */
function pctClass(v: number): string {
  return v < 60
    ? "font-semibold text-destructive"
    : v < 80
      ? "font-semibold text-warning"
      : "text-muted-foreground";
}

/** Seed data occasionally stamps activity slightly ahead of "now". */
function loginLabel(iso: string): string {
  return new Date(iso).getTime() > Date.now() ? "Today" : relTime(iso);
}

/** Staff column shows a real date/time stamp, per the owner's spec. */
function loginStamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

/**
 * Round 19: unread messages per staff member, over the threads they're in.
 * Involvement = staff listed as participants plus every coach assigned to an
 * athlete in the thread; broadcasts reach the whole staff. Honors the inbox
 * read-overrides so "Mark all as read" zeroes the column too.
 */
function chatUnreadCounts(
  overrides: Record<string, "read" | "unread">,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of threads) {
    // Same semantics as the inbox: "unread" re-flags a fully-read thread.
    const unread =
      overrides[t.id] === "read"
        ? 0
        : overrides[t.id] === "unread"
          ? Math.max(1, t.unread)
          : t.unread;
    if (unread === 0) continue;
    const involved = new Set<string>();
    if (t.kind === "broadcast") {
      for (const s of staffMembers) involved.add(s.id);
    } else {
      for (const p of t.participants) {
        if (staffById(p.id)) involved.add(p.id);
        if (p.role === "athlete" && p.id !== "all") {
          for (const id of assignedStaffIds(p.id)) involved.add(id);
        }
      }
    }
    for (const id of involved) counts[id] = (counts[id] ?? 0) + unread;
  }
  return counts;
}

/**
 * Round 19: Compliance became INTELLIGENCE. Members ranks every active
 * athlete by attendance / log rate / last login with program- and
 * management-coach filters; the owner/admin Staff tab ranks coach workload
 * (programming + management load, unread chats, overdue tasks, licenses,
 * last sign-in). Coaches get the Members view only — no tabs.
 */
export function IntelligenceTabs({
  rows,
  staffRows,
  admin,
  initialTab,
}: {
  rows: MemberIntelRow[];
  /** Empty for non-admins — the Staff tab is owner/admin only. */
  staffRows: StaffIntelRow[];
  admin: boolean;
  /** Seeded from ?tab= so tab links are shareable. */
  initialTab: IntelligenceTab;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<IntelligenceTab>(initialTab);
  // Ascending surfaces the at-risk members first, so it's the default.
  const [sortKey, setSortKey] = useState<MemberSortKey>("attendance");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // Round 19: coach filters — "" = all.
  const [programFilter, setProgramFilter] = useState("");
  const [managementFilter, setManagementFilter] = useState("");
  const [staffKey, setStaffKey] = useState<StaffSortKey>("name");
  const [staffDir, setStaffDir] = useState<"asc" | "desc">("asc");

  // Back/Forward must restore the tab — it derives from the URL.
  useEffect(() => {
    const t = searchParams.get("tab");
    setTab(admin && t === "staff" ? "staff" : "members");
  }, [searchParams, admin]);

  function selectTab(next: IntelligenceTab) {
    if (next === tab) return;
    setTab(next);
    router.push(`${pathname}?tab=${next}` as Route, { scroll: false });
  }

  function toggleSort(key: MemberSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleStaffSort(key: StaffSortKey) {
    if (key === staffKey) {
      setStaffDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setStaffKey(key);
      setStaffDir("asc");
    }
  }

  // Distinct coach names actually present, for the filter dropdowns.
  const programCoaches = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.programCoach)))
        .filter((n) => n !== "—")
        .sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const managementCoaches = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.managementCoach)))
        .filter((n) => n !== "—")
        .sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return rows
      .filter(
        (r) =>
          (programFilter === "" || r.programCoach === programFilter) &&
          (managementFilter === "" || r.managementCoach === managementFilter),
      )
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "attendance") cmp = a.attendancePct - b.attendancePct;
        else if (sortKey === "logRate") cmp = a.logRatePct - b.logRatePct;
        else cmp = a.lastLogin.localeCompare(b.lastLogin);
        return cmp !== 0 ? dir * cmp : a.name.localeCompare(b.name);
      });
  }, [rows, sortKey, sortDir, programFilter, managementFilter]);

  // Live columns — unread chats + overdue tasks live in this browser's
  // localStorage, so they layer in post-mount (house pattern).
  const [chatCounts, setChatCounts] = useState<Record<string, number>>(() =>
    chatUnreadCounts({}),
  );
  useEffect(() => {
    const recount = () => {
      try {
        const overrides = JSON.parse(
          window.localStorage.getItem("lps-staff-messaging-read") ?? "{}",
        ) as Record<string, "read" | "unread">;
        setChatCounts(chatUnreadCounts(overrides));
      } catch {
        setChatCounts(chatUnreadCounts({}));
      }
    };
    recount();
    window.addEventListener("aos-staff-read-changed", recount);
    return () => window.removeEventListener("aos-staff-read-changed", recount);
  }, []);

  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const recount = () => setTaskCounts(overdueTaskCounts());
    recount();
    window.addEventListener(TASKS_EVENT, recount);
    return () => window.removeEventListener(TASKS_EVENT, recount);
  }, []);

  const staffSorted = useMemo(() => {
    const dir = staffDir === "asc" ? 1 : -1;
    const val = (r: StaffIntelRow): number | string => {
      switch (staffKey) {
        case "program":
          return r.programCount;
        case "manage":
          return r.manageCount;
        case "chat":
          return chatCounts[r.id] ?? 0;
        case "tasks":
          return taskCounts[r.id] ?? 0;
        case "licenses":
          return r.licensesExpired ? 1 : 0;
        case "lastLogin":
          return lastLoginOf(r.id);
        default:
          return r.name;
      }
    };
    return [...staffRows].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return cmp !== 0 ? dir * cmp : a.name.localeCompare(b.name);
    });
  }, [staffRows, staffKey, staffDir, chatCounts, taskCounts]);

  // Staff-records summary (C23) — detail lives on the Team page.
  const staffCerts = staffMembers.flatMap((s) => s.certifications);
  const certsExpiring = staffCerts.filter(
    (c) => c.status === "expiring",
  ).length;
  const certsExpired = staffCerts.filter((c) => c.status === "expired").length;
  const vsChecksDue = staffMembers.filter(
    (s) => s.vulnerableSector.status === "due",
  ).length;

  const membersBlock = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={programFilter}
          aria-label="Filter by program coach"
          onChange={(e) => setProgramFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
        >
          <option value="">All Program Coaches</option>
          {programCoaches.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          value={managementFilter}
          aria-label="Filter by management coach"
          onChange={(e) => setManagementFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
        >
          <option value="">All Management Coaches</option>
          {managementCoaches.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          Booked vs attended vs logged — spot who&apos;s slipping before they
          churn.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Member</TableHead>
              <TableHead className="hidden md:table-cell">
                Program Coach
              </TableHead>
              <TableHead className="hidden md:table-cell">
                Management Coach
              </TableHead>
              <SortableHead
                label="Attendance %"
                sortKey="attendance"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableHead
                label="Log rate %"
                sortKey="logRate"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableHead
                label="Last login"
                sortKey="lastLogin"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow
                key={r.id}
                onClick={() =>
                  router.push(`/staff/athletes/${r.id}` as Route)
                }
                className="cursor-pointer transition-colors hover:bg-surface/60"
              >
                <TableCell className="font-medium">
                  <Link
                    href={`/staff/athletes/${r.id}` as Route}
                    onClick={(e) => e.stopPropagation()}
                    className="underline-offset-4 hover:underline"
                  >
                    {r.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {r.programCoach}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {r.managementCoach}
                </TableCell>
                <TableCell
                  className={cn("tnum text-sm", pctClass(r.attendancePct))}
                >
                  {r.attendancePct}%
                </TableCell>
                <TableCell
                  className={cn("tnum text-sm", pctClass(r.logRatePct))}
                >
                  {r.logRatePct}%
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {loginLabel(r.lastLogin)}
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  No members match these filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Click a member to open their full profile. Percentages under 60 read
        red, 60–79 amber — sort ascending to stack the at-risk on top.
      </p>
    </div>
  );

  const staffBlock = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Workload across the coaching staff — programming load, unread chats,
        overdue tasks and records at a glance.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <SortableHead
                label="Staff"
                sortKey="name"
                current={staffKey}
                dir={staffDir}
                onSort={toggleStaffSort}
              />
              <SortableHead
                label="Program"
                sortKey="program"
                current={staffKey}
                dir={staffDir}
                onSort={toggleStaffSort}
              />
              <SortableHead
                label="Manage"
                sortKey="manage"
                current={staffKey}
                dir={staffDir}
                onSort={toggleStaffSort}
              />
              <SortableHead
                label="Chat"
                sortKey="chat"
                current={staffKey}
                dir={staffDir}
                onSort={toggleStaffSort}
              />
              <SortableHead
                label="Tasks"
                sortKey="tasks"
                current={staffKey}
                dir={staffDir}
                onSort={toggleStaffSort}
              />
              <SortableHead
                label="Licenses Expired"
                sortKey="licenses"
                current={staffKey}
                dir={staffDir}
                onSort={toggleStaffSort}
                className="hidden md:table-cell"
              />
              <SortableHead
                label="Last Logged In"
                sortKey="lastLogin"
                current={staffKey}
                dir={staffDir}
                onSort={toggleStaffSort}
                className="hidden md:table-cell"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffSorted.map((r) => {
              const chat = chatCounts[r.id] ?? 0;
              const tasks = taskCounts[r.id] ?? 0;
              const login = lastLoginOf(r.id);
              return (
                <TableRow
                  key={r.id}
                  onClick={() => router.push("/staff/team" as Route)}
                  className="cursor-pointer transition-colors hover:bg-surface/60"
                >
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.title}
                    </div>
                  </TableCell>
                  <TableCell className="tnum whitespace-nowrap text-sm">
                    {r.programCount}
                    {r.programOverdue > 0 ? (
                      <span className="font-semibold text-destructive">
                        {" "}
                        ({r.programOverdue} Overdue)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="tnum text-sm">
                    {r.manageCount}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "tnum text-sm",
                      chat === 0 && "text-muted-foreground",
                    )}
                  >
                    {chat}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "tnum text-sm",
                      tasks > 0
                        ? "font-semibold text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {tasks}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "hidden text-sm md:table-cell",
                      r.licensesExpired
                        ? "font-semibold text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {r.licensesExpired ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                    {login === "" ? (
                      "Never"
                    ) : (
                      <time dateTime={login} suppressHydrationWarning>
                        {loginStamp(login)}
                      </time>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Program counts the members each coach writes programs for — red when
        one of those programs is past due. Chat and Tasks are live: unread
        messages in threads they&apos;re in, and overdue open tasks. Click a
        row to manage the person in Team.
      </p>

      {/* Staff records — the summary card keeps its home under this tab. */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg">Staff records</h2>
              <p className="text-sm text-muted-foreground">
                Certifications and vulnerable-sector checks across the coaching
                staff.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <Pill tone={certsExpiring > 0 ? "warning" : "success"} dot>
              {certsExpiring} certification{certsExpiring === 1 ? "" : "s"}{" "}
              expiring
            </Pill>
            {certsExpired > 0 ? (
              <Pill tone="danger" dot>
                {certsExpired} expired
              </Pill>
            ) : null}
            <Pill tone={vsChecksDue > 0 ? "danger" : "success"} dot>
              {vsChecksDue} vulnerable-sector check
              {vsChecksDue === 1 ? "" : "s"} due
            </Pill>
            {admin ? (
              <Button asChild variant="outline" size="sm" className="ml-1">
                <Link href={"/staff/team" as Route}>
                  Manage in Team
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {admin ? (
        <TabBar
          tabs={[
            {
              value: "members" as const,
              label: "Members",
              count: rows.length,
            },
            {
              value: "staff" as const,
              label: "Staff",
              count: staffRows.length,
            },
          ]}
          active={tab}
          onSelect={selectTab}
        />
      ) : null}

      {!admin || tab === "members" ? membersBlock : staffBlock}
    </div>
  );
}

function SortableHead<K extends string>({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: K;
  current: K;
  dir: "asc" | "desc";
  onSort: (key: K) => void;
  className?: string;
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
          "inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-foreground",
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
