"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { fmtDay, money2, type Invoice } from "@/lib/demo/data";

const statusMeta: Record<Invoice["status"], { label: string; tone: PillTone }> =
  {
    paid: { label: "Paid", tone: "success" },
    upcoming: { label: "Upcoming", tone: "neutral" },
    due: { label: "Due", tone: "warning" },
    overdue: { label: "Overdue", tone: "danger" },
  };

/**
 * Client invoices table. "Mark as paid" on an overdue row optimistically flips
 * that row to paid in local state (FR-21) — no backend, demo only.
 */
export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const [rows, setRows] = useState<Invoice[]>(invoices);

  function markPaid(id: string) {
    setRows((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, status: "paid" as const } : inv,
      ),
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Athlete</TableHead>
            <TableHead className="hidden md:table-cell">Plan</TableHead>
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
            return (
              <TableRow
                key={inv.id}
                className={
                  isOverdue
                    ? "border-destructive/20 bg-destructive/[0.05] hover:bg-destructive/[0.08]"
                    : undefined
                }
              >
                <TableCell className="font-medium">{inv.athleteName}</TableCell>
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
                    {isOverdue ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markPaid(inv.id)}
                      >
                        <Check className="h-4 w-4" />
                        Mark paid
                      </Button>
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
  );
}
