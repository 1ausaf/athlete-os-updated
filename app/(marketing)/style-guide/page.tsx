import type { ReactNode } from "react";
import { Zap } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { BarSeries, Sparkline } from "@/components/app/mini-charts";
import { Progress, ProgressRing } from "@/components/app/progress";
import { StatTile } from "@/components/app/stat-tile";
import { WolfMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, type PillTone } from "@/components/ui/pill";

/* ------------------------------------------------------------------ */
/* Small local layout helpers (gallery-only, no shared-kit edits)      */
/* ------------------------------------------------------------------ */

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 scroll-mt-24">
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="text-2xl md:text-3xl">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-pretty text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({
  name,
  token,
  className,
  ring = false,
}: {
  name: string;
  token: string;
  className: string;
  ring?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`h-16 w-full rounded-xl border ${ring ? "border-border" : "border-transparent"} ${className}`}
      />
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-semibold">{name}</span>
        <span className="font-mono text-[0.65rem] text-muted-foreground">{token}</span>
      </div>
    </div>
  );
}

const brandColors = [
  { name: "Foreground", token: "bg-foreground", className: "bg-foreground", ring: true },
  { name: "Brand / Volt", token: "bg-brand", className: "bg-brand" },
  { name: "Brand ink", token: "text-brand-ink", className: "bg-brand-ink" },
  { name: "Brand soft", token: "bg-brand-soft", className: "bg-brand-soft", ring: true },
];

const semanticColors = [
  { name: "Success", token: "bg-success", className: "bg-success" },
  { name: "Warning", token: "bg-warning", className: "bg-warning" },
  { name: "Danger", token: "bg-destructive", className: "bg-destructive" },
  { name: "Info", token: "bg-info", className: "bg-info" },
];

const surfaceColors = [
  { name: "Background", token: "bg-background", className: "bg-background", ring: true },
  { name: "Surface", token: "bg-surface", className: "bg-surface", ring: true },
  { name: "Card", token: "bg-card", className: "bg-card", ring: true },
  { name: "Muted", token: "bg-muted", className: "bg-muted", ring: true },
  { name: "Accent", token: "bg-accent", className: "bg-accent", ring: true },
  { name: "Border", token: "bg-border", className: "bg-border", ring: true },
];

const pillTones: PillTone[] = ["neutral", "brand", "success", "warning", "danger", "info"];

const avatarSizes = [
  { size: "sm" as const, initials: "JV", hue: 8 },
  { size: "md" as const, initials: "MO", hue: 268 },
  { size: "lg" as const, initials: "AS", hue: 190 },
  { size: "xl" as const, initials: "RT", hue: 150 },
];

