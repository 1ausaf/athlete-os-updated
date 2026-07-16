import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById } from "@/lib/demo/data";
import { generateBookableSlots, myBookings } from "@/lib/demo/training";

import { SessionBooking } from "./session-book-form";

export default async function AthleteSessionsPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const slots = generateBookableSlots(12);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Schedule"
        title="Sessions"
        description="Check every time you want across the next 12 weeks, then book them all in one go. Your plan cadence and billing status are enforced automatically."
        actions={
          <Pill tone="brand" dot>
            {athlete.planName}
          </Pill>
        }
      />

      <SessionBooking
        slots={slots}
        initialBookings={myBookings}
        frequencyPerWeek={athlete.frequencyPerWeek}
        bookedThisWeek={athlete.bookedThisWeek}
        frequencyLabel={athlete.frequency}
        overdue={athlete.billing.state === "overdue"}
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
