"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Bell,
  Camera,
  CheckCircle2,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { fmtDay } from "@/lib/demo/data";
import type { StaffMember } from "@/lib/demo/staff";

/**
 * The coach's own profile ("we're missing the Profile tab" on the coaching
 * side): contact details, bio + photo, notification preferences, and their
 * certification / vulnerable-sector records — self-service, no admin needed.
 */
export function StaffProfileForm({ member }: { member: StaffMember }) {
  const [phone, setPhone] = useState(member.phone);
  const [email, setEmail] = useState(member.email);
  const [bio, setBio] = useState(member.bio);
  const [push, setPush] = useState(member.notifications.push);
  const [emailNotif, setEmailNotif] = useState(member.notifications.email);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3500);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Identity + photo */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <div className="relative">
            <AthleteAvatar initials={member.initials} hue={member.hue} size="xl" />
            <button
              type="button"
              title="Upload photo (demo)"
              aria-label="Upload profile photo"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold">{member.name}</h3>
            <p className="text-sm text-muted-foreground">{member.title}</p>
            <Pill tone="neutral" className="mt-1.5 capitalize">
              {member.role}
            </Pill>
          </div>
        </CardContent>
      </Card>

      {/* Contact + bio */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Contact & bio</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Bio</Label>
            <Textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Notifications</h3>
          </div>
          {(
            [
              ["Push notifications", push, setPush, "Session changes, new notes, PRs — straight to your phone."],
              ["Email", emailNotif, setEmailNotif, "Daily digest + anything that needs a reply."],
            ] as const
          ).map(([label, value, set, hint]) => (
            <label
              key={label}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-surface/50 p-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {hint}
                </span>
              </span>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => set(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--brand))]"
              />
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Records — read-only view of what the owner tracks in Team */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Certifications & records</h3>
          </div>
          <ul className="flex flex-col gap-2">
            {member.certifications.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/50 p-3 text-sm"
              >
                <span className="font-medium">{c.name}</span>
                <Pill
                  tone={
                    c.status === "valid"
                      ? "success"
                      : c.status === "expiring"
                        ? "warning"
                        : "danger"
                  }
                >
                  {c.status === "valid"
                    ? `Valid · ${fmtDay(c.expires)}`
                    : c.status === "expiring"
                      ? `Expiring · ${fmtDay(c.expires)}`
                      : "Expired"}
                </Pill>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/50 p-3 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Vulnerable-sector check
            </span>
            {member.vulnerableSector.status === "on-file" ? (
              <Pill tone="success">
                On file
                {member.vulnerableSector.uploadedAt
                  ? ` · ${fmtDay(member.vulnerableSector.uploadedAt)}`
                  : ""}
              </Pill>
            ) : (
              <Pill tone="danger">Due — see the office</Pill>
            )}
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            Renewals are managed with the owner on the Team page.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="brand" onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save profile
        </Button>
        {saved ? (
          <Pill tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            Profile saved
          </Pill>
        ) : (
          <span className="text-xs text-muted-foreground">
            Saves locally in this demo.
          </span>
        )}
      </div>
    </div>
  );
}
