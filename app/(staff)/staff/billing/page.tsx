import { redirect } from "next/navigation";
import {
  BadgeCheck,
  DollarSign,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { facility, invoices, money, plans, revenueTrend } from "@/lib/demo/data";

import { InvoicesPanel } from "./invoice-actions";
import { PlansPanel } from "./plans-panel";
import { RevenuePanel } from "./revenue-panel";

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Team Workspace · Admin"
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

      {/* Revenue over a selectable period (O1) */}
      <RevenuePanel />

      {/* Invoices + the new-invoice flow (O2) */}
      <Card>
        <CardContent className="p-5">
          <InvoicesPanel invoices={invoices} />
        </CardContent>
      </Card>

      {/* Membership plans — editable, with add-plan (O3) */}
      <PlansPanel />

      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        Payments run on Square at standard market rates — LPS adds no platform
        markup on top of processing.
      </p>
    </div>
  );
}
