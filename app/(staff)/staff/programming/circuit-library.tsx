"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Minus,
  Plus,
  Search,
  Trash2,
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
 * Round 8 (G4): circuits are EDITABLE — clicking one opens a single-section
 * builder view (rename, category, movement rows, add/remove, delete with a
 * two-step confirm). "Edited" is now "Last Modified".
 */
export function CircuitLibrary({
  canManageCategories = false,
}: {
  /** R8 (G2) — Level-3+ coaches, coach managers and admins only. */
  canManageCategories?: boolean;
}) {
  const [circuits, setCircuits] = useState<CircuitTemplate[]>(circuitLibrary);
  const [categories, setCategories] = useState<string[]>(() =>
    Array.from(new Set(circuitLibrary.map((c) => c.category))).sort((a, b) =>
      a.localeCompare(b),
    ),
  );
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [editing, setEditing] = useState<string | null>(null);
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

  /* ---- circuit editing (G4) ---- */

  function saveCircuit(
    id: string,
    patch: {
      name: string;
      category: string;
      movements: { name: string; prescription: string }[];
    },
  ) {
    const today = new Date().toISOString().slice(0, 10);
    setCircuits((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch, lastModified: today } : c)),
    );
    setEditing(null);
    say(`"${patch.name}" updated — saves locally in this demo.`);
  }

  function deleteCircuit(id: string) {
    const name = circuits.find((c) => c.id === id)?.name ?? "Circuit";
    setCircuits((prev) => prev.filter((c) => c.id !== id));
    setEditing(null);
    say(`"${name}" deleted from the Circuit Library.`);
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tnum font-semibold text-foreground">
            {circuits.length}
          </span>{" "}
          circuits — reusable ordered blocks (warm-ups, finishers, arm care)
          dropped into programs as one piece. Click one to edit it.
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
          {/* R8 (G2) — category management is Level-3+ / manager / admin only */}
          {canManageCategories ? (
            <ManageCategoriesMenu
              categories={categories}
              usageCount={(cat) =>
                circuits.filter((c) => c.category === cat).length
              }
              onAdd={addCategory}
              onRename={renameCategory}
              onDelete={deleteCategory}
            />
          ) : null}
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
                {/* R8 (G4) — "Edited" renamed */}
                <TableHead>Last Modified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const isOpen = editing === c.id;
                const preview = c.movements
                  .slice(0, 3)
                  .map((m) => m.name)
                  .join(", ");
                const extra = c.movements.length - 3;
                return (
                  <Fragment key={c.id}>
                    <TableRow
                      onClick={() => setEditing(isOpen ? null : c.id)}
                      aria-expanded={isOpen}
                      title={
                        isOpen
                          ? `Close ${c.name}`
                          : `Edit ${c.name} — opens the circuit like a program section`
                      }
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
                        <TableCell colSpan={5} className="bg-surface/40 p-3">
                          {/* G4 — edit the circuit like one program section */}
                          <CircuitSectionEditor
                            circuit={c}
                            categories={categories}
                            onCancel={() => setEditing(null)}
                            onSave={(patch) => saveCircuit(c.id, patch)}
                            onDelete={() => deleteCircuit(c.id)}
                          />
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
/* Circuit editor (G4) — a single program-section view: the coach only */
/* sees THIS circuit. Rename, category, ordered movement rows with     */
/* add/remove, Save, and a two-step Delete.                            */
/* ------------------------------------------------------------------ */

interface DraftMovement {
  name: string;
  prescription: string;
}

function CircuitSectionEditor({
  circuit,
  categories,
  onCancel,
  onSave,
  onDelete,
}: {
  circuit: CircuitTemplate;
  categories: string[];
  onCancel: () => void;
  onSave: (patch: {
    name: string;
    category: string;
    movements: DraftMovement[];
  }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(circuit.name);
  const [category, setCategory] = useState(circuit.category);
  const [movements, setMovements] = useState<DraftMovement[]>(() =>
    circuit.movements.map((m) => ({ ...m })),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filled = movements.filter((m) => m.name.trim());
  const canSave = name.trim().length > 0 && filled.length > 0;

  function patchMovement(idx: number, patch: Partial<DraftMovement>) {
    setMovements((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    );
  }

  return (
    <div
      className="flex flex-col gap-2.5"
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label={`Edit circuit ${circuit.name}`}
    >
      {/* Section header — the same dot + uppercase title as the builder */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-brand" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Circuit name"
          title="Click to rename this circuit"
          className="min-w-40 rounded-md border border-transparent bg-transparent px-1 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:border-border focus-visible:border-border focus-visible:outline-none"
        />
        <span className="flex items-center gap-1.5">
          <Label className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Category
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              className="h-7 w-36 text-xs"
              aria-label="Circuit category"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(new Set([...categories, category])).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      </div>

      {/* Ordered movement rows — name + prescription, like a section */}
      <Card>
        <CardContent className="flex flex-col gap-1.5 p-3">
          {movements.map((m, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.25rem_1fr_7rem_1.75rem] items-center gap-1.5"
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
          <Button
            variant="outline"
            size="sm"
            className="mt-1 self-start"
            onClick={() =>
              setMovements((prev) => [...prev, { name: "", prescription: "" }])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add movement
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {/* G4 — delete is two-step, like every destructive action */}
        {confirmDelete ? (
          <span className="flex items-center gap-1.5">
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Confirm delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Keep it
            </Button>
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            title="Delete this circuit — asks to confirm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete circuit
          </Button>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[0.65rem] text-muted-foreground">
            Saves locally in this demo.
          </span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="brand"
            size="sm"
            disabled={!canSave}
            onClick={() =>
              onSave({
                name: name.trim(),
                category,
                movements: filled.map((m) => ({
                  name: m.name.trim(),
                  prescription: m.prescription.trim() || "—",
                })),
              })
            }
          >
            Save circuit
          </Button>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New-circuit modal — name/category + ordered movement rows           */
/* ------------------------------------------------------------------ */

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
