import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
  Droplet,
  Droplets,
  FileText,
  Lock,
  Milk,
  NotebookPen,
  Target,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById, fmtDay } from "@/lib/demo/data";
import { nutritionProtocols } from "@/lib/demo/training";

import { WeeklyCheckIn } from "./weekly-check-in";

/** Doc-style section heading — mirrors the client's Google-Doc template. */
function DocHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h4 className="eyebrow">{children}</h4>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

export default async function NutritionPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const protocol =
    athlete.nutrition === "pro" ? nutritionProtocols[athlete.id] : undefined;

  /* ---------------------------------------------------------------- */
  /* Upsell state — nutrition coaching is a Pro-tier feature           */
  /* ---------------------------------------------------------------- */
  if (!protocol) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Athlete Portal · Nutrition"
          title="Nutrition"
          description="Fueling guidance written by your coach, tailored to your program and season."
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center sm:p-14">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl text-muted-foreground">
                Nutrition coaching is part of the Pro tier
              </h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground/80 text-pretty">
                Pro athletes get an individualized protocol — weekly body-weight
                and body-fat check-ins with trend tracking, example meals,
                game-day fueling and a supplement plan — written and updated by
                the coaching staff. Talk to your coach to upgrade.
              </p>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button asChild variant="brand">
                <Link href={"/athlete/messages" as Route}>
                  Message your coach
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={"/athlete/dashboard" as Route}>
                  Back to dashboard
                </Link>
              </Button>
            </div>
            {/* Grayed-out preview of what's behind the lock */}
            <div
              className="mt-4 grid w-full max-w-lg gap-2 opacity-40 grayscale sm:grid-cols-2"
              aria-hidden
            >
              {["Weekly check-in", "Daily targets", "Example meals", "Supplements"].map(
                (label) => (
                  <div
                    key={label}
                    className="rounded-lg border border-dashed border-border bg-surface/30 p-3 text-left text-xs font-medium text-muted-foreground"
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Pro state — the protocol document + weekly check-in               */
  /* ---------------------------------------------------------------- */
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Nutrition"
        title={protocol.title}
        description={
          <>
            Written for you by {protocol.coach} · last updated{" "}
            {fmtDay(protocol.updatedAt)}. Follow it like your program — it
            changes when your block does.
          </>
        }
        actions={
          <Pill tone="brand" dot>
            Pro
          </Pill>
        }
      />

      {/* Goal */}
      <Card className="overflow-hidden">
        <CardContent className="flex items-start gap-4 bg-brand-sheen p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
            <Target className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">The goal</span>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-pretty sm:text-base">
              {protocol.goal}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Weekly check-in — weight / body fat / lean mass, trend + history */}
      <WeeklyCheckIn initialCheckIns={protocol.checkIns} />

      {/* Daily targets */}
      <section className="flex flex-col gap-3">
        <span className="eyebrow">Daily targets</span>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {protocol.dailyTargets.map((t) => {
            const [value, ...unitParts] = t.value.split(" ");
            return (
              <StatTile
                key={t.label}
                label={t.label}
                value={value}
                unit={unitParts.join(" ") || undefined}
                hint={t.hint}
              />
            );
          })}
        </div>
      </section>

      {/* The protocol document — mirrors the coach's template top-to-bottom */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">The protocol</h3>
            <Pill tone="neutral" className="ml-auto">
              As written by {protocol.coach}
            </Pill>
          </div>

          {/* Summary */}
          <section className="flex flex-col gap-2">
            <DocHeading>Summary</DocHeading>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-pretty">
              {protocol.summary}
            </p>
          </section>

          {/* Example meals + Healthy fats */}
          <div className="grid gap-6 sm:grid-cols-2">
            <section className="flex flex-col gap-2">
              <DocHeading>Example meals</DocHeading>
              <ul className="flex flex-col gap-2.5">
                {protocol.exampleMeals.map((m) => (
                  <li key={m.meal} className="flex items-start gap-2.5 text-sm">
                    <CheckSquare
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink"
                      aria-hidden
                    />
                    <span className="text-pretty">
                      <span className="font-semibold">{m.meal}:</span>{" "}
                      {m.example}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="flex flex-col gap-2">
              <DocHeading>Healthy fats</DocHeading>
              <ul className="flex flex-col gap-2.5">
                {protocol.healthyFats.map((fat) => (
                  <li key={fat} className="flex items-start gap-2.5 text-sm">
                    <Droplet
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      aria-hidden
                    />
                    <span className="text-pretty">{fat}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Supplements */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h4 className="eyebrow">Supplements</h4>
              <span className="h-px flex-1 bg-border" aria-hidden />
              <Pill tone="neutral">{protocol.supplements.length} approved</Pill>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplement</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead className="text-right">Timing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocol.supplements.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="tnum text-muted-foreground">
                      {s.dose}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {s.timing}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs italic text-muted-foreground">
              All supplements should be taken as recommended on the bottle.
            </p>
          </section>

          {/* Post-workout shake */}
          <section className="flex flex-col gap-2">
            <DocHeading>Post-workout shake</DocHeading>
            <ul className="flex flex-wrap gap-2">
              {protocol.postWorkoutShake.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2"
                >
                  <Milk
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="tnum text-sm font-semibold">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* The rule — highlighted, non-negotiable */}
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-warning"
              aria-hidden
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-warning">
                The rule
              </span>
              <p className="text-sm leading-relaxed text-pretty">
                {protocol.rule}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game day + hydration */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <CalendarCheck
                className="h-5 w-5 text-muted-foreground"
                aria-hidden
              />
              <h3 className="text-base">Game day</h3>
            </div>
            <ul className="flex flex-col gap-2.5">
              {protocol.gameDay.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-hidden
                  />
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/10 p-4 lg:self-start">
          <Droplets className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-info">Hydration</span>
            <p className="text-sm leading-relaxed text-pretty">
              {protocol.hydration}
            </p>
          </div>
        </div>
      </div>

      {/* Coach notes */}
      <Card>
        <CardContent className="flex items-start gap-4 p-5 sm:p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <NotebookPen className="h-5 w-5 text-muted-foreground" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-base">Coach notes</h3>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {protocol.notes}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              — {protocol.coach}, {fmtDay(protocol.updatedAt)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
