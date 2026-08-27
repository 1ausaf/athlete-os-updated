"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { TabBar } from "@/components/app/tab-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { fmtDay } from "@/lib/demo/data";
import { staffById } from "@/lib/demo/staff";
import {
  allTasks,
  appendLocalTask,
  completeTask,
  readLocalTasks,
  removeLocalTask,
  setTaskDone,
  setTaskEdit,
  TASKS_EVENT,
  type StaffTask,
} from "@/lib/demo/tasks";
import { cn } from "@/lib/utils";

/**
 * Round 12 (N21): the Tasks manager — To Do | Completed tabs over the merged
 * list (manual to-dos + every member's Alerts & Reminders), an assignee
 * filter, and a collapsed add form in the RemindersCard idiom.
 *
 * Round 13 (K1–K4): the row list is a Members-style table now — Task | Due |
 * Responsible | Type | actions — with sortable Due/Responsible headers and a
 * pencil that reopens the form pre-filled for any manual task (seed or
 * local), saved as a field-edit overlay via setTaskEdit.
 */

const FIELD_LABEL =
  "text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground";

type TaskTab = "todo" | "done";
type TaskRecurrence = NonNullable<StaffTask["recurrence"]>;
type SortKey = "due" | "assignee";
type SortDir = "asc" | "desc";

const RECURRENCE_LABEL: Record<TaskRecurrence, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

function recurrenceLabel(t: StaffTask): string | null {
  if (!t.recurrence) return null;
  // Reminder rows keep the profile card's "Every 3 months" wording.
  if (t.source === "reminder" && t.recurrence === "quarterly")
    return "Every 3 months";
  return RECURRENCE_LABEL[t.recurrence];
}

function assigneeName(t: StaffTask): string {
  if (!t.assigneeId) return "Everyone involved";
  return staffById(t.assigneeId)?.name ?? t.assigneeId;
}

/** Due-date sort: soonest first, no-date rows last. */
function byDue(a: StaffTask, b: StaffTask): number {
  if (!a.due && !b.due) return a.title.localeCompare(b.title);
  if (!a.due) return 1;
  if (!b.due) return -1;
  return a.due.localeCompare(b.due) || a.title.localeCompare(b.title);
}

