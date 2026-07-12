"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Triggers the browser print dialog (FR-42 — print / export to PDF). */
export function PrintButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="no-print"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" />
      Print / export PDF
    </Button>
  );
}
