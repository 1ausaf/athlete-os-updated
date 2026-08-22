"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  CreditCard,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Send,
  Undo2,
  XCircle,
} from "lucide-react";

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
import {
  athletes,
  fmtDay,
  money2,
  PAYMENT_METHODS,
  type Invoice,
} from "@/lib/demo/data";
import { trainingGroups } from "@/lib/demo/training";

import { BillingDialog } from "./billing-dialog";

const statusMeta: Record<Invoice["status"], { label: string; tone: PillTone }> =
  {
    paid: { label: "Paid", tone: "success" },
    upcoming: { label: "Upcoming", tone: "neutral" },
    due: { label: "Due", tone: "warning" },
    overdue: { label: "Overdue", tone: "danger" },
    canceled: { label: "Canceled", tone: "neutral" },
    partial: { label: "Partially paid", tone: "info" },
    refunded: { label: "Refunded", tone: "neutral" },
  };

/** Cents still owed on an invoice, partial payments considered (R48). */
function remainingCents(inv: Invoice): number {
  return inv.amountCents - (inv.paidAmountCents ?? 0);
}

/**
 * Round 15 (W1): where the open row menu sits on screen. Placement is
 * captured from the trigger's rect at open time; the menu renders through a
 * portal (the table wrappers clip overflow) and drops UP near the viewport
 * bottom so the last rows stay reachable.
 */
interface RowMenuState {
  id: string;
  top: number;
  bottom: number;
  right: number;
  dropUp: boolean;
}

/** One status-filtered entry in the row's ⋯ overflow menu. */
interface RowMenuItem {
  label: string;
  icon: ReactNode;
  destructive?: boolean;
  onSelect: () => void;
}

/**
 * Invoices panel: header + table + the round-5 "New invoice" flow (O2 — e.g.
 * a chiropractor pass-through billed straight to the client). Any open
 * invoice can still be marked paid manually (cash / e-transfer settled
 * outside Square) or canceled. Round 10: audit dates on every row (R45),
 * payment method + partial payments at mark-paid time (R47/R48), refunds
 * (R49) and receipts (R50). Round 15 (W1): the inline action cluster is now
 * a per-row ⋯ overflow menu (messaging-inbox idiom) and open invoices gain
 * an Edit… dialog for amount + due date. Local state, demo only.
 */
