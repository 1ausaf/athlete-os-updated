import type { ReactNode } from "react";

import { ChildSwitcher } from "@/components/app/child-switcher";
import { AthleteNav } from "@/components/nav/athlete-nav";
import { AppShell } from "@/components/shell/app-shell";
import { BrandStyle } from "@/components/tenant/brand-style";
import { TenantProvider } from "@/components/tenant/tenant-provider";
import { getAuthContext } from "@/lib/authz/context";
import { getDemoRole, requireAthleteContext } from "@/lib/demo/session";
import {
  getTenantBranding,
  getTenantPublic,
  tenantMetadata,
} from "@/lib/tenant/branding";
import { requireTenantIfTenantHost } from "@/lib/tenant/context";

// Per-request tenant resolution (x-powa-host) — never statically prerender, or
// a hostless build render bakes a "workspace not found" 404 into the Full Route
// Cache. See app/(auth)/layout.tsx for the full note.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return tenantMetadata();
}

export default async function AthletePortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Tenant hosts: unknown/unverified hostnames 404 before anything renders.
  await requireTenantIfTenantHost();
  const branding = await getTenantBranding();
  const tenantPublic = await getTenantPublic();

  // Athletes see themselves; parents see the selected child; staff redirect.
  const ctx = requireAthleteContext();
  const authCtx = await getAuthContext();

  return (
    <TenantProvider tenant={tenantPublic}>
      <BrandStyle colors={branding.colors} />
      <AppShell
        user={ctx.user}
        role={getDemoRole()}
        workspaceLabel={
          ctx.isParentView ? `Member Portal · ${ctx.athlete.name}` : "Member Portal"
        }
        nav={<AthleteNav user={ctx.user} athlete={ctx.athlete} />}
        realAuth={authCtx?.isRealAuth ?? false}
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
    </TenantProvider>
  );
}
