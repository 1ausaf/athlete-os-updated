"use client";

import { useRef, useState } from "react";
import {
  BadgeCheck,
  Bell,
  Camera,
  CheckCircle2,
  Paperclip,
  Phone,
  Plus,
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
import type { StaffCertification, StaffMember } from "@/lib/demo/staff";

import { EnablePushButton } from "../team/push-permission";

/**
 * F4 — same 45-day rule the owner's Team page uses when a cert is added,
 * so a coach's self-upload lands with the identical status.
 */
function certStatusFor(expiresIso: string): StaffCertification["status"] {
  const days =
    (new Date(`${expiresIso}T12:00:00`).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "expired";
  if (days < 45) return "expiring";
  return "valid";
}

/**
 * The coach's own profile ("we're missing the Profile tab" on the coaching
 * side): contact details + address, bio + photo, notification preferences,
 * and their certification / vulnerable-sector records — self-service.
 * Round 6: full-width two-column layout (F1), Address fields (F3) and a
 * self-serve certification upload (F4).
 */
export function StaffProfileForm({ member }: { member: StaffMember }) {
  const [phone, setPhone] = useState(member.phone);
  const [email, setEmail] = useState(member.email);
  const [bio, setBio] = useState(member.bio);
  // F3 — StaffMember carries no address yet; demo defaults, editable locally.
  const [street, setStreet] = useState("2180 Dundas St W");
  const [city, setCity] = useState("Toronto");
  const [province, setProvince] = useState("ON");
  const [postal, setPostal] = useState("M6R 1X3");
  const [country, setCountry] = useState("Canada");
  const [push, setPush] = useState(member.notifications.push);
  const [emailNotif, setEmailNotif] = useState(member.notifications.email);
  const [saved, setSaved] = useState(false);
  // F4 — self-serve certification upload.
  const [certs, setCerts] = useState<StaffCertification[]>(
    member.certifications,
  );
  const [certTitle, setCertTitle] = useState("");
  const [certFile, setCertFile] = useState<string | null>(null);
  const [certExpiry, setCertExpiry] = useState("");
  const certFileRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3500);
  }

  function addCertification() {
    const name = certTitle.trim();
    if (!name || !certExpiry) return;
    setCerts((prev) => [
      ...prev,
      {
        name,
        expires: new Date(`${certExpiry}T12:00:00`).toISOString(),
        status: certStatusFor(certExpiry),
      },
    ]);
    setCertTitle("");
    setCertFile(null);
    setCertExpiry("");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* F1 — two columns: identity + contact left, notifications + records
          right, so the page reads as wide as the member profile. */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {/* Identity + photo */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
              <div className="relative">
                <AthleteAvatar
                  initials={member.initials}
                  hue={member.hue}
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
              <div className="min-w-0">
                <h3 className="text-lg font-bold">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.title}</p>
                <Pill tone="neutral" className="mt-1.5 capitalize">
                  {member.role}
                </Pill>
              </div>
            </CardContent>
          </Card>

          {/* Contact + bio + address (F2, F3) */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base">Contact &amp; Bio</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
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
              {/* F3 — address block */}
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Street address
                </Label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Province / State
                  </Label>
                  <Input
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Postal code
                  </Label>
                  <Input
                    value={postal}
                    onChange={(e) => setPostal(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Country
                  </Label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
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
              <EnablePushButton hint="Most coaches are on their phones — accept notifications from this website so session changes reach this device." />
            </CardContent>
          </Card>

          {/* Records + self-serve upload (F4) */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <BadgeCheck
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden
                />
                <h3 className="text-base">Certifications &amp; records</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {certs.map((c, i) => (
                  <li
                    key={`${c.name}-${i}`}
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

              {/* F4 — upload a new certification (title + file + expiry) */}
              <div className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border p-3">
                <span className="text-xs font-semibold">
                  Upload certification
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Title
                    </Label>
                    <Input
                      placeholder="e.g. NCCP Weightlifting"
                      value={certTitle}
                      onChange={(e) => setCertTitle(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Expiry date
                    </Label>
                    <Input
                      type="date"
                      value={certExpiry}
                      aria-label="Certification expiry date"
                      onChange={(e) => setCertExpiry(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => certFileRef.current?.click()}
                    className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {certFile ?? "Choose file (demo)"}
                    </span>
                  </button>
                  <input
                    ref={certFileRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      setCertFile(e.target.files?.[0]?.name ?? null);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="brand"
                    size="sm"
                    className="ml-auto"
                    disabled={!certTitle.trim() || !certExpiry}
                    onClick={addCertification}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>

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
                Uploads are reviewed by the owner on the Team page — renewals
                are managed there.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

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