export function InvoicesPanel({ invoices }: { invoices: Invoice[] }) {
  const [rows, setRows] = useState<Invoice[]>(invoices);
  const [creating, setCreating] = useState(false);
  // B1 — row actions ask for confirmation before the status flips.
  const [confirming, setConfirming] = useState<{
    inv: Invoice;
    action: "paid" | "cancel" | "record" | "refund" | "push" | "edit";
  } | null>(null);
  // W1 — which row's ⋯ overflow menu is open (plus where to draw it).
  const [menuFor, setMenuFor] = useState<RowMenuState | null>(null);
  // R50 — receipt/refund confirmations flash at the bottom of the screen.
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  // W1 — the open row menu closes on Escape and on any scroll (its portal
  // position is fixed, so it would drift from the row otherwise).
  useEffect(() => {
    if (!menuFor) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuFor(null);
    }
    function onScroll() {
      setMenuFor(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menuFor]);

  function showFlash(message: string) {
    setFlash(message);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 3200);
  }

  function patchRow(id: string, patch: Partial<Invoice>) {
    setRows((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)),
    );
  }

  /** R47/R48 — settle (or partially settle) an invoice. */
  function recordPayment(inv: Invoice, method: string, receivedCents: number) {
    const total = (inv.paidAmountCents ?? 0) + receivedCents;
    if (total >= inv.amountCents) {
      patchRow(inv.id, {
        status: "paid",
        paidAt: new Date().toISOString(),
        paidMethod: method,
        paidAmountCents: inv.amountCents,
      });
      // R50 — a receipt goes out the moment the invoice settles.
      showFlash(`Receipt emailed to ${inv.athleteName}.`);
    } else {
      patchRow(inv.id, {
        status: "partial",
        paidMethod: method,
        paidAmountCents: total,
      });
      showFlash(
        `Payment recorded — ${money2(total)} received, ${money2(
          inv.amountCents - total,
        )} remaining.`,
      );
    }
    setConfirming(null);
  }

  /** R45 — cancellation stamps its date for the audit trail. */
  function cancelInvoice(inv: Invoice) {
    patchRow(inv.id, {
      status: "canceled",
      canceledAt: new Date().toISOString(),
    });
    setConfirming(null);
  }

  /** Round 11 (A6) — client away: push the cycle back a week or two. */
  function pushDueDate(inv: Invoice, weeks: number) {
    const shifted = new Date(
      new Date(inv.dueDate).getTime() + weeks * 7 * 86_400_000,
    ).toISOString();
    patchRow(inv.id, {
      dueDate: shifted,
      status: inv.status === "overdue" ? "due" : inv.status,
    });
    showFlash(
      `Due date pushed to ${fmtDay(shifted)} — cycle extended while ${
        inv.athleteName
      } is away.`,
    );
    setConfirming(null);
  }

  /** R49 — full refunds flip the status; partial ones annotate the row. */
  function refundInvoice(inv: Invoice, refundCents: number) {
    const paidBase = inv.paidAmountCents ?? inv.amountCents;
    const already = inv.refundedCents ?? 0;
    const next = Math.min(paidBase, already + refundCents);
    if (next >= paidBase) {
      patchRow(inv.id, { status: "refunded", refundedCents: paidBase });
      showFlash(
        `${money2(paidBase - already)} refunded to ${inv.athleteName} — invoice fully refunded.`,
      );
    } else {
      patchRow(inv.id, { refundedCents: next });
      showFlash(`${money2(refundCents)} refunded to ${inv.athleteName}.`);
    }
    setConfirming(null);
  }

  /**
   * Round 15 (W1): the ⋯ menu's entries, filtered by status. Every entry
   * reuses an existing handler/dialog — "Take Payment" is simply the menu
   * label for the record-payment flow; only "Edit…" is new. Canceled and
   * refunded rows get no menu (the trigger renders disabled).
   */
  function menuItemsFor(inv: Invoice): RowMenuItem[] {
    const iconCls = "h-3.5 w-3.5 text-muted-foreground";
    const isOpen =
      inv.status === "due" ||
      inv.status === "overdue" ||
      inv.status === "upcoming";
    const takePayment: RowMenuItem = {
      label: "Take Payment",
      icon: <CreditCard className={iconCls} />,
      onSelect: () => setConfirming({ inv, action: "record" }),
    };
    const refund: RowMenuItem = {
      label: "Refund…",
      icon: <Undo2 className={iconCls} />,
      onSelect: () => setConfirming({ inv, action: "refund" }),
    };
    const cancel: RowMenuItem = {
      label: "Cancel",
      icon: <XCircle className="h-3.5 w-3.5" />,
      destructive: true,
      onSelect: () => setConfirming({ inv, action: "cancel" }),
    };
    if (isOpen) {
      return [
        takePayment,
        {
          label: "Mark as Paid",
          icon: <Check className={iconCls} />,
          onSelect: () => setConfirming({ inv, action: "paid" }),
        },
        {
          label: "Push Due Date",
          icon: <CalendarClock className={iconCls} />,
          onSelect: () => setConfirming({ inv, action: "push" }),
        },
        {
          label: "Edit…",
          icon: <Pencil className={iconCls} />,
          onSelect: () => setConfirming({ inv, action: "edit" }),
        },
        cancel,
      ];
    }
    if (inv.status === "partial") return [takePayment, refund, cancel];
    if (inv.status === "paid") {
      return [
        {
          label: "Send Receipt",
          icon: <Send className={iconCls} />,
          onSelect: () => showFlash(`Receipt sent to ${inv.athleteName}.`),
        },
        refund,
      ];
    }
    return [];
  }

  // W1 — the invoice whose menu is open (menu markup lives in one portal).
  const menuInv = menuFor
    ? (rows.find((r) => r.id === menuFor.id) ?? null)
    : null;

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
              {/* R45 — issue date beside due date, the audit trail */}
              <TableHead className="hidden md:table-cell">Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="hidden md:table-cell">Method</TableHead>
              <TableHead className="text-right">Status</TableHead>
              {/* W1 — the ⋯ overflow-menu column */}
              <TableHead className="w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((inv) => {
              const meta = statusMeta[inv.status];
              const isOverdue = inv.status === "overdue";
              // W1 — canceled/refunded rows have an empty menu.
              const hasActions = menuItemsFor(inv).length > 0;
              // R45/R47/R48 — the resolved line under the status pill.
              const resolvedNote =
                inv.status === "paid"
                  ? [
                      inv.paidAt ? `Paid ${fmtDay(inv.paidAt)}` : "Paid",
                      inv.paidMethod ?? inv.method,
                    ].join(" · ") +
                    (inv.refundedCents
                      ? ` · −${money2(inv.refundedCents)} refunded`
                      : "")
                  : inv.status === "canceled"
                    ? inv.canceledAt
                      ? `Canceled ${fmtDay(inv.canceledAt)}`
                      : null
                    : inv.status === "partial"
                      ? `${money2(inv.paidAmountCents ?? 0)} paid / ${money2(
                          remainingCents(inv),
                        )} remaining`
                      : inv.status === "refunded"
                        ? `Refunded in full${
                            inv.paidAt ? ` · paid ${fmtDay(inv.paidAt)}` : ""
                          }`
                        : null;
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
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {fmtDay(inv.issuedAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtDay(inv.dueDate)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {inv.paidMethod ?? inv.method}
                  </TableCell>
                  {/* W1 — the pill is information and stays on the row;
                      the actions moved into the ⋯ menu next door. */}
                  <TableCell className="text-right">
                    <Pill tone={meta.tone} dot>
                      {meta.label}
                    </Pill>
                    {resolvedNote ? (
                      <div className="mt-1 text-[0.7rem] text-muted-foreground">
                        {resolvedNote}
                      </div>
                    ) : null}
                  </TableCell>
                  {/* W1 — per-row ⋯ overflow menu (inbox idiom); canceled /
                      refunded rows have nothing to do, so it's disabled. */}
                  <TableCell className="w-10 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      disabled={!hasActions}
                      title={hasActions ? undefined : "No actions available"}
                      aria-label={`Invoice actions for ${inv.athleteName}`}
                      aria-haspopup="menu"
                      aria-expanded={menuFor?.id === inv.id}
                      onClick={(e) => {
                        // Round 15 (W1): the table wrappers clip overflow, so
                        // the menu renders through a portal — capture where
                        // the trigger sits and drop up near the viewport
                        // bottom so the last rows' menus stay reachable.
                        const r = e.currentTarget.getBoundingClientRect();
                        setMenuFor((cur) =>
                          cur?.id === inv.id
                            ? null
                            : {
                                id: inv.id,
                                top: r.bottom + 4,
                                bottom: window.innerHeight - r.top + 4,
                                right: Math.max(window.innerWidth - r.right, 8),
                                dropUp: r.bottom + 200 > window.innerHeight,
                              },
                        );
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* W1 — the open row's ⋯ menu + its click-away layer. Portaled to the
          body so the table's overflow wrappers can't clip it. */}
      {menuFor && menuInv
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close invoice menu"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setMenuFor(null)}
              />
              <span
                className="fixed z-30 block w-44 rounded-lg border border-border bg-card p-1 text-left shadow-raised"
                style={
                  menuFor.dropUp
                    ? { right: menuFor.right, bottom: menuFor.bottom }
                    : { right: menuFor.right, top: menuFor.top }
                }
              >
                {menuItemsFor(menuInv).map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setMenuFor(null);
                      item.onSelect();
                    }}
                    className={
                      item.destructive
                        ? "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/[0.08]"
                        : "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent"
                    }
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </span>
            </>,
            document.body,
          )
        : null}

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

      {/* B1 — confirmation before an invoice is canceled (R45: date stamped). */}
      {confirming?.action === "cancel" ? (
        <BillingDialog
          title="Cancel invoice"
          subtitle={`${confirming.inv.athleteName} · ${money2(
            confirming.inv.amountCents,
          )} · due ${fmtDay(confirming.inv.dueDate)}`}
          onClose={() => setConfirming(null)}
        >
          <p className="text-sm">
            Are you sure you want to cancel this invoice?
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
              variant="destructive"
              size="sm"
              onClick={() => cancelInvoice(confirming.inv)}
            >
              Confirm
            </Button>
          </div>
        </BillingDialog>
      ) : null}

      {/* R47/R48 — mark paid / record payment: method + amount received. */}
      {confirming?.action === "paid" || confirming?.action === "record" ? (
        <SettlePaymentDialog
          inv={confirming.inv}
          record={confirming.action === "record"}
          onClose={() => setConfirming(null)}
          onConfirm={(method, cents) =>
            recordPayment(confirming.inv, method, cents)
          }
        />
      ) : null}

      {/* A6 — push the due date while the client is away. */}
      {confirming?.action === "push" ? (
        <PushDueDateDialog
          inv={confirming.inv}
          onClose={() => setConfirming(null)}
          onConfirm={(weeks) => pushDueDate(confirming.inv, weeks)}
        />
      ) : null}

      {/* Round 15 (W1) — edit an open invoice's amount / due date. */}
      {confirming?.action === "edit" ? (
        <EditInvoiceDialog
          inv={confirming.inv}
          onClose={() => setConfirming(null)}
          onSave={(amountCents, dueDate) => {
            patchRow(confirming.inv.id, { amountCents, dueDate });
            showFlash("Invoice updated.");
            setConfirming(null);
          }}
        />
      ) : null}

      {/* R49 — full or partial refund on a paid invoice. */}
      {confirming?.action === "refund" ? (
        <RefundDialog
          inv={confirming.inv}
          onClose={() => setConfirming(null)}
          onConfirm={(cents) => refundInvoice(confirming.inv, cents)}
        />
      ) : null}

      {/* R50 — receipt/refund flash */}
      {flash ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-full border border-success/30 bg-card px-4 py-2 text-center text-sm font-medium shadow-raised"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          {flash}
        </div>
      ) : null}
    </div>
  );
}

