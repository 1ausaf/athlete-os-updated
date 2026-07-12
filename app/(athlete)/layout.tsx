import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AthleteNav } from "@/components/nav/athlete-nav";
import { AppShell } from "@/components/shell/app-shell";
import { requireUserWithProfile } from "@/lib/auth";
import { getDemoRole } from "@/lib/demo/session";

export default async function AthletePortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") {
    redirect("/staff/athletes");
  }

  return (
    <AppShell
      user={user}
      role={getDemoRole()}
      workspaceLabel="Athlete Portal"
      nav={<AthleteNav user={user} />}
    >
      {children}
    </AppShell>
  );
}
