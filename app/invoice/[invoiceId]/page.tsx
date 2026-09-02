import { notFound } from "next/navigation";
import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";

import { BrandLockup } from "@/components/brand/logo";
import { BrandStyle } from "@/components/tenant/brand-style";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill, type PillTone } from "@/components/ui/pill";
import { fmtDay, invoiceById, money2 } from "@/lib/demo/data";
import { getTenantBranding } from "@/lib/tenant/branding";
import { requireTenantIfTenantHost } from "@/lib/tenant/context";

/**
 * Round 16 (Q5): the public "Share a Link" target — a hosted invoice view
 * the client can open WITHOUT logging in (Square-style). Read-only; the
 * pay button is demo-only.
 */

const STATUS: Record<string, { label: string; tone: PillTone }> = {
  paid: { label: "Paid", tone: "success" },
  due: { label: "Due", tone: "info" },
  overdue: { label: "Overdue", tone: "danger" },
  upcoming: { label: "Scheduled", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
  canceled: { label: "Canceled", tone: "neutral" },
  partial: { label: "Partially paid", tone: "warning" },
  refunded: { label: "Refunded", tone: "neutral" },
};

export default async function PublicInvoicePage({
  params,
}: {
  params: { invoiceId: string };
}) {
  await requireTenantIfTenantHost();
  const branding = await getTenantBranding();

  const inv = invoiceById(params.invoiceId);
  if (!inv) notFound();

  const status = STATUS[inv.status] ?? STATUS.due!;
  const received = inv.status === "partial" ? (inv.paidAmountCents ?? 0) : 0;
  const owing =
    inv.status === "paid" || inv.status === "refunded" || inv.status === "canceled"
      ? 0
      : inv.amountCents - received;

  return (
    <main className="flex min-h-screen items-start justify-center bg-background px-4 py-10">
      <BrandStyle colors={branding.colors} />
      <div className="flex w-full max-w-lg flex-col gap-4">
        <BrandLockup
          subtitle="Member Billing"
          name={branding.name}
          logoUrl={branding.logoUrl}
        />

        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Invoice {inv.id.toUpperCase()}</p>
                <h1 className="mt-1 text-xl font-semibold">{inv.athleteName}</h1>
                <p className="text-sm text-muted-foreground">{inv.plan}</p>
              </div>
              <Pill tone={status.tone} dot>
                {status.label}
              </Pill>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Issued
                </dt>
                <dd className="tnum font-medium">{fmtDay(inv.issuedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Due
                </dt>
                <dd className="tnum font-medium">{fmtDay(inv.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Amount
                </dt>
                <dd className="tnum text-lg font-bold">
                  {money2(inv.amountCents)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Balance
                </dt>
                <dd className="tnum text-lg font-bold">{money2(owing)}</dd>
              </div>
            </dl>

            {inv.status === "partial" ? (
              <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                {money2(received)} received so far — {money2(owing)} remaining.
              </p>
            ) : null}

            {owing > 0 ? (
              <Button variant="brand" className="w-full">
                <CreditCard className="h-4 w-4" aria-hidden />
                Pay {money2(owing)} online
              </Button>
            ) : (
              <p className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                Nothing owing on this invoice.
              </p>
            )}

            <p className="text-xs text-muted-foreground text-pretty">
              {branding.isTenantHost ? (
                <>
                  Prefer e-transfer, cash or cheque? Settle at the front desk —
                  the staff will mark this invoice paid.
                </>
              ) : (
                <>
                  Prefer e-transfer, cash or cheque? Send e-transfers to
                  billing@lpsathletic.com, or settle at the front desk — the
                  staff will mark this invoice paid.
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Secure link from {branding.name} — no login needed. Demo environment:
          payments are simulated.
        </p>
      </div>
    </main>
  );
}
