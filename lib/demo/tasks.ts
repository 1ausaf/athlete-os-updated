/**
 * Round 12 (N21): staff To-Do / Tasks.
 *
 * One list for the whole coaching staff: manual tasks (added and assigned by
 * coaches, or seeded by owners/admins as recurring projects) plus every
 * member's Alerts & Reminders rolled in, so upcoming work lives in one place.
 *
 * Demo persistence: seeds below + localStorage for added tasks and for
 * done-state overrides. Reminder rows come from the same per-athlete store
 * the profile RemindersCard writes (`aos-reminders-{athleteId}`), falling
 * back to each athlete's seeded reminder strings when the profile was never
 * opened in this browser.
 */

import { athletes } from "@/lib/demo/data";

export interface StaffTask {
  id: string;
  title: string;
  /** yyyy-mm-dd; "" = no due date. */
  due: string;
  /** Staff id, or "" = unassigned/everyone. */
  assigneeId: string;
  done: boolean;
  doneAt?: string;
  source: "manual" | "reminder";
  /** Reminder-sourced tasks point back at their member. */
  athleteId?: string;
  athleteName?: string;
  createdBy?: string;
  recurrence?: "weekly" | "monthly" | "quarterly";
}

export const TASKS_KEY = "aos-tasks";
export const TASKS_STATE_KEY = "aos-tasks-state";
/** Round 13 (K1): field edits layered over any manual task (seed or local). */
export const TASKS_EDITS_KEY = "aos-tasks-edits";
export const TASKS_EVENT = "aos-tasks-changed";

export type TaskEdit = Partial<
  Pick<StaffTask, "title" | "due" | "assigneeId" | "recurrence">
>;

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Owner/admin-seeded projects + a few coach to-dos. */
export const taskSeeds: StaffTask[] = [
  {
    id: "task-seed-1",
    title: "Quarterly equipment + platform audit",
    due: isoDay(12),
    assigneeId: "coach-ellis",
    done: false,
    source: "manual",
    createdBy: "Jeremy Choi",
    recurrence: "quarterly",
  },
  {
    id: "task-seed-2",
    title: "Load fall block openings into the schedule",
    due: isoDay(3),
    assigneeId: "admin-victoria",
    done: false,
    source: "manual",
    createdBy: "Jeremy Choi",
  },
  {
    id: "task-seed-3",
    title: "Call Tigers HPP program director re: winter block",
    due: isoDay(1),
    assigneeId: "coach-nadia",
    done: false,
    source: "manual",
    createdBy: "Coach Clance",
  },
  {
    id: "task-seed-4",
    title: "Weekly floor walkthrough — rack pins + bands",
    due: isoDay(-1),
    assigneeId: "coach-ellis",
    done: true,
    doneAt: isoDay(-1),
    source: "manual",
    createdBy: "Jeremy Choi",
    recurrence: "weekly",
  },
];

interface StoredReminder {
  id: string;
  name: string;
  recurring: boolean;
  date: string;
  frequency?: "weekly" | "monthly" | "quarterly";
  staffIds: string[];
}

/**
 * Every member reminder as a task row. Reads the per-athlete localStorage
 * stores the profile RemindersCard maintains; athletes whose store was never
 * created fall back to their seeded reminder strings.
 */
export function reminderTasks(): StaffTask[] {
  const rows: StaffTask[] = [];
  for (const a of athletes) {
    let reminders: StoredReminder[] | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(`aos-reminders-${a.id}`);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredReminder[];
          if (Array.isArray(parsed)) reminders = parsed;
        }
      } catch {
        /* corrupted store — use the seeds */
      }
    }
    const list: StoredReminder[] =
      reminders ??
      a.reminders.map((s, i) => ({
        id: `rem-seed-${i}`,
        name: s,
        recurring: false,
        date: "",
        staffIds: [],
      }));
    for (const r of list) {
      rows.push({
        id: `task-rem-${a.id}-${r.id}`,
        title: r.name,
        due: r.date,
        assigneeId: r.staffIds[0] ?? "",
        done: false,
        source: "reminder",
        athleteId: a.id,
        athleteName: a.name,
        recurrence: r.recurring ? (r.frequency ?? "monthly") : undefined,
      });
    }
  }
  return rows;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(TASKS_EVENT));
}

/** Tasks added in this browser (on top of the seeds). */
export function readLocalTasks(): StaffTask[] {
  return readJson<StaffTask[]>(TASKS_KEY, []);
}

export function appendLocalTask(task: StaffTask): void {
  writeJson(TASKS_KEY, [task, ...readLocalTasks()]);
}

export function removeLocalTask(id: string): void {
  writeJson(
    TASKS_KEY,
    readLocalTasks().filter((t) => t.id !== id),
  );
  // Drop the task's done-state override too, so nothing orphans.
  const overrides = taskStateOverrides();
  if (id in overrides) {
    delete overrides[id];
    writeJson(TASKS_STATE_KEY, overrides);
  }
}

/** Done-state overrides, keyed by task id (covers seeds + reminder rows). */
export function taskStateOverrides(): Record<
  string,
  { done: boolean; doneAt?: string }
> {
  return readJson(TASKS_STATE_KEY, {});
}

export function setTaskDone(id: string, done: boolean): void {
  writeJson(TASKS_STATE_KEY, {
    ...taskStateOverrides(),
    [id]: { done, doneAt: done ? isoDay(0) : undefined },
  });
}

/** Round 14 (V19): the recurrence interval in days (month ≈ 30, quarter 91). */
const RECURRENCE_DAYS: Record<NonNullable<StaffTask["recurrence"]>, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 91,
};

/**
 * Round 14 (V19): completing a task. Recurring tasks ROLL — this occurrence
 * lands in Completed AND the next one appears in To Do with the due date
 * advanced by the recurrence interval.
 */
export function completeTask(task: StaffTask): void {
  setTaskDone(task.id, true);
  if (!task.recurrence) return;
  const base = task.due ? new Date(`${task.due}T12:00:00`) : new Date();
  base.setDate(base.getDate() + RECURRENCE_DAYS[task.recurrence]);
  appendLocalTask({
    ...task,
    id: `task-recur-${task.id}-${base.getTime()}`,
    due: base.toISOString().slice(0, 10),
    done: false,
    doneAt: undefined,
    source: "manual",
  });
}

/** Round 14 (V18): open tasks that are overdue or due within a day. */
export function dueSoonCount(): number {
  const cutoff = isoDay(1);
  return allTasks().filter((t) => !t.done && t.due !== "" && t.due <= cutoff)
    .length;
}

/** Round 13 (K1): per-task field edits (title/due/assignee/recurrence). */
export function taskEditOverrides(): Record<string, TaskEdit> {
  return readJson(TASKS_EDITS_KEY, {});
}

export function setTaskEdit(id: string, edit: TaskEdit): void {
  writeJson(TASKS_EDITS_KEY, { ...taskEditOverrides(), [id]: edit });
}

/** The full merged list: local + seeds + member reminders, overrides applied. */
export function allTasks(): StaffTask[] {
  const overrides = taskStateOverrides();
  const edits = taskEditOverrides();
  return [...readLocalTasks(), ...taskSeeds, ...reminderTasks()].map((t) => {
    const o = overrides[t.id];
    const e = t.source === "manual" ? edits[t.id] : undefined;
    let next = t;
    if (e) next = { ...next, ...e };
    if (o) next = { ...next, done: o.done, doneAt: o.doneAt };
    return next;
  });
}
