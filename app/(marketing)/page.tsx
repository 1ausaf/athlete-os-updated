import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { EnterDemoButton } from "@/components/app/enter-demo";
import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Pill } from "@/components/ui/pill";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  { value: "<3 min", label: "Huddle prep", hint: "from 10–15 min across 3 tools" },
  { value: "4 → 1", label: "Tools unified", hint: "Amelia · TrainHeroic · Trello · Square" },
  { value: "100%", label: "Rule-of-Two coverage", hint: "every coach–minor thread" },
  { value: "50", label: "Requirements mapped", hint: "P0–P2 across 7 domains" },
];

const replaced = ["Amelia", "TrainHeroic", "Trello", "Square"];

const features = [
  {
    icon: Dumbbell,
    title: "Individualized programming",
    body: "Every athlete on their own periodized block — day, phase, and logged sets/reps/weights, not a class-wide workout.",
  },
  {
    icon: CalendarCheck2,
    title: "Frequency-aware booking",
    body: "A 3×/week plan can't book a fourth. Sessions honor membership cadence before they ever hit the calendar.",
  },
  {
    icon: CreditCard,
    title: "Billing-to-booking enforcement",
    body: "Past-due accounts are paused automatically within 24h — no more late-payers slipping onto the floor.",
  },
  {
    icon: ClipboardList,
    title: "The coach huddle brief",
    body: "One screen, every athlete on deck: program day, plan frequency, last 3 CAP notes, injury flags and billing.",
  },
  {
    icon: ShieldCheck,
    title: "Safe-Sport messaging",
    body: "Rule of Two enforced at the system level. No private 1:1 between a coach and a minor — ever, no override.",
  },
  {
    icon: Users,
    title: "One unified athlete profile",
    body: "Membership, history, CAP notes, PRs and messages in a single record — shared cleanly across every role.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 volt-halo" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:py-28">
          <div className="flex flex-col items-start gap-6">
            <Pill tone="brand" dot>
              LPS Athletic · Athlete Operating System
            </Pill>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Remap athletes to{" "}
              <span className="relative whitespace-nowrap text-brand-ink">
                dominate
                <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-brand" />
              </span>
              . Automate the rest.
            </h1>
            <p className="max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
              The unified hub for semi-private coaching and fully individualized
              programming. Booking, billing, CAP notes, compliant messaging and the
              coach huddle brief — one system, built for The Pro Maker™.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <EnterDemoButton role="athlete" variant="brand" size="lg">
                Launch athlete portal
                <ArrowRight className="h-4 w-4" />
              </EnterDemoButton>
              <EnterDemoButton role="coach" variant="outline" size="lg">
                Enter coach console
              </EnterDemoButton>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="text-[0.7rem]">As featured on</span>
              {["ESPN", "TSN", "CBC", "HBO", "The Globe & Mail"].map((n) => (
                <span key={n} className="font-display font-bold text-foreground/70">
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* Floating huddle preview */}
          <div className="relative hidden md:block">
            <HuddlePreview />
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-8 px-4 md:grid-cols-4 md:px-6">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 py-8 md:py-10">
              <span className="tnum font-display text-3xl font-extrabold md:text-4xl">
                {s.value}
              </span>
              <span className="text-sm font-semibold">{s.label}</span>
              <span className="text-xs text-muted-foreground">{s.hint}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Replace 4 tools */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="flex flex-col items-center gap-8 text-center">
          <span className="eyebrow">One hub, not four tabs</span>
          <h2 className="max-w-2xl text-balance text-3xl md:text-4xl">
            Retire the fragmented stack coaches click through every huddle.
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {replaced.map((t) => (
              <span
                key={t}
                className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground line-through decoration-destructive/70"
              >
                {t}
              </span>
            ))}
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground shadow-glow">
              <Sparkles className="h-4 w-4" />
              LPS Athlete OS
            </span>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <div className="mb-10 flex flex-col gap-3">
            <span className="eyebrow">What ships in the platform</span>
            <h2 className="max-w-2xl text-3xl md:text-4xl">
              Purpose-built for a model generic gym software can&apos;t serve.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="group transition-shadow hover:shadow-raised">
                <CardHeader className="gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand-ink">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {body}
                  </CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Safe-Sport spotlight */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Pill tone="success" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              Non-negotiable compliance
            </Pill>
            <h2 className="text-3xl md:text-4xl">
              The Safe-Sport Rule of Two, enforced by the system — not a policy PDF.
            </h2>
            <p className="text-muted-foreground">
              For any athlete under 18, a coach can never open a private 1:1 thread.
              Every message thread automatically requires a second adult — a
              parent/guardian or second coach. There is no admin override. Believed
              unsolved by any product on the market today.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Pill tone="neutral" dot>Audit-logged &amp; timestamped</Pill>
              <Pill tone="neutral" dot>Guardian accounts linked</Pill>
              <Pill tone="neutral" dot>Zero override</Pill>
            </div>
          </div>
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4 text-success" />
              New thread · Maya Okafor
              <Pill tone="success" className="ml-auto">
                Minor athlete
              </Pill>
            </div>
            <CardContent className="space-y-3 p-5 text-sm">
              <p className="text-muted-foreground">
                A guardian is present, so the Rule of Two is satisfied and messages
                can flow.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { n: "Coach Ellis", r: "coach", h: 150 },
                  { n: "Maya Okafor", r: "minor athlete", h: 268 },
                  { n: "Diane Okafor", r: "guardian", h: 330 },
                ].map((p) => (
                  <span
                    key={p.n}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 text-xs"
                  >
                    <AthleteAvatar
                      initials={p.n.split(" ").map((w) => w[0]).join("")}
                      hue={p.h}
                      size="sm"
                      className="h-5 w-5 text-[0.55rem]"
                    />
                    {p.n}
                    <span className="text-muted-foreground">· {p.r}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border">
        <div className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 py-16 md:px-6 md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="relative flex flex-col items-center gap-6 text-center">
            <Layers className="h-8 w-8 text-brand-ink" />
            <h2 className="max-w-2xl text-balance text-3xl md:text-4xl">
              See the whole platform. Switch between athlete, coach and owner in one
              click.
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <EnterDemoButton role="athlete" variant="brand" size="lg">
                Launch the demo
                <ArrowRight className="h-4 w-4" />
              </EnterDemoButton>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-8 text-sm font-semibold transition-colors hover:bg-accent"
              >
                View licensing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Compact huddle-brief mock shown floating in the hero. */
function HuddlePreview() {
  const rows = [
    { name: "Jordan Vega", hue: 8, initials: "JV", meta: "Day 14 · 3×/wk", tag: "PR +385", tone: "brand" as const },
    { name: "Maya Okafor", hue: 268, initials: "MO", meta: "Day 6 · RTP wk2", tag: "Landings only", tone: "warning" as const },
    { name: "Andre Santos", hue: 190, initials: "AS", meta: "Day 9 · 4×/wk", tag: "Overdue", tone: "danger" as const },
  ];
  return (
    <div className="absolute inset-0 flex items-center">
      <div className="w-full rotate-1 rounded-2xl border border-border bg-card p-5 shadow-raised">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="eyebrow">Huddle brief</span>
            <span className="font-display text-lg font-bold">Next session · 4:00 PM</span>
          </div>
          <Pill tone="brand" dot>
            4 on deck
          </Pill>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.name}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3"
            >
              <AthleteAvatar initials={r.initials} hue={r.hue} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.meta}</div>
              </div>
              <Pill tone={r.tone}>{r.tag}</Pill>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
