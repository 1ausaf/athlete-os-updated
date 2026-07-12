import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  Check,
  Coins,
  Layers,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { EnterDemoButton } from "@/components/app/enter-demo";
import { Pill } from "@/components/ui/pill";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { money, plans } from "@/lib/demo/data";

const competitors = [
  { name: "Amelia + TrainHeroic + Trello + Square", price: "$200–$500 / mo", gap: "Four subscriptions, still no unified profile" },
  { name: "Generic gym CRM", price: "$250–$400 / mo", gap: "Class-based — can't model individualized programs" },
  { name: "Enterprise athletic suites", price: "$500+ / mo", gap: "Priced for teams, no Rule-of-Two enforcement" },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 volt-halo" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-20 md:px-6 md:py-24">
          <Pill tone="brand" dot>
            Pricing
          </Pill>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Train at LPS — or run your facility on our{" "}
            <span className="relative whitespace-nowrap text-brand-ink">
              platform
              <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-brand" />
            </span>
            .
          </h1>
          <p className="max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            Membership plans put athletes on individualized, periodized
            programming with real coaches. Platform licensing hands the whole
            Athlete Operating System to facilities that coach the way we do.
          </p>
        </div>
      </section>

      {/* Membership plans */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="mb-10 flex flex-col gap-3">
          <span className="eyebrow">Train at LPS</span>
          <h2 className="max-w-2xl text-3xl md:text-4xl">
            Membership plans, priced by cadence.
          </h2>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            Every plan is semi-private and fully individualized. Your frequency
            is enforced at booking time — a 3×/week plan can never book a fourth.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col overflow-hidden transition-shadow hover:shadow-raised",
                plan.popular && "border-brand/40 bg-brand-sheen shadow-glow",
              )}
            >
              {plan.popular ? (
                <span className="absolute right-4 top-4">
                  <Pill tone="brand" dot>
                    Most popular
                  </Pill>
                </span>
              ) : null}
              <CardHeader className="gap-2">
                <CardTitle className="font-display text-lg">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1.5">
                  <span className="tnum font-display text-4xl font-extrabold tracking-tight">
                    {money(plan.priceCents)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {plan.period.toLowerCase()}
                  </span>
                </div>
                <CardDescription className="text-sm">
                  {plan.frequency} · {plan.activeMembers} active members
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="flex flex-col gap-2.5 text-sm">
                  {[
                    plan.sessionsPerPeriod,
                    plan.access,
                    "Individualized periodized program",
                    "Frequency-aware booking",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" aria-hidden />
                      <span className="text-muted-foreground">{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  <EnterDemoButton
                    role="athlete"
                    variant={plan.popular ? "brand" : "outline"}
                    className="w-full"
                  >
                    Start on {plan.name}
                  </EnterDemoButton>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarCheck2 className="h-4 w-4" aria-hidden />
          Prices in CAD. Past-due accounts pause booking automatically within
          24h — no late-payers slip onto the floor.
        </p>
      </section>

      {/* Licensing */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <div className="mb-10 flex flex-col gap-3">
            <span className="eyebrow">License the platform</span>
            <h2 className="max-w-2xl text-3xl md:text-4xl">
              Run your facility on the Athlete Operating System.
            </h2>
            <p className="max-w-2xl text-pretty text-muted-foreground">
              AOS was built in-house for LPS Athletic, and because we own it, we
              license it to peer facilities that share our semi-private,
              individualized model.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            {/* License price card */}
            <Card className="relative flex flex-col overflow-hidden border-brand/40 bg-brand-sheen shadow-glow">
              <CardHeader className="gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand-ink">
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <CardTitle className="font-display text-lg">Facility license</CardTitle>
                <div className="flex items-baseline gap-1.5">
                  <span className="tnum font-display text-4xl font-extrabold tracking-tight">
                    {money(30000)}–{money(40000)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ month, per gym</span>
                </div>
                <CardDescription className="text-sm">
                  Full AOS — booking, billing, programming, CAP notes, compliant
                  messaging and the coach huddle brief.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="flex flex-col gap-2.5 text-sm">
                  {[
                    "The complete unified athlete profile",
                    "Safe-Sport Rule-of-Two enforced at the system level",
                    "Frequency-aware booking + billing-to-booking pausing",
                    "Owner exec dashboard + facility KPIs",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" aria-hidden />
                      <span className="text-muted-foreground">{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  <EnterDemoButton role="owner" variant="brand" className="w-full">
                    Tour the owner console
                    <ArrowRight className="h-4 w-4" />
                  </EnterDemoButton>
                </div>
              </CardContent>
            </Card>

            {/* Economics + comparison */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader className="gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand-ink">
                    <Coins className="h-5 w-5" aria-hidden />
                  </span>
                  <CardTitle className="text-base">The build pays for itself</CardTitle>
                  <CardDescription>
                    AOS represents a roughly {money(2000000)} build. At{" "}
                    {money(30000)}–{money(40000)} / month per gym, just four to
                    five licensed facilities recoup it — after that it&apos;s a
                    margin-positive line of business.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3">
                  {[
                    { value: `~${money(2000000)}`, label: "Build cost", icon: Layers },
                    { value: "4–5", label: "Gyms to recoup", icon: Building2 },
                    { value: "Margin+", label: "Every gym after", icon: TrendingUp },
                  ].map(({ value, label, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-surface/60 p-3"
                    >
                      <Icon className="h-4 w-4 text-brand-ink" aria-hidden />
                      <span className="tnum font-display text-xl font-extrabold">
                        {value}
                      </span>
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="gap-1">
                  <CardTitle className="text-base">Versus the fragmented stack</CardTitle>
                  <CardDescription>
                    Competitors run {money(20000)}–{money(50000)} / month and
                    still fall short — no unified profile, no individualized
                    programming, no Rule of Two.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {competitors.map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.gap}</div>
                      </div>
                      <span className="tnum shrink-0 text-xs font-semibold text-muted-foreground">
                        {c.price}
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 flex items-center gap-3 rounded-lg bg-brand px-4 py-3 text-brand-foreground shadow-glow">
                    <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">LPS Athlete OS</div>
                      <div className="text-xs opacity-90">
                        One platform, purpose-built, compliance included
                      </div>
                    </div>
                    <span className="tnum shrink-0 text-xs font-bold">
                      {money(30000)}–{money(40000)} / mo
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border">
        <div className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 py-16 md:px-6 md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="relative flex flex-col items-center gap-6 text-center">
            <Layers className="h-8 w-8 text-brand-ink" />
            <h2 className="max-w-2xl text-balance text-3xl md:text-4xl">
              Try every plan and role in one click — athlete, coach and owner.
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <EnterDemoButton role="athlete" variant="brand" size="lg">
                Launch the demo
                <ArrowRight className="h-4 w-4" />
              </EnterDemoButton>
              <Link
                href="/about"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-8 text-sm font-semibold transition-colors hover:bg-accent"
              >
                Read the story
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
