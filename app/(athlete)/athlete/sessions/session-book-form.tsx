"use client";

import { useState } from "react";
import { AlertCircle, Check, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";

type Outcome = "idle" | "booked" | "waitlisted";

export function SessionBookForm({
  atCapacity,
  overdue,
  weekFull,
  frequencyPerWeek,
}: {
  /** Session is at roster capacity — booking offers the waitlist instead. */
  atCapacity: boolean;
  /** Billing overdue — booking paused (FR-11). */
  overdue: boolean;
  /** Weekly plan frequency already met (FR-10). */
  weekFull: boolean;
  frequencyPerWeek: number;
}) {
  const [outcome, setOutcome] = useState<Outcome>("idle");

  if (outcome === "booked") {
    return (
      <Pill tone="success" icon={<Check className="h-3 w-3" />}>
        Booked
      </Pill>
    );
  }
  if (outcome === "waitlisted") {
    return (
      <Pill tone="info" icon={<Clock className="h-3 w-3" />}>
        On waitlist
      </Pill>
    );
  }

  if (overdue) {
    return (
      <div className="flex max-w-[220px] flex-col items-end gap-1 text-right">
        <Button type="button" size="sm" variant="outline" disabled>
          Booking paused
        </Button>
        <span className="inline-flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          Clear your overdue balance to book.
        </span>
      </div>
    );
  }

  if (weekFull) {
    return (
      <div className="flex max-w-[220px] flex-col items-end gap-1 text-right">
        <Button type="button" size="sm" variant="outline" disabled>
          Week full
        </Button>
        <span className="text-xs text-muted-foreground">
          Plan cap of {frequencyPerWeek}/week reached — book next week or ask
          your coach.
        </span>
      </div>
    );
  }

  if (atCapacity) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOutcome("waitlisted")}
      >
        Join waitlist
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="brand"
      onClick={() => setOutcome("booked")}
    >
      Book
    </Button>
  );
}
