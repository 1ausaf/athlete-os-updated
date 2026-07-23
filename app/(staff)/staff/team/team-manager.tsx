"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Bell,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  Mail,
  Phone,
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
import { Pill, type PillTone } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { fmtFullDay } from "@/lib/demo/data";
import {
  ACCESS_LEVEL_LABEL,
  athleteIdsForStaff,
  staffMembers,
  type StaffAccessLevel,
  type StaffCertification,
  type StaffMember,
} from "@/lib/demo/staff";

/** Local, mutable copy of a staff row (demo state lives in the browser). */
type LocalStaff = StaffMember & { isLocal?: boolean };

const ACCESS_LEVELS = Object.keys(ACCESS_LEVEL_LABEL) as StaffAccessLevel[];

const ROLE_PILL: Record<StaffMember["role"], { label: string; tone: PillTone }> =
  {
    owner: { label: "Owner", tone: "brand" },
    admin: { label: "Admin", tone: "info" },
    coach: { label: "Coach", tone: "neutral" },
  };

const CERT_PILL: Record<
  StaffCertification["status"],
  { label: string; tone: PillTone }
> = {
  valid: { label: "Valid", tone: "success" },
  expiring: { label: "Expiring soon", tone: "warning" },
  expired: { label: "Expired", tone: "danger" },
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
    title: "",
    accessLevel: "coaching" as StaffAccessLevel,
  });

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

  function setAccess(member: LocalStaff, level: StaffAccessLevel) {
    patchStaff(member.id, (s) => ({ ...s, accessLevel: level }));
    showFlash(
      `Access updated — ${member.name} is now ${ACCESS_LEVEL_LABEL[level]}`,
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
    if (!name) return;
    const member: LocalStaff = {
      id: `staff-local-${Date.now()}`,
      name,
      initials: initialsFrom(name),
      hue: hueFrom(name),
      role: "coach",
      accessLevel: form.accessLevel,
      title: form.title.trim() || "Coach",
      email: "",
      phone: "",
      bio: "New staff member — profile pending.",
      certifications: [],
      vulnerableSector: { status: "due" },
      notifications: { push: true, email: true },
      isLocal: true,
    };
    setStaff((prev) => [...prev, member]);
    setForm({ name: "", title: "", accessLevel: "coaching" });
    setAdding(false);
    setExpandedId(member.id);
    showFlash(`${name} added to the team`);
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
              : "within 60 days"
          }
        />
        <StatTile
          label="Vulnerable-sector checks due"
          value={kpis.vsDue}
          icon={kpis.vsDue === 0 ? ShieldCheck : ShieldAlert}
          hint={kpis.vsDue === 0 ? "all on file" : "upload required"}
        />
      </div>

      {/* List header + add */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">Staff</h2>
          <p className="text-sm text-muted-foreground">
            Set what each person can do — changes apply immediately.
          </p>
        </div>
        <Button
          variant={adding ? "outline" : "brand"}
          size="sm"
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {adding ? "Cancel" : "Add staff member"}
        </Button>
      </div>

      {/* Inline add form */}
      {adding ? (
        <Card className="border-brand/30">
          <CardContent className="flex flex-col gap-3 p-5">
            <span className="eyebrow">New staff member</span>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Full name"
                aria-label="Full name"
                autoFocus
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
                value={form.accessLevel}
                aria-label="Access level"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    accessLevel: e.target.value as StaffAccessLevel,
                  }))
                }
                className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
              >
                {ACCESS_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {ACCESS_LEVEL_LABEL[level]}
                  </option>
                ))}
              </select>
              <Button
                variant="brand"
                size="sm"
                className="h-9"
                onClick={addStaff}
                disabled={!form.name.trim()}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              New staff start as a coach — they appear in assignments and
              messaging once an admin assigns them to athletes.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Staff list */}
      <Card>
        <div className="divide-y divide-border">
          {staff.map((member) => (
            <StaffRow
              key={member.id}
              member={member}
              expanded={expandedId === member.id}
              onToggle={() =>
                setExpandedId((cur) => (cur === member.id ? null : member.id))
              }
              onAccessChange={(level) => setAccess(member, level)}
              onToggleNotification={(channel) =>
                toggleNotification(member.id, channel)
              }
              onUploadVs={() => uploadVulnerableSector(member)}
            />
          ))}
        </div>
      </Card>

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
  onAccessChange,
  onToggleNotification,
  onUploadVs,
}: {
  member: LocalStaff;
  expanded: boolean;
  onToggle: () => void;
  onAccessChange: (level: StaffAccessLevel) => void;
  onToggleNotification: (channel: "push" | "email") => void;
  onUploadVs: () => void;
}) {
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
          <span className="eyebrow hidden sm:inline">Access</span>
          <select
            value={member.accessLevel}
            aria-label={`Access level for ${member.name}`}
            disabled={member.role === "owner"}
            title={
              member.role === "owner"
                ? "The owner always has full access"
                : undefined
            }
            onChange={(e) =>
              onAccessChange(e.target.value as StaffAccessLevel)
            }
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ACCESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {ACCESS_LEVEL_LABEL[level]}
              </option>
            ))}
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
            </div>
          </div>

          {/* Certifications */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <span className="eyebrow inline-flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" />
              Certifications
            </span>
            {member.certifications.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                No certifications on file yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {member.certifications.map((cert) => {
                  const pill = CERT_PILL[cert.status];
                  return (
                    <li
                      key={cert.name}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {cert.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cert.status === "expired" ? "Expired" : "Expires"}{" "}
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