/**
 * R47/R48 — settle an invoice: pick the payment method and enter the amount
 * received (prefilled with the outstanding balance). Anything less than the
 * balance keeps the invoice open as Partially paid.
 */
function SettlePaymentDialog({
  inv,
  record,
  onClose,
  onConfirm,
}: {
  inv: Invoice;
  /** True when topping up a partially paid invoice. */
  record: boolean;
  onClose: () => void;
  onConfirm: (method: string, receivedCents: number) => void;
}) {
  const remaining = remainingCents(inv);
  const [method, setMethod] = useState<string>(inv.paidMethod ?? "Square");
  const [amount, setAmount] = useState((remaining / 100).toFixed(2));

  const receivedCents = Math.round(parseFloat(amount || "0") * 100);
  const valid = receivedCents > 0 && receivedCents <= remaining;
  const partial = valid && receivedCents < remaining;

  return (
    <BillingDialog
      title={record ? "Record payment" : "Mark invoice as paid"}
      subtitle={`${inv.athleteName} · ${money2(inv.amountCents)} · due ${fmtDay(
        inv.dueDate,
      )}`}
      onClose={onClose}
    >
      {record ? (
        <p className="text-sm text-muted-foreground">
          {money2(inv.paidAmountCents ?? 0)} received so far —{" "}
          <span className="font-semibold text-foreground">
            {money2(remaining)}
          </span>{" "}
          outstanding.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Payment method
          </Label>
          <select
            value={method}
            aria-label="Payment method"
            onChange={(e) => setMethod(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Amount received (CAD)
          </Label>
          <Input
            type="number"
            min={0}
            max={remaining / 100}
            step="0.01"
            value={amount}
            autoFocus
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>
      <p
        className={
          partial
            ? "rounded-lg border border-info/30 bg-info/[0.06] px-3 py-2 text-xs text-info"
            : "text-xs text-muted-foreground"
        }
      >
        {partial
          ? `Less than the balance — the invoice stays open as Partially paid (${money2(
              remaining - receivedCents,
            )} remaining).`
          : `A receipt is emailed to ${inv.athleteName} as soon as the invoice is settled.`}
      </p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose}>
          Keep
        </Button>
        <Button
          variant="brand"
          size="sm"
          disabled={!valid}
          onClick={() => onConfirm(method, receivedCents)}
        >
          {partial ? "Record partial payment" : "Confirm"}
        </Button>
      </div>
    </BillingDialog>
  );
}

/**
 * Round 11 (A6) — push an open invoice's due date back one or two weeks:
 * clients away for a week get their subscription cycle extended instead of
 * going overdue. Overdue rows flip back to Due.
 */
function PushDueDateDialog({
  inv,
  onClose,
  onConfirm,
}: {
  inv: Invoice;
  onClose: () => void;
  onConfirm: (weeks: number) => void;
}) {
  return (
    <BillingDialog
      title="Push due date"
      subtitle={`${inv.athleteName} · ${money2(inv.amountCents)} · due ${fmtDay(
        inv.dueDate,
      )}`}
      onClose={onClose}
    >
      <p className="text-sm text-muted-foreground">
        Client away for a bit? Push the cycle back — the subscription picks up
        where it left off, nothing is lost or charged twice.
      </p>
      <div className="flex flex-col gap-2">
        {[1, 2].map((weeks) => {
          const shifted = new Date(
            new Date(inv.dueDate).getTime() + weeks * 7 * 86_400_000,
          );
          return (
            <Button
              key={weeks}
              variant="outline"
              size="sm"
              className="justify-between"
              onClick={() => onConfirm(weeks)}
            >
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" />+{weeks} week
                {weeks === 1 ? "" : "s"}
              </span>
              <span className="text-muted-foreground">
                new due date {fmtDay(shifted.toISOString())}
              </span>
            </Button>
          );
        })}
      </div>
      {inv.status === "overdue" ? (
        <p className="text-xs text-muted-foreground">
          This invoice is overdue — pushing the date also clears the overdue
          flag back to Due.
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose}>
          Keep as is
        </Button>
      </div>
    </BillingDialog>
  );
}

/**
 * R49 — refund a paid invoice: the amount prefills with everything paid
 * (minus prior refunds). A full refund flips the status to Refunded; a
 * partial one keeps the row Paid with a "−$X refunded" note.
 */
function RefundDialog({
  inv,
  onClose,
  onConfirm,
}: {
  inv: Invoice;
  onClose: () => void;
  onConfirm: (refundCents: number) => void;
}) {
  const paidBase = inv.paidAmountCents ?? inv.amountCents;
  const refundable = paidBase - (inv.refundedCents ?? 0);
  const [amount, setAmount] = useState((refundable / 100).toFixed(2));

  const cents = Math.round(parseFloat(amount || "0") * 100);
  const valid = cents > 0 && cents <= refundable;
  const full = valid && cents === refundable;

  return (
    <BillingDialog
      title="Refund payment"
      subtitle={`${inv.athleteName} · paid ${money2(paidBase)}${
        inv.paidMethod ? ` · ${inv.paidMethod}` : ""
      }`}
      onClose={onClose}
    >
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">
          Refund amount (CAD)
        </Label>
        <Input
          type="number"
          min={0}
          max={refundable / 100}
          step="0.01"
          value={amount}
          autoFocus
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {full
          ? "Refunds the full payment — the invoice is marked Refunded."
          : valid
            ? `Partial refund — the invoice stays Paid with a −${money2(
                cents,
              )} refunded note.`
            : `Up to ${money2(refundable)} can be refunded.`}
      </p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose}>
          Keep
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={!valid}
          onClick={() => onConfirm(cents)}
        >
          {full ? "Refund in full" : "Refund"}
        </Button>
      </div>
    </BillingDialog>
  );
}

/**
 * Round 15 (W1) — edit an open invoice: just the amount and the due date,
 * saved straight onto the row. Anything deeper (client, memo) is a cancel +
 * re-issue in real billing systems, so it stays out of scope here.
 */
function EditInvoiceDialog({
  inv,
  onClose,
  onSave,
}: {
  inv: Invoice;
  onClose: () => void;
  onSave: (amountCents: number, dueDate: string) => void;
}) {
  const [amount, setAmount] = useState((inv.amountCents / 100).toFixed(2));
  const [due, setDue] = useState(() => {
    const d = new Date(inv.dueDate);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  });

  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const valid = amountCents > 0 && due.length > 0;

  return (
    <BillingDialog
      title="Edit invoice"
      subtitle={`${inv.athleteName} · ${inv.plan}`}
      onClose={onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Amount (CAD)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
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
      <p className="text-xs text-muted-foreground">
        The invoice stays open — the client sees the updated amount and date.
      </p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose}>
          Keep
        </Button>
        <Button
          variant="brand"
          size="sm"
          disabled={!valid}
          onClick={() =>
            onSave(amountCents, new Date(`${due}T12:00:00`).toISOString())
          }
        >
          Save changes
        </Button>
      </div>
    </BillingDialog>
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
      issuedAt: new Date().toISOString(),
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
