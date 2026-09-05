/**
 * Round 21: full letterhead invoice PDF, modeled on the club's real Square
 * invoice — logo tile, business block, brand rule, plan-name title, payment
 * note, Customer/Invoice/Payment columns, itemized table, totals and a
 * pay-online footer (R21.2: with a scannable QR code and an HST-included
 * line, like the real one). Still zero libraries: a hand-built single-page
 * Letter PDF with Helvetica metrics for wrapping/right-alignment, the wolf
 * mark drawn as vector path operators, and the QR from lib/demo/qr.
 */

import { athleteProfileById, money2, type Invoice } from "@/lib/demo/data";
import { qrMatrix } from "@/lib/demo/qr";

/** Ontario HST portion of a tax-inclusive amount (13/113 of the total). */
export function hstIncludedCents(amountCents: number): number {
  return Math.round((amountCents * 13) / 113);
}

export interface InvoicePdfBrand {
  name: string;
  /** Letterhead lines under the name (street, city, …). */
  addressLines: string[];
  /** "email | phone" line. */
  contactLine?: string;
  /** e.g. "GST/HST: 841193451RT0001". */
  taxLine?: string;
  /** Shown in the payment note for Email Money Transfers. */
  emtEmail?: string;
  /** Draw the LPS wolf tile; tenant brands get a monogram tile. */
  wolfMark?: boolean;
}

export interface InvoicePdfOptions {
  brand?: InvoicePdfBrand;
  /** Public share URL for the pay-online footer. */
  payUrl?: string;
}

/** The real LPS letterhead (from the club's live Square invoices). */
const LPS_BRAND: InvoicePdfBrand = {
  name: "LPS Athletic",
  addressLines: ["125 Martin Ross Avenue", "Unit 12, North York, ON M3J 2L9 Canada"],
  contactLine: "train@lpsathletic.com | (416) 360-0460",
  taxLine: "GST/HST: 841193451RT0001",
  emtEmail: "accounts@lpsathletic.com",
  wolfMark: true,
};

/* ------------------------------------------------------------------ */
/* Helvetica metrics (Adobe AFM widths, chars 32–126, per 1000 units) */
/* ------------------------------------------------------------------ */

// prettier-ignore
const W_REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
// prettier-ignore
const W_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

function width(text: string, size: number, bold: boolean): number {
  const table = bold ? W_BOLD : W_REG;
  let units = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    units += code >= 32 && code <= 126 ? table[code - 32]! : 556;
  }
  return (units / 1000) * size;
}

/** PDF string escaping + ASCII folding (Helvetica base encoding). */
function esc(text: string): string {
  return text
    .replace(/[—–]/g, "-")
    .replace(/·/g, ".")
    .replace(/×/g, "x")
    .replace(/[éè]/g, "e")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/** Fold before measuring so widths match what actually renders. */
function fold(text: string): string {
  return text
    .replace(/[—–]/g, "-")
    .replace(/·/g, ".")
    .replace(/×/g, "x")
    .replace(/[éè]/g, "e")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7e]/g, "");
}

/* ------------------------------------------------------------------ */
/* Tiny content-stream builder (Letter, origin flipped to top-left)   */
/* ------------------------------------------------------------------ */

const PAGE_W = 612;
const PAGE_H = 792;

type Rgb = [number, number, number];
const BLACK: Rgb = [0, 0, 0];
const GREY: Rgb = [0.42, 0.42, 0.45];
const RULE: Rgb = [0.88, 0.88, 0.9];
const BRAND_RED: Rgb = [0.78, 0.1, 0.18];

class Pdf {
  private ops: string[] = [];

