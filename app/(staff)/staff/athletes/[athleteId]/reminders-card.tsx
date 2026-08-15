"use client";

import { useEffect, useState } from "react";
import { BellRing, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { fmtDay } from "@/lib/demo/data";
import { staffMembers } from "@/lib/demo/staff";
import { cn } from "@/lib/utils";

/**
 * Round 10 (R15) — Alerts & Reminders on the member profile: re-testing
 * timelines, "back from season" follow-ups, birthdays. One-time or recurring,
 * aimed at everyone involved with the member or a picked set of staff.
 * Persists per athlete in localStorage; seeded from the athlete's demo
 * reminder strings so the card is never empty.
 */

const FIELD_LABEL =
  "text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground";

type ReminderFrequency = "weekly" | "monthly" | "quarterly";

const FREQUENCY_LABEL: Record<ReminderFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Every 3 months",
};

interface Reminder {
  id: string;
  name: string;
  recurring: boolean;
  /** yyyy-mm-dd; "" = no date set yet. */
  date: string;
  frequency?: ReminderFrequency;
  /** Staff ids to notify; empty = everyone involved with the member. */
  staffIds: string[];
}

function whoLabel(r: Reminder): string {
  if (r.staffIds.length === 0) return "Everyone involved";
  return r.staffIds
    .map((id) => staffMembers.find((s) => s.id === id)?.name ?? id)
    .join(", ");
}

export function RemindersCard({
  athleteId,
  seedReminders,
}: {
  athleteId: string;
  /** athlete.reminders strings — seeded as one-time, everyone-involved rows. */
  seedReminders: string[];
}) {
  const storageKey = `aos-reminders-${athleteId}`;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loaded, setLoaded] = useState(false);
  // The add/edit form — editingId null = adding a new reminder.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [date, setDate] = useState("");
  const [frequency, setFrequency] = useState<ReminderFrequency>("monthly");
  const [everyone, setEveryone] = useState(true);
  const [staffChecks, setStaffChecks] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Reminder[];
        if (Array.isArray(parsed)) {
          setReminders(parsed);
          setLoaded(true);
          return;
        }
      }
    } catch {
      /* corrupted storage — fall through to seeds */
    }
    // Seed from the athlete's demo reminder strings: one-time, everyone.
    setReminders(
      seedReminders.map((s, i) => ({
        id: `rem-seed-${i}`,
        name: s,
        recurring: false,
        date: "",
        staffIds: [],
      })),
    );
    setLoaded(true);
    // seedReminders is static demo data — only the athlete drives reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(reminders));
    } catch {
      /* storage full/blocked — reminders still work in-memory */
    }
  }, [reminders, loaded, storageKey]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setRecurring(false);
    setDate("");
    setFrequency("monthly");
    setEveryone(true);
    setStaffChecks(new Set());
  }

  function openAdd() {
    resetForm();
    setFormOpen(true);
  }

  function openEdit(r: Reminder) {
    setEditingId(r.id);
    setName(r.name);
    setRecurring(r.recurring);
    setDate(r.date);
    setFrequency(r.frequency ?? "monthly");
    setEveryone(r.staffIds.length === 0);
    setStaffChecks(new Set(r.staffIds));
    setFormOpen(true);
  }

  function toggleStaff(id: string) {
    setStaffChecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canSave = name.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const entry: Reminder = {
      id: editingId ?? `rem-${Date.now()}`,
      name: name.trim(),
      recurring,
      date,
      frequency: recurring ? frequency : undefined,
      staffIds: everyone ? [] : Array.from(staffChecks),
    };
    setReminders((prev) =>
      editingId
        ? prev.map((r) => (r.id === editingId ? entry : r))
        : [...prev, entry],
    );
    resetForm();
    setFormOpen(false);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Alerts &amp; Reminders</h3>
          {!formOpen ? (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" />
              Add Reminder
            </Button>
          ) : null}
        </div>

        {reminders.length === 0 && !formOpen ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
            No reminders yet — add the first one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reminders.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold">{r.name}</span>
                    <Pill tone={r.recurring ? "info" : "neutral"}>
                      {r.recurring
                        ? FREQUENCY_LABEL[r.frequency ?? "monthly"]
                        : "One-time"}
                    </Pill>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="tnum font-medium text-foreground/80">
                      {r.date ? fmtDay(`${r.date}T00:00:00`) : "—"}
                    </span>{" "}
                    · {whoLabel(r)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Edit reminder: ${r.name}`}
                  title="Edit reminder"
                  onClick={() => openEdit(r)}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete reminder: ${r.name}`}
                  title="Delete reminder"
                  onClick={() =>
                    setReminders((prev) => prev.filter((x) => x.id !== r.id))
                  }
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {formOpen ? (
          <div className="flex flex-col gap-3 rounded-lg border border-brand/30 bg-brand/[0.03] p-3">
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Reminder</span>
              <Input
                autoFocus
                value={name}
                placeholder="e.g. Re-test vertical jump"
                className="h-9 bg-surface text-sm"
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Repeats</span>
                <div className="flex overflow-hidden rounded-md border border-input">
                  {(
                    [
                      { label: "One-time", value: false },
                      { label: "Recurring", value: true },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setRecurring(opt.value)}
                      aria-pressed={recurring === opt.value}
                      className={cn(
                        "h-9 px-3 text-sm font-medium transition-colors",
                        recurring === opt.value
                          ? "bg-brand/15 text-brand-ink"
                          : "bg-surface text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>
                  {recurring ? "First date" : "Date"}
                </span>
                <input
                  type="date"
                  value={date}
                  aria-label="Reminder date"
                  onChange={(e) => setDate(e.target.value)}
                  className="tnum h-9 rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
                />
              </label>
              {recurring ? (
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Frequency</span>
                  <select
                    value={frequency}
                    aria-label="Reminder frequency"
                    onChange={(e) =>
                      setFrequency(e.target.value as ReminderFrequency)
                    }
                    className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
                  >
                    {(Object.keys(FREQUENCY_LABEL) as ReminderFrequency[]).map(
                      (f) => (
                        <option key={f} value={f}>
                          {FREQUENCY_LABEL[f]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL}>Remind who</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`rem-who-${athleteId}`}
                    checked={everyone}
                    onChange={() => setEveryone(true)}
                    className="h-3.5 w-3.5 accent-[hsl(var(--brand))]"
                  />
                  Everyone involved
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`rem-who-${athleteId}`}
                    checked={!everyone}
                    onChange={() => setEveryone(false)}
                    className="h-3.5 w-3.5 accent-[hsl(var(--brand))]"
                  />
                  Selected staff
                </label>
              </div>
              {!everyone ? (
                <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-2">
                  {staffMembers.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={staffChecks.has(s.id)}
                        onChange={() => toggleStaff(s.id)}
                        className="h-3.5 w-3.5 accent-[hsl(var(--brand))]"
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 border-t border-border/60 pt-2.5">
              <Button
                variant="brand"
                size="sm"
                disabled={!canSave}
                onClick={handleSave}
              >
                {editingId ? "Save reminder" : "Add reminder"}
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

        <p className="text-[0.7rem] text-muted-foreground text-pretty">
          Reminders notify everyone involved with this member — retesting
          timelines, back-from-season follow-ups… Saves locally in this demo.
        </p>
      </CardContent>
    </Card>
  );
}
