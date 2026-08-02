"use client";

import { useState } from "react";
import { Check, Plus, Receipt, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import type { PillTone } from "@/components/ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { athletes, fmtDay, money2, type Invoice } from "@/lib/demo/data";
import { trainingGroups } from "@/lib/demo/training";

import { BillingDialog } from "./billing-dialog";

const statusMeta: Record<Invoice["status"], { label: string; tone: PillTone }> =
  {
    paid: { label: "Paid", tone: "success" },
    upcoming: { label: "Upcoming", tone: "neutral" },
    due: { label: "Due", tone: "warning" },
    overdue: { label: "Overdue", tone: "danger" },
    canceled: { label: "Canceled", tone: "neutral" },
  };

/**
 * Invoices panel: header + table + the round-5 "New invoice" flow (O2 — e.g.
 * a chiropractor pass-through billed straight to the client). Any open
 * invoice can still be marked paid manually (cash / e-transfer settled
 * outside Square) or canceled. Local state, demo only.
 */
export function InvoicesPanel({ invoices }: { invoices: Invoice[] }) {
  const [rows, setRows] = useState<Invoice[]>(invoices);
  const [creating, setCreating] = useState(false);
  // B1 — row actions ask for confirmation before the status flips.
  const [confirming, setConfirming] = useState<{
    inv: Invoice;
    action: "paid" | "cancel";
  } | null>(null);

  function setStatus(id: string, status: Invoice["status"]) {
    setRows((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status } : inv)),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            Recent charges across the roster — including one-off pass-through
            billing. Clear an overdue balance directly from the row.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="neutral" icon={<Receipt className="h-3.5 w-3.5" />}>
            {rows.length} invoices
          </Pill>
          <Button variant="brand" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">
                Plan / memo
              </TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="hidden md:table-cell">Method</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((inv) => {
              const meta = statusMeta[inv.status];
              const isOverdue = inv.status === "overdue";
              const isOpen =
                inv.status === "due" ||
                inv.status === "overdue" ||
                inv.status === "upcoming";
              return (
                <TableRow
                  key={inv.id}
                  className={
                    isOverdue
                      ? "border-destructive/20 bg-destructive/[0.05] hover:bg-destructive/[0.08]"
                      : inv.status === "canceled"
                        ? "opacity-60"
                        : undefined
                  }
                >
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {inv.athleteName}
                      {inv.id.startsWith("inv-local") ? (
                        <Pill tone="brand">New</Pill>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {inv.plan}
                  </TableCell>
                  <TableCell className="tnum text-right font-semibold">
                    {money2(inv.amountCents)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtDay(inv.dueDate)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {inv.method}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isOpen ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Settle manually — cash or e-transfer taken outside Square"
                            onClick={() =>
                              setConfirming({ inv, action: "paid" })
                            }
                          >
                            <Check className="h-4 w-4" />
                            Mark paid
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            title="Cancel this invoice"
                            onClick={() =>
                              setConfirming({ inv, action: "cancel" })
                            }
                          >
                            <XCircle className="h-4 w-4" />
                            Cancel
                          </Button>
                        </>
                      ) : null}
                      <Pill tone={meta.tone} dot>
                        {meta.label}
                      </Pill>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        New invoices save locally in this demo — in production they charge
        through Square.
      </p>

      {creating ? (
        <NewInvoiceDialog
          onClose={() => setCreating(false)}
          onCreate={(inv) => {
            setRows((prev) => [inv, ...prev]);
            setCreating(false);
          }}
        />
      ) : null}

      {/* B1 — confirmation before an invoice is settled or canceled. */}
      {confirming ? (
        <BillingDialog
          title={
            confirming.action === "paid"
              ? "Mark invoice as paid"
              : "Cancel invoice"
          }
          subtitle={`${confirming.inv.athleteName} · ${money2(
            confirming.inv.amountCents,
          )} · due ${fmtDay(confirming.inv.dueDate)}`}
          onClose={() => setConfirming(null)}
        >
          <p className="text-sm">
            {confirming.action === "paid"
              ? "Are you sure you want to mark this invoice as paid?"
              : "Are you sure you want to cancel this invoice?"}
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming(null)}
            >
              Keep
            </Button>
            <Button
              variant={confirming.action === "paid" ? "brand" : "destructive"}
              size="sm"
              onClick={() => {
                setStatus(
                  confirming.inv.id,
                  confirming.action === "paid" ? "paid" : "canceled",
                );
                setConfirming(null);
              }}
            >
              Confirm
            </Button>
          </div>
        </BillingDialog>
      ) : null}
    </div>
  );
}

/** O2 — create a one-off invoice for any client (athlete or team). */
function NewInvoiceDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (invoice: Invoice) => void;
}) {
  const [clientId, setClientId] = useState(athletes[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [due, setDue] = useState(() => {
    const d = new Date(Date.now() + 7 * 86_400_000);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  });

  const clientName =
    athletes.find((a) => a.id === clientId)?.name ??
    trainingGroups.find((g) => g.id === clientId)?.name ??
    "";
  const amountNum = parseFloat(amount || "0");
  const valid = clientName.length > 0 && amountNum > 0 && due.length > 0;

  function create() {
    if (!valid) return;
    onCreate({
      id: `inv-local-${Date.now()}`,
      athleteId: clientId,
      athleteName: clientName,
      plan: memo.trim() || "One-off invoice",
      amountCents: Math.round(amountNum * 100),
      dueDate: new Date(`${due}T12:00:00`).toISOString(),
      status: "due",
      method: "Square",
    });
  }

  return (
    <BillingDialog
      title="New invoice"
      subtitle="One-off charges — pass-through billing, gear, missed-session fees."
      onClose={onClose}
    >
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Client</Label>
        <select
          value={clientId}
          aria-label="Invoice client"
          onChange={(e) => setClientId(e.target.value)}
          className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
        >
          <optgroup label="Athletes">
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Teams">
            {trainingGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Amount (CAD)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="120.00"
            value={amount}
            autoFocus
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Due date</Label>
          <Input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Memo</Label>
        <Input
          placeholder="e.g. Chiropractor pass-through"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">
          Lands as a Square charge marked “Due”.
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="brand" size="sm" disabled={!valid} onClick={create}>
            Create invoice
          </Button>
        </div>
      </div>
    </BillingDialog>
  );
}
