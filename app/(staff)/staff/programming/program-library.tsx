"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Globe,
  PencilLine,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, type PillTone } from "@/components/ui/pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { athletes } from "@/lib/demo/data";
import {
  LIBRARY_TOTALS,
  PROGRAM_CATEGORIES,
  programTemplates,
  trainingGroups,
  type ProgramTemplate,
} from "@/lib/demo/training";
import { cn } from "@/lib/utils";

import { ManageCategoriesMenu } from "./manage-categories";

const levelTone: Record<ProgramTemplate["level"], PillTone> = {
  Beginner: "info",
  Intermediate: "neutral",
  Advanced: "brand",
};

const LEVEL_ORDER: Record<ProgramTemplate["level"], number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

/* ---- column sorting (G3 — sortable headers like Members) ---- */

type ColumnKey = "name" | "category" | "level" | "weeks" | "edited";

interface ColumnSort {
  key: ColumnKey;
  dir: 1 | -1;
}

function lastEdited(tpl: ProgramTemplate): string {
  return tpl.lastModified ?? tpl.createdAt;
}

function compareByColumn(
  a: ProgramTemplate,
  b: ProgramTemplate,
  key: ColumnKey,
): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "category":
      return a.category.localeCompare(b.category);
    case "level":
      return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
    case "weeks":
      return a.weeks - b.weeks;
    case "edited":
      // Ascending = most recently edited first.
      return lastEdited(b).localeCompare(lastEdited(a));
  }
}

function sortRows(
  rows: ProgramTemplate[],
  sort: ColumnSort | null,
): ProgramTemplate[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const cmp = compareByColumn(a, b, sort.key) || a.name.localeCompare(b.name);
    return cmp * sort.dir;
  });
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** A client the coach can apply a program to — athlete or team (C24). */
interface ApplyTarget {
  id: string;
  name: string;
  kind: "athlete" | "team";
}

const APPLY_TARGETS: ApplyTarget[] = [
  ...athletes
    .filter((a) => a.status === "active")
    .map((a): ApplyTarget => ({ id: a.id, name: a.name, kind: "athlete" })),
  ...trainingGroups.map(
    (g): ApplyTarget => ({ id: g.id, name: g.name, kind: "team" }),
  ),
];

/**
 * G3 — the Program Library as a Members-style table: sortable Name /
 * Category / Level / Weeks / Edited columns, search, and managed categories
 * (add / rename / delete — renames update the rows using them). Every row
 * keeps its "Apply to client…" + Edit actions and links to the template
 * editor at its own URL.
 */
