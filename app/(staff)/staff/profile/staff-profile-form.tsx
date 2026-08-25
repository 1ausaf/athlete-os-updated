"use client";

import { useRef, useState } from "react";
import {
  BadgeCheck,
  Bell,
  CheckCircle2,
  HeartPulse,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";

import { AvatarUpload } from "@/components/app/avatar-upload";
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

/** Round 16 (Q1): phone inputs accept phone characters only — digits, spaces
 *  and + ( ) - survive; everything else is stripped at the state-write point
 *  so letters can't be typed or pasted. */
const sanitizePhone = (v: string) => v.replace(/[^\d\s+()-]/g, "");

/**
 * The coach's own profile — self-service contact, bio, notifications and
 * records. Round 8: editable first/last/title/designations with a live
 * "Coach First Last" preview (S2), a 7-row bio (S3), an emergency-contact
 * section (S4) and the reordered Certifications & Records card with
 * expired-cert renewal (S5).
 */
export function StaffProfileForm({ member }: { member: StaffMember }) {
  // S2 — identity fields, seeded from the staff record.
  const [firstName, setFirstName] = useState(member.firstName);
  const [lastName, setLastName] = useState(member.lastName);
  const [title, setTitle] = useState(member.title);
  const [designations, setDesignations] = useState(member.designations ?? "");
  // Round 14 (V16): free-text display name so coaches can go by last name
  // ("Coach Mason", "Coach Clance") — seeded from the current display name.
  const [displayName, setDisplayName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone);
  const [email, setEmail] = useState(member.email);
  const [bio, setBio] = useState(member.bio);
  // F3 — StaffMember carries no address yet; demo defaults, editable locally.
  const [street, setStreet] = useState("2180 Dundas St W");
  const [city, setCity] = useState("Toronto");
  const [province, setProvince] = useState("ON");
  const [postal, setPostal] = useState("M6R 1X3");
  const [country, setCountry] = useState("Canada");
  // S4 — emergency contact, seeded when the record has one.
  const [ecName, setEcName] = useState(member.emergencyContact?.name ?? "");
  const [ecRelation, setEcRelation] = useState(
    member.emergencyContact?.relation ?? "",
  );
  const [ecPhone, setEcPhone] = useState(member.emergencyContact?.phone ?? "");
  const [push, setPush] = useState(member.notifications.push);
  const [emailNotif, setEmailNotif] = useState(member.notifications.email);
  // R37 / Round 14 (V17): scoped to sessions YOU coach and off by default —
  // coaches shouldn't be pinged for every member booking in the gym.
  const [bookingNotif, setBookingNotif] = useState(false);
  const [saved, setSaved] = useState(false);
  // F4/S5 — self-serve certification upload + expired-cert renewal.
  const [certs, setCerts] = useState<StaffCertification[]>(
    member.certifications,
  );
  const [certTitle, setCertTitle] = useState("");
  const [certFile, setCertFile] = useState<string | null>(null);
  const [certExpiry, setCertExpiry] = useState("");
  const certFileRef = useRef<HTMLInputElement>(null);
  const uploadPanelRef = useRef<HTMLDivElement>(null);

  // S2/V16 — the typed display name wins; empty falls back to
  // "Coach First Last" once both names exist.
  const shownName =
    displayName.trim() ||
    (firstName.trim() && lastName.trim()
      ? `Coach ${firstName.trim()} ${lastName.trim()}`
      : member.name);

  function handleSave() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3500);
  }

  /** S5 — a new doc + expiry for an existing title replaces its status. */
  function addCertification() {
    const name = certTitle.trim();
    if (!name || !certExpiry) return;
    const next: StaffCertification = {
      name,
      expires: new Date(`${certExpiry}T12:00:00`).toISOString(),
      status: certStatusFor(certExpiry),
    };
    setCerts((prev) =>
      prev.some((c) => c.name === name)
        ? prev.map((c) => (c.name === name ? next : c))
        : [...prev, next],
    );
    setCertTitle("");
    setCertFile(null);
    setCertExpiry("");
  }

  /** S5 — "Update" on an expired row prefills the upload panel. */
  function startRenewal(cert: StaffCertification) {
    setCertTitle(cert.name);
    setCertFile(null);
    setCertExpiry("");
    uploadPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* F1 — two columns: identity + contact left, notifications + records
          right, so the page reads as wide as the member profile. */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {/* Identity + photo — editable names/title/designations (S2) */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* Round 12 (N20): the camera button is live — shared
                    crop-dialog upload, same as the member profile */}
                <AvatarUpload
                  initials={member.initials}
                  hue={member.hue}
                  name={member.name}
                  uploadLabel="Upload photo (demo)"
                  storageKey={`aos-avatar-staff-${member.id}`}
                />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold">{shownName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {title.trim()}
                    {designations.trim() ? ` · ${designations.trim()}` : ""}
                  </p>
                  <Pill tone="neutral" className="mt-1.5 capitalize">
                    {member.role}
                  </Pill>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    First name
                  </Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Last name
                  </Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                {/* V16 — go by last name if you like ("Coach Mason") */}
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">
                    Display Name
                  </Label>
                  <Input
                    value={displayName}
                    placeholder="e.g. Coach Mason"
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <p className="text-[0.7rem] text-muted-foreground">
                    How your name appears across the workspace.
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Designations
                  </Label>
                  <Input
                    value={designations}
                    placeholder="e.g. PhD, AASc, CSCS, R.Kin"
                    onChange={(e) => setDesignations(e.target.value)}
                  />
                </div>
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
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhone(e.target.value))}
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
                {/* S3 — roughly twice the writing room */}
                <Textarea
                  rows={7}
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

          {/* S4 — emergency contact */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <HeartPulse
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden
                />
                <h3 className="text-base">Emergency Contact</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    value={ecName}
                    placeholder="Full name"
                    onChange={(e) => setEcName(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Relation
                  </Label>
                  <Input
                    value={ecRelation}
                    placeholder="e.g. Spouse, Parent"
                    onChange={(e) => setEcRelation(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input
                    inputMode="tel"
                    value={ecPhone}
                    placeholder="+1 (416) 555-0000"
                    onChange={(e) => setEcPhone(sanitizePhone(e.target.value))}
                  />
                </div>
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                Who the office calls if something happens to you on the floor.
              </p>
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
                  // S1 — the push hint names what actually notifies you.
                  ["Push notifications", push, setPush, "Chats you're subscribed to or actively involved in — straight to your phone."],
                  ["Email", emailNotif, setEmailNotif, "Daily digest + anything that needs a reply."],
                  // R37/V17 — your own sessions only, default off.
                  ["Booking activity", bookingNotif, setBookingNotif, "Bookings for sessions you coach — when a member books or cancels."],
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

          {/* S5 — Certifications & Records: vulnerable-sector first, the cert
              list next, the upload panel at the bottom. */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <BadgeCheck
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden
                />
                <h3 className="text-base">Certifications &amp; Records</h3>
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

              <ul className="flex flex-col gap-2">
                {certs.map((c, i) => (
                  <li
                    key={`${c.name}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface/50 p-3 text-sm"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="flex items-center gap-1.5">
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
                      {/* S5 — renew an expired doc in place */}
                      {c.status === "expired" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startRenewal(c)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Update
                        </Button>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>

              {/* F4/S5 — upload panel, at the bottom; a matching title
                  replaces the existing record's doc + status. */}
              <div
                ref={uploadPanelRef}
                className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border p-3"
              >
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
                    {certs.some((c) => c.name === certTitle.trim())
                      ? "Replace"
                      : "Add"}
                  </Button>
                </div>
                {certs.some((c) => c.name === certTitle.trim()) ? (
                  <p className="text-[0.7rem] text-muted-foreground">
                    A new doc + expiry for &ldquo;{certTitle.trim()}&rdquo;
                    replaces its current status.
                  </p>
                ) : null}
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
