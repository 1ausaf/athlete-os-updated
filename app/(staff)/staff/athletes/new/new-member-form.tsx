"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * C4/C10 — the full-page Add Member onboarding form. Everything the intake
 * call collects in one pass; submit shows the generated temporary login
 * password. Local state only — nothing persists in this demo.
 */

const FIELD_LABEL =
  "text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground";

const ADD_NEW = "__add-new__";

/** Round 18 (D2): the default membership PLANS — the dropdown's option list
 *  is managed (add/rename/delete) and persists to localStorage. */
const PLAN_DEFAULTS = [
  "2x/wk",
  "2x/wk + Remote",
  "3x/wk",
  "3x/wk + Remote",
  "4x/wk",
  "4x/wk + Remote",
  "2x/wk Remote",
  "3x/wk Remote",
  "4x/wk Remote",
];
const PLAN_STORAGE_KEY = "aos-plan-options";

/** "Wolf-4821" — the volt-and-wolf brand's temporary password shape. */
export function generateTempPassword(): string {
  return `Wolf-${Math.floor(1000 + Math.random() * 9000)}`;
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className={FIELD_LABEL}>{label}</span>
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow border-b border-border/60 pb-1.5">{children}</p>;
}

const INPUT_CLS = "h-9 bg-surface text-sm";
const SELECT_CLS =
  "h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm font-medium";

/** Round 16 (Q1): phone inputs accept phone characters only — digits, spaces
 *  and + ( ) - survive; everything else is stripped at the state-write point
 *  so letters can't be typed or pasted. */
const sanitizePhone = (v: string) => v.replace(/[^\d\s+()-]/g, "");

