import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CreditCard,
  DollarSign,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { BarSeries } from "@/components/app/mini-charts";
import { StatTile } from "@/components/app/stat-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { facility, invoices, money, plans, revenueTrend } from "@/lib/demo/data";

import { InvoicesTable } from "./invoice-actions";

export default async function StaffBillingPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const activeMembers = plans.reduce((n, p) => n + p.activeMembers, 0);
  const thisWeekCents = revenueTrend[revenueTrend.length - 1];
  const prevWeekCents = revenueTrend[revenueTrend.length - 2] ?? thisWeekCents;
  const wow =
    prevWeekCents > 0
      ? Math.round(((thisWeekCents - prevWeekCents) / prevWeekCents) * 100)
      : 0;

  const weekLabels = revenueTrend.map((_, i) => `W${i + 1}`);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Admin"
        title="Billing & revenue"
        description="Recurring revenue, invoices, and membership plans — powered by Square at market rates, with no platform markup."
        actions={
          <Pill tone="brand" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
            Square · no markup
          </Pill>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Monthly recurring"
          value={money(facility.monthlyRecurringCents)}
          icon={DollarSign}
          accent
          delta={{ value: `${wow >= 0 ? "+" : ""}${wow}% WoW`, direction: wow >= 0 ? "up" : "down" }}
        />
        <StatTile
          label="Overdue accounts"
          value={facility.overdueAccounts}
          icon={Receipt}
          hint={facility.overdueAccounts === 0 ? "all current" : "needs follow-up"}
        />
        <StatTile
          label="Active members"
          value={activeMembers}
          icon={Users}
          hint="across all plans"
        />
        <StatTile
          label="This week revenue"
          value={money(thisWeekCents)}
          icon={TrendingUp}
          hint="week 8 of trend"
        />
      </div>

      {/* Revenue trend */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="eyebrow">Revenue trend</span>
              <p className="text-sm text-muted-foreground">
                Weekly collections, last 8 weeks — {money(revenueTrend[0])} →{" "}
                {money(thisWeekCents)}.
              </p>
            </div>
            <Pill tone={wow >= 0 ? "success" : "danger"} dot>
              {wow >= 0 ? "+" : ""}
              {wow}% week over week
            </Pill>
          </div>
          <BarSeries data={revenueTrend} labels={weekLabels} height={160} />
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg">Invoices</h2>
              <p className="text-sm text-muted-foreground">
                Recent charges across the roster. Clear an overdue balance
                directly from the row.
              </p>
            </div>
            <Pill tone="neutral" icon={<Receipt className="h-3.5 w-3.5" />}>
              {invoices.length} invoices
            </Pill>
          </div>
          <InvoicesTable invoices={invoices} />
        </CardContent>
      </Card>

      {/* Membership plans */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h2 className="text-lg">Membership plans</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={
                plan.popular
                  ? "relative overflow-hidden bg-brand-sheen ring-1 ring-brand/30"
                  : "relative overflow-hidden"
              }
            >
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-bold">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.access}</p>
                  </div>
                  {plan.popular ? <Pill tone="brand">Popular</Pill> : null}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="tnum font-display text-3xl font-extrabold tracking-tight">
                    {money(plan.priceCents)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {plan.period.toLowerCase()}
                  </span>
                </div>
                <dl className="mt-auto flex flex-col gap-1.5 text-xs">
                  <PlanRow label="Frequency" value={plan.frequency} />
                  <PlanRow label="Sessions" value={plan.sessionsPerPeriod} />
                </dl>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    Active members
                  </span>
                  <span className="tnum text-sm font-bold">
                    {plan.activeMembers}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        Payments run on Square at standard market rates — LPS adds no platform
        markup on top of processing.
      </p>
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground/90">{value}</dd>
    </div>
  );
}
