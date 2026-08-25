/**
 * Round 16 (Q5): a tiny hand-built PDF for "Download PDF" — no libraries.
 * Produces a valid single-page PDF (Letter) with the invoice summary in
 * Helvetica. Kept deliberately simple: text lines only, ASCII-safe.
 */

import { money2, type Invoice } from "@/lib/demo/data";

interface PdfLine {
  text: string;
  bold?: boolean;
  size?: number;
  /** Extra gap ABOVE this line, in points. */
  gap?: number;
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

function contentStream(lines: PdfLine[]): string {
  let y = 730;
  const ops: string[] = ["BT"];
  for (const line of lines) {
    const size = line.size ?? 11;
    y -= (line.gap ?? 0) + size + 7;
    ops.push(
      `/${line.bold ? "F2" : "F1"} ${size} Tf`,
      `1 0 0 1 56 ${y} Tm`,
      `(${esc(line.text)}) Tj`,
    );
  }
  ops.push("ET");
  return ops.join("\n");
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
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

export function invoicePdfBlob(inv: Invoice): Blob {
  const owing =
    inv.status === "partial"
      ? inv.amountCents - (inv.paidAmountCents ?? 0)
      : inv.status === "paid" || inv.status === "refunded"
        ? 0
        : inv.amountCents;

  const lines: PdfLine[] = [
    { text: "LPS ATHLETIC", bold: true, size: 20 },
    { text: "Athlete Operating System - Invoice", size: 10 },
    { text: `Invoice ${inv.id.toUpperCase()}`, bold: true, size: 14, gap: 18 },
    { text: `Status: ${STATUS_LABEL[inv.status]}`, gap: 6 },
    { text: `Billed to: ${inv.athleteName}`, gap: 12 },
    { text: `Plan: ${inv.plan}` },
    { text: `Issued: ${fmtDate(inv.issuedAt)}` },
    { text: `Due: ${fmtDate(inv.dueDate)}` },
    { text: `Amount: ${money2(inv.amountCents)}`, bold: true, gap: 12 },
  ];
  if (inv.paidAmountCents && inv.status === "partial") {
    lines.push({
      text: `Received so far: ${money2(inv.paidAmountCents)} - ${money2(owing)} outstanding`,
    });
  }
  if (inv.paidAt) {
    lines.push({
      text: `Paid ${fmtDate(inv.paidAt)}${inv.paidMethod ? ` via ${inv.paidMethod}` : ""}`,
    });
  }
  if (inv.refundedCents) {
    lines.push({ text: `Refunded: ${money2(inv.refundedCents)}` });
  }
  lines.push({
    text: "Questions? billing@lpsathletic.com - LPS Athletic, North York, ON",
    size: 9,
    gap: 24,
  });

  const stream = contentStream(lines);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
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
