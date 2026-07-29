"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * C36 — print the analytics view as a clean report ("great to send to the
 * athlete and show them"). The page ships a small print stylesheet; the app
 * chrome is already hidden by the global `.no-print` rules.
 */
export function PrintReportButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="no-print"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" />
      Print report
    </Button>
  );
}
