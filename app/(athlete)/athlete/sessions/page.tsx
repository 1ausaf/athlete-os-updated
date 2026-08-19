import Link from "next/link";
import type { Route } from "next";

import { PageHeader } from "@/components/app/page-header";
import { requireAthleteContext } from "@/lib/demo/session";
import {
  generateBookableSlots,
  myBookings,
  pastBookings,
  restrictedSessionTypesFor,
} from "@/lib/demo/training";

import { SessionBooking } from "./session-book-form";

export default async function AthleteSessionsPage() {
  const { athlete, isParentView, children } = requireAthleteContext();
  const slots = generateBookableSlots(12);

  return (
    <div className="flex flex-col gap-6">
      {/* Round 8 (M21): Sessions → Bookings; the plan line moved into the
          weekly-cadence card (M23). Round 13 (B1): description removed. */}
      <PageHeader title="Bookings" />

      <SessionBooking
        slots={slots}
        initialBookings={myBookings}
        pastSessions={pastBookings}
        frequencyPerWeek={athlete.frequencyPerWeek}
        bookedThisWeek={athlete.bookedThisWeek}
        frequencyLabel={athlete.frequency}
        planName={athlete.planName}
        overdue={athlete.billing.state === "overdue"}
        lockedTypes={[...restrictedSessionTypesFor(athlete.id)]}
        isParentView={isParentView}
        bookKids={children.map((c) => ({ id: c.id, name: c.name }))}
        activeKidId={athlete.id}
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
