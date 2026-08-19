"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  CreditCard,
  GripVertical,
  IdCard,
  KeyRound,
  LinkIcon,
  Pencil,
  Plus,
  Send,
  Settings2,
  Target,
  Trash2,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  athleteById,
  athletes,
  bucketLabel,
  fmtDay,
  money2,
  parentsOfAthlete,
  statusLabel,
  type Athlete,
  type AthleteProfile,
  type AthleteStatus,
} from "@/lib/demo/data";
import { billingMeta } from "@/lib/demo/status";
import {
  assignmentsForAthlete,
  staffMembers,
} from "@/lib/demo/staff";
import { cn } from "@/lib/utils";

/**
 * Round 6 profile panels, round-8 pass: the Type/Focus manage gears and
 * Delete Member are admin-only (C15); Instagram is a selectable @handle and
 * email a mailto link (C16); coaches see only the billing status pill (C18).
 * The links editor and management card are exported for the group profile to
 * reuse (C21). Round 12: the nutrition editor moved to its own /nutrition
 * page (N4/N5) and AvatarUpload to components/app/avatar-upload (N20).
 */

const STATUS_TONE: Record<AthleteStatus, "success" | "info" | "warning" | "neutral"> = {
  active: "success",
  paused: "warning",
  inactive: "neutral",
};

const FIELD_LABEL =
  "text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground";

/* ------------------------------------------------------------------ */
/* P9 — ManagedSelect: a dropdown whose OPTIONS are manageable         */
/* (add / rename / delete) from a small gear popover; the option list  */
/* persists in localStorage.                                           */
/* ------------------------------------------------------------------ */