export function TasksManager({
  currentUserName,
  staff,
}: {
  currentUserName: string;
  staff: { id: string; name: string }[];
}) {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  // Ids added in this browser — the only rows that get a delete control.
  const [localIds, setLocalIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<TaskTab>("todo");
  // "all" = Everyone; otherwise a staff id. "" assignees match every filter.
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  // K2/K3 — sortable Due / Responsible columns; due-date asc stays default.
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // The collapsed Add Task form — K1: also reused as the edit form.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [formAssignee, setFormAssignee] = useState("");
  const [recurrence, setRecurrence] = useState<"" | TaskRecurrence>("");

  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number>();

  useEffect(() => {
    const refresh = () => {
      setTasks(allTasks());
      setLocalIds(new Set(readLocalTasks().map((t) => t.id)));
    };
    refresh();
    window.addEventListener(TASKS_EVENT, refresh);
    return () => window.removeEventListener(TASKS_EVENT, refresh);
  }, []);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  function showFlash(message: string) {
    setFlash(message);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 2200);
  }

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          assigneeFilter === "all" ||
          t.assigneeId === "" ||
          t.assigneeId === assigneeFilter,
      ),
    [tasks, assigneeFilter],
  );

  const compare = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return (a: StaffTask, b: StaffTask): number =>
      sortKey === "due"
        ? dir * byDue(a, b)
        : dir *
          (assigneeName(a).localeCompare(assigneeName(b)) || byDue(a, b));
  }, [sortKey, sortDir]);

  const todo = useMemo(
    () => filtered.filter((t) => !t.done).sort(compare),
    [filtered, compare],
  );
  const completed = useMemo(
    () => filtered.filter((t) => t.done).sort(compare),
    [filtered, compare],
  );

  const visible = tab === "todo" ? todo : completed;
  const today = new Date().toISOString().slice(0, 10);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function resetForm() {
    setTitle("");
    setDue("");
    setFormAssignee("");
    setRecurrence("");
    setEditingId(null);
  }

  const canSave = title.trim().length > 0;

  /** Round 18 (D13): adding while an assignee filter is active defaults the
   *  form to that coach — otherwise the new task lands unassigned ("") and,
   *  since "" matches EVERY filter, shows under everyone. */
  function openAdd() {
    resetForm();
    if (assigneeFilter !== "all") setFormAssignee(assigneeFilter);
    setFormOpen(true);
  }

  /** K1 — the pencil reopens the add form pre-filled with the task. */
  function openEdit(t: StaffTask) {
    setEditingId(t.id);
    setTitle(t.title);
    setDue(t.due);
    setFormAssignee(t.assigneeId);
    setRecurrence(t.recurrence ?? "");
    setFormOpen(true);
  }

  /** Round 14 (V19): completion rolls recurring tasks to the next due date. */
  function handleComplete(t: StaffTask) {
    completeTask(t);
    if (t.recurrence) showFlash("Done — next occurrence added");
  }

  function handleSave() {
    if (!canSave) return;
    if (editingId) {
      // K1 — edits overlay the task (seed or local) via the shared store.
      setTaskEdit(editingId, {
        title: title.trim(),
        due,
        assigneeId: formAssignee,
        recurrence: recurrence === "" ? undefined : recurrence,
      });
      showFlash("Task updated");
    } else {
      appendLocalTask({
        id: `task-${Date.now()}`,
        title: title.trim(),
        due,
        assigneeId: formAssignee,
        done: false,
        source: "manual",
        createdBy: currentUserName,
        recurrence: recurrence === "" ? undefined : recurrence,
      });
      showFlash("Task added");
    }
    resetForm();
    setFormOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <TabBar
        tabs={[
          { value: "todo" as TaskTab, label: "To Do", count: todo.length },
          {
            value: "done" as TaskTab,
            label: "Completed",
            count: completed.length,
          },
        ]}
        active={tab}
        onSelect={setTab}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className={FIELD_LABEL}>Assigned to</span>
          <select
            value={assigneeFilter}
            aria-label="Filter by assignee"
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
          >
            <option value="all">Everyone</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {!formOpen ? (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        ) : null}
      </div>

      {formOpen ? (
        <div className="flex flex-col gap-3 rounded-lg border border-brand/30 bg-brand/[0.03] p-3">
          <label className="flex flex-col gap-1">
            <span className={FIELD_LABEL}>Task</span>
            <Input
              autoFocus
              value={title}
              placeholder="e.g. Restock chalk + tape by the platforms"
              className="h-9 bg-surface text-sm"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Due</span>
              <input
                type="date"
                value={due}
                aria-label="Due date"
                onChange={(e) => setDue(e.target.value)}
                className="tnum h-9 rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Assign to</span>
              <select
                value={formAssignee}
                aria-label="Assign to"
                onChange={(e) => setFormAssignee(e.target.value)}
                className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
              >
                <option value="">Everyone</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Repeats</span>
              <select
                value={recurrence}
                aria-label="Recurrence"
                onChange={(e) =>
                  setRecurrence(e.target.value as "" | TaskRecurrence)
                }
                className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
              >
                <option value="">One-time</option>
                {(Object.keys(RECURRENCE_LABEL) as TaskRecurrence[]).map(
                  (f) => (
                    <option key={f} value={f}>
                      {RECURRENCE_LABEL[f]}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2 border-t border-border/60 pt-2.5">
            <Button
              variant="brand"
              size="sm"
              disabled={!canSave}
              onClick={handleSave}
            >
              {editingId ? "Save task" : "Add task"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetForm();
                setFormOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {/* K4 — the Members-table look; scrolls sideways on phones */}
      <div className="overflow-x-auto rounded-xl border border-border scrollbar-slim">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-3 py-2.5">
                <span className="flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Task
                </span>
              </th>
              <SortHeader
                label="Due"
                active={sortKey === "due"}
                dir={sortDir}
                onClick={() => toggleSort("due")}
              />
              <SortHeader
                label="Responsible"
                active={sortKey === "assignee"}
                dir={sortDir}
                onClick={() => toggleSort("assignee")}
              />
              <th className="px-3 py-2.5">
                <span className="flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </span>
              </th>
              {/* Round 18 (C8): wide enough for pencil + trash at 32px each */}
              <th className="w-20 px-3 py-2.5" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                done={tab === "done"}
                today={today}
                deletable={localIds.has(t.id)}
                onComplete={() => handleComplete(t)}
                onEdit={
                  t.source === "manual" && tab === "todo"
                    ? () => openEdit(t)
                    : undefined
                }
              />
            ))}
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  {tab === "todo"
                    ? "Nothing on the list — add a task above."
                    : "Nothing completed yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="text-[0.7rem] text-muted-foreground text-pretty">
        Member Alerts &amp; Reminders roll in automatically — edit those on
        the member&rsquo;s profile; here they only check off. Saves locally
        in this demo.
      </p>

      {flash ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-raised"
        >
          {flash}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** K2/K3 — members-list-style sortable header cell. */
function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th
      className="px-3 py-2.5"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wide transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  );
}

function TaskRow({
  task,
  done,
  today,
  deletable,
  onComplete,
  onEdit,
}: {
  task: StaffTask;
  done: boolean;
  today: string;
  deletable: boolean;
  /** V19 — completes via the lib store so recurring tasks roll forward. */
  onComplete: () => void;
  /** K1 — present on manual to-dos only; reminders edit on the profile. */
  onEdit?: () => void;
}) {
  const overdue = !done && task.due !== "" && task.due < today;
  const recurrence = recurrenceLabel(task);

  return (
    <tr
      className={cn(
        "border-b border-border/60 last:border-b-0",
        done ? "bg-muted/30" : "bg-surface/30",
      )}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          {done ? (
            <span
              aria-hidden
              className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-success/50 bg-success/15 text-success"
            >
              <Check className="h-3 w-3" />
            </span>
          ) : (
            <button
              type="button"
              aria-label={`Mark done: ${task.title}`}
              title="Mark done"
              onClick={onComplete}
              className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-muted-foreground/40 transition-colors hover:border-brand hover:bg-brand/10"
            />
          )}
          <div className="min-w-0 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "text-sm font-semibold",
                done && "font-medium text-muted-foreground line-through",
              )}
            >
              {task.title}
            </span>
            {recurrence ? <Pill tone="neutral">{recurrence}</Pill> : null}
          </div>
        </div>
      </td>
      <td className="tnum whitespace-nowrap px-3 py-2.5">
        <span
          className={cn(
            "text-xs font-medium",
            overdue ? "text-destructive" : "text-foreground/80",
            done && "text-muted-foreground",
          )}
        >
          {done
            ? `Done ${task.doneAt ? fmtDay(`${task.doneAt}T00:00:00`) : "today"}`
            : task.due
              ? fmtDay(`${task.due}T00:00:00`)
              : "No due date"}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
        {assigneeName(task)}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        {task.source === "reminder" ? (
          <span className="flex items-center gap-1.5">
            <Pill tone="info">Reminder</Pill>
            {task.athleteId ? (
              <Link
                href={`/staff/athletes/${task.athleteId}` as Route}
                className="text-xs font-medium text-brand-ink hover:underline"
              >
                {task.athleteName}
              </Link>
            ) : null}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Manual{task.createdBy ? ` · ${task.createdBy}` : ""}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <div className="flex items-center justify-end gap-0.5">
          {done ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTaskDone(task.id, false)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reopen
            </Button>
          ) : (
            <>
              {/* Round 18 (C8): 32px hit areas so the pencil is tappable
                  once the table is scrolled across on a phone */}
              {onEdit ? (
                <button
                  type="button"
                  aria-label={`Edit task: ${task.title}`}
                  title="Edit task"
                  onClick={onEdit}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {deletable ? (
                <button
                  type="button"
                  aria-label={`Delete task: ${task.title}`}
                  title="Delete task"
                  onClick={() => removeLocalTask(task.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
