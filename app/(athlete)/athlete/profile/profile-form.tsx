"use client";

import { useState } from "react";
import {
  AtSign,
  CheckCircle2,
  Instagram,
  Link2,
  MapPin,
  Phone,
  Save,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import type { AthleteProfile } from "@/lib/demo/data";

/**
 * Self-service profile (A20): address, contact details, socials and
 * recruiting links. What's saved here is what the coaching staff sees on the
 * athlete's card — no more re-typing contact info into Trello.
 */
export function ProfileForm({
  initial,
  athleteName,
  gender,
  isMinor,
  isParentView,
}: {
  initial: AthleteProfile;
  athleteName: string;
  gender: "M" | "F";
  isMinor: boolean;
  isParentView: boolean;
}) {
  const [p, setP] = useState<AthleteProfile>(initial);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof AthleteProfile>(
    key: K,
    value: AthleteProfile[K],
  ) => {
    setP((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  function handleSave() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3500);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Identity — DOB + gender live on the record (assessment needs them) */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Identity</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Full name">
              <Input value={athleteName} disabled className="bg-muted/40" />
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <Field label="Postal code">
              <Input
                value={p.address.postal}
                onChange={(e) =>
                  set("address", { ...p.address, postal: e.target.value })
                }
              />
            </Field>
          </div>
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

      {/* Guardian — required for minors */}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name">
              <Input
                value={p.guardian?.name ?? ""}
                onChange={(e) =>
                  set("guardian", {
                    name: e.target.value,
                    relation: p.guardian?.relation ?? "",
                    phone: p.guardian?.phone ?? "",
                    email: p.guardian?.email ?? "",
                  })
                }
              />
            </Field>
            <Field label="Relation">
              <Input
                value={p.guardian?.relation ?? ""}
                onChange={(e) =>
                  set("guardian", {
                    name: p.guardian?.name ?? "",
                    relation: e.target.value,
                    phone: p.guardian?.phone ?? "",
                    email: p.guardian?.email ?? "",
                  })
                }
              />
            </Field>
            <Field label="Phone">
              <Input
                value={p.guardian?.phone ?? ""}
                onChange={(e) =>
                  set("guardian", {
                    name: p.guardian?.name ?? "",
                    relation: p.guardian?.relation ?? "",
                    phone: e.target.value,
                    email: p.guardian?.email ?? "",
                  })
                }
              />
            </Field>
            <Field label="Email">
              <Input
                value={p.guardian?.email ?? ""}
                onChange={(e) =>
                  set("guardian", {
                    name: p.guardian?.name ?? "",
                    relation: p.guardian?.relation ?? "",
                    phone: p.guardian?.phone ?? "",
                    email: e.target.value,
                  })
                }
              />
            </Field>
          </div>
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
              ? "You're editing this on your child's behalf."
              : "Changes appear on your card in the coach workspace."}
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
