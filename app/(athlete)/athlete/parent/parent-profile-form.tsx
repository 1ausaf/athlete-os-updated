"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  Bell,
  Camera,
  CheckCircle2,
  MapPin,
  Phone,
  Save,
  Users,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import type { ParentAccount } from "@/lib/demo/data";

import { openChildProfile } from "./actions";

export interface KidSummary {
  id: string;
  name: string;
  initials: string;
  hue: number;
  sport: string;
}

/**
 * P3 — the parent's own editable profile: photo spot, contact + address,
 * notification prefs, and the linked kids. Local demo state.
 */
export function ParentProfileForm({
  account,
  kids,
}: {
  account: ParentAccount;
  kids: KidSummary[];
}) {
  const [name, setName] = useState(account.name);
  const [relation, setRelation] = useState(account.relation);
  const [phone, setPhone] = useState(account.phone);
  const [email, setEmail] = useState(account.email);
  const [address, setAddress] = useState(account.address);
  const [push, setPush] = useState(account.notifications.push);
  const [emailNotif, setEmailNotif] = useState(account.notifications.email);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

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
            <AthleteAvatar
              initials={account.initials}
              hue={account.hue}
              size="xl"
            />
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
            <h3 className="text-lg font-bold">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {relation} · {kids.length} athlete{kids.length === 1 ? "" : "s"}
            </p>
            <Pill tone="neutral" className="mt-1.5">
              Parent account
            </Pill>
          </div>
        </CardContent>
      </Card>

      {/* Contact + address */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Contact</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Relation">
              <Input
                value={relation}
                placeholder="Mother, father, guardian…"
                onChange={(e) => setRelation(e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold">Home address</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Street" className="sm:col-span-2">
              <Input
                value={address.street}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, street: e.target.value }))
                }
              />
            </Field>
            <Field label="City">
              <Input
                value={address.city}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, city: e.target.value }))
                }
              />
            </Field>
            <Field label="Postal code">
              <Input
                value={address.postal}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, postal: e.target.value }))
                }
              />
            </Field>
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
              [
                "Push notifications",
                push,
                setPush,
                "Session changes, coach replies and invoices for every child.",
              ],
              [
                "Email",
                emailNotif,
                setEmailNotif,
                "Receipts, schedules and anything that needs a reply.",
              ],
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

      {/* Linked kids */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Your athletes</h3>
          </div>
          <ul className="flex flex-col gap-2">
            {kids.map((kid) => (
              <li key={kid.id}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => openChildProfile(kid.id))
                  }
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface/50 p-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-60"
                >
                  <AthleteAvatar
                    initials={kid.initials}
                    hue={kid.hue}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {kid.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {kid.sport}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    Open profile
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Your contact info auto-fills each child&apos;s parent section.
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
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
