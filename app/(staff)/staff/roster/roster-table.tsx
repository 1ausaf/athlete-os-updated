"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LiveRosterRow } from "@/lib/data/members";
import { cn } from "@/lib/utils";

type TypeFilter = "all" | "At LPS" | "Remote";
type SortKey = "name" | "age";

/** Read-only table over the real imported roster. */
export function RosterTable({ rows }: { rows: LiveRosterRow[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const counts = useMemo(
    () => ({
      total: rows.length,
      atLps: rows.filter((r) => r.membershipType === "At LPS").length,
      remote: rows.filter((r) => r.membershipType === "Remote").length,
      minors: rows.filter((r) => r.isMinor).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const dir = sortDir === "asc" ? 1 : -1;
    return rows
      .filter((r) => {
        if (typeFilter !== "all" && r.membershipType !== typeFilter) return false;
        if (!q) return true;
        return [r.name, r.focus, r.plan, r.groupName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "age") cmp = (a.age ?? 999) - (b.age ?? 999);
        else cmp = a.name.localeCompare(b.name);
        return cmp !== 0 ? dir * cmp : a.name.localeCompare(b.name);
      });
  }, [rows, query, typeFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, sport, plan, group"
            className="h-9 w-64 pl-8"
            aria-label="Search the live roster"
          />
        </div>
        <select
          value={typeFilter}
          aria-label="Filter by membership type"
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
        >
          <option value="all">All types</option>
          <option value="At LPS">At LPS</option>
          <option value="Remote">Remote</option>
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Pill tone="brand" dot>
            {counts.total} members
          </Pill>
          <Pill tone="neutral">{counts.atLps} at LPS</Pill>
          <Pill tone="neutral">{counts.remote} remote</Pill>
          <Pill tone="neutral">{counts.minors} minors</Pill>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <SortableHead
                label="Member"
                sortKey="name"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableHead
                label="Age"
                sortKey="age"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <TableHead className="hidden md:table-cell">Sex</TableHead>
              <TableHead>Focus</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Plan</TableHead>
              <TableHead className="hidden lg:table-cell">Group</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.name}
                  {r.isMinor ? (
                    <span className="ml-2 align-middle font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                      minor
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="tnum text-sm text-muted-foreground">
                  {r.age ?? (r.dobRaw ? "2 DOBs" : "—")}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {r.sex ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{r.focus ?? "—"}</TableCell>
                <TableCell>
                  <Pill tone={r.membershipType === "Remote" ? "info" : "neutral"} dot>
                    {r.membershipType ?? "—"}
                  </Pill>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {r.plan ?? "—"}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {r.groupName ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  No members match.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Imported from the club spreadsheet — {counts.total} members, read-only.
        Rows marked &quot;2 DOBs&quot; came from a spreadsheet cell holding two
        birthdates and are preserved for cleanup. Logins, profiles and parent
        accounts are created in the next phase.
      </p>
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = current === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead>
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