  /** y is measured from the TOP of the page. */
  text(
    x: number,
    yTop: number,
    raw: string,
    o: { size?: number; bold?: boolean; color?: Rgb; align?: "left" | "right" } = {},
  ): void {
    const size = o.size ?? 9.5;
    const bold = o.bold ?? false;
    const [r, g, b] = o.color ?? BLACK;
    const s = fold(raw);
    const tx = o.align === "right" ? x - width(s, size, bold) : x;
    const ty = PAGE_H - yTop - size; // baseline roughly size below the top
    this.ops.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${tx.toFixed(2)} ${ty.toFixed(2)} Tm (${esc(raw)}) Tj ET`,
    );
  }

  rect(x: number, yTop: number, w: number, h: number, color: Rgb): void {
    const [r, g, b] = color;
    this.ops.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${(PAGE_H - yTop - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
    );
  }

  hline(x1: number, x2: number, yTop: number, color: Rgb = RULE, lw = 0.75): void {
    this.rect(x1, yTop, x2 - x1, lw, color);
  }

  /** Filled path from top-left-space points; supports beziers via 6-tuples. */
  path(color: Rgb, segments: (number[] | "Z")[]): void {
    const [r, g, b] = color;
    const parts: string[] = [`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`];
    segments.forEach((seg, i) => {
      if (seg === "Z") {
        parts.push("h");
        return;
      }
      const pts = seg.map((v, j) => (j % 2 === 0 ? v : PAGE_H - v));
      if (seg.length === 2) {
        parts.push(`${pts[0]!.toFixed(2)} ${pts[1]!.toFixed(2)} ${i === 0 ? "m" : "l"}`);
      } else {
        parts.push(
          `${pts[0]!.toFixed(2)} ${pts[1]!.toFixed(2)} ${pts[2]!.toFixed(2)} ${pts[3]!.toFixed(2)} ${pts[4]!.toFixed(2)} ${pts[5]!.toFixed(2)} c`,
        );
      }
    });
    parts.push("f");
    this.ops.push(parts.join(" "));
  }

  roundedRect(x: number, yTop: number, w: number, h: number, rad: number, color: Rgb): void {
    const k = 0.5523 * rad;
    const x2 = x + w;
    const y1 = yTop;
    const y2 = yTop + h;
    this.path(color, [
      [x + rad, y1],
      [x2 - rad, y1],
      [x2 - rad + k, y1, x2, y1 + rad - k, x2, y1 + rad],
      [x2, y2 - rad],
      [x2, y2 - rad + k, x2 - rad + k, y2, x2 - rad, y2],
      [x + rad, y2],
      [x + rad - k, y2, x, y2 - rad + k, x, y2 - rad],
      [x, y1 + rad],
      [x, y1 + rad - k, x + rad - k, y1, x + rad, y1],
      "Z",
    ]);
  }

  stream(): string {
    return this.ops.join("\n");
  }
}

/** The wolf mark: black rounded tile, white head, notch, brand-red eyes. */
function wolfTile(pdf: Pdf, x: number, yTop: number, size: number): void {
  pdf.roundedRect(x, yTop, size, size, size * 0.22, BLACK);
  const s = size / 32;
  const px = (sx: number) => x + sx * s;
  const py = (sy: number) => yTop + sy * s;
  // Head silhouette (from components/brand/logo.tsx, relatives expanded).
  pdf.path([1, 1, 1], [
    [px(16), py(3.5)],
    [px(5.5), py(8)],
    [px(5.5), py(15.5)],
    [px(5.5), py(21.9), px(10.1), py(26.1), px(16), py(28.5)],
    [px(21.9), py(26.1), px(26.5), py(21.9), px(26.5), py(15.5)],
    [px(26.5), py(8)],
    "Z",
  ]);
  // Muzzle notch (tile color cut-out).
  pdf.path(BLACK, [
    [px(16), py(20.5)],
    [px(12.5), py(16.2)],
    [px(19.5), py(16.2)],
    "Z",
  ]);
  // Eyes.
  pdf.path(BRAND_RED, [
    [px(11), py(12.2)], [px(13.4), py(11)], [px(14), py(13.4)], [px(11.4), py(13.7)], "Z",
  ]);
  pdf.path(BRAND_RED, [
    [px(21), py(12.2)], [px(18.6), py(11)], [px(18), py(13.4)], [px(20.6), py(13.7)], "Z",
  ]);
}

/** Monogram tile for tenant brands without an LPS mark. */
function monogramTile(pdf: Pdf, x: number, yTop: number, size: number, letter: string): void {
  pdf.roundedRect(x, yTop, size, size, size * 0.22, BLACK);
  const ch = (letter || "P").slice(0, 1).toUpperCase();
  const fs = size * 0.52;
  const w = width(ch, fs, true);
  pdf.text(x + (size - w) / 2, yTop + (size - fs) / 2 - fs * 0.12, ch, {
    size: fs,
    bold: true,
    color: BRAND_RED,
  });
}

/** QR code as filled rects (horizontal runs merged); page white = quiet zone. */
function drawQr(pdf: Pdf, x: number, yTop: number, size: number, mat: boolean[][]): void {
  const n = mat.length;
  const m = size / n;
  for (let r = 0; r < n; r++) {
    const row = mat[r]!;
    for (let c = 0; c < n; c++) {
      if (!row[c]) continue;
      let run = 1;
      while (c + run < n && row[c + run]) run++;
      pdf.rect(x + c * m, yTop + r * m, run * m + 0.05, m + 0.05, BLACK);
      c += run - 1;
    }
  }
}

function wrap(text: string, maxWidth: number, size: number, bold = false): string[] {
  const words = fold(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (width(candidate, size, bold) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_LABEL: Record<Invoice["status"], string> = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
  upcoming: "Scheduled",
  draft: "Draft",
  canceled: "Canceled",
  partial: "Partially paid",
  refunded: "Refunded",
};

/* ------------------------------------------------------------------ */
/* The invoice                                                         */
/* ------------------------------------------------------------------ */

export function invoicePdfBlob(inv: Invoice, opts: InvoicePdfOptions = {}): Blob {
  const brand = opts.brand ?? LPS_BRAND;
  const profile = athleteProfileById(inv.athleteId);

  const received = inv.status === "partial" ? (inv.paidAmountCents ?? 0) : 0;
  const balance =
    inv.status === "paid" || inv.status === "refunded" || inv.status === "canceled"
      ? 0
      : inv.amountCents - received;

  const pdf = new Pdf();
  const L = 56; // left margin
  const R = PAGE_W - 56; // right edge

  /* Letterhead */
  const tile = 46;
  if (brand.wolfMark) wolfTile(pdf, L, 48, tile);
  else monogramTile(pdf, L, 48, tile, brand.name);

  const bx = L + tile + 14;
  pdf.text(bx, 50, brand.name, { size: 10.5, bold: true });
  let by = 66;
  for (const line of brand.addressLines) {
    pdf.text(bx, by, line, { size: 8.5, color: GREY });
    by += 12;
  }
  if (brand.contactLine) {
    pdf.text(bx, by, brand.contactLine, { size: 8.5, color: GREY });
    by += 12;
  }
  if (brand.taxLine) {
    pdf.text(bx, by, brand.taxLine, { size: 8.5, color: GREY });
  }

  pdf.text(R, 50, `Invoice #${inv.id.toUpperCase()}`, { size: 10, bold: true, align: "right" });
  pdf.text(R, 74, "Issue date", { size: 8.5, bold: true, align: "right" });
  pdf.text(R, 86, fmtDate(inv.issuedAt), { size: 8.5, color: GREY, align: "right" });

  /* Brand rule */
  pdf.rect(L, 128, R - L, 3.5, BRAND_RED);

  /* Title = the plan/billing item */
  pdf.text(L, 156, inv.plan, { size: 21, bold: true });

  /* Payment note */
  const first = inv.athleteName.split(" ")[0] ?? inv.athleteName;
  let note: string;
  if (inv.status === "paid") {
    note = `This invoice for ${first}'s membership plan has been settled${inv.paidMethod ? ` via ${inv.paidMethod}` : ""}. Thank you for your business!`;
  } else if (inv.status === "canceled") {
    note = `This invoice for ${first}'s membership plan was canceled — no payment is required.`;
  } else {
    note =
      `This is an invoice for ${first}'s membership plan. You may use the secure link in this invoice to pay by credit card.` +
      (brand.emtEmail
        ? ` Or if you prefer an Email Money Transfer (EMT), please send it to ${brand.emtEmail} - HST is already included in the total.`
        : "") +
      " Thank you for your business!";
  }
  let y = 194;
  for (const line of wrap(note, R - L, 9.5)) {
    pdf.text(L, y, line, { size: 9.5, color: GREY });
    y += 13.5;
  }

  /* Customer | Invoice Details | Payment */
  const colY = y + 18;
  const cols = [L, L + 176, L + 352];
  const colW = 160;
  const headers = ["Customer", "Invoice Details", "Payment"];
  cols.forEach((cx, i) => {
    pdf.hline(cx, cx + colW, colY, RULE);
    pdf.text(cx, colY + 10, headers[i]!, { size: 9.5, bold: true });
  });

  const customerLines = [
    inv.athleteName,
    ...(profile
      ? [
          profile.email,
          profile.phone,
          profile.address.street,
          `${profile.address.city} ${profile.address.region} ${profile.address.postal}`,
        ]
      : []),
  ];
  let cy = colY + 28;
  for (const line of customerLines.slice(0, 5)) {
    pdf.text(cols[0]!, cy, line, { size: 9, color: GREY });
    cy += 13;
  }

  pdf.text(cols[1]!, colY + 28, `PDF created ${fmtLongDate(new Date().toISOString())}`, {
    size: 9,
    color: GREY,
  });
  pdf.text(cols[1]!, colY + 41, money2(inv.amountCents), { size: 9, color: GREY });
  pdf.text(cols[1]!, colY + 54, `Status: ${STATUS_LABEL[inv.status]}`, { size: 9, color: GREY });

  if (inv.status === "paid" && inv.paidAt) {
    pdf.text(cols[2]!, colY + 28, `Paid ${fmtLongDate(inv.paidAt)}`, { size: 9, color: GREY });
    pdf.text(cols[2]!, colY + 41, money2(inv.amountCents), { size: 9, color: GREY });
  } else {
    pdf.text(cols[2]!, colY + 28, `Due ${fmtLongDate(inv.dueDate)}`, { size: 9, color: GREY });
    pdf.text(cols[2]!, colY + 41, money2(balance), { size: 9, color: GREY });
  }

  /* Items table — starts below the tallest column (Customer can run 5 lines) */
  const tY = Math.max(colY + 84, cy + 10);
  pdf.hline(L, R, tY, RULE);
  const qtyX = L + 330;
  const priceX = L + 420;
  pdf.text(L, tY + 10, "Items", { size: 9, bold: true });
  pdf.text(qtyX, tY + 10, "Quantity", { size: 9, bold: true, align: "right" });
  pdf.text(priceX, tY + 10, "Price", { size: 9, bold: true, align: "right" });
  pdf.text(R, tY + 10, "Amount", { size: 9, bold: true, align: "right" });
  pdf.hline(L, R, tY + 26, RULE);

  pdf.text(L, tY + 38, inv.plan, { size: 9.5 });
  pdf.text(L, tY + 52, "Membership plan", { size: 8.5, color: GREY });
  pdf.text(qtyX, tY + 38, "1", { size: 9.5, align: "right" });
  pdf.text(priceX, tY + 38, money2(inv.amountCents), { size: 9.5, align: "right" });
  pdf.text(R, tY + 38, money2(inv.amountCents), { size: 9.5, align: "right" });

  pdf.hline(L, R, tY + 70, RULE);

  /* Totals */
  let sy = tY + 82;
  const totalRow = (
    label: string,
    value: string,
    opts2: { bold?: boolean; size?: number; color?: Rgb } = {},
  ) => {
    pdf.text(L, sy, label, { size: opts2.size ?? 9.5, bold: opts2.bold, color: opts2.color });
    pdf.text(R, sy, value, {
      size: opts2.size ?? 9.5,
      bold: opts2.bold,
      color: opts2.color,
      align: "right",
    });
    sy += (opts2.size ?? 9.5) + 6;
  };
  totalRow("Subtotal", money2(inv.amountCents));
  // R21.2 — prices are tax-inclusive; surface the HST portion (13/113).
  if (brand.taxLine) {
    totalRow("HST 13% (included)", money2(hstIncludedCents(inv.amountCents)), {
      color: GREY,
    });
  }
  if (received > 0) totalRow("Received so far", `-${money2(received)}`);
  if (inv.refundedCents) totalRow("Refunded", money2(inv.refundedCents));
  sy += 6;
  pdf.hline(L, R, sy - 2, RULE);
  sy += 8;
  const totalLabel = inv.status === "paid" ? "Total Paid" : "Total Due";
  const totalValue = inv.status === "paid" ? inv.amountCents : balance;
  pdf.text(L, sy, totalLabel, { size: 15, bold: true });
  pdf.text(R, sy, money2(totalValue), { size: 15, bold: true, align: "right" });

  /* Footer — R21.2: QR code beside the pay link, like the real invoice. */
  const qr = opts.payUrl && balance > 0 ? qrMatrix(opts.payUrl) : null;
  if (qr && opts.payUrl) {
    const qSize = 58;
    const fTop = 694;
    pdf.hline(L, R, fTop - 8, RULE);
    drawQr(pdf, L, fTop, qSize, qr);
    const tx = L + qSize + 14;
    pdf.text(tx, fTop + 6, "Pay online", { size: 9.5, bold: true });
    pdf.text(tx, fTop + 20, "Scan the code with your phone camera, or go to", {
      size: 8.5,
      color: GREY,
    });
    pdf.text(tx, fTop + 32, opts.payUrl, { size: 8.5, color: GREY });
    pdf.text(R, fTop + 6, "Page 1 of 1", { size: 8.5, color: GREY, align: "right" });
  } else {
    const fy = 726;
    pdf.hline(L, R, fy - 14, RULE);
    if (opts.payUrl && balance > 0) {
      pdf.text(L, fy, "Pay online", { size: 9.5, bold: true });
      pdf.text(L, fy + 14, `To pay your invoice go to ${opts.payUrl}`, { size: 8.5, color: GREY });
    } else {
      pdf.text(L, fy, brand.name, { size: 9.5, bold: true });
      pdf.text(L, fy + 14, "Thank you for your business!", { size: 8.5, color: GREY });
    }
    pdf.text(R, fy, "Page 1 of 1", { size: 8.5, color: GREY, align: "right" });
  }

  /* Assemble the file */
  const stream = pdf.stream();
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    body += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([body], { type: "application/pdf" });
}
