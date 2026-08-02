"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * G3 — shared "Manage categories" popover for the Program and Circuit
 * Libraries: add, RENAME (updates every row using it) and delete categories.
 * Delete is two-step; all state lives in the parent (local demo state).
 */
export function ManageCategoriesMenu({
  label = "Manage categories",
  categories,
  usageCount,
  onAdd,
  onRename,
  onDelete,
}: {
  label?: string;
  categories: string[];
  /** Rows currently using a category — shown next to it. */
  usageCount: (category: string) => number;
  onAdd: (category: string) => void;
  /** Renaming updates the rows that use the old name. */
  onRename: (from: string, to: string) => void;
  onDelete: (category: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState("");
  const [editing, setEditing] = useState<{ from: string; value: string } | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function commitRename() {
    if (!editing) return;
    const to = editing.value.trim();
    if (to && to !== editing.from) onRename(editing.from, to);
    setEditing(null);
  }

  function commitAdd() {
    const clean = adding.trim();
    if (!clean) return;
    onAdd(clean);
    setAdding("");
  }

  return (
    <span className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setEditing(null);
          setConfirmDelete(null);
        }}
      >
        <Settings2 className="h-3.5 w-3.5" />
        {label}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-72 rounded-xl border border-border bg-card p-2 shadow-raised">
          <p className="px-1.5 pb-1.5 pt-1 text-xs font-semibold text-muted-foreground">
            Categories — rename updates every row using it.
          </p>
          <div className="flex max-h-60 flex-col overflow-y-auto scrollbar-slim">
            {categories.map((cat) => {
              const isEditing = editing?.from === cat;
              const isConfirming = confirmDelete === cat;
              return (
                <span
                  key={cat}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent"
                >
                  {isEditing ? (
                    <>
                      <Input
                        autoFocus
                        value={editing.value}
                        onChange={(e) =>
                          setEditing({ from: cat, value: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename();
                          }
                          if (e.key === "Escape") setEditing(null);
                        }}
                        aria-label={`Rename category ${cat}`}
                        className="h-7 flex-1 text-xs"
                      />
                      <button
                        type="button"
                        aria-label={`Save new name for ${cat}`}
                        onClick={commitRename}
                        className="text-success transition-colors hover:opacity-80"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel rename"
                        onClick={() => setEditing(null)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate">
                        {cat}{" "}
                        <span className="tnum text-xs text-muted-foreground">
                          ({usageCount(cat)})
                        </span>
                      </span>
                      {isConfirming ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(cat);
                            setConfirmDelete(null);
                          }}
                          className="shrink-0 rounded-md bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
                        >
                          Confirm delete
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label={`Rename category ${cat}`}
                            title="Rename this category"
                            onClick={() => {
                              setEditing({ from: cat, value: cat });
                              setConfirmDelete(null);
                            }}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete category ${cat}`}
                            title="Delete this category — asks to confirm"
                            onClick={() => {
                              setConfirmDelete(cat);
                              setEditing(null);
                            }}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </span>
              );
            })}
            {categories.length === 0 ? (
              <span className="px-1.5 py-2 text-xs text-muted-foreground">
                No categories yet — add one below.
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 border-t border-border px-1 pt-2">
            <Input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitAdd();
                }
              }}
              placeholder="New category…"
              aria-label="New category name"
              className="h-8 text-xs"
            />
            <Button
              variant="brand"
              size="sm"
              className="h-8"
              disabled={!adding.trim()}
              onClick={commitAdd}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          <p className="px-1.5 pb-1 pt-1.5 text-[0.65rem] text-muted-foreground">
            Saves locally in this demo.
          </p>
        </div>
      ) : null}
    </span>
  );
}
