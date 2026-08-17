import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById } from "@/lib/demo/data";
import { isStaff } from "@/lib/rbac";

import { NutritionEditor } from "./nutrition-editor";

/**
 * Round 12 (N4/N5): the nutrition protocol left the header dropdown + modal
 * for its own page — tier control, the full editor, and revision history all
 * live here. Server shell only: guards + athlete lookup.
 */
export default async function StaffNutritionPage({
  params,
}: {
  params: { athleteId: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const athlete = athleteById(params.athleteId);
  if (!athlete) notFound();

  const profileHref = `/staff/athletes/${athlete.id}` as Route;

  return (
    <div className="flex flex-col gap-6">
      {/* G4 — every breadcrumb ancestor is a real link */}
      <nav
        aria-label="Breadcrumb"
        className="eyebrow flex flex-wrap items-center gap-1.5"
      >
        <Link
          href={"/staff/athletes" as Route}
          className="transition-colors hover:text-foreground"
        >
          Members
        </Link>
        <span aria-hidden>/</span>
        <Link href={profileHref} className="transition-colors hover:text-foreground">
          {athlete.name}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">Nutrition</span>
      </nav>

      <PageHeader
        title={`${athlete.name} — Nutrition Protocol`}
        description="Exactly what the member sees in their portal — edit the protocol, save revisions, restore older versions."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={profileHref}>← Profile</Link>
          </Button>
        }
      />

      <NutritionEditor athleteId={athlete.id} initialTier={athlete.nutrition} />
    </div>
  );
}
