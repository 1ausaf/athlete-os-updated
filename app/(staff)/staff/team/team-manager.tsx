"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  Bell,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  FileText,
  Mail,
  Phone,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, type PillTone } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { fmtFullDay } from "@/lib/demo/data";
import {
  STAFF_ROLE_LABEL,
  STAFF_ROLE_ORDER,
  STAFF_ROLE_PERMISSIONS,
  athleteIdsForStaff,
  staffMembers,
  type StaffCertification,
  type StaffMember,
  type StaffRole,
} from "@/lib/demo/staff";

import { EnablePushButton } from "./push-permission";

/** Local, mutable copy of a staff row (demo state lives in the browser). */
type LocalStaff = StaffMember & { isLocal?: boolean };

/** Roles the owner can hand out — there's exactly one owner. */
const ASSIGNABLE_ROLES = STAFF_ROLE_ORDER.filter((r) => r !== "owner");

/** O6 — status derived from the expiry date when a cert is added. */
function certStatusFor(expiresIso: string): StaffCertification["status"] {
  const days =
    (new Date(`${expiresIso}T12:00:00`).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "expired";
  if (days < 45) return "expiring";
  return "valid";
}

const ROLE_PILL: Record<StaffMember["role"], { label: string; tone: PillTone }> =
  {
    owner: { label: "Owner", tone: "brand" },
    admin: { label: "Admin", tone: "info" },
    "coach-manager": { label: "Coach Manager", tone: "info" },
    coach: { label: "Coach", tone: "neutral" },
    intern: { label: "Intern", tone: "neutral" },
  };

const CERT_PILL: Record<
  StaffCertification["status"],
  { label: string; tone: PillTone }
> = {
  valid: { label: "Valid", tone: "success" },
  expiring: { label: "Expiring soon", tone: "warning" },
  expired: { label: "Expired — invalid", tone: "danger" },
};

function hueFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase();
}