export default function StyleGuidePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[380px] w-[680px] -translate-x-1/2 volt-halo" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 py-16 md:px-6 md:py-20">
          <div className="flex items-center gap-3">
            <WolfMark className="h-11 w-11" />
            <Pill tone="brand" dot>
              Living design system
            </Pill>
          </div>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
            The AOS design system.
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
            Every token, type style and UI primitive that builds the Athlete
            Operating System — rendered live in both light and dark. Toggle the
            theme in the header to check contrast on any element.
          </p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-16 md:px-6 md:py-20">
        {/* Color tokens */}
        <Section
          eyebrow="Foundations"
          title="Color tokens"
          description="Semantic HSL tokens defined in globals.css. Never hard-code hex — always reference the token so both themes stay in sync."
        >
          <div className="flex flex-col gap-6">
            <div>
              <h4 className="mb-3">Brand · Volt</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {brandColors.map((c) => (
                  <Swatch key={c.name} {...c} />
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-3">Semantic</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {semanticColors.map((c) => (
                  <Swatch key={c.name} {...c} />
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-3">Surfaces</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {surfaceColors.map((c) => (
                  <Swatch key={c.name} {...c} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Typography */}
        <Section
          eyebrow="Foundations"
          title="Type scale"
          description="Display for headings, sans for body, mono for eyebrows and numeric metadata. Numeric UI uses tabular-nums via .tnum."
        >
          <Card>
            <CardContent className="flex flex-col gap-6 divide-y divide-border pt-6 [&>*]:pt-6 [&>*:first-child]:pt-0">
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Eyebrow · font-mono uppercase tracking</span>
                <span className="font-mono text-xs text-muted-foreground">.eyebrow</span>
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="font-display text-4xl font-extrabold tracking-tight">
                  Display H1 — Remap athletes to dominate
                </h1>
                <span className="font-mono text-xs text-muted-foreground">
                  font-display · text-4xl · extrabold
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl md:text-3xl">H2 — Purpose-built for the model</h2>
                <span className="font-mono text-xs text-muted-foreground">h2 · text-3xl · bold</span>
              </div>
              <div className="flex flex-col gap-1">
                <h3>H3 — The coach huddle brief</h3>
                <span className="font-mono text-xs text-muted-foreground">h3 · text-lg · bold</span>
              </div>
              <div className="flex flex-col gap-1">
                <h4>H4 — Individualized programming</h4>
                <span className="font-mono text-xs text-muted-foreground">h4 · text-base · semibold</span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="max-w-2xl text-muted-foreground">
                  Body — The unified hub for semi-private coaching and fully
                  individualized programming. Booking, billing, CAP notes and
                  compliant messaging in one system.
                </p>
                <span className="font-mono text-xs text-muted-foreground">
                  font-sans · text-sm · text-muted-foreground
                </span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="tnum font-display text-3xl font-extrabold">385 lb</span>
                <span className="tnum font-mono text-sm text-muted-foreground">
                  .tnum · font-mono · tabular-nums
                </span>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Buttons */}
        <Section
          eyebrow="Components"
          title="Buttons"
          description="Variants map to action weight; brand carries the volt glow. Sizes: sm, default, lg, xl."
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Variants</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <Button>Default</Button>
                <Button variant="brand">
                  <Zap className="h-4 w-4" />
                  Brand
                </Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra large</Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Pills */}
        <Section
          eyebrow="Components"
          title="Pills"
          description="Compact status chips with a semantic tone and an optional leading dot or icon."
        >
          <Card>
            <CardContent className="flex flex-col gap-5 pt-6">
              <div className="flex flex-wrap gap-2">
                {pillTones.map((tone) => (
                  <Pill key={tone} tone={tone}>
                    {tone}
                  </Pill>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {pillTones.map((tone) => (
                  <Pill key={tone} tone={tone} dot>
                    {tone} · dot
                  </Pill>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="brand" icon={<Zap className="h-3.5 w-3.5" />}>
                  with icon
                </Pill>
                <Pill tone="success" dot>
                  Rule of Two satisfied
                </Pill>
                <Pill tone="danger" dot>
                  Booking paused
                </Pill>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Cards */}
        <Section
          eyebrow="Components"
          title="Cards"
          description="Rounded-xl surface with soft shadow. Hover lifts to shadow-raised; the accent card uses the brand sheen."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="transition-shadow hover:shadow-raised">
              <CardHeader>
                <CardTitle className="text-base">Default card</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                bg-card · border · shadow-soft. The workhorse container across the
                app.
              </CardContent>
            </Card>
            <Card className="border-brand/40 bg-brand-sheen shadow-glow">
              <CardHeader>
                <CardTitle className="text-base">Accent card</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                bg-brand-sheen · shadow-glow. Used to highlight the popular plan or
                a primary path.
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold">
                Header strip
                <Pill tone="brand" className="ml-auto">
                  Pattern
                </Pill>
              </div>
              <CardContent className="pt-5 text-sm text-muted-foreground">
                A bordered header strip over CardContent — the messaging + preview
                pattern.
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Avatars */}
        <Section
          eyebrow="Components"
          title="Athlete avatars"
          description="Deterministic gradient avatars keyed by hue. Sizes sm, md, lg, xl; optional background ring for stacking."
        >
          <Card>
            <CardContent className="flex flex-wrap items-end gap-6 pt-6">
              {avatarSizes.map((a) => (
                <div key={a.size} className="flex flex-col items-center gap-2">
                  <AthleteAvatar initials={a.initials} hue={a.hue} size={a.size} />
                  <span className="font-mono text-xs text-muted-foreground">{a.size}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-2">
                <div className="flex -space-x-2">
                  {avatarSizes.map((a) => (
                    <AthleteAvatar
                      key={a.size}
                      initials={a.initials}
                      hue={a.hue}
                      size="md"
                      ring
                    />
                  ))}
                </div>
                <span className="font-mono text-xs text-muted-foreground">stacked · ring</span>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Progress */}
        <Section
          eyebrow="Components"
          title="Progress"
          description="Thin linear track (brand / success / warning / muted tones) and the circular ProgressRing."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress bars</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {(
                  [
                    { tone: "brand", value: 92, label: "Program compliance" },
                    { tone: "success", value: 98, label: "Attendance" },
                    { tone: "warning", value: 70, label: "Log adherence" },
                    { tone: "muted", value: 45, label: "Block progress" },
                  ] as const
                ).map((p) => (
                  <div key={p.label} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{p.label}</span>
                      <span className="tnum font-semibold">{p.value}%</span>
                    </div>
                    <Progress value={p.value} tone={p.tone} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress rings</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-8 pt-2">
                <ProgressRing value={92} label="Block C" />
                <ProgressRing value={76} size={80} stroke={7} label="Speed" />
                <ProgressRing value={99} size={96} stroke={8} label="Peaking" />
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Stat tiles */}
        <Section
          eyebrow="Components"
          title="Stat tiles"
          description="KPI tile with a big tabular value, optional unit, trend delta and hint. accent applies the brand sheen."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Huddle prep"
              value="2.4"
              unit="min"
              delta={{ value: "-82%", direction: "down" }}
              hint="from 10–15 min"
            />
            <StatTile
              label="Active athletes"
              value={128}
              delta={{ value: "+6", direction: "up" }}
              hint="this month"
              icon={Zap}
            />
            <StatTile
              label="Rule-of-Two"
              value="100"
              unit="%"
              delta={{ value: "held", direction: "flat" }}
              hint="every minor thread"
            />
            <StatTile
              label="MRR"
              value="$52.4k"
              accent
              delta={{ value: "+7%", direction: "up" }}
              hint="recurring"
            />
          </div>
        </Section>

        {/* Charts */}
        <Section
          eyebrow="Components"
          title="Mini charts"
          description="Dependency-free SVG primitives — BarSeries with an optionally highlighted last bar, and the compact Sparkline."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">BarSeries</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <BarSeries
                  data={[38, 41, 40, 44, 47, 45, 49, 52]}
                  labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]}
                  height={140}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sparkline</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-2">
                <div className="flex items-center gap-4">
                  <Sparkline data={[8, 12, 10, 15, 14, 18, 22, 24]} />
                  <span className="text-xs text-muted-foreground">Rising trend</span>
                </div>
                <div className="flex items-center gap-4">
                  <Sparkline data={[24, 20, 22, 16, 18, 12, 10, 6]} />
                  <span className="text-xs text-muted-foreground">Falling trend</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <p className="border-t border-border pt-6 text-xs text-muted-foreground">
          This page is excluded from search indexing (
          <code className="rounded bg-muted px-1 font-mono">robots: noindex</code>). It
          renders only the shared kit and design tokens — no backend data.
        </p>
      </div>
    </div>
  );
}
