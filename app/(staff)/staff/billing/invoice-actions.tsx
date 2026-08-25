"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  ArchiveRestore,
  BellRing,
  CalendarClock,
  Check,
  CheckCircle2,
  CreditCard,
  FileDown,
  Info,
  Link2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Repeat,
  Search,
  Send,
  Undo2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  fmtFullDay,
  money2,
  PAYMENT_METHODS,
  type Invoice,
  type RecurringSeries,
} from "@/lib/demo/data";
import { invoicePdfBlob } from "@/lib/demo/invoice-pdf";
import { trainingGroups } from "@/lib/demo/training";

import { BillingDialog } from "./billing-dialog";

const statusMeta: Record<Invoice["status"], { label: string; tone: PillTone }> =
  {
    paid: { label: "Paid", tone: "success" },
    // Round 16 (Q2): "upcoming" reads as Scheduled — queued to send.
    upcoming: { label: "Scheduled", tone: "neutral" },
    draft: { label: "Draft", tone: "neutral" },
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

/* ------------------------------------------------------------------ */
/* Round 16 (Q2): filters + search                                     */
/* ------------------------------------------------------------------ */

type StatusFilter =
  | "all"
  | "sent"
  | "outstanding"
  | "overdue"
  | "paid"
  | "scheduled"
  | "recurring"
  | "draft"
  | "archived"
  | "undelivered";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Invoices" },
  { value: "sent", label: "Sent" },
  { value: "outstanding", label: "Outstanding" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "scheduled", label: "Scheduled" },
  { value: "recurring", label: "Recurring" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
  { value: "undelivered", label: "Undelivered" },
];

/**
 * Round 16 (Q2): status-filter semantics. Archived is the only view that
 * shows archived rows — everywhere else they're gone.
 */
function matchesStatus(inv: Invoice, filter: StatusFilter): boolean {
  if (filter === "archived") return Boolean(inv.archived);
  if (inv.archived) return false;
  switch (filter) {
    case "all":
      return true;
    case "sent": {
      // Pre-R16 seeds have no sentAt — non-draft/non-scheduled rows are
      // treated as sent on their issue date. "Sent" = delivered, unpaid side.
      const sent =
        Boolean(inv.sentAt) ||
        (inv.status !== "draft" && inv.status !== "upcoming");
      return (
        sent &&
        (inv.status === "due" ||
          inv.status === "overdue" ||
          inv.status === "partial")
      );
    }
    case "outstanding":
      return (
        inv.status === "due" ||
        inv.status === "overdue" ||
        inv.status === "partial"
      );
    case "overdue":
      return inv.status === "overdue";
    case "paid":
      return inv.status === "paid";
    case "scheduled":
      return inv.status === "upcoming";
    case "recurring":
      return Boolean(inv.recurringSeriesId);
    case "draft":
      return inv.status === "draft";
    case "undelivered":
      return Boolean(inv.undelivered);
  }
}

type DateRangeKey =
  | "all"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "custom";

const DATE_RANGES: { value: DateRangeKey; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "custom", label: "Custom…" },
];

/**
 * Round 16 (Q2): [start, end) millis for a date-range choice, applied to
 * issuedAt. Weeks anchor on Monday — the house convention.
 */
function dateRangeBounds(
  range: DateRangeKey,
  from: string,
  to: string,
): [number, number] | null {
  if (range === "all") return null;
  const DAY = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (range === "custom") {
    const lo = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const hi = to ? new Date(`${to}T00:00:00`).getTime() + DAY : Infinity;
    return [lo, hi];
  }
  if (range === "yesterday") return [today.getTime() - DAY, today.getTime()];
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  if (range === "thisWeek")
    return [monday.getTime(), monday.getTime() + 7 * DAY];
  if (range === "lastWeek")
    return [monday.getTime() - 7 * DAY, monday.getTime()];
  const y = today.getFullYear();
  const m = today.getMonth();
  if (range === "thisMonth")
    return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()];
  if (range === "lastMonth")
    return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()];
  if (range === "thisYear")
    return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime()];
  return [new Date(y - 1, 0, 1).getTime(), new Date(y, 0, 1).getTime()];
}