export function NewMemberForm({
  focusOptions,
  groups,
  initialGroupId,
}: {
  focusOptions: string[];
  groups: { id: string; name: string }[];
  initialGroupId: string;
}) {
  // Identity
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  // Round 18 (D3): Sex gains "Other".
  const [sex, setSex] = useState<"M" | "F" | "O">("M");
  // Membership — Round 18 (D2): membership type IS the plan, one managed
  // dropdown (the old bucket select + free-text plan collapsed into it).
  const [focus, setFocus] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [plan, setPlan] = useState(PLAN_DEFAULTS[0]);
  const [groupId, setGroupId] = useState(
    groups.some((g) => g.id === initialGroupId) ? initialGroupId : "",
  );
  // Goals & medical
  const [goals, setGoals] = useState("");
  const [pastInjuries, setPastInjuries] = useState("");
  const [limitations, setLimitations] = useState("");
  // Parent / guardian (optional) + emergency contact
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  // R40 — parent accounts: on by default whenever the guardian is filled in.
  const [createParentLogin, setCreateParentLogin] = useState(true);

  const [created, setCreated] = useState<{
    name: string;
    email: string;
    password: string;
    groupName?: string;
    parentEmail?: string;
  } | null>(null);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 3;

  const guardianFilled =
    guardianName.trim().length > 0 || guardianEmail.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    setCreated({
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim(),
      password: generateTempPassword(),
      groupName: groups.find((g) => g.id === groupId)?.name,
      // R40 — the parent invite goes out when the box stays checked
      parentEmail:
        createParentLogin && guardianEmail.trim().length > 3
          ? guardianEmail.trim()
          : undefined,
    });
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setDob("");
    setSex("M");
    setFocus("");
    setCustomFocus("");
    setPlan(PLAN_DEFAULTS[0]);
    setGroupId("");
    setGoals("");
    setPastInjuries("");
    setLimitations("");
    setGuardianName("");
    setGuardianRelation("");
    setGuardianPhone("");
    setGuardianEmail("");
    setEmergencyName("");
    setEmergencyRelation("");
    setEmergencyPhone("");
    setCreateParentLogin(true);
    setCreated(null);
  }

  /* -------- success state: the generated login (C10) -------- */
  if (created) {
    return (
      <Card className="border-success/40">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
          <div>
            <p className="text-lg font-bold">{created.name} is now a member</p>
            {created.groupName ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Added to {created.groupName}.
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">
              A login was created — temporary password:
            </p>
            <p className="tnum mt-2 inline-flex select-all items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm font-bold">
              <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden />
              {created.password}
            </p>
            {/* R39 — the invite email carries a set-password link */}
            <p className="mt-2 text-xs text-muted-foreground">
              An invite email with a set-password link was sent to{" "}
              <span className="font-semibold text-foreground">
                {created.email}
              </span>
              .
            </p>
            {/* R40 — the parent gets their own invite */}
            {created.parentEmail ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Parent invite sent to{" "}
                <span className="font-semibold text-foreground">
                  {created.parentEmail}
                </span>{" "}
                — they manage bookings, billing and chat for this athlete.
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              They&apos;ll set their own password at first sign-in. (Demo — no
              real email goes out.)
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild variant="brand" size="sm">
              <Link href={"/staff/athletes" as Route}>
                <ArrowLeft className="h-4 w-4" />
                Back to Members
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={resetForm}>
              <Plus className="h-4 w-4" />
              Add another member
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* -------- the onboarding form -------- */
  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4">
          <SectionTitle>Identity</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="First name">
              <Input
                autoFocus
                value={firstName}
                className={INPUT_CLS}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={lastName}
                className={INPUT_CLS}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                value={dob}
                aria-label="Date of birth"
                onChange={(e) => setDob(e.target.value)}
                className={cn(SELECT_CLS, "tnum")}
              />
            </Field>
            <Field label="Sex">
              <select
                value={sex}
                aria-label="Sex"
                onChange={(e) => setSex(e.target.value as "M" | "F" | "O")}
                className={SELECT_CLS}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                {/* Round 18 (D3) */}
                <option value="O">Other</option>
              </select>
            </Field>
            <Field label="Email" className="lg:col-span-2">
              <Input
                type="email"
                value={email}
                placeholder="name@example.com"
                className={INPUT_CLS}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Phone" className="lg:col-span-2">
              <Input
                type="tel"
                inputMode="tel"
                value={phone}
                placeholder="+1 (416) 555-0100"
                className={INPUT_CLS}
                onChange={(e) => setPhone(sanitizePhone(e.target.value))}
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Membership</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Focus">
              <select
                value={focus}
                aria-label="Focus"
                onChange={(e) => setFocus(e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">Select focus…</option>
                {focusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value={ADD_NEW}>+ Add new…</option>
              </select>
            </Field>
            {focus === ADD_NEW ? (
              <Field label="New focus">
                <Input
                  value={customFocus}
                  placeholder="e.g. Weight loss"
                  className={INPUT_CLS}
                  onChange={(e) => setCustomFocus(e.target.value)}
                />
              </Field>
            ) : null}
            {/* Round 18 (D2): one managed dropdown of plans replaces the
                bucket select + free-text plan */}
            <ManagedPlanSelect value={plan} onChange={setPlan} />
            <Field label="Group (optional)">
              <select
                value={groupId}
                aria-label="Group"
                onChange={(e) => setGroupId(e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">None — individual member</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Goals &amp; Medical History</SectionTitle>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Field label="Goals">
              <Textarea
                rows={3}
                value={goals}
                placeholder="What this member is training toward…"
                className="text-sm"
                onChange={(e) => setGoals(e.target.value)}
              />
            </Field>
            <Field label="Past injuries">
              <Textarea
                rows={3}
                value={pastInjuries}
                placeholder="Injury history worth knowing…"
                className="text-sm"
                onChange={(e) => setPastInjuries(e.target.value)}
              />
            </Field>
            <Field label="Current limitations">
              <Textarea
                rows={3}
                value={limitations}
                placeholder="Anything limiting training right now…"
                className="text-sm"
                onChange={(e) => setLimitations(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Parent / Guardian (optional)</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name">
              <Input
                value={guardianName}
                className={INPUT_CLS}
                onChange={(e) => setGuardianName(e.target.value)}
              />
            </Field>
            <Field label="Relation">
              <Input
                value={guardianRelation}
                placeholder="e.g. Mother"
                className={INPUT_CLS}
                onChange={(e) => setGuardianRelation(e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                inputMode="tel"
                value={guardianPhone}
                className={INPUT_CLS}
                onChange={(e) => setGuardianPhone(sanitizePhone(e.target.value))}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={guardianEmail}
                className={INPUT_CLS}
                onChange={(e) => setGuardianEmail(e.target.value)}
              />
            </Field>
          </div>
          {/* R40 — parent accounts: checked by default once a guardian is
              filled in; the invite goes to the guardian email on submit */}
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 text-sm font-medium",
              !guardianFilled && "opacity-60",
            )}
          >
            <input
              type="checkbox"
              checked={createParentLogin}
              onChange={(e) => setCreateParentLogin(e.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--brand))]"
            />
            Create parent login
            <span className="text-xs font-normal text-muted-foreground">
              — invite sent to the guardian email
            </span>
          </label>
          <p className="text-[0.7rem] text-muted-foreground">
            For minors, the parent gets their own login and manages bookings,
            billing and chat for this member.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Emergency Contact</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name">
              <Input
                value={emergencyName}
                className={INPUT_CLS}
                onChange={(e) => setEmergencyName(e.target.value)}
              />
            </Field>
            <Field label="Relation">
              <Input
                value={emergencyRelation}
                placeholder="e.g. Spouse"
                className={INPUT_CLS}
                onChange={(e) => setEmergencyRelation(e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                inputMode="tel"
                value={emergencyPhone}
                className={INPUT_CLS}
                onChange={(e) =>
                  setEmergencyPhone(sanitizePhone(e.target.value))
                }
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <Button variant="brand" size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            <UserPlus className="h-4 w-4" />
            Add Member
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={"/staff/athletes" as Route}>Cancel</Link>
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            Submitting creates the login and shows the temporary password.
            Saves locally in this demo.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Round 18 (D2): Membership type — a dropdown of PLANS whose options  */
/* are manageable (add / rename / delete) from a gear popover, a       */
/* lightweight copy of the profile's ManagedSelect (P9). The page is   */
/* admin-gated, so the gear always shows. Persists to localStorage.    */
/* ------------------------------------------------------------------ */

function ManagedPlanSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [options, setOptions] = useState<string[]>(PLAN_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [addDraft, setAddDraft] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) setOptions(parsed);
      }
    } catch {
      /* corrupted storage — keep defaults */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(options));
    } catch {
      /* storage full/blocked — options still work in-memory */
    }
  }, [options, loaded]);

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
    <div className="flex flex-col gap-1">
      <span className={cn(FIELD_LABEL, "flex items-center justify-between")}>
        Membership type
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Manage plan options"
          title="Manage plan options — add, rename or delete"
          className="rounded p-0.5 transition-colors hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </span>
      <div className="relative">
        <select
          value={value}
          aria-label="Membership type"
          onChange={(e) => onChange(e.target.value)}
          className={SELECT_CLS}
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
              <p className="eyebrow px-1.5 pb-1.5">Plan options</p>
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
                  placeholder="Add plan…"
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
                  aria-label="Add plan option"
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
