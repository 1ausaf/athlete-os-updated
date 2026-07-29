"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Camera,
  Check,
  CheckSquare,
  IdCard,
  LinkIcon,
  Plus,
  Target,
  Trash2,
  UserCog,
  X,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Progress } from "@/components/app/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  athletes,
  bucketLabel,
  fmtDay,
  programDueDate,
  statusLabel,
  type Athlete,
  type AthleteStatus,
  type MemberBucket,
} from "@/lib/demo/data";
import {
  athleteChecklists,
  checklistTemplateById,
  checklistTemplates,
  type AthleteChecklist,
} from "@/lib/demo/checklists";
import {
  assignmentsForAthlete,
  staffMembers,
} from "@/lib/demo/staff";
import { cn } from "@/lib/utils";

/**
 * Round 4: the card modal is gone — its working parts live on the full
 * profile now. These are the interactive ones (status lifecycle, coach
 * assignments, checklists); the static sections stay server-rendered.
 */

const STATUS_TONE: Record<AthleteStatus, "success" | "info" | "warning" | "neutral"> = {
  active: "success",
  paused: "warning",
  inactive: "neutral",
};

const STATUS_HELP: Record<AthleteStatus, string> = {
  active: "Training normally — programs, booking and billing all run.",
  paused:
    "On hold (seasonal break or retention hold): login stays on, no programs run. The follow-up date drives the call.",
  inactive: "Account disabled — no login. The record stays unless deleted.",
};

