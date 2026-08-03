"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
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
import { Textarea } from "@/components/ui/textarea";
import {
  exerciseLibrary,
  LIBRARY_TOTALS,
  LOAD_MODE_LABEL,
  REP_MODE_LABEL,
  type LibraryExercise,
  type LoadMode,
  type RepMode,
} from "@/lib/demo/training";
import { cn } from "@/lib/utils";

const LOAD_MODES = Object.keys(LOAD_MODE_LABEL) as LoadMode[];
const REP_MODES = Object.keys(REP_MODE_LABEL) as RepMode[];

/** C27 — exercises are owned by a company, never a coach. */
const MY_COMPANY = "LPS Athletic";
const GLOBAL_COMPANY = "AOS Global";

/* ---- column sorting (C11) ---- */

type ColumnKey = "name" | "tags" | "video" | "refMax" | "createdBy";

interface ColumnSort {
  key: ColumnKey;
  dir: 1 | -1;
}

function compareByColumn(a: LibraryExercise, b: LibraryExercise, key: ColumnKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "tags":
      return a.tags.join(", ").localeCompare(b.tags.join(", "));
    case "video":
      // Ascending = exercises WITH a video first.
      return Number(b.videoUrl != null) - Number(a.videoUrl != null);
    case "refMax":
      // Exercises without a reference max sort last.
      return (a.referenceMax ?? "￿").localeCompare(b.referenceMax ?? "￿");
    case "createdBy":
      return a.createdBy.localeCompare(b.createdBy);
  }
}

function sortRows(rows: LibraryExercise[], sort: ColumnSort | null): LibraryExercise[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const cmp = compareByColumn(a, b, sort.key) || a.name.localeCompare(b.name);
    return cmp * sort.dir;
  });
}

/** Editor form state — "none" stands in for a null reference max. */
interface Draft {
  id: string | null;
  name: string;
  videoUrl: string;
  pointsOfPerformance: string;
  tags: string[];
  referenceMax: string;
  repMode: RepMode;
  loadMode: LoadMode;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  name: "",
  videoUrl: "",
  pointsOfPerformance: "",
  tags: [],
  referenceMax: "none",
  repMode: "reps",
  loadMode: "lb",
};

/**
 * Searchable, tag-filterable exercise library with a full exercise editor.
 * Round 5: company ownership + duplicate-to-my-library (C27), no Points
 * column (C28), tag type-ahead + central tag management (C29), YouTube or
 * Vimeo links (C30), compact single-line rows (C31). All edits are local
 * state — demo only.
 */