export function TeamManager() {
  const [staff, setStaff] = useState<LocalStaff[]>(() =>
    staffMembers.map((s) => ({
      ...s,
      certifications: s.certifications.map((c) => ({ ...c })),
      vulnerableSector: { ...s.vulnerableSector },
      notifications: { ...s.notifications },
    })),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    title: "",
    role: "coach" as StaffRole,
  });
  // R51 — sortable list like Members; alphabetical by default.
  const [sortKey, setSortKey] = useState<"name" | "role">("name");

  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );
  function showFlash(text: string) {
    setFlash(text);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2600);
  }

  function patchStaff(id: string, patch: (s: LocalStaff) => LocalStaff) {
    setStaff((prev) => prev.map((s) => (s.id === id ? patch(s) : s)));
  }

  function setRole(member: LocalStaff, role: StaffRole) {
    patchStaff(member.id, (s) => ({ ...s, role }));
    showFlash(
      `Role updated — ${member.name} is now ${STAFF_ROLE_LABEL[role]}`,
    );
  }

  /** O6 — append a certification with its status computed from the expiry. */
  function addCertification(
    member: LocalStaff,
    cert: { name: string; expires: string },
  ) {
    const status = certStatusFor(cert.expires);
    patchStaff(member.id, (s) => ({
      ...s,
      certifications: [
        ...s.certifications,
        {
          name: cert.name,
          expires: new Date(`${cert.expires}T12:00:00`).toISOString(),
          status,
        },
      ],
    }));
    showFlash(
      status === "expired"
        ? `${cert.name} added for ${member.name} — already expired, flagged`
        : `${cert.name} added for ${member.name}`,
    );
  }

  function toggleNotification(id: string, channel: "push" | "email") {
    patchStaff(id, (s) => ({
      ...s,
      notifications: {
        ...s.notifications,
        [channel]: !s.notifications[channel],
      },
    }));
  }

  function uploadVulnerableSector(member: LocalStaff) {
    const reupload = member.vulnerableSector.status === "on-file";
    patchStaff(member.id, (s) => ({
      ...s,
      vulnerableSector: {
        status: "on-file",
        uploadedAt: new Date().toISOString(),
      },
    }));
    showFlash(
      reupload
        ? `Vulnerable-sector check re-uploaded for ${member.name}`
        : `Vulnerable-sector check on file for ${member.name}`,
    );
  }

  function addStaff() {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || !email.includes("@")) return;
    const [first = "", ...rest] = name.split(/\s+/);
    const member: LocalStaff = {
      id: `staff-local-${Date.now()}`,
      name,
      firstName: first,
      lastName: rest.join(" "),
      initials: initialsFrom(name),
      hue: hueFrom(name),
      role: form.role,
      accessLevel: "coaching",
      title: form.title.trim() || STAFF_ROLE_LABEL[form.role],
      email,
      phone: "",
      bio: "New staff member — profile pending.",
      certifications: [],
      vulnerableSector: { status: "due" },
      notifications: { push: true, email: true },
      isLocal: true,
    };
    setStaff((prev) => [...prev, member]);
    setForm({ name: "", email: "", title: "", role: "coach" });
    setAdding(false);
    setExpandedId(member.id);
    // R51 — new staff get their credentials by email.
    showFlash(`${name} added — invite sent to ${email} with login credentials.`);
  }

  /** R51 — admins fix a coach's first/last; the display name follows. */
  function setNameParts(id: string, first: string, last: string) {
    patchStaff(id, (s) => {
      const f = first.trim();
      const l = last.trim();
      const base = `${f} ${l}`.trim();
      const coachRole =
        s.role === "coach" || s.role === "coach-manager" || s.role === "intern";
      return {
        ...s,
        firstName: first,
        lastName: last,
        name: f && l ? (coachRole ? `Coach ${f} ${l}` : base) : s.name,
        initials: base ? initialsFrom(base) : s.initials,
      };
    });
  }

  const kpis = useMemo(() => {
    const certs = staff.flatMap((s) => s.certifications);
    return {
      count: staff.length,
      expiring: certs.filter((c) => c.status === "expiring").length,
      expired: certs.filter((c) => c.status === "expired").length,
      vsDue: staff.filter((s) => s.vulnerableSector.status === "due").length,
    };
  }, [staff]);

  // R51 — alphabetical by default; Role sorts down the ladder, then name.
  const sorted = useMemo(() => {
    const byName = (a: LocalStaff, b: LocalStaff) =>
      a.name.localeCompare(b.name);
    if (sortKey === "name") return [...staff].sort(byName);
    return [...staff].sort(
      (a, b) =>
        STAFF_ROLE_ORDER.indexOf(a.role) - STAFF_ROLE_ORDER.indexOf(b.role) ||
        byName(a, b),
    );
  }, [staff, sortKey]);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Staff members" value={kpis.count} icon={Users} accent />
        <StatTile
          label="Certifications expiring"
          value={kpis.expiring}
          icon={Award}
          hint={
            kpis.expired > 0
              ? `+ ${kpis.expired} already expired`
              : "within 45 days"
          }
        />
        <StatTile
          label="Vulnerable-sector checks due"
          value={kpis.vsDue}
          icon={kpis.vsDue === 0 ? ShieldCheck : ShieldAlert}
          hint={kpis.vsDue === 0 ? "all on file" : "upload required"}
        />
      </div>

      {/* List header + sort + add */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">Staff</h2>
          <p className="text-sm text-muted-foreground">
            Set what each person can do — changes apply immediately.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* R51 — sortable like the Members list */}
          <span className="text-xs text-muted-foreground">Sort by</span>
          {(["name", "role"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              aria-pressed={sortKey === key}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-semibold capitalize transition-colors",
                sortKey === key
                  ? "border-brand/40 bg-brand/10 text-brand-ink"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {key}
            </button>
          ))}
          <Button
            variant={adding ? "outline" : "brand"}
            size="sm"
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? (
              <X className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {adding ? "Cancel" : "Add staff member"}
          </Button>
        </div>
      </div>

      {/* Inline add form */}
      {adding ? (
        <Card className="border-brand/30">
          <CardContent className="flex flex-col gap-3 p-5">
            <span className="eyebrow">New staff member</span>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]">
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Full name"
                aria-label="Full name"
                autoFocus
              />
              {/* R51 — the invite (with login credentials) goes here */}
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="Email — invite goes here"
                aria-label="Email"
              />
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Title (e.g. Assistant Coach)"
                aria-label="Title"
              />
              <select
                value={form.role}
                aria-label="Role"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value as StaffRole,
                  }))
                }
                className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {STAFF_ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
              <Button
                variant="brand"
                size="sm"
                className="h-9"
                onClick={addStaff}
                disabled={!form.name.trim() || !form.email.trim().includes("@")}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The role sets what they can do — see the permission matrix below.
              An invite email with their login credentials goes out as soon as
              they&apos;re added.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Staff list — sorted (R51) */}
      <Card>
        <div className="divide-y divide-border">
          {sorted.map((member) => (
            <StaffRow
              key={member.id}
              member={member}
              expanded={expandedId === member.id}
              onToggle={() =>
                setExpandedId((cur) => (cur === member.id ? null : member.id))
              }
              onRoleChange={(role) => setRole(member, role)}
              onNameChange={(first, last) =>
                setNameParts(member.id, first, last)
              }
              onToggleNotification={(channel) =>
                toggleNotification(member.id, channel)
              }
              onUploadVs={() => uploadVulnerableSector(member)}
              onAddCert={(cert) => addCertification(member, cert)}
            />
          ))}
        </div>
      </Card>

      {/* Permission matrix (O4) — what each rung of the ladder can do */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg">What each role can do</h2>
          <p className="text-sm text-muted-foreground">
            The five-tier ladder — pick a role above and these permissions
            apply immediately.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {STAFF_ROLE_ORDER.map((role) => (
            <div
              key={role}
              className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4"
            >
              <Pill tone={ROLE_PILL[role].tone} className="self-start">
                {ROLE_PILL[role].label}
              </Pill>
              <ul className="flex flex-col gap-1.5 text-xs">
                {STAFF_ROLE_PERMISSIONS[role].map((perm) => {
                  const masked = perm.toLowerCase().includes("masked");
                  return (
                    <li
                      key={perm}
                      className={cn(
                        "flex items-start gap-1.5",
                        masked
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {masked ? (
                        <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-success/70" />
                      )}
                      <span>{perm}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

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
/* Row + expandable profile panel                                      */
/* ------------------------------------------------------------------ */

function StaffRow({
  member,
  expanded,
  onToggle,
  onRoleChange,
  onNameChange,
  onToggleNotification,
  onUploadVs,
  onAddCert,
}: {
  member: LocalStaff;
  expanded: boolean;
  onToggle: () => void;
  onRoleChange: (role: StaffRole) => void;
  /** R51 — admins edit first/last; the display name updates live. */
  onNameChange: (first: string, last: string) => void;
  onToggleNotification: (channel: "push" | "email") => void;
  onUploadVs: () => void;
  onAddCert: (cert: { name: string; expires: string }) => void;
}) {
  const [addingCert, setAddingCert] = useState(false);
  const role = ROLE_PILL[member.role];
  const athleteCount = member.isLocal ? 0 : athleteIdsForStaff(member.id).size;
  const hasExpired = member.certifications.some((c) => c.status === "expired");
  const hasExpiring = member.certifications.some(
    (c) => c.status === "expiring",
  );
  const vsDue = member.vulnerableSector.status === "due";
  const recordsIssue = vsDue || hasExpired || hasExpiring;

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
          <AthleteAvatar initials={member.initials} hue={member.hue} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold">{member.name}</span>
              {hasExpired ? (
                <span
                  title="Certifications expired — needs attention"
                  className="inline-flex text-destructive"
                >
                  <AlertCircle className="h-4 w-4" aria-hidden />
                  <span className="sr-only">
                    Certifications expired — needs attention
                  </span>
                </span>
              ) : null}
              <Pill tone={role.tone}>{role.label}</Pill>
              {member.isLocal ? <Pill tone="brand">New</Pill> : null}
              {recordsIssue ? (
                <Pill tone={vsDue || hasExpired ? "danger" : "warning"} dot>
                  Records due
                </Pill>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {member.title}
              <span className="tnum">
                {" · "}
                {athleteCount} athlete{athleteCount === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <span className="eyebrow hidden sm:inline">Role</span>
          <select
            value={member.role}
            aria-label={`Role for ${member.name}`}
            disabled={member.role === "owner"}
            title={
              member.role === "owner"
                ? "The owner always has full access"
                : undefined
            }
            onChange={(e) => onRoleChange(e.target.value as StaffRole)}
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {(member.role === "owner" ? STAFF_ROLE_ORDER : ASSIGNABLE_ROLES).map(
              (r) => (
                <option key={r} value={r}>
                  {STAFF_ROLE_LABEL[r]}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {/* Expanded profile panel */}
      {expanded ? (
        <div className="grid gap-4 border-t border-border bg-surface/30 p-4 md:grid-cols-2">
          {/* Profile + notifications */}
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:col-span-2 lg:flex-row">
            <div className="flex items-start gap-4 lg:flex-1">
              <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface/50 text-muted-foreground">
                <Camera className="h-5 w-5" />
                <span className="text-[0.65rem] font-medium">Photo</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="eyebrow">Profile</span>
                {/* R51 — first/last editable here; the list name follows */}
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      First name
                    </Label>
                    <Input
                      value={member.firstName}
                      aria-label={`First name for ${member.name}`}
                      onChange={(e) =>
                        onNameChange(e.target.value, member.lastName)
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Last name
                    </Label>
                    <Input
                      value={member.lastName}
                      aria-label={`Last name for ${member.name}`}
                      onChange={(e) =>
                        onNameChange(member.firstName, e.target.value)
                      }
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
                  Keeps names consistent — coaches display as &ldquo;Coach{" "}
                  {member.firstName.trim() || "First"}{" "}
                  {member.lastName.trim() || "Last"}&rdquo; everywhere.
                </p>
                <div className="mt-2 flex flex-col gap-1.5 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {member.phone || (
                      <span className="text-muted-foreground">
                        No phone on file
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-2 break-all">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {member.email || (
                      <span className="text-muted-foreground">
                        No email on file
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-2 text-pretty text-sm text-muted-foreground">
                  {member.bio}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:w-72 lg:shrink-0">
              <span className="eyebrow">Notifications</span>
              <NotificationToggle
                icon={Bell}
                label="Push notifications"
                checked={member.notifications.push}
                onToggle={() => onToggleNotification("push")}
              />
              <NotificationToggle
                icon={Mail}
                label="Email notifications"
                checked={member.notifications.email}
                onToggle={() => onToggleNotification("email")}
              />
              <EnablePushButton hint="Most coaches are on their phones — accept notifications from this website to get pings on this device." />
            </div>
          </div>

          {/* Certifications (O6 — add flow + expired flags) */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="eyebrow inline-flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" />
                Certifications
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingCert((v) => !v)}
              >
                {addingCert ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {addingCert ? "Cancel" : "Add certification"}
              </Button>
            </div>
            {addingCert ? (
              <AddCertificationForm
                onAdd={(cert) => {
                  onAddCert(cert);
                  setAddingCert(false);
                }}
              />
            ) : null}
            {member.certifications.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                No certifications on file yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {member.certifications.map((cert) => {
                  const pill = CERT_PILL[cert.status];
                  const expired = cert.status === "expired";
                  return (
                    <li
                      key={cert.name}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2",
                        expired
                          ? "border-destructive/40 bg-destructive/[0.05]"
                          : "border-border bg-surface/50",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {cert.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {expired ? "Expired" : "Expires"}{" "}
                          {fmtFullDay(cert.expires)}
                        </div>
                      </div>
                      <Pill tone={pill.tone} dot>
                        {pill.label}
                      </Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Vulnerable-sector check */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <span className="eyebrow inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5" />
              Vulnerable-sector check
            </span>
            {member.vulnerableSector.status === "on-file" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-success/30 bg-success/[0.06] px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
                  <span>
                    <span className="font-medium">On file</span>
                    <span className="text-muted-foreground">
                      {" · uploaded "}
                      {member.vulnerableSector.uploadedAt
                        ? fmtFullDay(member.vulnerableSector.uploadedAt)
                        : "—"}
                    </span>
                  </span>
                </span>
                <Button variant="outline" size="sm" onClick={onUploadVs}>
                  <Upload className="h-4 w-4" />
                  Re-upload (demo)
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/[0.06] px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-destructive">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Due — upload required
                </span>
                <Button variant="brand" size="sm" onClick={onUploadVs}>
                  <Upload className="h-4 w-4" />
                  Upload (demo)
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Required before working with minor athletes. Renewals are tracked
              here and surfaced on the Compliance page.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * O6 — inline add-certification flow: name, a document upload affordance
 * (demo — the file never leaves the browser) and an expiry date. The status
 * pill derives from the date: valid, expiring within 45 days, or expired.
 */
function AddCertificationForm({
  onAdd,
}: {
  onAdd: (cert: { name: string; expires: string }) => void;
}) {
  const [name, setName] = useState("");
  const [expires, setExpires] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-brand/30 bg-surface/50 p-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Certification name (e.g. Standard First Aid + CPR-C)"
        aria-label="Certification name"
        autoFocus
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium transition-colors hover:bg-accent/50">
          <Upload className="h-4 w-4 text-muted-foreground" aria-hidden />
          Upload document (demo)
          <input
            type="file"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        {fileName ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{fileName}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            PDF or photo of the card
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Expiry date
          </span>
          <Input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            aria-label="Certification expiry date"
            className="h-9 w-[10rem]"
          />
        </div>
        <Button
          variant="brand"
          size="sm"
          className="h-9"
          disabled={!name.trim() || !expires}
          onClick={() => onAdd({ name: name.trim(), expires })}
        >
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        An expired date flags the certification as invalid and marks the staff
        member for attention. Saves locally in this demo.
      </p>
    </div>
  );
}

function NotificationToggle({
  icon: Icon,
  label,
  checked,
  onToggle,
}: {
  icon: typeof Bell;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm transition-colors hover:bg-accent/50"
    >
      <span className="inline-flex items-center gap-2 font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-soft transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
