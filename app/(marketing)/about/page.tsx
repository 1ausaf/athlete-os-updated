import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  ClipboardList,
  CreditCard,
  Handshake,
  MessagesSquare,
  Repeat,
  ShieldAlert,
  Sparkles,
  Timer,
  Trello,
  Users,
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

const oldStack = [
  { name: "Amelia", role: "Booking", icon: ClipboardList },
  { name: "TrainHeroic", role: "Programming", icon: Repeat },
  { name: "Trello", role: "Athlete notes", icon: Trello },
  { name: "Square", role: "Payments", icon: CreditCard },
  { name: "WhatsApp", role: "Messaging", icon: MessagesSquare },
];

const pillars = [
  {
    icon: Users,
    title: "Semi-private, never a class",
    body: "Four to six athletes on the floor at once — each on their own fully individualized, periodized block. The coaching is premium and personal; the software finally matches it.",
  },
  {
    icon: ClipboardList,
    title: "One profile, every signal",
    body: "Membership, program day, CAP notes, PRs, injury flags, billing and messages resolve to a single athlete record — shared cleanly across athlete, coach and owner.",
  },
  {
    icon: BrainCircuit,
    title: "Human-in-the-loop, always",
    body: "AOS drafts, surfaces and reminds. It never coaches. Every plan, note and message is written or approved by a person — AI is the assistant, the coach is the author.",
  },
  {
    icon: ShieldAlert,
    title: "Safe-Sport by construction",
    body: "The Rule of Two is enforced at the system level. No private 1:1 thread between a coach and a minor can exist. No policy PDF, no admin override — it simply can't happen.",
  },
];

const stats = [
  { value: "10–15 → <3", label: "Minutes of huddle prep", hint: "per session, before the floor opens" },
  { value: "5 → 1", label: "Tools replaced", hint: "Amelia · TrainHeroic · Trello · Square · WhatsApp" },
  { value: "100%", label: "Rule-of-Two coverage", hint: "every coach–minor thread, no exceptions" },
  { value: "1", label: "Owned platform", hint: "licensable to peer facilities" },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 volt-halo" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-20 md:px-6 md:py-28">
          <Pill tone="brand" dot>
            About · The Pro Maker™
          </Pill>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            We build pros. The{" "}
            <span className="relative whitespace-nowrap text-brand-ink">
              software
              <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-brand" />
            </span>{" "}
            should get out of the way.
          </h1>
          <p className="max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            LPS Athletic has put athletes on ESPN, TSN, CBC and HBO and produced
            alumni like P.K. Subban. The coaching is elite. The tooling behind it
            was a stack of five apps that stole the first ten minutes of every
            session. The Athlete Operating System is our answer — built in-house,
            owned by us.
          </p>
        </div>
      </section>

      {/* The problem */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <span className="eyebrow">The problem</span>
            <h2 className="text-balance text-3xl md:text-4xl">
              Every huddle started with a scavenger hunt across five tabs.
            </h2>
            <p className="text-muted-foreground">
              To prep a single semi-private session a coach clicked through
              Amelia for the roster, TrainHeroic for each athlete&apos;s program,
              Trello for context notes, Square to check who was past due, and
              WhatsApp to chase a parent. Ten to fifteen minutes, per session,
              before anyone touched a barbell.
            </p>
            <p className="text-muted-foreground">
              Worse, the messaging had no guardrails. A coach texting a minor
              athlete on WhatsApp meant a private 1:1 with no second adult — a
              direct Safe-Sport Rule-of-Two violation, invisible and unlogged.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Pill tone="danger" icon={<Timer className="h-3.5 w-3.5" />}>
                10–15 min prep / session
              </Pill>
              <Pill tone="danger" dot>
                No Rule of Two on WhatsApp
              </Pill>
              <Pill tone="warning" dot>
                Five disconnected systems
              </Pill>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              The old stack · one huddle
              <Pill tone="danger" className="ml-auto">
                5 tabs
              </Pill>
            </div>
            <CardContent className="grid gap-2 p-5">
              {oldStack.map(({ name, role, icon: Icon }) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold line-through decoration-destructive/60">
                      {name}
                    </div>
                    <div className="text-xs text-muted-foreground">{role}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              <div className="mt-1 flex items-center gap-3 rounded-lg bg-brand px-4 py-3 text-brand-foreground shadow-glow">
                <Sparkles className="h-5 w-5" aria-hidden />
                <span className="text-sm font-bold">
                  LPS Athlete Operating System
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* The model */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <div className="mb-10 flex flex-col gap-3">
            <span className="eyebrow">The model &amp; the principle</span>
            <h2 className="max-w-2xl text-3xl md:text-4xl">
              Premium semi-private coaching, unified and automated — so coaches
              coach.
            </h2>
            <p className="max-w-2xl text-pretty text-muted-foreground">
              AOS exists to remove the busywork between a coach and their
              athletes, not to replace the judgement in the middle. Automate the
              admin; protect the relationship.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pillars.map(({ icon: Icon, title, body }) => (
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

      {/* Human-in-the-loop spotlight */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Pill tone="info" icon={<BrainCircuit className="h-3.5 w-3.5" />}>
              The human-in-the-loop principle
            </Pill>
            <h2 className="text-3xl md:text-4xl">
              AI drafts and reminds. It never coaches.
            </h2>
            <p className="text-muted-foreground">
              AOS will summarize a week of CAP notes, flag a lapsed check-in, or
              pre-fill a huddle brief. But a person always writes the program,
              approves the message, and makes the call. The coach is the author;
              the system is the assistant that hands them the pen.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Pill tone="neutral" dot>Coach approves every plan</Pill>
              <Pill tone="neutral" dot>No autonomous messaging</Pill>
              <Pill tone="neutral" dot>Every action audit-logged</Pill>
            </div>
          </div>
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold">
              <Handshake className="h-4 w-4 text-info" />
              Where the human stays in charge
            </div>
            <CardContent className="space-y-3 p-5 text-sm">
              {[
                { a: "AOS drafts", b: "a huddle brief from the roster + latest CAP notes" },
                { a: "Coach reviews", b: "edits the plan and confirms the read on each athlete" },
                { a: "AOS surfaces", b: "a billing pause and a Rule-of-Two gap to resolve" },
                { a: "Coach acts", b: "and every decision is logged against the athlete record" },
              ].map((row) => (
                <div
                  key={row.a}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface/60 p-3"
                >
                  <span className="mt-0.5 flex h-6 shrink-0 items-center rounded-md bg-brand/10 px-2 text-xs font-bold text-brand-ink">
                    {row.a}
                  </span>
                  <span className="text-muted-foreground">{row.b}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stat band */}
      <section className="border-y border-border bg-surface/40">
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

      {/* The ambition */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="eyebrow">The ambition</span>
          <h2 className="max-w-3xl text-balance text-3xl md:text-4xl">
            An asset we own — and can hand to facilities that train the way we do.
          </h2>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            Off-the-shelf gym software was built for class-based studios and
            can&apos;t serve individualized semi-private coaching. So we built our
            own — and because we own it, AOS becomes a licensable platform for
            peer facilities that share our model, turning an internal tool into a
            line of business.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border">
        <div className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 py-16 md:px-6 md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="relative flex flex-col items-center gap-6 text-center">
            <Sparkles className="h-8 w-8 text-brand-ink" />
            <h2 className="max-w-2xl text-balance text-3xl md:text-4xl">
              See the operating system that runs The Pro Maker™.
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
                View pricing &amp; licensing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