export function ExerciseLibrary({
  isAdmin = false,
}: {
  /** R8 (G5) — deleting exercises/tags is admin-only. */
  isAdmin?: boolean;
}) {
  const [list, setList] = useState<LibraryExercise[]>(exerciseLibrary);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  // R8 (G5) — the library opens sorted by Name.
  const [sort, setSort] = useState<ColumnSort | null>({ key: "name", dir: 1 });
  const [draft, setDraft] = useState<Draft | null>(null);
  /** R8 (G5) — two-step deletes: the id/tag waiting on its confirm click. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  function announce(message: string) {
    setFlash(message);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2600);
  }

  const bySearch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        ex.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [list, query]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ex of bySearch)
      for (const t of ex.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return counts;
  }, [bySearch]);

  const allTags = useMemo(
    () =>
      Array.from(new Set(list.flatMap((ex) => ex.tags))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [list],
  );

  const filtered =
    activeTags.length === 0
      ? bySearch
      : bySearch.filter((ex) => ex.tags.some((t) => activeTags.includes(t)));

  const rows = sortRows(filtered, sort);

  function toggleSort(key: ColumnKey) {
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === 1
          ? { key, dir: -1 }
          : null
        : { key, dir: 1 },
    );
  }

  const referenceOptions = useMemo(
    () =>
      Array.from(new Set(list.map((ex) => ex.name)))
        .filter((name) => name !== draft?.name)
        .sort(),
    [list, draft?.name],
  );

  function toggleTag(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  /** C29 — central tag management: deleting removes the tag everywhere. */
  function deleteTag(tag: string) {
    setList((prev) =>
      prev.map((ex) =>
        ex.tags.includes(tag)
          ? { ...ex, tags: ex.tags.filter((t) => t !== tag) }
          : ex,
      ),
    );
    setActiveTags((prev) => prev.filter((t) => t !== tag));
    setConfirmDeleteTag(null);
    announce(`Tag "${tag}" deleted from every exercise.`);
  }

  /** R8 (G5) — admin-only delete, reached only through the two-step confirm. */
  function deleteExercise(ex: LibraryExercise) {
    setList((prev) => prev.filter((e) => e.id !== ex.id));
    setConfirmDeleteId(null);
    announce(`"${ex.name}" deleted from the library.`);
  }

  /** C27 — copy an AOS Global exercise into the gym's own library. */
  function duplicateToMine(ex: LibraryExercise) {
    setList((prev) => [
      { ...ex, id: `ex-copy-${Date.now()}`, createdBy: MY_COMPANY },
      ...prev,
    ]);
    announce(`"${ex.name}" duplicated to the ${MY_COMPANY} library.`);
  }

  function openEditor(ex?: LibraryExercise) {
    setDraft(
      ex
        ? {
            id: ex.id,
            name: ex.name,
            videoUrl: ex.videoUrl ?? "",
            pointsOfPerformance: ex.pointsOfPerformance.join("\n"),
            tags: [...ex.tags],
            referenceMax: ex.referenceMax ?? "none",
            repMode: ex.defaultRepMode,
            loadMode: ex.defaultLoadMode,
          }
        : EMPTY_DRAFT,
    );
  }

  function saveDraft() {
    if (!draft || !draft.name.trim()) return;
    const tags = draft.tags.filter(Boolean);
    const patch = {
      name: draft.name.trim(),
      videoUrl: draft.videoUrl.trim() || null,
      pointsOfPerformance: draft.pointsOfPerformance
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      tags: tags.length > 0 ? tags : ["Uncategorized"],
      referenceMax: draft.referenceMax === "none" ? null : draft.referenceMax,
      defaultRepMode: draft.repMode,
      defaultLoadMode: draft.loadMode,
    };
    if (draft.id) {
      setList((prev) =>
        prev.map((ex) => (ex.id === draft.id ? { ...ex, ...patch } : ex)),
      );
      announce(`"${patch.name}" updated in the library`);
    } else {
      setList((prev) => [
        { id: `ex-custom-${Date.now()}`, createdBy: MY_COMPANY, ...patch },
        ...prev,
      ]);
      announce(`"${patch.name}" added to the library`);
    }
    setDraft(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tnum font-semibold text-foreground">
            {LIBRARY_TOTALS.exercises}
          </span>{" "}
          exercises in the library · showing {filtered.length} of {list.length}{" "}
          samples
        </p>
        <Button variant="brand" size="sm" onClick={() => openEditor()}>
          <Plus className="h-4 w-4" />
          New exercise
        </Button>
      </div>

      {/* Search + tag filter row (C29): All chip + selected tags + Tags menu */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 basis-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises or tags…"
            className="pl-9"
            aria-label="Search exercise library"
          />
        </div>
        <button
          type="button"
          onClick={() => setActiveTags([])}
          aria-pressed={activeTags.length === 0}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            activeTags.length === 0
              ? "border-brand/40 bg-brand/10 text-brand-ink"
              : "border-border bg-surface/50 text-muted-foreground hover:bg-accent",
          )}
        >
          All
        </button>
        {activeTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            aria-pressed
            className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand-ink"
          >
            {tag}
            <X className="h-3 w-3 opacity-70" />
          </button>
        ))}
        <div className="relative">
          <button
            type="button"
            onClick={() => setTagMenuOpen((o) => !o)}
            aria-expanded={tagMenuOpen}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Filter by Tags
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", tagMenuOpen && "rotate-180")}
            />
          </button>
          {tagMenuOpen ? (
            <div className="absolute left-0 top-full z-40 mt-1.5 w-60 rounded-xl border border-border bg-card p-2 shadow-raised">
              <div className="flex max-h-64 flex-col overflow-y-auto scrollbar-slim">
                {allTags.map((tag) => {
                  const active = activeTags.includes(tag);
                  const count = tagCounts.get(tag) ?? 0;
                  return (
                    <span
                      key={tag}
                      className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        aria-pressed={active}
                        className={cn(
                          "flex flex-1 items-center justify-between gap-2 text-left text-sm",
                          active ? "font-semibold text-brand-ink" : "text-foreground",
                        )}
                      >
                        {tag}
                        <span className="tnum text-xs text-muted-foreground">
                          {count}
                        </span>
                      </button>
                      {/* R8 (G5) — tag delete: admin-only, two-step confirm */}
                      {isAdmin ? (
                        confirmDeleteTag === tag ? (
                          <button
                            type="button"
                            onClick={() => deleteTag(tag)}
                            className="shrink-0 rounded-md bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
                          >
                            Confirm delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Delete tag ${tag}`}
                            title={`Delete "${tag}" from every exercise — asks to confirm`}
                            onClick={() => setConfirmDeleteTag(tag)}
                            className="text-muted-foreground/70 transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )
                      ) : null}
                    </span>
                  );
                })}
                {allTags.length === 0 ? (
                  <span className="px-1.5 py-2 text-xs text-muted-foreground">
                    No tags yet.
                  </span>
                ) : null}
              </div>
              <p className="px-1.5 pb-1 pt-1.5 text-[0.65rem] text-muted-foreground">
                {isAdmin
                  ? "Click to filter · trash deletes a tag everywhere (asks first)."
                  : "Click to filter."}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Library table — compact single-line rows (C31) */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Exercise"
                  columnKey="name"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Tags"
                  columnKey="tags"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Video"
                  columnKey="video"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-14 text-center"
                />
                <SortableHead
                  label="Reference max"
                  columnKey="refMax"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-36"
                />
                <SortableHead
                  label="Created by"
                  columnKey="createdBy"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-32"
                />
                <TableHead className="w-24">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((ex) => (
                <TableRow
                  key={ex.id}
                  onClick={() => openEditor(ex)}
                  className="cursor-pointer"
                >
                  <TableCell className="max-w-52 truncate whitespace-nowrap py-2 font-medium">
                    {ex.name}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="flex flex-nowrap gap-1 overflow-hidden">
                      {ex.tags.slice(0, 2).map((t) => (
                        <Pill key={t} tone="neutral" className="whitespace-nowrap">
                          {t}
                        </Pill>
                      ))}
                      {ex.tags.length > 2 ? (
                        <Pill tone="neutral">+{ex.tags.length - 2}</Pill>
                      ) : null}
                    </span>
                  </TableCell>
                  {/* R8 (G5) — icon only when a video exists; blank otherwise
                      so the sortable column surfaces the gaps */}
                  <TableCell className="py-2 text-center">
                    {ex.videoUrl ? (
                      <a
                        href={ex.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex text-muted-foreground transition-colors hover:text-brand-ink"
                        aria-label={`Watch ${ex.name} demo video`}
                      >
                        <Video className="h-4 w-4" />
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-2 text-sm">
                    {ex.referenceMax ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "whitespace-nowrap py-2 text-xs",
                      ex.createdBy === GLOBAL_COMPANY
                        ? "text-info"
                        : "text-muted-foreground",
                    )}
                  >
                    {ex.createdBy}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <span className="inline-flex items-center justify-end gap-2">
                      {ex.createdBy === GLOBAL_COMPANY ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateToMine(ex);
                          }}
                          title="Duplicate to my library"
                          aria-label={`Duplicate ${ex.name} to the ${MY_COMPANY} library`}
                          className="inline-flex text-muted-foreground transition-colors hover:text-brand-ink"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      ) : null}
                      {/* R8 (G5) — delete: admins only, two-step confirm */}
                      {isAdmin ? (
                        confirmDeleteId === ex.id ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteExercise(ex);
                            }}
                            className="shrink-0 rounded-md bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
                          >
                            Confirm delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(ex.id);
                            }}
                            title="Delete this exercise — asks to confirm"
                            aria-label={`Delete ${ex.name} from the library`}
                            className="inline-flex text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )
                      ) : null}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No exercises match — clear the search or tag filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Click an exercise to edit its video, points of performance, tags and
        reference max. {GLOBAL_COMPANY} exercises are shared masters — duplicate
        one to tailor it for your own library.
      </p>

      {/* Exercise editor */}
      {draft ? (
        <ExerciseEditor
          draft={draft}
          setDraft={setDraft}
          allTags={allTags}
          referenceOptions={referenceOptions}
          onSave={saveDraft}
        />
      ) : null}

      {/* Success flash */}
      {flash ? (
        <div
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-success/30 bg-card px-4 py-2 text-sm font-medium shadow-soft"
        >
          <CheckCircle2 className="h-4 w-4 text-success" />
          {flash}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exercise editor modal                                               */
/* ------------------------------------------------------------------ */

function ExerciseEditor({
  draft,
  setDraft,
  allTags,
  referenceOptions,
  onSave,
}: {
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  allTags: string[];
  referenceOptions: string[];
  onSave: () => void;
}) {
  const [tagInput, setTagInput] = useState("");

  /** C29 — type-ahead over every existing tag stops Med ball/med-ball splits. */
  const suggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    if (!q) return [];
    return allTags
      .filter(
        (t) => t.toLowerCase().includes(q) && !draft.tags.includes(t),
      )
      .slice(0, 8);
  }, [allTags, draft.tags, tagInput]);

  function addTag(raw: string) {
    const clean = raw.trim();
    if (!clean) return;
    // Reuse the canonical casing when the tag already exists.
    const canonical =
      allTags.find((t) => t.toLowerCase() === clean.toLowerCase()) ?? clean;
    if (!draft.tags.includes(canonical)) {
      setDraft({ ...draft, tags: [...draft.tags, canonical] });
    }
    setTagInput("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={draft.id ? "Edit exercise" : "New exercise"}
    >
      <button
        type="button"
        aria-label="Close editor"
        onClick={() => setDraft(null)}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <Card className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden">
        <CardContent className="flex flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="eyebrow">Exercise editor</span>
              <h3 className="text-lg">
                {draft.id ? draft.name || "Edit exercise" : "New exercise"}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDraft(null)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-title">Title</Label>
            <Input
              id="ex-title"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Hip Snatch"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-video">YouTube or Vimeo link</Label>
            <Input
              id="ex-video"
              value={draft.videoUrl}
              onChange={(e) =>
                setDraft({ ...draft, videoUrl: e.target.value })
              }
              placeholder="https://youtu.be/… or https://vimeo.com/…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-pop">Points of performance</Label>
            <Textarea
              id="ex-pop"
              rows={4}
              value={draft.pointsOfPerformance}
              onChange={(e) =>
                setDraft({ ...draft, pointsOfPerformance: e.target.value })
              }
              placeholder={"One per line, e.g.\nBar close to the body.\nFinish the pull tall."}
            />
            <p className="text-xs text-muted-foreground">
              Shown to the athlete under the demo video — a program can override
              this note per exercise in the builder.
            </p>
          </div>

          {/* C29 — tag chips + type-ahead suggestions */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-tags">Tags</Label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5">
              {draft.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-ink"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove tag ${tag}`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        tags: draft.tags.filter((t) => t !== tag),
                      })
                    }
                    className="opacity-70 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                id="ex-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(suggestions[0] ?? tagInput);
                  }
                }}
                placeholder={draft.tags.length === 0 ? "Type to add tags…" : "Add another…"}
                className="h-6 min-w-24 flex-1 bg-transparent text-sm focus-visible:outline-none"
                aria-label="Add a tag"
              />
            </div>
            {suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="rounded-full border border-border bg-surface/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Suggestions come from existing tags — press Enter or click to add.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Reference max</Label>
            <Select
              value={draft.referenceMax}
              onValueChange={(v) => setDraft({ ...draft, referenceMax: v })}
            >
              <SelectTrigger aria-label="Reference max">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No reference max</SelectItem>
                {referenceOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The mother lift a % prescription points at — e.g. Hip Snatch
              = 60% of Snatch.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Track as</Label>
              <Select
                value={draft.repMode}
                onValueChange={(v) =>
                  setDraft({ ...draft, repMode: v as RepMode })
                }
              >
                <SelectTrigger aria-label="Track reps as">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REP_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {REP_MODE_LABEL[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Default load unit</Label>
              <Select
                value={draft.loadMode}
                onValueChange={(v) =>
                  setDraft({ ...draft, loadMode: v as LoadMode })
                }
              >
                <SelectTrigger aria-label="Default load unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAD_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {LOAD_MODE_LABEL[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={onSave}
              disabled={!draft.name.trim()}
            >
              Save exercise
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Clickable column header — cycles ascending ▲ → descending ▼ → off (C11). */
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
