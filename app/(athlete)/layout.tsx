import type { ReactNode } from "react";

import { ChildSwitcher } from "@/components/app/child-switcher";
import { AthleteNav } from "@/components/nav/athlete-nav";
import { AppShell } from "@/components/shell/app-shell";
import { getDemoRole, requireAthleteContext } from "@/lib/demo/session";

export default async function AthletePortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Athletes see themselves; parents see the selected child; staff redirect.
  const ctx = requireAthleteContext();

  return (
    <AppShell
      user={ctx.user}
      role={getDemoRole()}
      workspaceLabel={
        ctx.isParentView ? `Athlete Portal · ${ctx.athlete.name}` : "Athlete Portal"
      }
      nav={<AthleteNav user={ctx.user} athlete={ctx.athlete} />}
      headerExtra={
        ctx.isParentView ? (
          <ChildSwitcher
            activeId={ctx.athlete.id}
            childrenOptions={ctx.children.map((c) => ({
              id: c.id,
              name: c.name,
              initials: c.initials,
              hue: c.hue,
              sport: c.sport,
            }))}
          />
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}
