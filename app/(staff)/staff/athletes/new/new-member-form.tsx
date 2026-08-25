"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { bucketLabel, type MemberBucket } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

/**
 * C4/C10 — the full-page Add Member onboarding form. Everything the intake
 * call collects in one pass; submit shows the generated temporary login
 * password. Local state only — nothing persists in this demo.
 */

const FIELD_LABEL =
  "text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground";

const ADD_NEW = "__add-new__";

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
  const [sex, setSex] = useState<"M" | "F">("M");
  // Membership
  const [focus, setFocus] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [bucket, setBucket] = useState<MemberBucket>("in-gym");
  const [plan, setPlan] = useState("");
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
    setBucket("in-gym");
    setPlan("");
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
                onChange={(e) => setSex(e.target.value as "M" | "F")}
                className={SELECT_CLS}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
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
            <Field label="Membership type">
              <select
                value={bucket}
                aria-label="Membership type"
                onChange={(e) => setBucket(e.target.value as MemberBucket)}
                className={SELECT_CLS}
              >
                {(Object.keys(bucketLabel) as MemberBucket[]).map((b) => (
                  <option key={b} value={b}>
                    {bucketLabel[b]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plan">
              <Input
                value={plan}
                placeholder="e.g. Pro Track — 3×/week"
                className={INPUT_CLS}
                onChange={(e) => setPlan(e.target.value)}
              />
            </Field>
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
