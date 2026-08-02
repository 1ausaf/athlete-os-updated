"use client";

import { useState } from "react";
import {
  AtSign,
  Bell,
  Camera,
  CheckCircle2,
  HeartPulse,
  Instagram,
  Link2,
  MapPin,
  Phone,
  Save,
  Scale,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AthleteProfile } from "@/lib/demo/data";

/**
 * Self-service profile (A20 + round 5 A16): photo spot, split name fields,
 * full address (province/state + country), read-only parent info linked from
 * the parent account, an editable emergency contact, and the preferred unit
 * that drives the session-log default.
 */
export function ProfileForm({
  initial,
  athleteName,
  initials,
  hue,
  gender,
  isMinor,
  isParentView,
}: {
  initial: AthleteProfile;
  athleteName: string;
  initials: string;
  hue: number;
  gender: "M" | "F";
  isMinor: boolean;
  isParentView: boolean;
}) {
  const [p, setP] = useState<AthleteProfile>(initial);
  const [saved, setSaved] = useState(false);
  // Round 7 (R7-17): notification prefs — BOTH on by default.
  const [pushOn, setPushOn] = useState(true);
  const [emailOn, setEmailOn] = useState(true);

  const set = <K extends keyof AthleteProfile>(
    key: K,
    value: AthleteProfile[K],
  ) => {
    setP((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const setEmergency = (
    patch: Partial<NonNullable<AthleteProfile["emergencyContact"]>>,
  ) => {
    set("emergencyContact", {
      name: p.emergencyContact?.name ?? "",
      relation: p.emergencyContact?.relation ?? "",
      phone: p.emergencyContact?.phone ?? "",
      ...patch,
    });
  };

  function handleSave() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3500);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Identity — photo spot + locked names + DOB (round 5, A16) */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Identity</h3>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <AthleteAvatar initials={initials} hue={hue} size="xl" />
              <button
                type="button"
                title="Upload photo (demo)"
                aria-label="Upload profile photo"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{athleteName}</p>
              <p className="mt-0.5 max-w-md text-xs text-muted-foreground text-pretty">
                Your photo appears on rosters and huddle boards so coaches
                recognize you. Upload is a demo here — production stores the
                image.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="First name">
              <Input value={p.firstName} disabled className="bg-muted/40" />
            </Field>
            <Field label="Last name">
              <Input value={p.lastName} disabled className="bg-muted/40" />
            </Field>
            <Field label="Date of birth">
              <Input
                type="date"
                value={p.dob}
                onChange={(e) => set("dob", e.target.value)}
              />
            </Field>
            <Field label="Gender">
              <Input value={gender === "M" ? "Male" : "Female"} disabled className="bg-muted/40" />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Name changes go through the front desk — they update your legal
            record everywhere at once.
          </p>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Contact</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <Input
                type="email"
                value={p.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                value={p.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold">Home address</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Street" className="sm:col-span-2">
              <Input
                value={p.address.street}
                onChange={(e) =>
                  set("address", { ...p.address, street: e.target.value })
                }
              />
            </Field>
            <Field label="City">
              <Input
                value={p.address.city}
                onChange={(e) =>
                  set("address", { ...p.address, city: e.target.value })
                }
              />
            </Field>
            <Field label="Province / State">
              <Input
                value={p.address.region}
                onChange={(e) =>
                  set("address", { ...p.address, region: e.target.value })
                }
              />
            </Field>
            <Field label="Postal code">
              <Input
                value={p.address.postal}
                onChange={(e) =>
                  set("address", { ...p.address, postal: e.target.value })
                }
              />
            </Field>
            <Field label="Country">
              <Input
                value={p.address.country}
                onChange={(e) =>
                  set("address", { ...p.address, country: e.target.value })
                }
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Training preferences — the logger reads this default (A7/A16) */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Training preferences</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preferred unit">
              <Select
                value={p.preferredUnit}
                onValueChange={(v) => set("preferredUnit", v as "lb" | "kg")}
              >
                <SelectTrigger aria-label="Preferred weight unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <p className="self-end pb-2 text-xs text-muted-foreground text-pretty">
              Sets the default unit in your session log — each exercise
              section can still be flipped on the floor.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications — both ON by default (round 7, R7-17) */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Notifications</h3>
          </div>
          {(
            [
              ["Push notifications", pushOn, setPushOn],
              ["Email", emailOn, setEmailOn],
            ] as const
          ).map(([label, value, setValue]) => (
            <label
              key={label}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-surface/50 p-3"
            >
              <span className="text-sm font-semibold">{label}</span>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setValue(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--brand))]"
              />
            </label>
          ))}
          <p className="text-xs text-muted-foreground text-pretty">
            You&apos;re notified about scheduling, training program updates,
            invoices, messages and announcements.
          </p>
        </CardContent>
      </Card>

      {/* Socials + recruiting links */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Socials & links</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              So the staff can find and share your highlights
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Instagram" icon={Instagram}>
              <Input
                placeholder="@handle"
                value={p.instagram ?? ""}
                onChange={(e) => set("instagram", e.target.value || undefined)}
              />
            </Field>
            <Field label="X / Twitter" icon={AtSign}>
              <Input
                placeholder="@handle"
                value={p.twitter ?? ""}
                onChange={(e) => set("twitter", e.target.value || undefined)}
              />
            </Field>
            <Field label="HUDL profile" icon={Link2}>
              <Input
                placeholder="hudl.com/profile/…"
                value={p.hudl ?? ""}
                onChange={(e) => set("hudl", e.target.value || undefined)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Parent / guardian — read-only, linked from the parent account (A16) */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Parent / guardian</h3>
            {isMinor ? (
              <Pill tone="info" className="ml-auto">
                Required for minors
              </Pill>
            ) : null}
          </div>
          {p.guardian ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Name">
                  <Input value={p.guardian.name} disabled className="bg-muted/40" />
                </Field>
                <Field label="Relation">
                  <Input
                    value={p.guardian.relation}
                    disabled
                    className="bg-muted/40"
                  />
                </Field>
                <Field label="Phone">
                  <Input value={p.guardian.phone} disabled className="bg-muted/40" />
                </Field>
                <Field label="Email">
                  <Input value={p.guardian.email} disabled className="bg-muted/40" />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground text-pretty">
                Linked from the parent account — parents keep this current in
                their own profile.
              </p>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
              No linked parent account on file
              {isMinor
                ? " — the front desk links one during onboarding."
                : "."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Emergency contact — editable, for when it's not the parents (A16) */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Emergency contact</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <Input
                value={p.emergencyContact?.name ?? ""}
                onChange={(e) => setEmergency({ name: e.target.value })}
              />
            </Field>
            <Field label="Relation">
              <Input
                value={p.emergencyContact?.relation ?? ""}
                onChange={(e) => setEmergency({ relation: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                value={p.emergencyContact?.phone ?? ""}
                onChange={(e) => setEmergency({ phone: e.target.value })}
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground text-pretty">
            Who we call first in an emergency — useful when it&apos;s not the
            parents.
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
            Profile saved — your coaches see the update
          </Pill>
        ) : (
          <span className="text-xs text-muted-foreground">
            {isParentView
              ? "You're editing this on your child's behalf. Saves locally in this demo."
              : "Changes appear on your card in the coach workspace. Saves locally in this demo."}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  className,
  children,
}: {
  label: string;
  icon?: typeof Phone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {label}
      </Label>
      {children}
    </div>
  );
}
