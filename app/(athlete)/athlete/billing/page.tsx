import Link from "next/link";
import type { Route } from "next";
import {
  ChevronDown,
  CreditCard,
  Landmark,
  Receipt,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill, type PillTone } from "@/components/ui/pill";
import { requireAthleteContext } from "@/lib/demo/session";
import {
  athleteProfileById,
  fmtDay,
  invoices,
  money2,
  plans,
  type Invoice,
} from "@/lib/demo/data";
import { billingMeta } from "@/lib/demo/status";
import { cn } from "@/lib/utils";

/** Round 18 (A10c): the open-balance statuses shown on the member page. */
const OUTSTANDING_META: Record<
  "due" | "overdue" | "partial",
  { label: string; tone: PillTone }
> = {
  due: { label: "Due", tone: "warning" },
  overdue: { label: "Overdue", tone: "danger" },
  partial: { label: "Partially paid", tone: "info" },
};

export default async function AthleteBillingPage() {
  const { athlete, isParentView } = requireAthleteContext();

  // Round 5 (P4): parents handle a minor's billing. A minor's own login gets
  // a friendly hand-off instead of card UI; the parent view is unchanged.
  if (athlete.isMinor && !isParentView) {
    const guardianName = athleteProfileById(athlete.id)?.guardian?.name;
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Billing"
          description="Membership and payments for your training."
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand/20 bg-brand/10 text-brand-ink">
              <UserRound className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-base font-semibold">
              Billing is handled by your parent
            </p>
            <p className="max-w-md text-sm text-muted-foreground text-pretty">
              Statements, invoices and payment methods live on
              {guardianName ? ` ${guardianName}'s` : " your parent's"} account
              — nothing for you to manage here. Questions about your
              membership? Ask your parent or message your coach.
            </p>
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

  const billing = billingMeta[athlete.billing.state];
  const plan = plans.find((p) => athlete.planName.startsWith(p.name));
  const amountDue = athlete.billing.amountDueCents;

  // Next-cycle focus: the upcoming charge is the story, not the running total.
  const nextAmount = amountDue > 0 ? amountDue : (plan?.priceCents ?? 0);
  const nextDate = new Date(athlete.billing.nextInvoice);
  const daysUntil = Math.max(
    0,
    Math.ceil((nextDate.getTime() - Date.now()) / 86_400_000),
  );

  // Round 18 (A10c): this athlete's open balances, oldest due date first.
  const outstanding = invoices
    .filter(
      (i): i is Invoice & { status: keyof typeof OUTSTANDING_META } =>
        i.athleteId === athlete.id && !i.archived && i.status in OUTSTANDING_META,
    )
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));

  // Only the two most recent settled receipts, tucked away by default.
  const pastReceipts = invoices
    .filter((i) => i.athleteId === athlete.id && i.status === "paid")
    .slice()
    .sort((a, b) => (b.dueDate > a.dueDate ? 1 : -1))
    .slice(0, 2);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="Your membership and what's coming up next cycle. Payments run on Square at market processing rates — no platform markup."
        actions={
          <Pill tone={billing.tone} dot>
            {billing.label}
          </Pill>
        }
      />

      {/* Next invoice hero */}
      <Card className="overflow-hidden">
        <CardContent className="bg-brand-sheen p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <span className="eyebrow">
                {amountDue > 0 ? "Amount due now" : "Next invoice"}
              </span>
              <div className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                {fmtDay(athlete.billing.nextInvoice)}
              </div>
              <p className="text-sm text-muted-foreground">
                {amountDue > 0
                  ? "Settle at the front desk or update your card to retry."
                  : daysUntil === 0
                    ? "Charged today to your payment method on file."
                    : `In ${daysUntil} day${daysUntil === 1 ? "" : "s"} · charged automatically via Square.`}
              </p>
            </div>
            {/* Round 18 (P3): left-aligned once it wraps under the date at
                375px — right-aligned only beside it on sm+. */}
            <div className="text-left sm:text-right">
              <span className="eyebrow">Amount</span>
              <div className="tnum font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                {money2(nextAmount)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {athlete.planName}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Round 18 (A10c): outstanding invoices — what's still owing and how
          to settle it. Hidden entirely when nothing is open. */}
      {outstanding.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" aria-hidden />
              <h3 className="text-base">Outstanding Invoices</h3>
              <Pill tone="warning" className="ml-auto">
                <span className="tnum">{outstanding.length}</span>
              </Pill>
            </div>
            <ul className="flex flex-col gap-2">
              {outstanding.map((inv) => {
                const meta = OUTSTANDING_META[inv.status];
                // Partial payments count against the balance (P3 rows are
                // stacked + left-aligned at 375px; one row on sm+).
                const owingCents =
                  inv.amountCents -
                  (inv.status === "partial" ? (inv.paidAmountCents ?? 0) : 0);
                return (
                  <li
                    key={inv.id}
                    className="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface/50 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="flex min-w-0 items-center gap-2 sm:flex-1">
                      <span className="truncate text-sm font-semibold">
                        {inv.plan}
                      </span>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        inv.status === "overdue"
                          ? "font-medium text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      Due {fmtDay(inv.dueDate)}
                    </span>
                    <span className="tnum text-sm font-semibold">
                      {money2(owingCents)}
                      {inv.status === "partial" ? (
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          of {money2(inv.amountCents)}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground text-pretty">
              Pay online from your invoice link, or e-transfer / cash at the
              front desk — the staff records it against your invoice.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Plan — membership + cycle folded into one compact card */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-muted-foreground" aria-hidden />
              {/* Round 18 (A10b): "Membership" label → "Plan" */}
              <h3 className="text-base">Plan</h3>
              <Pill tone={billing.tone} className="ml-auto" dot>
                {billing.label}
              </Pill>
            </div>
            <div className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-surface/50 p-4">
              <div>
                <p className="text-sm font-semibold">{athlete.planName}</p>
                <p className="text-xs text-muted-foreground">
                  {plan?.access ?? "Semi-private blocks"}
                </p>
              </div>
              <p className="tnum shrink-0 text-sm font-semibold">
                {plan ? money2(plan.priceCents) : "—"}
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  /{" "}
                  {plan?.period === "Monthly"
                    ? "month"
                    : (plan?.period.replace("Every ", "").toLowerCase() ??
                      "month")}
                </span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-pretty">
              Your plan covers everything above — no separate cycle to track.
              Questions about your membership? Message your coach.
            </p>
          </CardContent>
        </Card>

        {/* Payment method — card on file only. Cash handling stays a
            back-office action (staff mark an invoice paid manually); Round 16
            (Q6): the offline options are named below so members know how. */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
              <h3 className="text-base">Payment Method</h3>
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
              <Pill tone="success">Active</Pill>
            </div>
            <Button variant="outline" size="sm" className="w-full" disabled>
              Update payment method (demo)
            </Button>
            <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground text-pretty">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              Processing is handled by Square at standard market rates. LPS adds
              no platform markup on your payments.
            </p>
            <p className="text-xs text-muted-foreground text-pretty">
              No card on file? Pay by EMT / e-transfer, cash or cheque at the
              front desk — the staff records it against your invoice.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Past receipts — tucked behind a collapsed expander */}
      <details className="group rounded-xl border border-border bg-surface/30">
        <summary className="flex cursor-pointer select-none items-center gap-2 p-4 text-sm text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <Receipt className="h-4 w-4" aria-hidden />
          <span className="font-medium">Past receipts</span>
          <ChevronDown
            className="ml-auto h-4 w-4 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="flex flex-col gap-2 px-4 pb-4">
          {pastReceipts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              No settled receipts yet.
            </p>
          ) : (
            pastReceipts.map((inv) => (
              // Round 18 (P3): at 375px the amount + pill wrap onto their own
              // LEFT-aligned line; sm+ keeps the single right-anchored row.
              <div
                key={inv.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/60 bg-surface/50 px-3 py-2.5 text-xs text-muted-foreground"
              >
                <span className="tnum font-medium text-foreground/80">
                  {fmtDay(inv.dueDate)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {inv.plan} · {inv.method}
                </span>
                <span className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                  <span className="tnum font-semibold text-foreground/80">
                    {money2(inv.amountCents)}
                  </span>
                  <Pill tone="neutral">paid</Pill>
                </span>
              </div>
            ))
          )}
        </div>
      </details>

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
