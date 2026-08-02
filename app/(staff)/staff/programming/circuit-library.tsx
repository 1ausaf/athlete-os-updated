"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { circuitLibrary, type CircuitTemplate } from "@/lib/demo/training";
import { cn } from "@/lib/utils";

import { ManageCategoriesMenu } from "./manage-categories";

type SortKey = "name" | "newest" | "category";

const SORT_LABEL: Record<SortKey, string> = {
  name: "Name",
  newest: "Newest",
  category: "Category",
};

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sortCircuits(list: CircuitTemplate[], key: SortKey): CircuitTemplate[] {
  const sorted = [...list];
  switch (key) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "newest":
      sorted.sort(
        (a, b) =>
          b.lastModified.localeCompare(a.lastModified) ||
          a.name.localeCompare(b.name),
      );
      break;
    case "category":
      sorted.sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      );
      break;
  }
  return sorted;
}

/**
 * G1 — the Circuit Library: named, ordered movement circuits (the dynamic
 * warm-up is the canonical example) dropped into programs as one block.
 * Search + sort like the other libraries; a row expands to the full ordered
 * list; "New circuit" builds one from name/category + movement rows.
 */
export function CircuitLibrary() {
  const [circuits, setCircuits] = useState<CircuitTemplate[]>(circuitLibrary);
  const [categories, setCategories] = useState<string[]>(() =>
    Array.from(new Set(circuitLibrary.map((c) => c.category))).sort((a, b) =>
      a.localeCompare(b),
    ),
  );
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  function say(message: string) {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(message);
    flashTimer.current = setTimeout(() => setFlash(null), 2600);
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? circuits.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            c.movements.some((m) => m.name.toLowerCase().includes(q)),
        )
      : circuits;
    return sortCircuits(list, sortKey);
  }, [circuits, query, sortKey]);

  /* ---- category management (shared pattern with the Program Library) ---- */

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
    setCircuits((prev) =>
      prev.map((c) => (c.category === from ? { ...c, category: to } : c)),
    );
    say(`Category "${from}" renamed to "${to}" — circuits updated.`);
  }

  function deleteCategory(cat: string) {
    setCategories((prev) => prev.filter((c) => c !== cat));
    setCircuits((prev) =>
      prev.map((c) =>
        c.category === cat ? { ...c, category: "Uncategorized" } : c,
      ),
    );
    say(`Category "${cat}" deleted — its circuits are now Uncategorized.`);
  }

  function createCircuit(
    name: string,
    category: string,
    movements: { name: string; prescription: string }[],
  ) {
    const today = new Date().toISOString().slice(0, 10);
    setCircuits((prev) => [
      {
        id: `cir-custom-${Date.now()}`,
        name,
        category,
        movements,
        createdBy: "LPS Athletic",
        lastModified: today,
      },
      ...prev,
    ]);
    setCreating(false);
    say(`"${name}" added to the Circuit Library — saves locally in this demo.`);
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tnum font-semibold text-foreground">
            {circuits.length}
          </span>{" "}
          circuits — reusable ordered blocks (warm-ups, finishers, arm care)
          dropped into programs as one piece.
        </p>
        <span className="flex flex-wrap items-center gap-2">
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search circuits…"
              className="h-8 w-44 pl-9 text-xs"
              aria-label="Search Circuit Library"
            />
          </span>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger
              className="h-8 w-32 text-xs"
              aria-label="Sort Circuit Library"
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
          <ManageCategoriesMenu
            categories={categories}
            usageCount={(cat) =>
              circuits.filter((c) => c.category === cat).length
            }
            onAdd={addCategory}
            onRename={renameCategory}
            onDelete={deleteCategory}
          />
          <Button variant="brand" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New circuit
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
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Movements</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Edited</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const isOpen = expanded === c.id;
                const preview = c.movements
                  .slice(0, 3)
                  .map((m) => m.name)
                  .join(", ");
                const extra = c.movements.length - 3;
                return (
                  <Fragment key={c.id}>
                    <TableRow
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                      aria-expanded={isOpen}
                      className={cn(
                        "cursor-pointer",
                        isOpen && "bg-accent/50 hover:bg-accent/50",
                      )}
                    >
                      <TableCell className="font-semibold">
                        <span className="flex items-center gap-1.5">
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                          {c.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.category}
                      </TableCell>
                      <TableCell className="max-w-64 text-xs text-muted-foreground">
                        <span className="tnum font-semibold text-foreground">
                          {c.movements.length}
                        </span>{" "}
                        <span className="truncate">
                          — {preview}
                          {extra > 0 ? `, +${extra} more` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.createdBy}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(c.lastModified)}
                      </TableCell>
                    </TableRow>
                    {isOpen ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="bg-surface/40 py-3">
                          <ol className="flex flex-col gap-1">
                            {c.movements.map((m, i) => (
                              <li
                                key={`${m.name}-${i}`}
                                className="flex items-baseline gap-2.5 text-sm"
                              >
                                <span className="tnum w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">
                                  {i + 1}
                                </span>
                                <span className="font-medium">{m.name}</span>
                                <span className="tnum text-xs text-muted-foreground">
                                  {m.prescription}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No circuits match — clear the search.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {creating ? (
        <NewCircuitModal
          categories={categories}
          onClose={() => setCreating(false)}
          onCreate={createCircuit}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New-circuit modal — name/category + ordered movement rows           */
/* ------------------------------------------------------------------ */

interface DraftMovement {
  name: string;
  prescription: string;
}

function NewCircuitModal({
  categories,
  onClose,
  onCreate,
}: {
  categories: string[];
  onClose: () => void;
  onCreate: (
    name: string,
    category: string,
    movements: DraftMovement[],
  ) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Uncategorized");
  const [movements, setMovements] = useState<DraftMovement[]>([
    { name: "", prescription: "" },
    { name: "", prescription: "" },
    { name: "", prescription: "" },
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filled = movements.filter((m) => m.name.trim());
  const canSave = name.trim().length > 0 && filled.length > 0;

  function patchMovement(idx: number, patch: Partial<DraftMovement>) {
    setMovements((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="New circuit"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <Card className="relative z-10 w-full max-w-md">
        <CardContent className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto scrollbar-slim p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="eyebrow">Circuit Library</span>
              <h3 className="text-lg">New circuit</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nc-name">Circuit name</Label>
              <Input
                id="nc-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dynamic Warm-up C"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Circuit category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(categories.length > 0 ? categories : ["Uncategorized"]).map(
                    (cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Movements — in order</Label>
            <div className="flex flex-col gap-1.5">
              {movements.map((m, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1.25rem_1fr_6.5rem_1.75rem] items-center gap-1.5"
                >
                  <span className="tnum text-right text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <Input
                    value={m.name}
                    onChange={(e) => patchMovement(i, { name: e.target.value })}
                    placeholder="Movement name"
                    aria-label={`Movement ${i + 1} name`}
                    className="h-8 text-xs"
                  />
                  <Input
                    value={m.prescription}
                    onChange={(e) =>
                      patchMovement(i, { prescription: e.target.value })
                    }
                    placeholder="e.g. 2×10"
                    aria-label={`Movement ${i + 1} prescription`}
                    className="tnum h-8 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove movement row ${i + 1}`}
                    disabled={movements.length <= 1}
                    onClick={() =>
                      setMovements((prev) => prev.filter((_, x) => x !== i))
                    }
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                setMovements((prev) => [...prev, { name: "", prescription: "" }])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add movement
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <span className="text-[0.65rem] text-muted-foreground">
              Saves locally in this demo.
            </span>
            <span className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="brand"
                size="sm"
                disabled={!canSave}
                onClick={() =>
                  onCreate(
                    name.trim(),
                    category,
                    filled.map((m) => ({
                      name: m.name.trim(),
                      prescription: m.prescription.trim() || "—",
                    })),
                  )
                }
              >
                Save circuit
              </Button>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