export function StatusCard({ athlete }: { athlete: Athlete }) {
  const [status, setStatus] = useState<AthleteStatus>(athlete.status);
  const [followUp, setFollowUp] = useState<string>(
    athlete.followUpDate ? athlete.followUpDate.slice(0, 10) : "",
  );
  const [deleted, setDeleted] = useState(false);

  if (deleted) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Record deleted (demo — refresh restores it).
        </CardContent>
      </Card>
    );
  }

  const needsFollowUp = status === "paused";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Status</h3>
          <Pill tone={STATUS_TONE[status]} dot className="ml-auto">
            {statusLabel[status]}
          </Pill>
        </div>
        <select
          value={status}
          aria-label="Member status"
          onChange={(e) => setStatus(e.target.value as AthleteStatus)}
          className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
        >
          {(Object.keys(statusLabel) as AthleteStatus[]).map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground text-pretty">
          {STATUS_HELP[status]}
        </p>
        {needsFollowUp ? (
          <label className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 p-2.5">
            <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-xs font-medium text-muted-foreground">
              Follow up
            </span>
            <input
              type="date"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              aria-label="Follow-up date"
              className="tnum ml-auto rounded-md border border-input bg-card px-2 py-1 text-xs font-semibold"
            />
          </label>
        ) : null}
        {status === "inactive" ? (
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  `Delete ${athlete.name}'s record entirely? This can't be undone.`,
                )
              ) {
                setDeleted(true);
              }
            }}
            className="flex items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/[0.06] px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete record entirely
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function CoachesCard({ athlete }: { athlete: Athlete }) {
  const base = assignmentsForAthlete(athlete.id);
  const [programming, setProgramming] = useState(
    base.find((a) => a.role === "programming")?.staffId ?? "",
  );
  const [management, setManagement] = useState(
    base.find((a) => a.role === "management")?.staffId ?? "",
  );
  // C9: MULTIPLE assistant coaches — add appends underneath, each removable.
  const [assistants, setAssistants] = useState<string[]>(
    base.filter((a) => a.role === "assistant").map((a) => a.staffId),
  );

  const availableAssistants = staffMembers.filter(
    (s) => !assistants.includes(s.id),
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Coaches</h3>
        </div>
        <div className="flex flex-col gap-1.5">
          {(
            [
              { label: "Programming", value: programming, set: setProgramming },
              { label: "Management", value: management, set: setManagement },
            ] as const
          ).map(({ label, value, set }) => (
            <div
              key={label}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-2"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {label}
              </span>
              <select
                value={value}
                aria-label={`${label} coach`}
                onChange={(e) => set(e.target.value)}
                className="h-8 rounded-md border border-input bg-surface px-2 text-sm"
              >
                <option value="">—</option>
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Assistant coaches — a list, not a single slot (C9) */}
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start gap-2">
            <span className="pt-1.5 text-xs font-medium text-muted-foreground">
              Assistants
            </span>
            <div className="flex flex-col gap-1.5">
              {assistants.map((id) => {
                const s = staffMembers.find((m) => m.id === id);
                if (!s) return null;
                return (
                  <span
                    key={id}
                    className="flex items-center gap-2 rounded-md border border-border bg-surface/60 px-2 py-1 text-sm"
                  >
                    <AthleteAvatar
                      initials={s.initials}
                      hue={s.hue}
                      size="sm"
                      className="h-6 w-6 text-[0.55rem]"
                    />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${s.name} as assistant`}
                      onClick={() =>
                        setAssistants((prev) => prev.filter((a) => a !== id))
                      }
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                );
              })}
              <select
                value=""
                aria-label="Add assistant coach"
                onChange={(e) => {
                  if (e.target.value) {
                    setAssistants((prev) => [...prev, e.target.value]);
                  }
                }}
                className="h-8 rounded-md border border-dashed border-input bg-surface px-2 text-xs text-muted-foreground"
              >
                <option value="">+ Add assistant…</option>
                {availableAssistants.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <p className="text-[0.7rem] text-muted-foreground">
          Assignments drive who&apos;s in this member&apos;s chat thread and
          whose queue they appear in. Saves locally in this demo.
        </p>
      </CardContent>
    </Card>
  );
}

export function ChecklistsCard({ athlete }: { athlete: Athlete }) {
  const [checklists, setChecklists] = useState<AthleteChecklist[]>(
    athleteChecklists[athlete.id] ?? [],
  );

  function toggleItem(ci: number, ii: number) {
    setChecklists((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, checked: c.checked.map((v, j) => (j === ii ? !v : v)) }
          : c,
      ),
    );
  }

  function addChecklist(templateId: string) {
    const tpl = checklistTemplateById(templateId);
    if (!tpl) return;
    setChecklists((prev) => [
      ...prev,
      { templateId, checked: tpl.items.map(() => false) },
    ]);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Checklists</h3>
          <select
            value=""
            aria-label="Add checklist"
            onChange={(e) => {
              if (e.target.value) addChecklist(e.target.value);
            }}
            className="ml-auto h-8 rounded-md border border-input bg-surface px-2 text-xs"
          >
            <option value="">+ Add checklist…</option>
            {checklistTemplates
              .filter((t) => !checklists.some((c) => c.templateId === t.id))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>

        {checklists.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
            No checklist running — add Onboarding, Returning or Exit.
          </p>
        ) : (
          checklists.map((c, ci) => {
            const tpl = checklistTemplateById(c.templateId);
            if (!tpl) return null;
            const done = c.checked.filter(Boolean).length;
            const pct = Math.round((done / tpl.items.length) * 100);
            return (
              <details
                key={c.templateId}
                className="group rounded-lg border border-border bg-surface/40"
                open={pct < 100}
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{tpl.name}</span>
                  <span className="tnum ml-auto text-xs text-muted-foreground">
                    {done}/{tpl.items.length} · {pct}%
                  </span>
                </summary>
                <div className="px-3 pb-1">
                  <Progress value={pct} tone={pct === 100 ? "success" : "brand"} />
                </div>
                <ul className="flex flex-col gap-0.5 p-3 pt-2">
                  {tpl.items.map((item, ii) => (
                    <li key={ii}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-md p-1 transition-colors hover:bg-accent/40">
                        <input
                          type="checkbox"
                          checked={c.checked[ii] ?? false}
                          onChange={() => toggleItem(ci, ii)}
                          className="mt-0.5 h-3.5 w-3.5 accent-[hsl(var(--brand))]"
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-xs leading-snug",
                            c.checked[ii] && "text-muted-foreground line-through",
                          )}
                        >
                          <span className="mr-1 font-mono text-[0.6rem] font-bold text-muted-foreground">
                            [{item.owner}]
                          </span>
                          {item.label}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Trello-style editable details — carried over from the retired card modal
 * ("whatever is in those cards, we should put them into here somehow").
 * Click a field and change it; saves locally in the demo.
 */
export function DetailsCard({ athlete }: { athlete: Athlete }) {
  const [a, setA] = useState({
    bucket: athlete.bucket,
    sport: athlete.sport,
    yob: athlete.yearOfBirth,
    gender: athlete.gender,
    dueDate: programDueDate(athlete).slice(0, 10),
    nutrition: athlete.nutrition,
  });

  const patch = <K extends keyof typeof a>(key: K, value: (typeof a)[K]) =>
    setA((prev) => ({ ...prev, [key]: value }));

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <IdCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Details</h3>
          <span className="ml-auto text-[0.7rem] text-muted-foreground">
            Click a field to change it
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FieldSelect
            label="Membership"
            value={a.bucket}
            options={(Object.keys(bucketLabel) as MemberBucket[]).map((b) => ({
              value: b,
              label: bucketLabel[b],
            }))}
            onChange={(v) => patch("bucket", v as MemberBucket)}
          />
          <FocusField value={a.sport} onChange={(v) => patch("sport", v)} />
          <FieldInput
            label="YOB"
            value={String(a.yob)}
            numeric
            onCommit={(v) => {
              const n = Number(v);
              if (Number.isFinite(n) && n > 1900) patch("yob", n);
            }}
          />
          <FieldSelect
            label="Sex"
            value={a.gender}
            options={[
              { value: "M", label: "M" },
              { value: "F", label: "F" },
            ]}
            onChange={(v) => patch("gender", v as "M" | "F")}
          />
          {/* C7: a real DATE picker — the days-remaining chip stays derived */}
          <label className="flex flex-col gap-0.5">
            <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
              Program due
            </span>
            <input
              type="date"
              value={a.dueDate}
              onChange={(e) => patch("dueDate", e.target.value)}
              className="tnum h-8 rounded-md border border-transparent bg-surface/60 px-1.5 text-xs font-semibold transition-colors hover:border-input focus:border-input focus:outline-none"
            />
          </label>
          <FieldSelect
            label="Nutrition"
            value={a.nutrition}
            options={[
              { value: "none", label: "None" },
              { value: "standard", label: "Standard" },
              { value: "pro", label: "Pro" },
            ]}
            onChange={(v) => patch("nutrition", v as Athlete["nutrition"])}
          />
        </div>
      </CardContent>
    </Card>
  );
}

const ADD_NEW_FOCUS = "__add-new__";

/**
 * C5: Focus is a dropdown of EXISTING values (alphabetical) + "Add new…" —
 * no free-text typos fragmenting the filter list.
 */
function FocusField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [addingNew, setAddingNew] = useState(false);
  const [draft, setDraft] = useState("");
  const options = Array.from(
    new Set([...athletes.map((x) => x.sport), value]),
  ).sort();

  function commitNew() {
    const v = draft.trim();
    if (v) onChange(v);
    setAddingNew(false);
    setDraft("");
  }

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
        Focus
      </span>
      {addingNew ? (
        <input
          autoFocus
          value={draft}
          placeholder="New focus…"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitNew}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft("");
              setAddingNew(false);
            }
          }}
          className="h-8 rounded-md border border-input bg-surface/60 px-1.5 text-xs font-semibold focus:outline-none"
        />
      ) : (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === ADD_NEW_FOCUS) {
              setAddingNew(true);
            } else {
              onChange(e.target.value);
            }
          }}
          className="h-8 rounded-md border border-transparent bg-surface/60 px-1.5 text-xs font-semibold transition-colors hover:border-input"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value={ADD_NEW_FOCUS}>+ Add new…</option>
        </select>
      )}
    </label>
  );
}

/** Click-to-edit goals — also carried over from the card modal. */
export function GoalsCard({ initialGoal }: { initialGoal: string }) {
  const [goal, setGoal] = useState(initialGoal);
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-brand-ink" aria-hidden />
          <h3 className="text-base">Goal</h3>
        </div>
        {editing ? (
          <Textarea
            autoFocus
            rows={2}
            value={goal}
            className="text-sm"
            onChange={(e) => setGoal(e.target.value)}
            onBlur={() => setEditing(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Click to edit"
            className="-m-1 rounded-md p-1 text-left text-sm leading-relaxed text-foreground/90 transition-colors hover:bg-accent/50"
          >
            {goal || "Click to add a goal…"}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-transparent bg-surface/60 px-1.5 text-xs font-semibold transition-colors hover:border-input"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldInput({
  label,
  value,
  numeric = false,
  onCommit,
}: {
  label: string;
  value: string;
  numeric?: boolean;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        value={draft}
        inputMode={numeric ? "numeric" : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-8 rounded-md border border-transparent bg-surface/60 px-1.5 text-xs font-semibold transition-colors hover:border-input focus:border-input focus:outline-none"
      />
    </label>
  );
}

/** Compact "Current program" side card ("this can be smaller on the side"). */
export function CompactProgramCard({ athlete }: { athlete: Athlete }) {
  const pct =
    athlete.program.totalDays > 0
      ? Math.round((athlete.program.day / athlete.program.totalDays) * 100)
      : 0;
  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="eyebrow">Current program</span>
          <span className="tnum text-xs text-muted-foreground">
            Day {athlete.program.day}/{athlete.program.totalDays}
          </span>
        </div>
        <p className="text-sm font-semibold leading-snug">
          {athlete.program.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {athlete.program.phase} phase · {athlete.frequency}
        </p>
        <Progress value={pct} />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* C3 — dynamic link chips ("we never know what software we're gonna   */
/* change to"): default stack, add custom label+URL, remove any.       */
/* ------------------------------------------------------------------ */

interface ProfileLink {
  label: string;
  url: string;
}

const DEFAULT_LINKS: ProfileLink[] = [
  { label: "Drive", url: "https://drive.google.com" },
  { label: "Quo", url: "https://quo.com" },
  { label: "Google Contact", url: "https://contacts.google.com" },
  { label: "Brevo", url: "https://brevo.com" },
  { label: "Square", url: "https://squareup.com" },
];

export function LinkChips({ athleteId }: { athleteId: string }) {
  const storageKey = `aos-links-${athleteId}`;
  const [links, setLinks] = useState<ProfileLink[]>(DEFAULT_LINKS);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setLinks(JSON.parse(raw) as ProfileLink[]);
    } catch {
      /* corrupted storage — keep defaults */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(links));
    } catch {
      /* storage full/blocked — chips still work in-memory */
    }
  }, [links, loaded, storageKey]);

  function addLink() {
    const l = label.trim();
    if (!l) return;
    const u = url.trim();
    setLinks((prev) => [
      ...prev,
      { label: l, url: u && !/^https?:\/\//.test(u) ? `https://${u}` : u },
    ]);
    setLabel("");
    setUrl("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {links.map((link, i) => (
          <span
            key={`${link.label}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          >
            <LinkIcon className="h-3 w-3" aria-hidden />
            {link.url ? (
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              link.label
            )}
            <button
              type="button"
              aria-label={`Remove ${link.label} link`}
              onClick={() =>
                setLinks((prev) => prev.filter((_, j) => j !== i))
              }
              className="ml-0.5 rounded-full p-0.5 transition-colors hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
          >
            <Plus className="h-3 w-3" />
            Add link
          </button>
        ) : null}
      </div>
      {adding ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-brand/30 bg-brand/[0.03] p-2.5">
          <div className="grid gap-1">
            <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
              Label
            </span>
            <Input
              autoFocus
              value={label}
              placeholder="e.g. TrueCoach"
              className="h-8 w-36 text-xs"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
              URL
            </span>
            <Input
              value={url}
              placeholder="https://…"
              className="h-8 w-48 text-xs"
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addLink();
              }}
            />
          </div>
          <Button
            variant="brand"
            size="sm"
            disabled={!label.trim()}
            onClick={addLink}
          >
            Add
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <p className="text-[0.7rem] text-muted-foreground">
          The external stack changes — add or remove links any time. Saves
          locally in this demo.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* C11 — avatar with an upload affordance (staff can change a client's */
/* photo; avatars surface on the roster + huddle so coaches recognize  */
/* faces).                                                             */
/* ------------------------------------------------------------------ */

export function AvatarUpload({
  initials,
  hue,
  name,
}: {
  initials: string;
  hue: number;
  name: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [updated, setUpdated] = useState(false);

  return (
    <span className="relative inline-flex shrink-0">
      <AthleteAvatar initials={initials} hue={hue} size="xl" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label={`Change ${name}'s photo`}
        title={
          updated
            ? "Photo updated (saves locally in this demo)"
            : "Change photo"
        }
        className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
      >
        {updated ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) setUpdated(true);
          e.target.value = "";
        }}
      />
    </span>
  );
}

/** Follow-up strip shown at the top for away/paused members. */
export function FollowUpBanner({ athlete }: { athlete: Athlete }) {
  if (athlete.status === "active" || !athlete.followUpDate) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3.5 text-sm font-medium",
        athlete.status === "paused"
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-info/40 bg-info/10 text-info",
      )}
    >
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        {statusLabel[athlete.status]} member — follow up{" "}
        {fmtDay(athlete.followUpDate)} — the retention call.
      </span>
    </div>
  );
}
