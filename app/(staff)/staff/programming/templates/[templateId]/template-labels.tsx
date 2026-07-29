"use client";

import { useMemo, useState } from "react";
import { Plus, Settings2, Tag, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROGRAM_LABELS } from "@/lib/demo/training";
import { cn } from "@/lib/utils";

/**
 * C25 — program category labels on the template header: current labels as
 * removable chips, add from the shared label list or free text, and a
 * "Manage labels" popover for central label management (kids, foundation,
 * executive, per-sport…). Demo state is local.
 */
export function TemplateLabels({ initial }: { initial: string[] }) {
  const [labels, setLabels] = useState<string[]>(initial);
  const [available, setAvailable] = useState<string[]>(() =>
    Array.from(new Set([...PROGRAM_LABELS, ...initial])).sort((a, b) =>
      a.localeCompare(b),
    ),
  );
  const [panel, setPanel] = useState<"add" | "manage" | null>(null);
  const [custom, setCustom] = useState("");

  const addable = useMemo(
    () => available.filter((l) => !labels.includes(l)),
    [available, labels],
  );

  function addLabel(label: string) {
    const clean = label.trim();
    if (!clean) return;
    setLabels((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setAvailable((prev) =>
      prev.includes(clean)
        ? prev
        : [...prev, clean].sort((a, b) => a.localeCompare(b)),
    );
    setCustom("");
  }

  function deleteEverywhere(label: string) {
    setAvailable((prev) => prev.filter((l) => l !== label));
    setLabels((prev) => prev.filter((l) => l !== label));
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Tag className="h-3 w-3" />
        Labels
      </span>

      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand-ink"
        >
          {label}
          <button
            type="button"
            aria-label={`Remove label ${label}`}
            onClick={() => setLabels((prev) => prev.filter((l) => l !== label))}
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {labels.length === 0 ? (
        <span className="text-xs text-muted-foreground">none yet</span>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-xs"
        aria-expanded={panel === "add"}
        onClick={() => setPanel((p) => (p === "add" ? null : "add"))}
      >
        <Plus className="h-3 w-3" />
        Add label
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground"
        aria-expanded={panel === "manage"}
        onClick={() => setPanel((p) => (p === "manage" ? null : "manage"))}
      >
        <Settings2 className="h-3 w-3" />
        Manage labels
      </Button>

      {panel === "add" ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-border bg-card p-3 shadow-raised">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Pick a label — kids, foundation, executive, or a sport:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {addable.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => addLabel(label)}
                className="rounded-full border border-border bg-surface/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {label}
              </button>
            ))}
            {addable.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                All labels applied — add a new one below.
              </span>
            ) : null}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLabel(custom);
                }
              }}
              placeholder="New label…"
              className="h-8 text-xs"
              aria-label="New label name"
            />
            <Button
              variant="brand"
              size="sm"
              className="h-8"
              disabled={!custom.trim()}
              onClick={() => addLabel(custom)}
            >
              Add
            </Button>
          </div>
          <p className="mt-2 text-[0.65rem] text-muted-foreground">
            Saves locally in this demo.
          </p>
        </div>
      ) : null}

      {panel === "manage" ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-raised">
          <p className="px-1.5 pb-1.5 pt-1 text-xs font-semibold text-muted-foreground">
            All labels — deleting removes a label everywhere.
          </p>
          <div className="flex max-h-56 flex-col overflow-y-auto scrollbar-slim">
            {available.map((label) => (
              <span
                key={label}
                className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent"
              >
                <span
                  className={cn(labels.includes(label) && "font-semibold")}
                >
                  {label}
                </span>
                <button
                  type="button"
                  aria-label={`Delete label ${label}`}
                  title={`Delete ${label} everywhere`}
                  onClick={() => deleteEverywhere(label)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {available.length === 0 ? (
              <span className="px-1.5 py-2 text-xs text-muted-foreground">
                No labels left — add one from the Add-label panel.
              </span>
            ) : null}
          </div>
          <p className="px-1.5 pb-1 pt-1.5 text-[0.65rem] text-muted-foreground">
            Saves locally in this demo.
          </p>
        </div>
      ) : null}
    </div>
  );
}
