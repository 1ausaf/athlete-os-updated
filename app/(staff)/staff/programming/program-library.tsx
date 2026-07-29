"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
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
import { athletes } from "@/lib/demo/data";
import {
  LIBRARY_TOTALS,
  programTemplates,
  trainingGroups,
  type ProgramTemplate,
} from "@/lib/demo/training";

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

/** C23 — sort menu is Name / Newest / Level / Last modified (no "Weeks"). */
type SortKey = "name" | "newest" | "level" | "modified";

const SORT_LABEL: Record<SortKey, string> = {
  name: "Name",
  newest: "Newest",
  level: "Level",
  modified: "Last modified",
};

function lastEdited(tpl: ProgramTemplate): string {
  return tpl.lastModified ?? tpl.createdAt;
}

function sortTemplates(list: ProgramTemplate[], key: SortKey): ProgramTemplate[] {
  const sorted = [...list];
  switch (key) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "newest":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "level":
      sorted.sort(
        (a, b) =>
          LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level] ||
          a.name.localeCompare(b.name),
      );
      break;
    case "modified":
      sorted.sort(
        (a, b) =>
          lastEdited(b).localeCompare(lastEdited(a)) ||
          a.name.localeCompare(b.name),
      );
      break;
  }
  return sorted;
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
 * Master-program library (C10/C23/C24). Every row opens the template editor
 * at its own URL; "Apply to client…" copies a master onto a client after a
 * confirm step — start fresh at Week 1, or append after their current weeks.
 */
export function ProgramLibrary() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [creating, setCreating] = useState(false);
  const [applying, setApplying] = useState<{
    tpl: ProgramTemplate;
    target: ApplyTarget;
  } | null>(null);
  const [applied, setApplied] = useState<Record<string, string | undefined>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? programTemplates.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
            (t.labels ?? []).some((l) => l.toLowerCase().includes(q)),
        )
      : programTemplates;
    return sortTemplates(list, sortKey);
  }, [query, sortKey]);

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tnum font-semibold text-foreground">
            {LIBRARY_TOTALS.programs}
          </span>{" "}
          programs in the library · showing {sorted.length} masters — click one
          to edit it, or apply it to a client.
        </p>
        <span className="flex flex-wrap items-center gap-2">
          {/* C23 — search the program library */}
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search programs…"
              className="h-8 w-44 pl-9 text-xs"
              aria-label="Search program library"
            />
          </span>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger
              className="h-8 w-36 text-xs"
              aria-label="Sort program library"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="brand" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New program
          </Button>
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {sorted.map((tpl) => {
              const editHref = `/staff/programming/templates/${tpl.id}` as Route;
              return (
                <div
                  key={tpl.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 transition-colors hover:bg-accent/50"
                >
                  <Link href={editHref} className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{tpl.name}</span>
                      <PencilLine className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Pill tone={levelTone[tpl.level]}>{tpl.level}</Pill>
                      {/* C23 — weeks stay visible on every row */}
                      <Pill tone="neutral" className="tnum">
                        {tpl.weeks} wk × {tpl.daysPerWeek}{" "}
                        {tpl.daysPerWeek === 1 ? "day" : "days"}
                      </Pill>
                      {tpl.remoteDays ? (
                        <Pill tone="info" icon={<Globe className="h-3 w-3" />}>
                          {tpl.remoteDays}× remote/wk
                        </Pill>
                      ) : null}
                      {(tpl.labels ?? []).map((label) => (
                        <Pill key={label} tone="brand">
                          {label}
                        </Pill>
                      ))}
                      {tpl.tags.map((tag) => (
                        <Pill key={tag} tone="neutral">
                          {tag}
                        </Pill>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {tpl.description} — {tpl.createdBy} · Edited{" "}
                      {fmtDate(lastEdited(tpl))}
                    </p>
                  </Link>

                  <div className="shrink-0">
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
                          className="h-8 w-48 text-xs"
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
                  </div>
                </div>
              );
            })}
            {sorted.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No programs match — clear the search.
              </p>
            ) : null}
          </div>
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
              <span className="eyebrow">Program library</span>
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