export function ProgramLibrary() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ProgramTemplate[]>(programTemplates);
  const [categories, setCategories] = useState<string[]>(() =>
    Array.from(
      new Set([...PROGRAM_CATEGORIES, ...programTemplates.map((t) => t.category)]),
    ).sort((a, b) => a.localeCompare(b)),
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ColumnSort | null>(null);
  const [creating, setCreating] = useState(false);
  const [applying, setApplying] = useState<{
    tpl: ProgramTemplate;
    target: ApplyTarget;
  } | null>(null);
  const [applied, setApplied] = useState<Record<string, string | undefined>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function say(message: string) {
    setFlash(message);
    timers.current.push(setTimeout(() => setFlash(null), 2600));
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? templates.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
            (t.labels ?? []).some((l) => l.toLowerCase().includes(q)),
        )
      : templates;
    return sortRows(list, sort);
  }, [templates, query, sort]);

  function toggleSort(key: ColumnKey) {
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === 1
          ? { key, dir: -1 }
          : null
        : { key, dir: 1 },
    );
  }

  /* ---- category management (G3) ---- */

  function addCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat)
        ? prev
        : [...prev, cat].sort((a, b) => a.localeCompare(b)),
    );
    say(`Category "${cat}" added.`);
  }

  function renameCategory(from: string, to: string) {
    setCategories((prev) =>
      Array.from(new Set(prev.map((c) => (c === from ? to : c)))).sort((a, b) =>
        a.localeCompare(b),
      ),
    );
    setTemplates((prev) =>
      prev.map((t) => (t.category === from ? { ...t, category: to } : t)),
    );
    say(`Category "${from}" renamed to "${to}" — programs updated.`);
  }

  function deleteCategory(cat: string) {
    setCategories((prev) => prev.filter((c) => c !== cat));
    setTemplates((prev) =>
      prev.map((t) =>
        t.category === cat ? { ...t, category: "Uncategorized" } : t,
      ),
    );
    say(`Category "${cat}" deleted — its programs are now Uncategorized.`);
  }

  function confirmApply(mode: "fresh" | "append") {
    if (!applying) return;
    const { tpl, target } = applying;
    setApplying(null);
    setApplied((prev) => ({
      ...prev,
      [tpl.id]: `${target.name}${mode === "append" ? " (appended)" : ""}`,
    }));
    timers.current.push(
      setTimeout(
        () => setApplied((prev) => ({ ...prev, [tpl.id]: undefined })),
        2600,
      ),
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tnum font-semibold text-foreground">
            {LIBRARY_TOTALS.programs}
          </span>{" "}
          programs in the library · showing {rows.length} masters — click one to
          edit it, or apply it to a client.
        </p>
        <span className="flex flex-wrap items-center gap-2">
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search programs…"
              className="h-8 w-44 pl-9 text-xs"
              aria-label="Search Program Library"
            />
          </span>
          <ManageCategoriesMenu
            categories={categories}
            usageCount={(cat) =>
              templates.filter((t) => t.category === cat).length
            }
            onAdd={addCategory}
            onRename={renameCategory}
            onDelete={deleteCategory}
          />
          <Button variant="brand" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New program
          </Button>
        </span>
      </div>

      {flash ? (
        <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success animate-fade-up">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {flash}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Name"
                  columnKey="name"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Category"
                  columnKey="category"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Level"
                  columnKey="level"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Weeks"
                  columnKey="weeks"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Edited"
                  columnKey="edited"
                  sort={sort}
                  onSort={toggleSort}
                />
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tpl) => {
                const editHref =
                  `/staff/programming/templates/${tpl.id}` as Route;
                return (
                  <TableRow key={tpl.id}>
                    <TableCell className="max-w-72">
                      <Link href={editHref} className="group block min-w-0">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <span className="truncate">{tpl.name}</span>
                          <PencilLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                          {tpl.remoteDays ? (
                            <Pill
                              tone="info"
                              icon={<Globe className="h-3 w-3" />}
                            >
                              {tpl.remoteDays}× remote/wk
                            </Pill>
                          ) : null}
                          {(tpl.labels ?? []).map((label) => (
                            <Pill key={label} tone="brand">
                              {label}
                            </Pill>
                          ))}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {tpl.category}
                    </TableCell>
                    <TableCell>
                      <Pill tone={levelTone[tpl.level]}>{tpl.level}</Pill>
                    </TableCell>
                    <TableCell className="tnum text-xs text-muted-foreground">
                      {tpl.weeks} wk × {tpl.daysPerWeek}d
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(lastEdited(tpl))}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center justify-end gap-1.5">
                        {applied[tpl.id] ? (
                          <Pill
                            tone="success"
                            icon={<CheckCircle2 className="h-3 w-3" />}
                          >
                            Applied to {applied[tpl.id]}
                          </Pill>
                        ) : (
                          <Select
                            value=""
                            onValueChange={(targetId) => {
                              const target = APPLY_TARGETS.find(
                                (t) => t.id === targetId,
                              );
                              if (target) setApplying({ tpl, target });
                            }}
                          >
                            <SelectTrigger
                              className="h-8 w-40 text-xs"
                              aria-label={`Apply ${tpl.name} to a client`}
                            >
                              <SelectValue placeholder="Apply to client…" />
                            </SelectTrigger>
                            <SelectContent>
                              {APPLY_TARGETS.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  <span className="flex items-center gap-1.5">
                                    {t.kind === "team" ? (
                                      <Users className="h-3 w-3 text-muted-foreground" />
                                    ) : null}
                                    {t.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-8">
                          <Link href={editHref}>Edit</Link>
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No programs match — clear the search.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* C24 — the confirm step IS the care */}
      {applying ? (
        <ApplyConfirmModal
          templateName={applying.tpl.name}
          target={applying.target}
          onCancel={() => setApplying(null)}
          onConfirm={confirmApply}
        />
      ) : null}

      {creating ? (
        <NewProgramModal
          onClose={() => setCreating(false)}
          onCreate={(name, weeks, days) => {
            setCreating(false);
            router.push(
              `/staff/programming/templates/new?name=${encodeURIComponent(
                name,
              )}&weeks=${weeks}&days=${days}` as Route,
            );
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sortable header cell — aria-sort like Members (G3)                  */
/* ------------------------------------------------------------------ */

function SortableHead({
  label,
  columnKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  columnKey: ColumnKey;
  sort: ColumnSort | null;
  onSort: (key: ColumnKey) => void;
  className?: string;
}) {
  const active = sort?.key === columnKey;
  const dir = active ? sort.dir : null;
  return (
    <TableHead
      className={className}
      aria-sort={dir === 1 ? "ascending" : dir === -1 ? "descending" : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        title={`Sort by ${label.toLowerCase()}`}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <span aria-hidden className="text-[0.6rem] leading-none">
          {dir === 1 ? "▲" : dir === -1 ? "▼" : (
            <span className="opacity-40">▲▼</span>
          )}
        </span>
      </button>
    </TableHead>
  );
}

/* ------------------------------------------------------------------ */
/* Apply-to-client confirm (C24) — fresh start vs append               */
/* ------------------------------------------------------------------ */

function ApplyConfirmModal({
  templateName,
  target,
  onCancel,
  onConfirm,
}: {
  templateName: string;
  target: ApplyTarget;
  onCancel: () => void;
  onConfirm: (mode: "fresh" | "append") => void;
}) {
  const [mode, setMode] = useState<"fresh" | "append">("fresh");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Apply ${templateName} to ${target.name}`}
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <Card className="relative z-10 w-full max-w-sm">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="eyebrow">Apply program</span>
              <h3 className="text-lg">
                {target.name}
                {target.kind === "team" ? (
                  <Pill tone="brand" className="ml-2 align-middle">
                    Team
                  </Pill>
                ) : null}
              </h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Applying <span className="font-semibold text-foreground">{templateName}</span>{" "}
            — choose where it lands:
          </p>

          <div className="flex flex-col gap-2">
            {(
              [
                {
                  value: "fresh",
                  title: "Start as a new program (Week 1)",
                  hint: "Replaces the current block — the client restarts at Week 1, Day 1.",
                },
                {
                  value: "append",
                  title: "Append after their current weeks",
                  hint: "Keeps the current block — this program continues where it ends.",
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors " +
                  (mode === opt.value
                    ? "border-brand/40 bg-brand/10"
                    : "border-border bg-surface/50 hover:bg-accent")
                }
              >
                <input
                  type="radio"
                  name="apply-mode"
                  value={opt.value}
                  checked={mode === opt.value}
                  onChange={() => setMode(opt.value)}
                  className="mt-0.5 accent-[hsl(var(--brand))]"
                />
                <span>
                  <span className="block text-sm font-semibold">{opt.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {opt.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="brand" size="sm" onClick={() => onConfirm(mode)}>
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New-program modal — cloned from TrainHeroic's create dialog         */
/* ------------------------------------------------------------------ */

function NewProgramModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, weeks: number, days: number) => void;
}) {
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState("4");
  const [days, setDays] = useState("3");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="New program"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <Card className="relative z-10 w-full max-w-sm">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="eyebrow">Program Library</span>
              <h3 className="text-lg">New program</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="np-name">Program name</Label>
            <Input
              id="np-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AAS — Off-season Football — Phase 1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Number of weeks</Label>
              <Select value={weeks} onValueChange={setWeeks}>
                <SelectTrigger aria-label="Number of weeks">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 8, 12].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "week" : "weeks"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Days / week</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger aria-label="Days per week">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "day" : "days"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="brand"
              size="sm"
              disabled={!name.trim()}
              onClick={() => onCreate(name.trim(), Number(weeks), Number(days))}
            >
              Create program
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