const cadenceLabel: Record<RecurringSeries["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

/** yyyy-mm-dd for a `<input type="date">` value. */
function toDateInput(t: number | string | Date): string {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Round 16 (Q3): the next generation date for a fresh local series. */
function nextRunFrom(cadence: RecurringSeries["cadence"]): string {
  const d = new Date();
  if (cadence === "weekly") d.setDate(d.getDate() + 7);
  else if (cadence === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setMonth(d.getMonth() + 3);
  return d.toISOString();
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Round 16 (Q5): "Print" opens this clean one-page summary in a popup and
 * lets the browser's print dialog take over — fully self-contained, no
 * print CSS bleeding into the app.
 */
function printableInvoiceHtml(inv: Invoice): string {
  const rows: [string, string][] = [
    ["Billed to", inv.athleteName],
    ["Plan", inv.plan],
    ["Issued", fmtFullDay(inv.issuedAt)],
    ["Due", fmtFullDay(inv.dueDate)],
    ["Status", statusMeta[inv.status].label],
  ];
  if (inv.status === "partial")
    rows.push([
      "Received",
      `${money2(inv.paidAmountCents ?? 0)} — ${money2(remainingCents(inv))} outstanding`,
    ]);
  if (inv.paidAt)
    rows.push([
      "Paid",
      `${fmtFullDay(inv.paidAt)}${inv.paidMethod ? ` via ${inv.paidMethod}` : ""}`,
    ]);
  if (inv.refundedCents) rows.push(["Refunded", money2(inv.refundedCents)]);
  const body = rows
    .map(([k, v]) => `<tr><td>${escHtml(k)}</td><td>${escHtml(v)}</td></tr>`)
    .join("");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Invoice ${escHtml(inv.id.toUpperCase())} — LPS Athletic</title>
<style>
  body{font-family:Helvetica,Arial,sans-serif;color:#16181d;margin:48px auto;max-width:620px;padding:0 24px}
  h1{font-size:22px;letter-spacing:.04em;margin:0}
  .sub{color:#667085;font-size:12px;margin:2px 0 28px}
  h2{font-size:15px;margin:0 0 12px}
  table{border-collapse:collapse;width:100%;font-size:13px}
  td{padding:7px 8px;border-bottom:1px solid #e4e6eb;vertical-align:top}
  td:first-child{color:#667085;width:120px}
  .amount{font-size:20px;font-weight:700;margin:20px 0 0}
  .foot{color:#667085;font-size:11px;margin-top:32px}
</style></head>
<body>
  <h1>LPS ATHLETIC</h1>
  <p class="sub">Athlete Operating System — Invoice</p>
  <h2>Invoice ${escHtml(inv.id.toUpperCase())}</h2>
  <table>${body}</table>
  <p class="amount">${escHtml(money2(inv.amountCents))} <span style="font-size:12px;color:#667085;font-weight:400">CAD</span></p>
  <p class="foot">Questions? billing@lpsathletic.com — LPS Athletic, North York, ON</p>
  <script>window.onload = function () { window.print(); };</script>
</body></html>`;
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
 * (R49) and receipts (R50). Round 15 (W1): per-row ⋯ overflow menu plus an
 * Edit… dialog. Round 16: the Square-style workflow — status/date filters +
 * search (Q2), recurring series (Q3), scheduled sends (Q4), print / PDF /
 * public link / reminders / archive / resend (Q5), per-client billing
 * history (Q8), and a status guide (Q9). Local state, demo only.
 */
export function InvoicesPanel({
  invoices,
  series,
}: {
  invoices: Invoice[];
  series: RecurringSeries[];
}) {
  const [rows, setRows] = useState<Invoice[]>(invoices);
  const [seriesRows, setSeriesRows] = useState<RecurringSeries[]>(series);
  const [creating, setCreating] = useState(false);
  // B1 — row actions ask for confirmation before the status flips.
  const [confirming, setConfirming] = useState<{
    inv: Invoice;
    action: "paid" | "cancel" | "record" | "refund" | "push" | "edit";
  } | null>(null);
  // Q3 — series actions that need a dialog (cancel confirm, edit).
  const [seriesAction, setSeriesAction] = useState<{
    s: RecurringSeries;
    action: "cancel" | "edit";
  } | null>(null);
  // W1 — which row's ⋯ overflow menu is open (plus where to draw it).
  const [menuFor, setMenuFor] = useState<RowMenuState | null>(null);
  // Q2/Q8 — filters, search, and the per-client history dialog.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const [historyFor, setHistoryFor] = useState<{
    id: string;
    name: string;
  } | null>(null);
  // Q9 — the ⓘ status-guide dialog.
  const [guideOpen, setGuideOpen] = useState(false);
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

  function patchSeries(id: string, patch: Partial<RecurringSeries>) {
    setSeriesRows((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
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

  /** Q4 — drafts and scheduled invoices go out immediately. */
  function sendNow(inv: Invoice) {
    patchRow(inv.id, {
      status: "due",
      sentAt: new Date().toISOString(),
      scheduledFor: undefined,
    });
    showFlash(`Invoice sent to ${inv.athleteName}.`);
  }

  /** Q5 — nudge an unpaid client; the row keeps the reminder date. */
  function sendReminder(inv: Invoice) {
    patchRow(inv.id, { remindedAt: new Date().toISOString() });
    showFlash(`Payment reminder emailed to ${inv.athleteName}.`);
  }

  /** Q5 — bounce recovery: clear the flag and stamp a fresh send. */
  function resendInvoice(inv: Invoice) {
    patchRow(inv.id, {
      undelivered: false,
      undeliveredNote: undefined,
      sentAt: new Date().toISOString(),
    });
    showFlash(`Invoice re-sent to ${inv.athleteName}.`);
  }

  /** Q5 — archive hides the row from every filter except Archived. */
  function setArchived(inv: Invoice, archived: boolean) {
    patchRow(inv.id, { archived });
    showFlash(
      archived
        ? "Invoice archived — find it under the Archived filter."
        : "Invoice restored from the archive.",
    );
  }

  /** Q5 — copy the public no-login link (the /invoice/[id] page). */
  function shareLink(inv: Invoice) {
    const url = `${window.location.origin}/invoice/${inv.id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => showFlash("Public link copied — opens without a login."),
        () => showFlash(`Public link: ${url}`),
      );
    } else {
      showFlash(`Public link: ${url}`);
    }
  }

  /** Q5 — hand-built PDF from lib/demo/invoice-pdf, saved via a blob URL. */
  function downloadPdf(inv: Invoice) {
    const url = URL.createObjectURL(invoicePdfBlob(inv));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.id}-lps-invoice.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showFlash(`${inv.id}-lps-invoice.pdf saved.`);
  }

  /** Q5 — printable summary in a popup; its onload triggers print(). */
  function printInvoice(inv: Invoice) {
    const w = window.open("", "_blank", "width=760,height=920");
    if (!w) {
      showFlash("Pop-up blocked — allow pop-ups to print, or Download PDF.");
      return;
    }
    w.document.write(printableInvoiceHtml(inv));
    w.document.close();
    w.focus();
  }

  /** Q3 — pause/resume a recurring series in place. */
  function toggleSeries(s: RecurringSeries) {
    if (s.status === "active") {
      patchSeries(s.id, { status: "paused" });
      showFlash(
        `Series paused — no new invoices for ${s.athleteName} until resumed.`,
      );
    } else {
      patchSeries(s.id, { status: "active" });
      showFlash(`Series resumed — next invoice ${fmtDay(s.nextRun)}.`);
    }
  }

  /** Q3 — cancel keeps the generated-invoice history on the books. */
  function cancelSeries(s: RecurringSeries) {
    patchSeries(s.id, { status: "canceled" });
    showFlash("Series canceled — its invoice history stays on the books.");
    setSeriesAction(null);
  }

  /**
   * Round 15 (W1) / Round 16 (Q5): the ⋯ menu's entries, filtered by status
   * and returned in groups (rendered with dividers) — workflow actions
   * first, then paperwork (print / PDF / link), destructive last.
   */
  function menuItemsFor(inv: Invoice): RowMenuItem[][] {
    const iconCls = "h-3.5 w-3.5 text-muted-foreground";
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
    const edit: RowMenuItem = {
      label: "Edit…",
      icon: <Pencil className={iconCls} />,
      onSelect: () => setConfirming({ inv, action: "edit" }),
    };
    const sendNowItem: RowMenuItem = {
      label: "Send now",
      icon: <Send className={iconCls} />,
      onSelect: () => sendNow(inv),
    };
    const remind: RowMenuItem = {
      label: "Send Reminder",
      icon: <BellRing className={iconCls} />,
      onSelect: () => sendReminder(inv),
    };
    const resend: RowMenuItem = {
      label: "Resend",
      icon: <RefreshCw className={iconCls} />,
      onSelect: () => resendInvoice(inv),
    };
    const archive: RowMenuItem = {
      label: "Archive",
      icon: <Archive className={iconCls} />,
      onSelect: () => setArchived(inv, true),
    };
    const cancel: RowMenuItem = {
      label: "Cancel",
      icon: <XCircle className="h-3.5 w-3.5" />,
      destructive: true,
      onSelect: () => setConfirming({ inv, action: "cancel" }),
    };
    // Q5 — print/PDF work on every status; the public link skips drafts.
    const docs: RowMenuItem[] = [
      {
        label: "Print",
        icon: <Printer className={iconCls} />,
        onSelect: () => printInvoice(inv),
      },
      {
        label: "Download PDF",
        icon: <FileDown className={iconCls} />,
        onSelect: () => downloadPdf(inv),
      },
    ];
    if (inv.status !== "draft") {
      docs.push({
        label: "Share a Link",
        icon: <Link2 className={iconCls} />,
        onSelect: () => shareLink(inv),
      });
    }

    if (inv.archived) {
      return [
        [
          {
            label: "Unarchive",
            icon: <ArchiveRestore className={iconCls} />,
            onSelect: () => setArchived(inv, false),
          },
        ],
        docs,
      ];
    }
    if (inv.status === "draft") return [[edit, sendNowItem], docs, [archive]];
    if (inv.status === "upcoming") return [[edit, sendNowItem], docs, [cancel]];
    if (inv.status === "due" || inv.status === "overdue") {
      const workflow = [
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
        edit,
        remind,
      ];
      if (inv.undelivered) workflow.unshift(resend);
      return [workflow, docs, [cancel]];
    }
    if (inv.status === "partial")
      return [[takePayment, refund, remind], docs, [cancel]];
    if (inv.status === "paid") {
      return [
        [
          {
            label: "Send Receipt",
            icon: <Send className={iconCls} />,
            onSelect: () => showFlash(`Receipt sent to ${inv.athleteName}.`),
          },
          refund,
        ],
        docs,
        [archive],
      ];
    }
    // Canceled / refunded — resolved history rows: paperwork + archive.
    return [docs, [archive]];
  }

  // W1 — the invoice whose menu is open (menu markup lives in one portal).
  const menuInv = menuFor
    ? (rows.find((r) => r.id === menuFor.id) ?? null)
    : null;

  // Q2/Q8 — status, date range, and search compose (AND) over the rows.
  const bounds = dateRangeBounds(dateRange, customFrom, customTo);
  const query = search.trim().toLowerCase();
  const visible = rows.filter((inv) => {
    if (!matchesStatus(inv, statusFilter)) return false;
    if (bounds) {
      const t = new Date(inv.issuedAt).getTime();
      if (t < bounds[0] || t >= bounds[1]) return false;
    }
    return query === "" || inv.athleteName.toLowerCase().includes(query);
  });

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

      {/* Q2/Q8/Q9 — filter + search row; wraps cleanly at 375px. */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          aria-label="Filter invoices by status"
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={dateRange}
          aria-label="Filter invoices by date range"
          onChange={(e) => setDateRange(e.target.value as DateRangeKey)}
          className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
        >
          {DATE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground"
          aria-label="Status guide"
          title="Status guide"
          onClick={() => setGuideOpen(true)}
        >
          <Info className="h-4 w-4" />
        </Button>
        {dateRange === "custom" ? (
          <span className="flex items-center gap-1.5">
            <Input
              type="date"
              value={customFrom}
              aria-label="Issued from"
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 w-36"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={customTo}
              aria-label="Issued to"
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 w-36"
            />
          </span>
        ) : null}
        <span className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            placeholder="Search client…"
            aria-label="Search invoices by client name"
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full pl-8 sm:w-52"
          />
        </span>
        <span className="text-xs text-muted-foreground">
          {visible.length} of {rows.length}
        </span>
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
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No invoices match — try a different filter or search.
                </TableCell>
              </TableRow>
            ) : null}
            {visible.map((inv) => {
              const meta = statusMeta[inv.status];
              const isOverdue = inv.status === "overdue";
              const hasActions = menuItemsFor(inv).flat().length > 0;
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
                      {/* Q8 — the name opens the client's billing history. */}
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryFor({
                            id: inv.athleteId,
                            name: inv.athleteName,
                          })
                        }
                        title={`Billing history for ${inv.athleteName}`}
                        className="text-left font-medium underline-offset-2 hover:text-brand-ink hover:underline"
                      >
                        {inv.athleteName}
                      </button>
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
                    <span className="flex flex-wrap items-center justify-end gap-1">
                      {/* Q3 — series-generated rows carry a Recurring tag. */}
                      {inv.recurringSeriesId ? (
                        <Pill tone="info" icon={<Repeat className="h-3 w-3" />}>
                          Recurring
                        </Pill>
                      ) : null}
                      {/* Q5 — the bounce flag; Resend lives in the ⋯ menu. */}
                      {inv.undelivered ? (
                        <Pill tone="danger">Undelivered</Pill>
                      ) : null}
                      <Pill tone={meta.tone} dot>
                        {meta.label}
                      </Pill>
                    </span>
                    {inv.status === "upcoming" && inv.scheduledFor ? (
                      <div className="mt-1 text-[0.7rem] text-muted-foreground">
                        Sends {fmtDay(inv.scheduledFor)}
                      </div>
                    ) : null}
                    {resolvedNote ? (
                      <div className="mt-1 text-[0.7rem] text-muted-foreground">
                        {resolvedNote}
                      </div>
                    ) : null}
                    {inv.remindedAt ? (
                      <div className="mt-1 text-[0.7rem] text-muted-foreground">
                        Reminded {fmtDay(inv.remindedAt)}
                      </div>
                    ) : null}
                    {inv.undelivered && inv.undeliveredNote ? (
                      <div className="ml-auto mt-1 max-w-[220px] text-[0.7rem] text-destructive/80">
                        {inv.undeliveredNote}
                      </div>
                    ) : null}
                  </TableCell>
                  {/* W1 — per-row ⋯ overflow menu (inbox idiom). */}
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
                        const est =
                          menuItemsFor(inv).flat().length * 33 + 24;
                        setMenuFor((cur) =>
                          cur?.id === inv.id
                            ? null
                            : {
                                id: inv.id,
                                top: r.bottom + 4,
                                bottom: window.innerHeight - r.top + 4,
                                right: Math.max(window.innerWidth - r.right, 8),
                                dropUp: r.bottom + est > window.innerHeight,
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
                className="fixed z-30 block max-h-[80vh] w-48 overflow-y-auto rounded-lg border border-border bg-card p-1 text-left shadow-raised"
                style={
                  menuFor.dropUp
                    ? { right: menuFor.right, bottom: menuFor.bottom }
                    : { right: menuFor.right, top: menuFor.top }
                }
              >
                {menuItemsFor(menuInv)
                  .filter((group) => group.length > 0)
                  .map((group, gi) => (
                    <span key={gi} className="block">
                      {gi > 0 ? (
                        <span
                          aria-hidden
                          className="my-1 block h-px bg-border"
                        />
                      ) : null}
                      {group.map((item) => (
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
                  ))}
              </span>
            </>,
            document.body,
          )
        : null}

      {/* Q3 — recurring series: the templates that generate invoices. */}
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                Recurring series
              </h3>
              <p className="text-xs text-muted-foreground">
                Each series drops a fresh invoice on its cadence — pause while
                a client is away, cancel to stop for good (history stays).
              </p>
            </div>
            <Pill tone="neutral">
              {seriesRows.filter((s) => s.status === "active").length} active
            </Pill>
          </div>
          <div className="flex flex-col divide-y divide-border/60 rounded-lg border border-border">
            {seriesRows.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No recurring series yet — pick a cadence under
                &ldquo;Repeats&rdquo; when creating an invoice.
              </p>
            ) : null}
            {seriesRows.map((s) => (
              <div
                key={s.id}
                className={
                  s.status === "canceled"
                    ? "flex flex-wrap items-center gap-x-3 gap-y-2 p-3 opacity-60"
                    : "flex flex-wrap items-center gap-x-3 gap-y-2 p-3"
                }
              >
                <span className="min-w-0 flex-1 basis-40">
                  <span className="block text-sm font-medium">
                    {s.athleteName}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {s.plan} · {money2(s.amountCents)} ·{" "}
                    {cadenceLabel[s.cadence]}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-0.5">
                  <Pill
                    tone={
                      s.status === "active"
                        ? "success"
                        : s.status === "paused"
                          ? "warning"
                          : "neutral"
                    }
                    dot
                  >
                    {s.status === "active"
                      ? "Active"
                      : s.status === "paused"
                        ? "Paused"
                        : "Canceled"}
                  </Pill>
                  <span className="text-[0.7rem] text-muted-foreground">
                    {s.status === "active"
                      ? `Next run ${fmtDay(s.nextRun)}`
                      : s.status === "paused"
                        ? "Nothing generates while paused"
                        : "No further invoices"}
                  </span>
                </span>
                {s.status !== "canceled" ? (
                  <span className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => toggleSeries(s)}
                    >
                      {s.status === "active" ? (
                        <>
                          <Pause className="h-3.5 w-3.5" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Resume
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setSeriesAction({ s, action: "edit" })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit…
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => setSeriesAction({ s, action: "cancel" })}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        New invoices save locally in this demo — in production they charge
        through Square.
      </p>

      {creating ? (
        <NewInvoiceDialog
          onClose={() => setCreating(false)}
          onCreate={(inv, newSeries) => {
            setRows((prev) => [inv, ...prev]);
            if (newSeries) {
              // Q3 — the cadence choice spun up a local series.
              setSeriesRows((prev) => [newSeries, ...prev]);
              showFlash("Recurring series started — first invoice sent.");
            } else if (inv.status === "upcoming") {
              // Q4 — queued instead of sent.
              showFlash(
                `Invoice scheduled — sends ${fmtDay(
                  inv.scheduledFor ?? inv.dueDate,
                )}.`,
              );
            }
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

      {/* Q3 — cancel a recurring series (confirm first; history stays). */}
      {seriesAction?.action === "cancel" ? (
        <BillingDialog
          title="Cancel recurring series"
          subtitle={`${seriesAction.s.athleteName} · ${
            cadenceLabel[seriesAction.s.cadence]
          } · ${money2(seriesAction.s.amountCents)}`}
          onClose={() => setSeriesAction(null)}
        >
          <p className="text-sm">
            Stop generating invoices for this series? Invoices already sent
            stay on the books.
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSeriesAction(null)}
            >
              Keep
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cancelSeries(seriesAction.s)}
            >
              Cancel series
            </Button>
          </div>
        </BillingDialog>
      ) : null}

      {/* Q3 — edit a series' amount + cadence. */}
      {seriesAction?.action === "edit" ? (
        <EditSeriesDialog
          s={seriesAction.s}
          onClose={() => setSeriesAction(null)}
          onSave={(amountCents, cadence) => {
            patchSeries(seriesAction.s.id, { amountCents, cadence });
            showFlash("Series updated — applies from the next invoice.");
            setSeriesAction(null);
          }}
        />
      ) : null}

      {/* Q8 — the per-client billing-history dialog. */}
      {historyFor ? (
        <BillingHistoryDialog
          name={historyFor.name}
          list={rows.filter((r) => r.athleteId === historyFor.id)}
          onClose={() => setHistoryFor(null)}
        />
      ) : null}

      {/* Q9 — one-liner per status. */}
      {guideOpen ? (
        <StatusGuideDialog onClose={() => setGuideOpen(false)} />
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
  const [due, setDue] = useState(() => toDateInput(inv.dueDate));

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

/** Round 16 (Q3) — edit a recurring series: amount + cadence only. */
function EditSeriesDialog({
  s,
  onClose,
  onSave,
}: {
  s: RecurringSeries;
  onClose: () => void;
  onSave: (amountCents: number, cadence: RecurringSeries["cadence"]) => void;
}) {
  const [amount, setAmount] = useState((s.amountCents / 100).toFixed(2));
  const [cadence, setCadence] = useState<RecurringSeries["cadence"]>(s.cadence);

  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const valid = amountCents > 0;

  return (
    <BillingDialog
      title="Edit recurring series"
      subtitle={`${s.athleteName} · ${s.plan}`}
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
          <Label className="text-xs text-muted-foreground">Cadence</Label>
          <select
            value={cadence}
            aria-label="Series cadence"
            onChange={(e) =>
              setCadence(e.target.value as RecurringSeries["cadence"])
            }
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Changes apply from the next generated invoice — nothing already sent
        moves.
      </p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose}>
          Keep
        </Button>
        <Button
          variant="brand"
          size="sm"
          disabled={!valid}
          onClick={() => onSave(amountCents, cadence)}
        >
          Save changes
        </Button>
      </div>
    </BillingDialog>
  );
}

/**
 * Round 16 (Q8) — one client's complete billing picture: invoices
 * newest-first, the payments received, and lifetime totals.
 */
function BillingHistoryDialog({
  name,
  list,
  onClose,
}: {
  name: string;
  list: Invoice[];
  onClose: () => void;
}) {
  const sorted = [...list].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
  );
  const payments = sorted.filter(
    (i) => i.status === "paid" || i.status === "partial",
  );
  const billed = sorted.reduce(
    (n, i) =>
      i.status === "canceled" || i.status === "draft" ? n : n + i.amountCents,
    0,
  );
  const collected = sorted.reduce(
    (n, i) =>
      n +
      (i.status === "paid"
        ? i.amountCents - (i.refundedCents ?? 0)
        : i.status === "partial"
          ? (i.paidAmountCents ?? 0)
          : 0),
    0,
  );
  const outstanding = sorted.reduce(
    (n, i) =>
      n +
      (i.status === "due" ||
      i.status === "overdue" ||
      i.status === "partial"
        ? remainingCents(i)
        : 0),
    0,
  );

  return (
    <BillingDialog
      title={`Billing history — ${name}`}
      subtitle={`${sorted.length} invoice${sorted.length === 1 ? "" : "s"} on record`}
      onClose={onClose}
      wide
    >
      <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
        {sorted.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2 last:border-b-0"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {inv.id.toUpperCase()}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {inv.plan} · issued {fmtDay(inv.issuedAt)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="tnum text-sm font-semibold">
                {money2(inv.amountCents)}
              </span>
              <Pill tone={statusMeta[inv.status].tone}>
                {statusMeta[inv.status].label}
              </Pill>
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Payments
        </h4>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        ) : (
          payments.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="text-muted-foreground">
                {inv.id.toUpperCase()} · {inv.paidMethod ?? inv.method}
                {inv.paidAt ? ` · ${fmtDay(inv.paidAt)}` : ""}
              </span>
              <span className="tnum font-semibold">
                {money2(
                  inv.status === "paid"
                    ? inv.amountCents
                    : (inv.paidAmountCents ?? 0),
                )}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-surface/60 p-3 text-center">
        <div>
          <div className="text-[0.7rem] text-muted-foreground">
            Lifetime billed
          </div>
          <div className="tnum text-sm font-bold">{money2(billed)}</div>
        </div>
        <div>
          <div className="text-[0.7rem] text-muted-foreground">Collected</div>
          <div className="tnum text-sm font-bold text-success">
            {money2(collected)}
          </div>
        </div>
        <div>
          <div className="text-[0.7rem] text-muted-foreground">
            Outstanding
          </div>
          <div
            className={
              outstanding > 0
                ? "tnum text-sm font-bold text-destructive"
                : "tnum text-sm font-bold"
            }
          >
            {money2(outstanding)}
          </div>
        </div>
      </div>
    </BillingDialog>
  );
}

/** Round 16 (Q9) — one line per status, opened from the ⓘ by the filters. */
const STATUS_GUIDE: [string, string][] = [
  ["Draft", "Created but not sent — edit freely, then Send now."],
  ["Scheduled", "Sends automatically on its date; editable until then."],
  ["Sent", "Delivered to the client and awaiting payment."],
  ["Outstanding", "Any unpaid balance — due, overdue, or partially paid."],
  ["Overdue", "Past its due date — follow up or push the due date."],
  ["Paid", "Settled in full; a receipt was emailed automatically."],
  ["Recurring", "Generated by a recurring series on its cadence."],
  ["Undelivered", "The email bounced — fix the address and Resend."],
  ["Archived", "Hidden from every working view; restore any time."],
];

function StatusGuideDialog({ onClose }: { onClose: () => void }) {
  return (
    <BillingDialog
      title="Status guide"
      subtitle="What each invoice state means."
      onClose={onClose}
    >
      <dl className="flex flex-col gap-2">
        {STATUS_GUIDE.map(([term, def]) => (
          <div key={term} className="flex items-baseline gap-2 text-sm">
            <dt className="w-24 shrink-0 font-semibold">{term}</dt>
            <dd className="text-muted-foreground">{def}</dd>
          </div>
        ))}
      </dl>
      <p className="rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs text-muted-foreground">
        Staff can always Mark Paid, Cancel, Archive, or Resend an invoice
        manually from its ⋯ menu.
      </p>
    </BillingDialog>
  );
}

/**
 * O2 — create a one-off invoice for any client (athlete or team). Round 16:
 * a "Repeats" cadence starts a recurring series (Q3) and an optional future
 * "Send on" date queues the invoice as Scheduled instead of sending (Q4).
 */
function NewInvoiceDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (invoice: Invoice, series?: RecurringSeries) => void;
}) {
  const [clientId, setClientId] = useState(athletes[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [due, setDue] = useState(() => toDateInput(Date.now() + 7 * 86_400_000));
  const [repeat, setRepeat] = useState<"" | RecurringSeries["cadence"]>("");
  const [sendOn, setSendOn] = useState("");

  const clientName =
    athletes.find((a) => a.id === clientId)?.name ??
    trainingGroups.find((g) => g.id === clientId)?.name ??
    "";
  const amountNum = parseFloat(amount || "0");
  // Q4 — "Send on" must sit in the future (it's the automatic send date).
  const sendOnFuture =
    sendOn === "" || new Date(`${sendOn}T23:59:59`).getTime() > Date.now();
  const valid =
    clientName.length > 0 && amountNum > 0 && due.length > 0 && sendOnFuture;

  function create() {
    if (!valid) return;
    const now = new Date().toISOString();
    const base: Invoice = {
      id: `inv-local-${Date.now()}`,
      athleteId: clientId,
      athleteName: clientName,
      plan: memo.trim() || "One-off invoice",
      amountCents: Math.round(amountNum * 100),
      issuedAt: now,
      dueDate: new Date(`${due}T12:00:00`).toISOString(),
      status: "due",
      method: "Square",
      sentAt: now,
    };
    if (repeat) {
      // Q3 — the cadence spins up a local series; the first invoice goes
      // out immediately, flagged as part of it.
      const s: RecurringSeries = {
        id: `rs-local-${Date.now()}`,
        athleteId: clientId,
        athleteName: clientName,
        plan: base.plan,
        amountCents: base.amountCents,
        cadence: repeat,
        nextRun: nextRunFrom(repeat),
        status: "active",
        startedAt: now,
        method: "Square",
      };
      onCreate({ ...base, recurringSeriesId: s.id }, s);
      return;
    }
    if (sendOn) {
      // Q4 — queued as Scheduled; nothing is emailed until the date.
      onCreate({
        ...base,
        status: "upcoming",
        sentAt: undefined,
        scheduledFor: new Date(`${sendOn}T09:00:00`).toISOString(),
      });
      return;
    }
    onCreate(base);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Repeats</Label>
          <select
            value={repeat}
            aria-label="Repeats"
            onChange={(e) => {
              const v = e.target.value as "" | RecurringSeries["cadence"];
              setRepeat(v);
              // A repeating invoice sends its first copy now — no schedule.
              if (v) setSendOn("");
            }}
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
          >
            <option value="">Doesn&apos;t repeat</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Send on (optional)
          </Label>
          <Input
            type="date"
            value={sendOn}
            min={toDateInput(Date.now() + 86_400_000)}
            disabled={repeat !== ""}
            aria-label="Send on date"
            onChange={(e) => setSendOn(e.target.value)}
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
          {!sendOnFuture
            ? "Send-on must be a future date."
            : repeat
              ? `First invoice sends now — repeats ${cadenceLabel[
                  repeat
                ].toLowerCase()}.`
              : sendOn
                ? `Queues as Scheduled — sends ${fmtDay(
                    new Date(`${sendOn}T12:00:00`).toISOString(),
                  )}.`
                : "Lands as a Square charge marked “Due”."}
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
