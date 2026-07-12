import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CreditCard, Landmark, ShieldCheck } from "lucide-react";

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
import { athleteById, fmtDay, invoices, money2, plans } from "@/lib/demo/data";
import { billingMeta } from "@/lib/demo/status";

const invoiceTone: Record<
  string,
  "success" | "warning" | "danger" | "info"
> = {
  paid: "success",
  due: "warning",
  overdue: "danger",
  upcoming: "info",
};

export default async function AthleteBillingPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const billing = billingMeta[athlete.billing.state];
  const plan = plans.find((p) => athlete.planName.startsWith(p.name));
  const amountDue = athlete.billing.amountDueCents;

  const myInvoices = invoices
    .filter((i) => i.athleteId === athlete.id)
    .slice()
    .sort((a, b) => (b.dueDate > a.dueDate ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Billing"
        title="Billing"
        description="Your membership, standing, and invoice history. Payments run on Square at market processing rates — no platform markup."
        actions={
          <Pill tone={billing.tone} dot>
            {billing.label}
          </Pill>
        }
      />

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Amount due"
          value={money2(amountDue)}
          hint={amountDue > 0 ? "Due now" : "No balance"}
          accent={amountDue > 0}
        />
        <StatTile
          label="Next invoice"
          value={fmtDay(athlete.billing.nextInvoice)}
          hint={plan?.period ?? "Monthly"}
        />
        <StatTile label="Plan" value={athlete.planName} hint={athlete.frequency} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Plan card */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-muted-foreground" aria-hidden />
              <h3 className="text-base">Membership</h3>
              <Pill tone={billing.tone} className="ml-auto" dot>
                {billing.label}
              </Pill>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Row label="Plan" value={athlete.planName} />
              <Row label="Billing cycle" value={plan?.period ?? "Monthly"} />
              <Row
                label="Cadence"
                value={plan?.frequency ?? athlete.frequency}
              />
              <Row
                label="Rate"
                value={plan ? `${money2(plan.priceCents)} / cycle` : "—"}
              />
              <Row label="Access" value={plan?.access ?? "Semi-private blocks"} />
              <Row
                label="Next invoice"
                value={fmtDay(athlete.billing.nextInvoice)}
              />
            </dl>
          </CardContent>
        </Card>

        {/* Payment method card */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
              <h3 className="text-base">Payment method</h3>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-4">
              <span className="flex h-10 w-14 items-center justify-center rounded-md bg-brand/10 text-xs font-bold text-brand-ink">
                VISA
              </span>
              <div className="min-w-0 flex-1">
                <div className="tnum text-sm font-semibold">
                  •••• •••• •••• 4242
                </div>
                <div className="text-xs text-muted-foreground">
                  Card on file · Square · exp 08/27
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" disabled>
              Update payment method (demo)
            </Button>
            <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground text-pretty">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              Processing is handled by Square at standard market rates. LPS adds
              no platform markup on your payments.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice history */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <h3 className="text-base">Invoice history</h3>
            <Pill tone="neutral" className="ml-auto">
              {myInvoices.length} invoice{myInvoices.length === 1 ? "" : "s"}
            </Pill>
          </div>
          {myInvoices.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
              No invoices on file yet.
            </p>
          ) : (
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Due date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="tnum font-medium">
                      {fmtDay(inv.dueDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {inv.plan}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {inv.method}
                    </TableCell>
                    <TableCell className="tnum text-right font-semibold">
                      {money2(inv.amountCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Pill tone={invoiceTone[inv.status] ?? "neutral"}>
                        {inv.status}
                      </Pill>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <Link
          href={"/athlete/dashboard" as Route}
          className="underline-offset-4 hover:underline"
        >
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
