"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import {
  Archive,
  ArchiveRestore,
  BellRing,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
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

import { TabBar } from "@/components/app/tab-bar";
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
  athleteProfileById,
  athletes,
  fmtDay,
  fmtFullDay,
  money2,
  PAYMENT_METHODS,
  plans,
  seriesCadenceLabel,
  seriesEndLabel,
  seriesNextRun,
  type Invoice,
  type RecurringSeries,
} from "@/lib/demo/data";
import { invoicePdfBlob } from "@/lib/demo/invoice-pdf";
import { useTenant } from "@/components/tenant/tenant-provider";
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

/**
 * Round 17: a series whose end rule has been reached reads as Ended. Rows
 * keep status "active" in local state, so the end rule is checked at render
 * time (endAfter is only reachable in-demo via Duplicate/creation edges).
 */
function effectiveSeriesStatus(s: RecurringSeries): RecurringSeries["status"] {
  if (s.status === "canceled" || s.status === "ended") return s.status;
  if (s.endType === "after" && s.endAfter && s.generatedCount >= s.endAfter)
    return "ended";
  if (
    s.endType === "on" &&
    s.endDate &&
    new Date(s.endDate).getTime() < Date.now()
  )
    return "ended";
  return s.status;
}

/** yyyy-mm-dd for a `<input type="date">` value. */
function toDateInput(t: number | string | Date): string {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Round 16 (Q5): "Print" opens a one-page summary in a popup and lets the
 * browser's print dialog take over. Round 21: rebuilt on the club's real
 * Square-invoice letterhead — logo tile, business block, brand rule,
 * plan-name title, payment note, Customer/Invoice/Payment columns and an
 * itemized table — matching the downloaded PDF.
 */
interface InvoiceBrand {
  name: string;
  supportLine: string;
  addressLines?: string[];
  taxLine?: string;
  emtEmail?: string;
  /** LPS wolf tile vs a monogram tile for white-label tenants. */
  wolf?: boolean;
}

/** The real LPS letterhead (from the club's live Square invoices). */
const DEMO_INVOICE_BRAND: InvoiceBrand = {
  name: "LPS Athletic",
  supportLine: "train@lpsathletic.com | (416) 360-0460",
  addressLines: ["125 Martin Ross Avenue", "Unit 12, North York, ON M3J 2L9 Canada"],
  taxLine: "GST/HST: 841193451RT0001",
  emtEmail: "accounts@lpsathletic.com",
  wolf: true,
};

/** Wolf mark as inline SVG (mirrors components/brand/logo.tsx). */
const WOLF_TILE_SVG = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="30" height="30"><path d="M16 3.5 5.5 8v7.5c0 6.4 4.6 10.6 10.5 13 5.9-2.4 10.5-6.6 10.5-13V8L16 3.5Z" fill="#fff"/><path d="M16 20.5 12.5 16.2h7L16 20.5Z" fill="#111"/><path d="M11 12.2 13.4 11l.6 2.4-2.6.3-.4-1.5Z" fill="#c71a2e"/><path d="M21 12.2 18.6 11l-.6 2.4 2.6.3.4-1.5Z" fill="#c71a2e"/></svg>`;

function printableInvoiceHtml(
  inv: Invoice,
  brand: InvoiceBrand = DEMO_INVOICE_BRAND,
): string {
  const profile = athleteProfileById(inv.athleteId);
  const received = inv.status === "partial" ? (inv.paidAmountCents ?? 0) : 0;
  const balance =
    inv.status === "paid" || inv.status === "refunded" || inv.status === "canceled"
      ? 0
      : inv.amountCents - received;
  const first = escHtml(inv.athleteName.split(" ")[0] ?? inv.athleteName);

  const note =
    inv.status === "paid"
      ? `This invoice for ${first}'s membership plan has been settled${inv.paidMethod ? ` via ${escHtml(inv.paidMethod)}` : ""}. Thank you for your business!`
      : inv.status === "canceled"
        ? `This invoice for ${first}'s membership plan was canceled — no payment is required.`
        : `This is an invoice for ${first}'s membership plan. You may use the secure link in this invoice to pay by credit card.${brand.emtEmail ? ` Or if you prefer an Email Money Transfer (EMT), please send it to ${escHtml(brand.emtEmail)} and include the tax in your total amount.` : ""} Thank you for your business!`;

  const tile = brand.wolf
    ? `<span class="tile">${WOLF_TILE_SVG}</span>`
    : `<span class="tile mono">${escHtml((brand.name[0] ?? "P").toUpperCase())}</span>`;

  const customer = [
    inv.athleteName,
    ...(profile
      ? [
          profile.email,
          profile.phone,
          profile.address.street,
          `${profile.address.city} ${profile.address.region} ${profile.address.postal}`,
        ]
      : []),
  ]
    .map((l) => escHtml(l))
    .join("<br>");

  const payment =
    inv.status === "paid" && inv.paidAt
      ? `Paid ${escHtml(fmtFullDay(inv.paidAt))}<br>${escHtml(money2(inv.amountCents))}`
      : `Due ${escHtml(fmtFullDay(inv.dueDate))}<br>${escHtml(money2(balance))}`;

  const extraTotals =
    (received > 0
      ? `<tr class="tot"><td colspan="3">Received so far</td><td class="num">-${escHtml(money2(received))}</td></tr>`
      : "") +
    (inv.refundedCents
      ? `<tr class="tot"><td colspan="3">Refunded</td><td class="num">${escHtml(money2(inv.refundedCents))}</td></tr>`
      : "");

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invoice/${inv.id}`
      : `/invoice/${inv.id}`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Invoice ${escHtml(inv.id.toUpperCase())} — ${escHtml(brand.name)}</title>
<style>
  body{font-family:Helvetica,Arial,sans-serif;color:#16181d;margin:40px auto;max-width:680px;padding:0 24px;font-size:13px}
  .head{display:flex;gap:14px;align-items:flex-start}
  .tile{width:46px;height:46px;border-radius:10px;background:#111;display:flex;align-items:center;justify-content:center;flex:none}
  .tile.mono{color:#c71a2e;font-weight:800;font-size:24px}
  .biz b{font-size:14px}
  .biz div{color:#667085;font-size:11px;line-height:1.5}
  .headr{margin-left:auto;text-align:right}
  .headr b{font-size:13px}
  .headr div{color:#667085;font-size:11px;margin-top:6px}
  .rule{height:4px;background:#c71a2e;margin:20px 0 26px;border-radius:2px}
  h1{font-size:26px;margin:0 0 12px}
  .note{color:#667085;font-size:12.5px;line-height:1.55;margin:0 0 26px}
  .cols{display:flex;gap:24px;margin-bottom:28px}
  .col{flex:1;border-top:1px solid #e4e6eb;padding-top:10px}
  .col b{font-size:12.5px}
  .col div{color:#667085;font-size:12px;line-height:1.55;margin-top:6px}
  table{border-collapse:collapse;width:100%;font-size:12.5px}
  th{text-align:left;border-top:1px solid #e4e6eb;border-bottom:1px solid #e4e6eb;padding:8px 6px;font-size:12px}
  td{padding:8px 6px;vertical-align:top}
  .num{text-align:right}
  th.num{text-align:right}
  .desc{color:#98a2b3;font-size:11.5px}
  tr.item td{border-bottom:1px solid #e4e6eb}
  tr.tot td{padding:5px 6px}
  .grand td{border-top:1px solid #e4e6eb;font-size:18px;font-weight:700;padding-top:14px}
  .foot{display:flex;justify-content:space-between;color:#667085;font-size:11px;margin-top:44px;border-top:1px solid #e4e6eb;padding-top:12px}
</style></head>
<body>
  <div class="head">
    ${tile}
    <div class="biz">
      <b>${escHtml(brand.name)}</b>
      <div>${(brand.addressLines ?? []).map((l) => escHtml(l)).join("<br>")}${brand.addressLines?.length ? "<br>" : ""}${escHtml(brand.supportLine)}${brand.taxLine ? `<br>${escHtml(brand.taxLine)}` : ""}</div>
    </div>
    <div class="headr">
      <b>Invoice #${escHtml(inv.id.toUpperCase())}</b>
      <div><b style="color:#16181d;font-size:11px">Issue date</b><br>${escHtml(fmtFullDay(inv.issuedAt))}</div>
    </div>
  </div>
  <div class="rule"></div>
  <h1>${escHtml(inv.plan)}</h1>
  <p class="note">${note}</p>
  <div class="cols">
    <div class="col"><b>Customer</b><div>${customer}</div></div>
    <div class="col"><b>Invoice Details</b><div>PDF created ${escHtml(fmtFullDay(new Date().toISOString()))}<br>${escHtml(money2(inv.amountCents))}<br>Status: ${escHtml(statusMeta[inv.status].label)}</div></div>
    <div class="col"><b>Payment</b><div>${payment}</div></div>
  </div>
  <table>
    <tr><th>Items</th><th class="num">Quantity</th><th class="num">Price</th><th class="num">Amount</th></tr>
    <tr class="item"><td>${escHtml(inv.plan)}<br><span class="desc">Membership plan</span></td><td class="num">1</td><td class="num">${escHtml(money2(inv.amountCents))}</td><td class="num">${escHtml(money2(inv.amountCents))}</td></tr>
    <tr class="tot"><td colspan="3">Subtotal</td><td class="num">${escHtml(money2(inv.amountCents))}</td></tr>
    ${extraTotals}
    <tr class="grand"><td colspan="3">${inv.status === "paid" ? "Total Paid" : "Total Due"}</td><td class="num">${escHtml(money2(inv.status === "paid" ? inv.amountCents : balance))}</td></tr>
  </table>
  <div class="foot">
    <span>${balance > 0 ? `<b>Pay online</b> — ${escHtml(shareUrl)}` : "Thank you for your business!"}</span>
    <span>Page 1 of 1</span>
  </div>
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
  // Round 17: Square-style sub-tabs — Invoices | Recurring Series, backed
  // by ?tab= so the view is shareable and Back walks tabs (M1 convention).
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"invoices" | "recurring">(() =>
    searchParams.get("tab") === "recurring" ? "recurring" : "invoices",
  );
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
  const tenant = useTenant();
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  // Round 17 (M1): Back/Forward must restore the tab — pushes alone desync
  // when the component stays mounted, so the tab derives from the URL.
  useEffect(() => {
    setTab(searchParams.get("tab") === "recurring" ? "recurring" : "invoices");
  }, [searchParams]);

  /** Round 17: tab changes push a history entry built off the pathname. */
  function selectTab(next: "invoices" | "recurring") {
    if (next === tab) return;
    setTab(next);
    setMenuFor(null); // an open row menu would float over the other tab
    router.push(
      (next === "recurring" ? `${pathname}?tab=recurring` : pathname) as Route,
      { scroll: false },
    );
  }

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

  /** Q5 — hand-built letterhead PDF from lib/demo/invoice-pdf (R21). */
  function downloadPdf(inv: Invoice) {
    const url = URL.createObjectURL(
      invoicePdfBlob(inv, {
        // LPS letterhead by default; white-label tenants get their own
        // name + support line on a monogram tile.
        ...(tenant.slug !== "demo"
          ? {
              brand: {
                name: tenant.name,
                addressLines: [],
                contactLine: tenant.supportLine,
                wolfMark: false,
              },
            }
          : {}),
        payUrl: `${window.location.origin}/invoice/${inv.id}`,
      }),
    );
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
    w.document.write(
      // LPS letterhead by default; white-label tenants print their own
      // name + support line on a monogram tile (mirrors downloadPdf).
      tenant.slug !== "demo"
        ? printableInvoiceHtml(inv, {
            name: tenant.name,
            supportLine: tenant.supportLine,
          })
        : printableInvoiceHtml(inv),
    );
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

  /** Round 17: copy any invoice into a fresh draft — same client and terms,
   *  issued today and due in two weeks. Works on every status. */
  function duplicateInvoice(inv: Invoice) {
    const now = Date.now();
    const copy: Invoice = {
      id: `inv-copy-${now}`,
      athleteId: inv.athleteId,
      athleteName: inv.athleteName,
      plan: inv.plan,
      amountCents: inv.amountCents,
      issuedAt: new Date(now).toISOString(),
      dueDate: new Date(now + 14 * 86_400_000).toISOString(),
      status: "draft",
      method: inv.method,
    };
    setRows((prev) => [copy, ...prev]);
    showFlash("Duplicated — saved as a draft.");
  }

  /** Round 17: clone a series as a fresh active one — the count resets and
   *  no invoice goes out until its first run comes around. */
  function duplicateSeries(s: RecurringSeries) {
    const now = new Date();
    const copy: RecurringSeries = {
      ...s,
      id: `rs-copy-${now.getTime()}`,
      status: "active",
      startedAt: now.toISOString(),
      generatedCount: 0,
      nextRun: seriesNextRun(s, now),
    };
    setSeriesRows((prev) => [copy, ...prev]);
    showFlash("Series duplicated.");
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
      // Round 17 — Duplicate works on every status, archived included.
      {
        label: "Duplicate",
        icon: <Copy className={iconCls} />,
        onSelect: () => duplicateInvoice(inv),
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
      {/* Round 17: Square-style sub-tabs — invoices vs the series manager. */}
      <TabBar
        tabs={[
          {
            value: "invoices" as const,
            label: "Invoices",
            count: rows.filter((r) => !r.archived).length,
          },
          {
            value: "recurring" as const,
            label: "Recurring Series",
            count: seriesRows.filter((s) => s.status !== "canceled").length,
          },
        ]}
        active={tab}
        onSelect={selectTab}
      />

      {tab === "invoices" ? (
      <>
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

      <p className="text-xs text-muted-foreground">
        New invoices save locally in this demo — in production they charge
        through Square.
      </p>
      </>
      ) : null}

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

      {/* Round 17: the series manager, grown into a members-style table. */}
      {tab === "recurring" ? (
      <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg">Recurring series</h2>
          <p className="text-sm text-muted-foreground">
            The templates that drop a fresh invoice on their cadence — pause
            while a client is away, cancel to stop for good (history stays).
          </p>
        </div>
        <Pill tone="neutral" icon={<Repeat className="h-3.5 w-3.5" />}>
          {
            seriesRows.filter((s) => effectiveSeriesStatus(s) === "active")
              .length
          }{" "}
          active
        </Pill>
      </div>

      {/* Round 17: mobile scrolls the table sideways (tasks-table idiom). */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Client</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Repeats</TableHead>
              <TableHead>Next run</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seriesRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No recurring series yet — choose Repeats… when creating an
                  invoice.
                </TableCell>
              </TableRow>
            ) : null}
            {seriesRows.map((s) => {
              const status = effectiveSeriesStatus(s);
              // Ended/canceled series keep Duplicate only — nothing else
              // makes sense once the series stops generating.
              const open = status === "active" || status === "paused";
              return (
                <TableRow
                  key={s.id}
                  className={open ? undefined : "opacity-60"}
                >
                  <TableCell className="whitespace-nowrap font-medium">
                    {s.athleteName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {s.plan}
                  </TableCell>
                  <TableCell className="tnum whitespace-nowrap text-right font-semibold">
                    {money2(s.amountCents)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {seriesCadenceLabel(s)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {status === "active" ? fmtDay(s.nextRun) : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {seriesEndLabel(s)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Pill
                      tone={
                        status === "active"
                          ? "success"
                          : status === "paused"
                            ? "warning"
                            : "neutral"
                      }
                      dot
                    >
                      {status === "active"
                        ? "Active"
                        : status === "paused"
                          ? "Paused"
                          : status === "ended"
                            ? "Ended"
                            : "Canceled"}
                    </Pill>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span className="flex items-center justify-end gap-1">
                      {open ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => toggleSeries(s)}
                          >
                            {status === "active" ? (
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
                            onClick={() =>
                              setSeriesAction({ s, action: "edit" })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit…
                          </Button>
                        </>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => duplicateSeries(s)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Duplicate
                      </Button>
                      {open ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() =>
                            setSeriesAction({ s, action: "cancel" })
                          }
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      ) : null}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {seriesRows.length} series — a paused series generates nothing until
        resumed; canceled and ended series keep their invoice history.
      </p>
      </>
      ) : null}

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
          subtitle={`${seriesAction.s.athleteName} · ${seriesCadenceLabel(
            seriesAction.s,
          )} · ${money2(seriesAction.s.amountCents)}`}
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

      {/* Q3/Round 17 — edit a series' amount, interval, and end rule. */}
      {seriesAction?.action === "edit" ? (
        <EditSeriesDialog
          s={seriesAction.s}
          onClose={() => setSeriesAction(null)}
          onSave={(patch) => {
            patchSeries(seriesAction.s.id, patch);
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

/**
 * Round 17 — the flexible repeat controls shared by NewInvoiceDialog and
 * EditSeriesDialog: "Repeat every [N] [week(s)|month(s)]" plus the end rule
 * (never / on a date / after N invoices).
 */
function RepeatRuleFields({
  count,
  setCount,
  unit,
  setUnit,
  endType,
  setEndType,
  endDate,
  setEndDate,
  endAfter,
  setEndAfter,
}: {
  count: string;
  setCount: (v: string) => void;
  unit: RecurringSeries["intervalUnit"];
  setUnit: (v: RecurringSeries["intervalUnit"]) => void;
  endType: RecurringSeries["endType"];
  setEndType: (v: RecurringSeries["endType"]) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  endAfter: string;
  setEndAfter: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Repeat every</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            step={1}
            value={count}
            aria-label="Repeat every"
            onChange={(e) => setCount(e.target.value)}
            className="h-9 w-20"
          />
          <select
            value={unit}
            aria-label="Repeat unit"
            onChange={(e) =>
              setUnit(e.target.value as RecurringSeries["intervalUnit"])
            }
            className="h-9 flex-1 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
          >
            <option value="week">week(s)</option>
            <option value="month">month(s)</option>
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">End series</Label>
        <select
          value={endType}
          aria-label="End series"
          onChange={(e) =>
            setEndType(e.target.value as RecurringSeries["endType"])
          }
          className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
        >
          <option value="never">Never</option>
          <option value="on">On a date</option>
          <option value="after">After N invoices</option>
        </select>
        {endType === "on" ? (
          <Input
            type="date"
            value={endDate}
            aria-label="Series end date"
            onChange={(e) => setEndDate(e.target.value)}
          />
        ) : null}
        {endType === "after" ? (
          <span className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              step={1}
              value={endAfter}
              aria-label="Total invoices in the series"
              onChange={(e) => setEndAfter(e.target.value)}
              className="h-9 w-20"
            />
            <span className="text-xs text-muted-foreground">
              invoices total
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Round 16 (Q3) / Round 17 — edit a recurring series: amount, interval, and
 * end rule. An interval change recomputes the next run from today (least
 * surprising); nothing already generated moves.
 */
function EditSeriesDialog({
  s,
  onClose,
  onSave,
}: {
  s: RecurringSeries;
  onClose: () => void;
  onSave: (patch: Partial<RecurringSeries>) => void;
}) {
  const [amount, setAmount] = useState((s.amountCents / 100).toFixed(2));
  const [count, setCount] = useState(String(s.intervalCount));
  const [unit, setUnit] = useState<RecurringSeries["intervalUnit"]>(
    s.intervalUnit,
  );
  const [endType, setEndType] = useState<RecurringSeries["endType"]>(s.endType);
  const [endDate, setEndDate] = useState(
    s.endDate ? toDateInput(s.endDate) : "",
  );
  const [endAfter, setEndAfter] = useState(String(s.endAfter ?? 12));

  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const intervalCount = Math.floor(Number(count) || 0);
  const afterN = Math.floor(Number(endAfter) || 0);
  const valid =
    amountCents > 0 &&
    intervalCount >= 1 &&
    (endType !== "on" || endDate.length > 0) &&
    (endType !== "after" || afterN >= 1);

  function save() {
    const patch: Partial<RecurringSeries> = {
      amountCents,
      intervalCount,
      intervalUnit: unit,
      endType,
      endDate:
        endType === "on"
          ? new Date(`${endDate}T12:00:00`).toISOString()
          : undefined,
      endAfter: endType === "after" ? afterN : undefined,
    };
    if (intervalCount !== s.intervalCount || unit !== s.intervalUnit) {
      // Round 17: interval changed — recompute the next run from today.
      patch.nextRun = seriesNextRun(
        { ...s, intervalCount, intervalUnit: unit },
        new Date(),
      );
    }
    onSave(patch);
  }

  return (
    <BillingDialog
      title="Edit recurring series"
      subtitle={`${s.athleteName} · ${s.plan}`}
      onClose={onClose}
    >
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
      <RepeatRuleFields
        count={count}
        setCount={setCount}
        unit={unit}
        setUnit={setUnit}
        endType={endType}
        setEndType={setEndType}
        endDate={endDate}
        setEndDate={setEndDate}
        endAfter={endAfter}
        setEndAfter={setEndAfter}
      />
      <p className="text-xs text-muted-foreground">
        Changes apply from the next generated invoice — nothing already sent
        moves.
        {intervalCount !== s.intervalCount || unit !== s.intervalUnit
          ? " The interval changed, so the next run recounts from today."
          : ""}
      </p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose}>
          Keep
        </Button>
        <Button variant="brand" size="sm" disabled={!valid} onClick={save}>
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

// Round 18 (D16): the client picker lists everyone alphabetically —
// athletes A→Z first, then teams A→Z.
const athletesAZ = [...athletes].sort((a, b) => a.name.localeCompare(b.name));
const teamsAZ = [...trainingGroups].sort((a, b) =>
  a.name.localeCompare(b.name),
);

/**
 * O2 — create a one-off invoice for any client (athlete or team). Round 16:
 * a "Repeats" cadence starts a recurring series (Q3) and an optional future
 * "Send on" date queues the invoice as Scheduled instead of sending (Q4).
 * Round 18: typeable client filter (D16) plus membership-plan and discount
 * pickers (D17) — both bake into the amount and plan label, so they compose
 * with repeats and Send-on with no new model fields.
 */
function NewInvoiceDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (invoice: Invoice, series?: RecurringSeries) => void;
}) {
  const [clientId, setClientId] = useState(athletesAZ[0]?.id ?? "");
  // D16 — typing here filters the client select's options live.
  const [clientQuery, setClientQuery] = useState("");
  // D17 — "custom" keeps the free-form one-off behavior; a plan choice
  // auto-fills the amount (still editable after).
  const [planId, setPlanId] = useState("custom");
  const [discount, setDiscount] = useState<"none" | "family" | "custom">(
    "none",
  );
  const [customPct, setCustomPct] = useState("10");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [due, setDue] = useState(() => toDateInput(Date.now() + 7 * 86_400_000));
  // Round 17: flexible repeat settings — interval + end rule.
  const [repeats, setRepeats] = useState(false);
  const [repeatCount, setRepeatCount] = useState("1");
  const [repeatUnit, setRepeatUnit] =
    useState<RecurringSeries["intervalUnit"]>("month");
  const [endType, setEndType] = useState<RecurringSeries["endType"]>("never");
  const [endDate, setEndDate] = useState("");
  const [endAfter, setEndAfter] = useState("12");
  const [sendOn, setSendOn] = useState("");

  const clientName =
    athletes.find((a) => a.id === clientId)?.name ??
    trainingGroups.find((g) => g.id === clientId)?.name ??
    "";
  // D16 — the select shows only the clients matching the filter text.
  const cq = clientQuery.trim().toLowerCase();
  const athleteMatches = cq
    ? athletesAZ.filter((a) => a.name.toLowerCase().includes(cq))
    : athletesAZ;
  const teamMatches = cq
    ? teamsAZ.filter((g) => g.name.toLowerCase().includes(cq))
    : teamsAZ;
  const clientVisible =
    athleteMatches.some((a) => a.id === clientId) ||
    teamMatches.some((g) => g.id === clientId);
  const plan = plans.find((p) => p.id === planId);
  const amountNum = parseFloat(amount || "0");
  // D17 — the Amount field holds the pre-discount price; the discount is
  // baked into what the invoice actually charges (amountCents).
  const baseCents = Math.round(amountNum * 100);
  const discountPct =
    discount === "family"
      ? 10
      : discount === "custom"
        ? Math.floor(Number(customPct) || 0)
        : 0;
  const discountValid =
    discount !== "custom" || (discountPct >= 1 && discountPct <= 95);
  const chargeCents =
    discountPct > 0
      ? Math.round((baseCents * (100 - discountPct)) / 100)
      : baseCents;
  const discountNote =
    discount === "family"
      ? "Sibling & family −10%"
      : discount === "custom" && discountValid
        ? `Custom −${discountPct}%`
        : "";
  // Q4 — "Send on" must sit in the future (it's the automatic send date).
  const sendOnFuture =
    sendOn === "" || new Date(`${sendOn}T23:59:59`).getTime() > Date.now();
  // Round 17 — the repeat settings must be coherent before creating.
  const repeatCountN = Math.floor(Number(repeatCount) || 0);
  const endAfterN = Math.floor(Number(endAfter) || 0);
  const repeatValid =
    !repeats ||
    (repeatCountN >= 1 &&
      (endType !== "on" || endDate.length > 0) &&
      (endType !== "after" || endAfterN >= 1));
  const valid =
    clientName.length > 0 &&
    clientVisible &&
    amountNum > 0 &&
    chargeCents > 0 &&
    discountValid &&
    due.length > 0 &&
    sendOnFuture &&
    repeatValid;
  // Preview label ("weekly" / "every 4 weeks") for the footer line.
  const cadencePreview = seriesCadenceLabel({
    intervalCount: repeatCountN || 1,
    intervalUnit: repeatUnit,
  } as RecurringSeries).toLowerCase();

  function create() {
    if (!valid) return;
    const now = new Date().toISOString();
    // D17 — the plan label carries the memo and the discount note, e.g.
    // "Academy · Sibling & family −10%"; nothing new stored on the model.
    const labelParts = [plan ? plan.name : memo.trim() || "One-off invoice"];
    if (plan && memo.trim()) labelParts.push(memo.trim());
    if (discountNote) labelParts.push(discountNote);
    const base: Invoice = {
      id: `inv-local-${Date.now()}`,
      athleteId: clientId,
      athleteName: clientName,
      plan: labelParts.join(" · "),
      amountCents: chargeCents,
      issuedAt: now,
      dueDate: new Date(`${due}T12:00:00`).toISOString(),
      status: "due",
      method: "Square",
      sentAt: now,
    };
    if (repeats) {
      // Q3/Round 17 — the repeat settings spin up a local series; the
      // first invoice goes out immediately, flagged as part of it.
      const s: RecurringSeries = {
        id: `rs-local-${Date.now()}`,
        athleteId: clientId,
        athleteName: clientName,
        plan: base.plan,
        amountCents: base.amountCents,
        intervalCount: repeatCountN,
        intervalUnit: repeatUnit,
        endType,
        endDate:
          endType === "on"
            ? new Date(`${endDate}T12:00:00`).toISOString()
            : undefined,
        endAfter: endType === "after" ? endAfterN : undefined,
        generatedCount: 1,
        nextRun: "",
        status: "active",
        startedAt: now,
        method: "Square",
      };
      s.nextRun = seriesNextRun(s, new Date());
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
        {/* D16 — type-to-filter over the select below (works with keyboard
            and touch; the select stays the actual picker). */}
        <span className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={clientQuery}
            placeholder="Type to filter clients…"
            aria-label="Filter clients by name"
            onChange={(e) => {
              const q = e.target.value;
              setClientQuery(q);
              // Keep the selection on a visible option while typing.
              const ql = q.trim().toLowerCase();
              const first = [...athletesAZ, ...teamsAZ].filter(
                (c) => ql === "" || c.name.toLowerCase().includes(ql),
              );
              if (first.length > 0 && !first.some((c) => c.id === clientId))
                setClientId(first[0].id);
            }}
            className="h-9 w-full pl-8"
          />
        </span>
        <select
          value={clientId}
          aria-label="Invoice client"
          onChange={(e) => setClientId(e.target.value)}
          className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
        >
          {athleteMatches.length > 0 ? (
            <optgroup label="Athletes">
              {athleteMatches.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {teamMatches.length > 0 ? (
            <optgroup label="Teams">
              {teamMatches.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {athleteMatches.length + teamMatches.length === 0 ? (
            <option value="" disabled>
              No clients match “{clientQuery.trim()}”
            </option>
          ) : null}
        </select>
      </div>

      {/* D17 — plan auto-fills the amount; the discount recomputes it live
          and both ride along into repeats + Send-on unchanged. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Plan</Label>
          <select
            value={planId}
            aria-label="Membership plan"
            onChange={(e) => {
              setPlanId(e.target.value);
              const p = plans.find((pl) => pl.id === e.target.value);
              if (p) setAmount((p.priceCents / 100).toFixed(2));
            }}
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
          >
            <option value="custom">Custom / one-off</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {money2(p.priceCents)} · {p.cadence}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Discount</Label>
          <select
            value={discount}
            aria-label="Discount"
            onChange={(e) =>
              setDiscount(e.target.value as "none" | "family" | "custom")
            }
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
          >
            <option value="none">None</option>
            <option value="family">Sibling & family — 10%</option>
            <option value="custom">Custom…</option>
          </select>
          {discount === "custom" ? (
            <span className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={95}
                step={1}
                value={customPct}
                aria-label="Discount percent"
                onChange={(e) => setCustomPct(e.target.value)}
                className="h-9 w-20"
              />
              <span className="text-xs text-muted-foreground">
                % off (1–95)
              </span>
            </span>
          ) : null}
        </div>
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
          {/* D17 — the discount math, live as either input changes. */}
          {discountPct > 0 && baseCents > 0 ? (
            <p className="text-xs text-muted-foreground">
              was {money2(baseCents)} − {discountPct}% ={" "}
              <span className="font-semibold text-foreground">
                {money2(chargeCents)}
              </span>
            </p>
          ) : null}
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
            value={repeats ? "repeats" : ""}
            aria-label="Repeats"
            onChange={(e) => {
              const on = e.target.value === "repeats";
              setRepeats(on);
              // A repeating invoice sends its first copy now — no schedule.
              if (on) setSendOn("");
            }}
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
          >
            <option value="">Doesn&apos;t repeat</option>
            <option value="repeats">Repeats…</option>
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
            disabled={repeats}
            aria-label="Send on date"
            onChange={(e) => setSendOn(e.target.value)}
          />
        </div>
      </div>
      {/* Round 17: the flexible repeat settings appear once Repeats… is on. */}
      {repeats ? (
        <RepeatRuleFields
          count={repeatCount}
          setCount={setRepeatCount}
          unit={repeatUnit}
          setUnit={setRepeatUnit}
          endType={endType}
          setEndType={setEndType}
          endDate={endDate}
          setEndDate={setEndDate}
          endAfter={endAfter}
          setEndAfter={setEndAfter}
        />
      ) : null}
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
            : repeats
              ? `First invoice sends now — repeats ${cadencePreview}.`
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
