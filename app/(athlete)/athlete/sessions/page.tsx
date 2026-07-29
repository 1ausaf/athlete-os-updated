import Link from "next/link";
import type { Route } from "next";

import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireAthleteContext } from "@/lib/demo/session";
import {
  generateBookableSlots,
  myBookings,
  pastBookings,
  restrictedSessionTypesFor,
} from "@/lib/demo/training";

import { SessionBooking } from "./session-book-form";

export default async function AthleteSessionsPage() {
  const { athlete } = requireAthleteContext();
  const slots = generateBookableSlots(12);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Schedule"
        title="Sessions"
        description="Book times across the next 12 weeks, keep an eye on what's booked, and count your past sessions — all in one place."
        actions={
          <Pill tone="brand" dot>
            {athlete.planName}
          </Pill>
        }
      />

      <SessionBooking
        slots={slots}
        initialBookings={myBookings}
        pastSessions={pastBookings}
        frequencyPerWeek={athlete.frequencyPerWeek}
        bookedThisWeek={athlete.bookedThisWeek}
        frequencyLabel={athlete.frequency}
        overdue={athlete.billing.state === "overdue"}
        lockedTypes={[...restrictedSessionTypesFor(athlete.id)]}
      />

      <p className="text-xs text-muted-foreground">
        <Link
          href={"/athlete/dashboard" as Route}
          className="underline-offset-4 hover:underline"
        >
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
