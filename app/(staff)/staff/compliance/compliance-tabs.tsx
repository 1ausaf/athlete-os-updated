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
import { relTime } from "@/lib/demo/data";
import { staffMembers } from "@/lib/demo/staff";
import { cn } from "@/lib/utils";

export type ComplianceTab = "members" | "staff";

/** Serializable retention row prepared server-side (coach assignments). */
export interface MemberComplianceRow {
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

type SortKey = "attendance" | "logRate" | "lastLogin";

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

/**
 * Round 18 (D14): Compliance as the retention tool — a Members tab ranking
 * ACTIVE athletes by attendance / log rate / last login (ascending puts the
 * at-risk first), plus a Staff tab holding the records summary that used to
 * sit mid-page. Tab state is URL-backed (?tab=staff), house convention.
 */
export function ComplianceTabs({
  rows,
  admin,
  initialTab,
}: {
  rows: MemberComplianceRow[];
  /** "Manage in Team" is admin-only, same as before the redesign. */
  admin: boolean;
  /** Seeded from ?tab= so tab links are shareable. */
  initialTab: ComplianceTab;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ComplianceTab>(initialTab);
  // Ascending surfaces the at-risk members first, so it's the default.
  const [sortKey, setSortKey] = useState<SortKey>("attendance");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Back/Forward must restore the tab — it derives from the URL.
  useEffect(() => {
    const t = searchParams.get("tab");
    setTab(t === "staff" ? "staff" : "members");
  }, [searchParams]);

  function selectTab(next: ComplianceTab) {
    if (next === tab) return;
    setTab(next);
    router.push(`${pathname}?tab=${next}` as Route, { scroll: false });
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "attendance") cmp = a.attendancePct - b.attendancePct;
      else if (sortKey === "logRate") cmp = a.logRatePct - b.logRatePct;
      else cmp = a.lastLogin.localeCompare(b.lastLogin);
      return cmp !== 0 ? dir * cmp : a.name.localeCompare(b.name);
    });
  }, [rows, sortKey, sortDir]);

  // Staff-records summary (C23) — detail lives on the Team page.
  const staffCerts = staffMembers.flatMap((s) => s.certifications);
  const certsExpiring = staffCerts.filter(
    (c) => c.status === "expiring",
  ).length;
  const certsExpired = staffCerts.filter((c) => c.status === "expired").length;
  const vsChecksDue = staffMembers.filter(
    (s) => s.vulnerableSector.status === "due",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <TabBar
        tabs={[
          { value: "members" as const, label: "Members", count: rows.length },
          {
            value: "staff" as const,
            label: "Staff",
            count: staffMembers.length,
          },
        ]}
        active={tab}
        onSelect={selectTab}
      />

      {tab === "members" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Booked vs attended vs logged — spot who&apos;s slipping before they
            churn.
          </p>

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
                      No active members.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Click a member to open their full profile. Percentages under 60
            read red, 60–79 amber — sort ascending to stack the at-risk on
            top.
          </p>
        </div>
      ) : (
        /* Staff records — moved under the tab; detail lives on the Team page */
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
                <BadgeCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg">Staff records</h2>
                <p className="text-sm text-muted-foreground">
                  Certifications and vulnerable-sector checks across the
                  coaching staff.
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
      )}
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
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
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