export function ManagedSelect({
  label,
  storageKey,
  defaults,
  value,
  onChange,
  manageable = true,
}: {
  label: string;
  storageKey: string;
  defaults: string[];
  value: string;
  onChange: (v: string) => void;
  /** C15 — the manage gear (add/rename/delete options) is admin-only. */
  manageable?: boolean;
}) {
  const [options, setOptions] = useState<string[]>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [addDraft, setAddDraft] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) setOptions(parsed);
      }
    } catch {
      /* corrupted storage — keep defaults */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(options));
    } catch {
      /* storage full/blocked — options still work in-memory */
    }
  }, [options, loaded, storageKey]);

  // The current value always renders, even if its option was deleted.
  const shown = options.includes(value) ? options : [value, ...options];

  function addOption() {
    const v = addDraft.trim();
    setAddDraft("");
    if (!v || options.includes(v)) return;
    setOptions((prev) => [...prev, v]);
  }

  function commitRename(i: number) {
    const next = editDraft.trim();
    setEditIdx(null);
    if (!next || next === options[i] || options.includes(next)) return;
    const prevName = options[i];
    setOptions((prev) => prev.map((o, j) => (j === i ? next : o)));
    if (value === prevName) onChange(next);
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn(FIELD_LABEL, "flex items-center justify-between")}>
        {label}
        {manageable ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`Manage ${label} options`}
            title={`Manage ${label} options — add, rename or delete`}
            className="rounded p-0.5 transition-colors hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </span>
      <div className="relative">
        <select
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
        >
          {shown.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {open ? (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-border bg-popover p-2 shadow-raised">
              <p className="eyebrow px-1.5 pb-1.5">{label} options</p>
              <ul className="flex flex-col gap-0.5">
                {options.map((o, i) => (
                  <li
                    key={`${o}-${i}`}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/40"
                  >
                    {editIdx === i ? (
                      <input
                        autoFocus
                        value={editDraft}
                        aria-label={`Rename ${o}`}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onBlur={() => commitRename(i)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") setEditIdx(null);
                        }}
                        className="h-7 min-w-0 flex-1 rounded border border-input bg-surface px-1.5 text-sm focus:outline-none"
                      />
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate">{o}</span>
                        <button
                          type="button"
                          aria-label={`Rename ${o}`}
                          title="Rename"
                          onClick={() => {
                            setEditIdx(i);
                            setEditDraft(o);
                          }}
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${o}`}
                          title="Delete"
                          onClick={() =>
                            setOptions((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 flex items-center gap-1.5 border-t border-border/60 pt-1.5">
                <Input
                  value={addDraft}
                  placeholder="Add option…"
                  className="h-7 flex-1 text-xs"
                  onChange={(e) => setAddDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addOption();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={!addDraft.trim()}
                  aria-label={`Add ${label} option`}
                  onClick={addOption}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* P9 — Details: status lifecycle, manageable Type/Focus, Sex,         */
/* Birthday "mmm-dd-yyyy (age)" and the double-confirm Delete Member.  */
/* ------------------------------------------------------------------ */

function birthdayLabel(dob: string | undefined, yearOfBirth: number): string {
  if (!dob) {
    return `${yearOfBirth} (${new Date().getFullYear() - yearOfBirth})`;
  }
  const d = new Date(`${dob.slice(0, 10)}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}-${day}-${d.getFullYear()} (${age})`;
}

export function DetailsCard({
  athlete,
  dob,
  admin,
}: {
  athlete: Athlete;
  dob?: string;
  /** C15 — manage gears + Delete Member render for admin/owner only. */
  admin: boolean;
}) {
  const [status, setStatus] = useState<AthleteStatus>(athlete.status);
  const [followUp, setFollowUp] = useState<string>(
    athlete.followUpDate ? athlete.followUpDate.slice(0, 10) : "",
  );
  const [bucket, setBucket] = useState(bucketLabel[athlete.bucket]);
  const [focus, setFocus] = useState(athlete.sport);
  // Round 11 (M30): identity fields are admin-editable from the staff side —
  // names seed from the display-name split, sex/birthday from the record.
  const [firstName, setFirstName] = useState(
    () => athlete.name.split(" ")[0] ?? "",
  );
  const [lastName, setLastName] = useState(() =>
    athlete.name.split(" ").slice(1).join(" "),
  );
  const [sex, setSex] = useState(athlete.gender === "M" ? "Male" : "Female");
  const [birthDate, setBirthDate] = useState(dob ? dob.slice(0, 10) : "");
  const [deleted, setDeleted] = useState(false);
  // Delete Member is a two-step confirm: the first click ARMS the button for
  // ~4s ("Really delete?…"), the second click within that window deletes.
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (armTimer.current) window.clearTimeout(armTimer.current);
    },
    [],
  );

  const focusDefaults = Array.from(
    new Set([...athletes.map((a) => a.sport), athlete.sport]),
  ).sort();

  if (deleted) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Member deleted (demo — refresh restores the record).
        </CardContent>
      </Card>
    );
  }

  function handleDeleteClick() {
    if (!armed) {
      setArmed(true);
      armTimer.current = window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (armTimer.current) window.clearTimeout(armTimer.current);
    setDeleted(true);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <IdCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Details</h3>
          <Pill tone={STATUS_TONE[status]} dot className="ml-auto">
            {statusLabel[status]}
          </Pill>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex flex-col gap-0.5">
            <span className={FIELD_LABEL}>Status</span>
            <select
              value={status}
              aria-label="Member status"
              onChange={(e) => setStatus(e.target.value as AthleteStatus)}
              className="h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
            >
              {(Object.keys(statusLabel) as AthleteStatus[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </label>

          {status === "paused" ? (
            <label className="col-span-2 flex items-center gap-2 rounded-lg border border-border bg-surface/50 p-2.5">
              <CalendarClock
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
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

          {/* Round 11 (M30): admins fix names/sex/birthday right here —
              non-admin staff keep the read-only view */}
          {admin ? (
            <>
              <label className="flex flex-col gap-0.5">
                <span className={FIELD_LABEL}>First name</span>
                <Input
                  value={firstName}
                  aria-label="First name"
                  className="h-9"
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className={FIELD_LABEL}>Last name</span>
                <Input
                  value={lastName}
                  aria-label="Last name"
                  className="h-9"
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
            </>
          ) : null}

          <ManagedSelect
            label="Type"
            storageKey="aos-member-type-options"
            defaults={Object.values(bucketLabel)}
            value={bucket}
            onChange={setBucket}
            manageable={admin}
          />
          <ManagedSelect
            label="Focus"
            storageKey="aos-member-focus-options"
            defaults={focusDefaults}
            value={focus}
            onChange={setFocus}
            manageable={admin}
          />

          {admin ? (
            <label className="flex flex-col gap-0.5">
              <span className={FIELD_LABEL}>Sex</span>
              <select
                value={sex}
                aria-label="Sex"
                onChange={(e) => setSex(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
              >
                {["Male", "Female", "Non-binary", "Prefer not to say"].map(
                  (o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ),
                )}
              </select>
            </label>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className={FIELD_LABEL}>Sex</span>
              <div className="flex h-9 items-center rounded-md bg-surface/60 px-2.5 text-sm font-medium">
                {athlete.gender}
              </div>
            </div>
          )}
          {admin ? (
            <label className="flex flex-col gap-0.5">
              <span className={FIELD_LABEL}>Birthday</span>
              <input
                type="date"
                value={birthDate}
                aria-label="Birthday"
                onChange={(e) => setBirthDate(e.target.value)}
                className="tnum h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
              />
            </label>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className={FIELD_LABEL}>Birthday</span>
              <div className="tnum flex h-9 items-center rounded-md bg-surface/60 px-2.5 text-sm font-medium">
                {birthdayLabel(dob, athlete.yearOfBirth)}
              </div>
            </div>
          )}
        </div>

        {/* C15 — deleting a member is admin/owner only; Round 13 (S3): the
            status blurb + demo-save line are gone, so the footer only
            renders when there's a delete action to hold */}
        {admin ? (
          <div className="flex justify-end border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={handleDeleteClick}
              className={cn(
                "text-right text-xs transition-colors",
                armed
                  ? "font-semibold text-destructive"
                  : "text-muted-foreground/70 hover:text-destructive",
              )}
            >
              {armed ? (
                <>Really delete? This can&apos;t be undone — click again to confirm</>
              ) : (
                "Delete Member"
              )}
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* P11 — Contact & Links: the external stack as full-width button rows */
/* with pencil edit, plus member and parent/emergency contact columns. */
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

function normalizeUrl(u: string): string {
  const v = u.trim();
  return v && !/^https?:\/\//.test(v) ? `https://${v}` : v;
}

/** Round 13 (S7): tel: href — digits (and a leading +) only, pretty text stays. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

/** The editable external-link rows — shared by the member profile's Contact &
 *  Links card and the group profile's Links card (C21). */
export function LinksEditor({
  storageKey,
  defaults = DEFAULT_LINKS,
}: {
  storageKey: string;
  defaults?: ProfileLink[];
}) {
  const [links, setLinks] = useState<ProfileLink[]>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addUrl, setAddUrl] = useState("");
  // Round 13 (S5): native HTML5 drag-to-reorder (program-builder idiom);
  // the whole list lives in one state array, so the order persists as-is.
  const [dragIdx, setDragIdx] = useState<number | null>(null);

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
      /* storage full/blocked — links still work in-memory */
    }
  }, [links, loaded, storageKey]);

  function saveEdit(i: number) {
    const l = editLabel.trim();
    if (!l) return;
    const u = normalizeUrl(editUrl);
    setLinks((prev) =>
      prev.map((link, j) => (j === i ? { label: l, url: u } : link)),
    );
    setEditIdx(null);
  }

  function addLink() {
    const l = addLabel.trim();
    if (!l) return;
    setLinks((prev) => [...prev, { label: l, url: normalizeUrl(addUrl) }]);
    setAddLabel("");
    setAddUrl("");
    setAdding(false);
  }

  /** S5 — drop the dragged row at index i (persisted via the links effect). */
  function dropOn(i: number) {
    if (dragIdx === null || dragIdx === i) return;
    setLinks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      if (!moved) return prev;
      next.splice(i, 0, moved);
      return next;
    });
    setDragIdx(null);
  }

  return (
    <div>
      <div className="mt-2 flex flex-col gap-1.5">
            {links.map((link, i) =>
              editIdx === i ? (
                <div
                  key={`edit-${link.label}-${i}`}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-brand/30 bg-brand/[0.03] p-2.5"
                >
                  <div className="grid gap-1">
                    <span className={FIELD_LABEL}>Label</span>
                    <Input
                      autoFocus
                      value={editLabel}
                      className="h-8 w-36 text-xs"
                      onChange={(e) => setEditLabel(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <span className={FIELD_LABEL}>URL</span>
                    <Input
                      value={editUrl}
                      placeholder="https://…"
                      className="h-8 w-48 text-xs"
                      onChange={(e) => setEditUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(i);
                      }}
                    />
                  </div>
                  <Button
                    variant="brand"
                    size="sm"
                    disabled={!editLabel.trim()}
                    onClick={() => saveEdit(i)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditIdx(null)}
                  >
                    Cancel
                  </Button>
                  <button
                    type="button"
                    aria-label={`Remove ${link.label} link`}
                    title="Remove link"
                    onClick={() => {
                      setLinks((prev) => prev.filter((_, j) => j !== i));
                      setEditIdx(null);
                    }}
                    className="ml-auto rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  key={`${link.label}-${i}`}
                  onDragOver={(ev) => {
                    if (dragIdx !== null && dragIdx !== i) {
                      ev.preventDefault();
                      ev.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    dropOn(i);
                  }}
                  className={cn(
                    "flex h-9 w-full items-stretch overflow-hidden rounded-md border border-input bg-surface text-sm font-medium",
                    dragIdx === i && "opacity-50",
                  )}
                >
                  {/* Round 13 (S5): grab here to reorder */}
                  <span
                    draggable
                    role="button"
                    aria-label={`Drag to reorder ${link.label}`}
                    title="Drag to reorder"
                    onDragStart={(ev) => {
                      ev.dataTransfer.effectAllowed = "move";
                      ev.dataTransfer.setData("text/plain", link.label);
                      setDragIdx(i);
                    }}
                    onDragEnd={() => setDragIdx(null)}
                    className="flex cursor-grab items-center border-r border-border/60 px-1.5 text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 transition-colors hover:bg-accent/50"
                    >
                      <LinkIcon
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="truncate">{link.label}</span>
                    </a>
                  ) : (
                    <span className="flex min-w-0 flex-1 items-center gap-2 px-3">
                      <LinkIcon
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="truncate">{link.label}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Edit ${link.label} link`}
                    title="Edit label + URL"
                    onClick={() => {
                      setEditIdx(i);
                      setEditLabel(link.label);
                      setEditUrl(link.url);
                      setAdding(false);
                    }}
                    className="flex items-center border-l border-border/60 px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            )}

            {adding ? (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-brand/30 bg-brand/[0.03] p-2.5">
                <div className="grid gap-1">
                  <span className={FIELD_LABEL}>Label</span>
                  <Input
                    autoFocus
                    value={addLabel}
                    placeholder="e.g. TrueCoach"
                    className="h-8 w-36 text-xs"
                    onChange={(e) => setAddLabel(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <span className={FIELD_LABEL}>URL</span>
                  <Input
                    value={addUrl}
                    placeholder="https://…"
                    className="h-8 w-48 text-xs"
                    onChange={(e) => setAddUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addLink();
                    }}
                  />
                </div>
                <Button
                  variant="brand"
                  size="sm"
                  disabled={!addLabel.trim()}
                  onClick={addLink}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAdding(true);
                  setEditIdx(null);
                }}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
              >
                <Plus className="h-3.5 w-3.5" />
                Add link
              </button>
            )}
          </div>
    </div>
  );
}

export function ContactLinksCard({
  athlete,
  profile,
}: {
  athlete: Athlete;
  profile?: AthleteProfile;
}) {
  const guardian = profile?.guardian;
  const emergency = profile?.emergencyContact;
  // C16 — the app renders the @ itself; stored handles may carry one or not.
  const igHandle = profile?.instagram?.replace(/^@/, "");

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <IdCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Contact &amp; Links</h3>
        </div>

        {/* Links — full-width rows; Program/Assessment/Chat live in the top
            buttons now, so only the external stack remains here. */}
        <div>
          <span className="eyebrow">Links</span>
          <LinksEditor storageKey={`aos-links-${athlete.id}`} />
        </div>

        {/* Contact — member on the left, parent/emergency on the right */}
        <div>
          <span className="eyebrow">Contact</span>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 text-sm">
              <p className={FIELD_LABEL}>Member</p>
              <p className="font-medium">{athlete.name}</p>
              {profile ? (
                <>
                  {/* S7 — phones dial on tap */}
                  <p>
                    <a
                      href={telHref(profile.phone)}
                      className="text-brand-ink underline-offset-2 hover:underline"
                    >
                      {profile.phone}
                    </a>
                  </p>
                  {/* C16 — email is a mailto link */}
                  <p className="break-words">
                    <a
                      href={`mailto:${profile.email}`}
                      className="text-brand-ink underline-offset-2 hover:underline"
                    >
                      {profile.email}
                    </a>
                  </p>
                  <p className="text-pretty">
                    {profile.address.street}, {profile.address.city}{" "}
                    {profile.address.region} {profile.address.postal}
                  </p>
                  {/* C16 — "Instagram: @handle", selectable AND a real link */}
                  {igHandle ? (
                    <p>
                      Instagram:{" "}
                      <a
                        href={`https://instagram.com/${igHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="select-all text-brand-ink underline-offset-2 hover:underline"
                      >
                        @{igHandle}
                      </a>
                    </p>
                  ) : null}
                  {/* Round 13 (S6): HUDL reads like the Instagram row — a
                      label plus a short "Profile" link, not the raw URL */}
                  {profile.hudl ? (
                    <p>
                      HUDL:{" "}
                      <a
                        href={normalizeUrl(profile.hudl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-ink underline-offset-2 hover:underline"
                      >
                        Profile
                      </a>
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">No profile on file yet.</p>
              )}
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <p className={FIELD_LABEL}>Parent / Emergency contact</p>
              {guardian ? (
                <>
                  <p className="font-medium">{guardian.name}</p>
                  <p className="text-muted-foreground">{guardian.relation}</p>
                  <p>
                    <a
                      href={telHref(guardian.phone)}
                      className="text-brand-ink underline-offset-2 hover:underline"
                    >
                      {guardian.phone}
                    </a>
                  </p>
                  <p className="break-words">{guardian.email}</p>
                </>
              ) : emergency ? (
                <>
                  <p className="font-medium">{emergency.name}</p>
                  <p className="text-muted-foreground">{emergency.relation}</p>
                  <p>
                    <a
                      href={telHref(emergency.phone)}
                      className="text-brand-ink underline-offset-2 hover:underline"
                    >
                      {emergency.phone}
                    </a>
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">None on file.</p>
              )}
            </div>
          </div>
          <p className="mt-2 text-[0.7rem] text-muted-foreground">
            Synced from the member&apos;s profile — they keep it current.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Round 11 (A2/A3) — Parent & Guardian accounts: the member's own     */
/* login at the top (password reset), each linked parent login with    */
/* reset/re-invite actions, and an admin add-parent mini-form. The     */
/* card shows for all staff; the buttons and form are admin-only.      */
/* ------------------------------------------------------------------ */

/** A parent login added from this card — persists per athlete. */
interface LocalParentAccount {
  id: string;
  name: string;
  relation: string;
  email: string;
  childAthleteIds: string[];
}

export function ParentAccountsCard({
  athlete,
  profile,
  admin,
}: {
  athlete: Athlete;
  profile?: AthleteProfile;
  admin: boolean;
}) {
  const storageKey = `aos-parent-accounts-${athlete.id}`;
  const memberEmail = profile?.email;
  const [local, setLocal] = useState<LocalParentAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  // The add-parent mini-form
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRelation, setAddRelation] = useState("");
  const [addKids, setAddKids] = useState<Set<string>>(
    () => new Set([athlete.id]),
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as LocalParentAccount[];
        if (Array.isArray(parsed)) setLocal(parsed);
      }
    } catch {
      /* corrupted storage — start empty */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(local));
    } catch {
      /* storage full/blocked — accounts still work in-memory */
    }
  }, [local, loaded, storageKey]);

  useEffect(
    () => () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  function showFlash(message: string) {
    setFlash(message);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 3500);
  }

  // Seeded parent logins + the ones added locally from this card.
  const rows: LocalParentAccount[] = [
    ...parentsOfAthlete(athlete.id).map((p) => ({
      id: p.id,
      name: p.name,
      relation: p.relation,
      email: p.email,
      childAthleteIds: p.childAthleteIds,
    })),
    ...local,
  ];

  // Link-to-member options: this athlete first, then a few other actives.
  const kidOptions = [
    athlete,
    ...athletes
      .filter((a) => a.status === "active" && a.id !== athlete.id)
      .slice(0, 4),
  ];

  function kidNames(ids: string[]): string {
    return ids.map((id) => athleteById(id)?.name ?? id).join(", ");
  }

  function toggleKid(id: string) {
    setAddKids((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addParent() {
    const name = addName.trim();
    const email = addEmail.trim();
    if (!name || !email) return;
    setLocal((prev) => [
      ...prev,
      {
        id: `local-parent-${Date.now()}`,
        name,
        relation: addRelation.trim() || "Guardian",
        email,
        childAthleteIds: addKids.size > 0 ? [...addKids] : [athlete.id],
      },
    ]);
    setAdding(false);
    setAddName("");
    setAddEmail("");
    setAddRelation("");
    setAddKids(new Set([athlete.id]));
    showFlash(`Parent account created — login invite sent to ${email}`);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Parent &amp; Guardian Accounts</h3>
        </div>

        {flash ? (
          <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-2.5 text-xs font-medium text-success">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{flash}</span>
          </div>
        ) : null}

        {/* A3 — the MEMBER's own login: the manual password reset lives here */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/50 p-3">
          <div className="min-w-0 flex-1">
            <p className={FIELD_LABEL}>Member login</p>
            <p className="truncate text-sm font-medium">{athlete.name}</p>
            {memberEmail ? (
              <p className="truncate text-xs text-muted-foreground">
                {memberEmail}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No login email on file yet.
              </p>
            )}
          </div>
          {admin && memberEmail ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                showFlash(`Password reset email sent to ${memberEmail}`)
              }
            >
              <KeyRound className="h-3.5 w-3.5" />
              Send password reset
            </Button>
          ) : null}
        </div>

        {/* A2 — every parent login linked to this member */}
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
            No parent accounts linked yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface/50 p-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {p.name}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {p.relation}
                    </span>
                  </p>
                  <p className="break-words text-xs">
                    <a
                      href={`mailto:${p.email}`}
                      className="text-brand-ink underline-offset-2 hover:underline"
                    >
                      {p.email}
                    </a>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Linked: {kidNames(p.childAthleteIds)}
                  </p>
                </div>
                {admin ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        showFlash(`Password reset email sent to ${p.email}`)
                      }
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Send password reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        showFlash(`Login invite re-sent to ${p.email}`)
                      }
                    >
                      <Send className="h-3.5 w-3.5" />
                      Resend login invite
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {/* Admin-only: create a parent login and link it to members */}
        {admin ? (
          adding ? (
            <div className="flex flex-col gap-3 rounded-lg border border-brand/30 bg-brand/[0.03] p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-0.5">
                  <span className={FIELD_LABEL}>Name</span>
                  <Input
                    autoFocus
                    value={addName}
                    placeholder="e.g. Priya Rahman"
                    className="h-9"
                    onChange={(e) => setAddName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className={FIELD_LABEL}>Email</span>
                  <Input
                    type="email"
                    value={addEmail}
                    placeholder="parent@example.com"
                    className="h-9"
                    onChange={(e) => setAddEmail(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className={FIELD_LABEL}>Relation</span>
                  <Input
                    value={addRelation}
                    placeholder="Mother / Father / Guardian"
                    className="h-9"
                    onChange={(e) => setAddRelation(e.target.value)}
                  />
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Link to members</span>
                <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-2">
                  {kidOptions.map((a) => (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={addKids.has(a.id)}
                        onChange={() => toggleKid(a.id)}
                        className="h-3.5 w-3.5 accent-[hsl(var(--brand))]"
                      />
                      <span className="min-w-0 truncate">{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="brand"
                  size="sm"
                  disabled={!addName.trim() || !addEmail.trim()}
                  onClick={addParent}
                >
                  Create &amp; send invite
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
            >
              <Plus className="h-3.5 w-3.5" />
              Add parent account
            </button>
          )
        ) : null}

        <p className="text-[0.7rem] text-muted-foreground">
          {admin
            ? "Parents log in with their own account and see every linked kid. Resets and invites are demo flashes — production sends real emails."
            : "Password resets and invites are admin-only — the card is read-only for coaches."}
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* P12 — Team Management: Program | Manage side by side (labels above, */
/* full-width selects), Assistants full-width beneath.                 */
/* ------------------------------------------------------------------ */

export function TeamManagementCard({ athlete }: { athlete: Athlete }) {
  const base = assignmentsForAthlete(athlete.id);
  return (
    <ManagementCard
      initialProgramming={base.find((a) => a.role === "programming")?.staffId ?? ""}
      initialManagement={base.find((a) => a.role === "management")?.staffId ?? ""}
      initialAssistants={base
        .filter((a) => a.role === "assistant")
        .map((a) => a.staffId)}
      footnote="Assignments drive who's in this member's chat thread and whose queue they appear in. Saves locally in this demo."
    />
  );
}

/** The Program / Manage / Assistants selects — shared by member and group
 *  profiles (C21: "same Team Management section as members"). */
export function ManagementCard({
  initialProgramming,
  initialManagement,
  initialAssistants,
  footnote,
}: {
  initialProgramming: string;
  initialManagement: string;
  initialAssistants: string[];
  footnote: string;
}) {
  const [programming, setProgramming] = useState(initialProgramming);
  const [management, setManagement] = useState(initialManagement);
  // C9: MULTIPLE assistant coaches — add appends underneath, each removable.
  const [assistants, setAssistants] = useState<string[]>(initialAssistants);

  const availableAssistants = staffMembers.filter(
    (s) => !assistants.includes(s.id),
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Team Management</h3>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              { label: "Program", value: programming, set: setProgramming },
              { label: "Manage", value: management, set: setManagement },
            ] as const
          ).map(({ label, value, set }) => (
            <label key={label} className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>{label}</span>
              <select
                value={value}
                aria-label={`${label} coach`}
                onChange={(e) => set(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
              >
                <option value="">—</option>
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {/* Assistants — a full-width list, not a single slot */}
        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Assistants</span>
          {assistants.map((id) => {
            const s = staffMembers.find((m) => m.id === id);
            if (!s) return null;
            return (
              <span
                key={id}
                className="flex items-center gap-2 rounded-md border border-border bg-surface/60 px-2.5 py-1.5 text-sm"
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
            className="h-9 w-full rounded-md border border-dashed border-input bg-surface px-2.5 text-sm text-muted-foreground"
          >
            <option value="">+ Add assistant…</option>
            {availableAssistants.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[0.7rem] text-muted-foreground">{footnote}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* C18 — Financial: coaches see ONLY the billing-status pill; balances,*/
/* invoice amounts and the Manage button are admin/owner-only.         */
/* ------------------------------------------------------------------ */

export function FinancialCard({
  athlete,
  admin,
}: {
  athlete: Athlete;
  admin: boolean;
}) {
  const billing = billingMeta[athlete.billing.state];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Financial</h3>
          {admin ? (
            <span className="ml-auto">
              <Button asChild variant="outline" size="sm">
                <Link href={"/staff/billing" as Route}>Manage</Link>
              </Button>
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 text-sm">
          {/* Everyone sees the status pill — is this member in good standing? */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 p-3">
            <span className="font-medium">{athlete.planName}</span>
            <Pill tone={billing.tone} dot>
              {billing.label}
            </Pill>
          </div>
          {admin ? (
            <>
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>Next invoice</span>
                <span className="tnum font-semibold text-foreground">
                  {fmtDay(athlete.billing.nextInvoice)}
                </span>
              </div>
              {athlete.billing.amountDueCents > 0 ? (
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                  <span>Outstanding</span>
                  <span className="tnum font-semibold text-destructive">
                    {money2(athlete.billing.amountDueCents)}
                  </span>
                </div>
              ) : null}
            </>
          ) : null}
          <p className="px-1 text-[0.7rem] text-muted-foreground">
            {admin
              ? "Manage opens Billing — mark paid / cancel live there; Square handles cards."
              : "Coaches see the billing status only — balances and actions are admin-only."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* P17 — Goals & Medical History: GOALS, PAST INJURIES and CURRENT     */
/* INJURIES / LIMITATIONS (the last one feeds the session Huddle       */
/* Brief).                                                             */
/* ------------------------------------------------------------------ */

export function GoalsMedicalCard({
  initialGoals,
  initialPastInjuries,
  initialLimitations,
}: {
  initialGoals: string;
  initialPastInjuries: string;
  initialLimitations: string;
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [past, setPast] = useState(initialPastInjuries);
  const [limitations, setLimitations] = useState(initialLimitations);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-brand-ink" aria-hidden />
          <h3 className="text-base">Goals &amp; Medical History</h3>
        </div>

        <MedicalField
          label="GOALS"
          rows={3}
          value={goals}
          placeholder="What this member is training toward…"
          onChange={setGoals}
        />
        <MedicalField
          label="PAST INJURIES"
          rows={2}
          value={past}
          placeholder="Injury history worth knowing…"
          onChange={setPast}
        />
        <MedicalField
          label="CURRENT INJURIES / LIMITATIONS"
          rows={3}
          value={limitations}
          placeholder="Anything limiting training right now…"
          caption="Shows on the session Huddle Brief"
          onChange={setLimitations}
        />

        <p className="text-[0.7rem] text-muted-foreground">
          Saves locally in this demo.
        </p>
      </CardContent>
    </Card>
  );
}

function MedicalField({
  label,
  rows,
  value,
  placeholder,
  caption,
  onChange,
}: {
  label: string;
  rows: number;
  value: string;
  placeholder: string;
  caption?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        className="text-sm leading-relaxed"
        onChange={(e) => onChange(e.target.value)}
      />
      {caption ? (
        <span className="text-[0.7rem] text-muted-foreground">{caption}</span>
      ) : null}
    </label>
  );
}

/** Follow-up strip shown at the top for paused members. */
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
