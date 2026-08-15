"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { athletes, bucketLabel, type MemberBucket } from "@/lib/demo/data";
import { staffMembers } from "@/lib/demo/staff";
import { cn } from "@/lib/utils";

import { generateTempPassword } from "../new/new-member-form";

/**
 * C4/C10 — the Add Group onboarding form: name, focus, membership type, plan,
 * contact rows and the coach list, with the same generated-login success
 * state as Add Member. Local state only in this demo.
 */

const FIELD_LABEL =
  "text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground";

const ADD_NEW = "__add-new__";

const INPUT_CLS = "h-9 bg-surface text-sm";
const SELECT_CLS =
  "h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm font-medium";

interface ContactDraft {
  name: string;
  role: string;
  phone: string;
  email: string;
}

const BLANK_CONTACT: ContactDraft = { name: "", role: "", phone: "", email: "" };

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

export function NewGroupForm({ focusOptions }: { focusOptions: string[] }) {
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [bucket, setBucket] = useState<MemberBucket>("in-gym");
  const [plan, setPlan] = useState("");
  const [contacts, setContacts] = useState<ContactDraft[]>([
    { ...BLANK_CONTACT },
  ]);
  const [coachIds, setCoachIds] = useState<string[]>([]);
  // R41 — pick EXISTING athletes for the new group from a checklist.
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const [created, setCreated] = useState<{
    name: string;
    password: string;
    memberNames: string[];
  } | null>(null);

  const canSubmit = name.trim().length > 1;
  const availableCoaches = staffMembers.filter((s) => !coachIds.includes(s.id));
  const memberOptions = athletes
    .filter((a) => a.status === "active")
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  function setContact(i: number, patch: Partial<ContactDraft>) {
    setContacts((prev) =>
      prev.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    );
  }

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setCreated({
      name: name.trim(),
      password: generateTempPassword(),
      memberNames: memberOptions
        .filter((a) => memberIds.includes(a.id))
        .map((a) => a.name),
    });
  }

  function resetForm() {
    setName("");
    setFocus("");
    setCustomFocus("");
    setBucket("in-gym");
    setPlan("");
    setContacts([{ ...BLANK_CONTACT }]);
    setCoachIds([]);
    setMemberIds([]);
    setCreated(null);
  }

  /* -------- success state — same pattern as Add Member (C10) -------- */
  if (created) {
    return (
      <Card className="border-success/40">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
          <div>
            <p className="text-lg font-bold">
              {created.name} is on the books as a group
            </p>
            {/* R41 — the picked existing members land in the group */}
            {created.memberNames.length > 0 ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Group members: {created.memberNames.join(", ")}.
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">
              A login was created — temporary password:
            </p>
            <p className="tnum mt-2 inline-flex select-all items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm font-bold">
              <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden />
              {created.password}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              The group contact sets their own password at first sign-in.
              Nothing is emailed in this demo.
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
              Add another group
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* -------- the group form -------- */
  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4">
          <SectionTitle>Group</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Group name">
              <Input
                autoFocus
                value={name}
                placeholder="e.g. Sunday Golf Group"
                className={INPUT_CLS}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
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
                  placeholder="e.g. Rowing"
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
                placeholder="e.g. Group block — 2×/week"
                className={INPUT_CLS}
                onChange={(e) => setPlan(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* R41 — pick existing athletes into the group right away */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Group members</SectionTitle>
          <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-2 lg:grid-cols-3">
            {memberOptions.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/50"
              >
                <input
                  type="checkbox"
                  checked={memberIds.includes(a.id)}
                  onChange={() => toggleMember(a.id)}
                  className="h-3.5 w-3.5 accent-[hsl(var(--brand))]"
                />
                <AthleteAvatar
                  initials={a.initials}
                  hue={a.hue}
                  size="sm"
                  className="h-6 w-6 text-[0.55rem]"
                />
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.sport}</span>
              </label>
            ))}
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            Need someone brand new? Add them as a member afterwards with Add
            Group Member.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Contacts</SectionTitle>
          <div className="flex flex-col gap-2">
            {contacts.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface/40 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
              >
                <Field label="Name">
                  <Input
                    value={c.name}
                    className={INPUT_CLS}
                    onChange={(e) => setContact(i, { name: e.target.value })}
                  />
                </Field>
                <Field label="Role">
                  <Input
                    value={c.role}
                    placeholder="e.g. Club manager"
                    className={INPUT_CLS}
                    onChange={(e) => setContact(i, { role: e.target.value })}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    type="tel"
                    value={c.phone}
                    className={INPUT_CLS}
                    onChange={(e) => setContact(i, { phone: e.target.value })}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={c.email}
                    className={INPUT_CLS}
                    onChange={(e) => setContact(i, { email: e.target.value })}
                  />
                </Field>
                <div className="flex items-end pb-0.5">
                  <button
                    type="button"
                    aria-label={`Remove contact ${i + 1}`}
                    title="Remove contact"
                    onClick={() =>
                      setContacts((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setContacts((prev) => [...prev, { ...BLANK_CONTACT }])}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
            >
              <Plus className="h-3.5 w-3.5" />
              Add contact
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Coaches</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {coachIds.map((id) => {
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
                    aria-label={`Remove ${s.name} from the group`}
                    onClick={() =>
                      setCoachIds((prev) => prev.filter((c) => c !== id))
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
              aria-label="Add coach"
              onChange={(e) => {
                if (e.target.value) {
                  setCoachIds((prev) => [...prev, e.target.value]);
                }
              }}
              className="h-9 w-full rounded-md border border-dashed border-input bg-surface px-2.5 text-sm text-muted-foreground"
            >
              <option value="">+ Add coach…</option>
              {availableCoaches.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            Every coach added here sees the group in their queue and chat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <Button variant="brand" size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            <Users className="h-4 w-4" />
            Add Group
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={"/staff/athletes" as Route}>Cancel</Link>
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            Submitting creates the group login and shows the temporary
            password. Saves locally in this demo.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
