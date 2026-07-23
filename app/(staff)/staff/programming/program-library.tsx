"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowUpDown, CheckCircle2, Globe, PencilLine, Plus, X } from "lucide-react";

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

type SortKey = "name" | "newest" | "weeks" | "level";

const SORT_LABEL: Record<SortKey, string> = {
  name: "Name",
  newest: "Newest",
  weeks: "Weeks",
  level: "Level",
};

function sortTemplates(list: ProgramTemplate[], key: SortKey): ProgramTemplate[] {
  const sorted = [...list];
  switch (key) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "newest":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "weeks":
      sorted.sort((a, b) => b.weeks - a.weeks || a.name.localeCompare(b.name));
      break;
    case "level":
      sorted.sort(
        (a, b) =>
          LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level] ||
          a.name.localeCompare(b.name),
      );
      break;
  }
  return sorted;
}

function fmtCreated(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Master-program library (C10). Every row opens the template in the builder;
 * "Copy to athlete…" stays the client's real workflow: a master is copied
 * onto an athlete, then tailored. "New program" mirrors TrainHeroic's
 * create modal — name + weeks + days/week → straight into the editor.
 */
export function ProgramLibrary() {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<Record<string, string | undefined>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const sorted = useMemo(() => sortTemplates(programTemplates, sortKey), [sortKey]);

  function copyTo(templateId: string, athleteId: string) {
    const name = athletes.find((a) => a.id === athleteId)?.name ?? "athlete";
    setCopied((prev) => ({ ...prev, [templateId]: name }));
    timers.current.push(
      setTimeout(
        () => setCopied((prev) => ({ ...prev, [templateId]: undefined })),
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
          programs in the library · showing {programTemplates.length} masters —
          click one to edit it, or copy it onto an athlete.
        </p>
        <span className="flex items-center gap-2">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger
              className="h-8 w-32 text-xs"
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
                      <Pill tone="neutral" className="tnum">
                        {tpl.weeks} wk × {tpl.daysPerWeek} d/wk
                      </Pill>
                      {tpl.remoteDays ? (
                        <Pill tone="info" icon={<Globe className="h-3 w-3" />}>
                          {tpl.remoteDays}× remote/wk
                        </Pill>
                      ) : null}
                      {tpl.tags.map((tag) => (
                        <Pill key={tag} tone="neutral">
                          {tag}
                        </Pill>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {tpl.description} — {tpl.createdBy} · added{" "}
                      {fmtCreated(tpl.createdAt)}
                    </p>
                  </Link>

                  <div className="shrink-0">
                    {copied[tpl.id] ? (
                      <Pill
                        tone="success"
                        icon={<CheckCircle2 className="h-3 w-3" />}
                      >
                        Copied to {copied[tpl.id]}
                      </Pill>
                    ) : (
                      <Select
                        value=""
                        onValueChange={(athleteId) => copyTo(tpl.id, athleteId)}
                      >
                        <SelectTrigger
                          className="h-8 w-48 text-xs"
                          aria-label={`Copy ${tpl.name} to an athlete`}
                        >
                          <SelectValue placeholder="Copy to athlete…" />
                        </SelectTrigger>
                        <SelectContent>
                          {athletes.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
