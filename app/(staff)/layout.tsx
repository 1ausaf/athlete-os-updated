import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { StaffNav } from "@/components/nav/staff-nav";
import { AppShell } from "@/components/shell/app-shell";
import { BrandStyle } from "@/components/tenant/brand-style";
import { TenantProvider } from "@/components/tenant/tenant-provider";
import { requireUserWithProfile } from "@/lib/auth";
import { getAuthContext } from "@/lib/authz/context";
import { demoLiveRosterAllowed } from "@/lib/data/members";
import { getDemoRole } from "@/lib/demo/session";
import { isStaff } from "@/lib/rbac";
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

export default async function StaffWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireTenantIfTenantHost();
  const branding = await getTenantBranding();
  const tenantPublic = await getTenantPublic();

  const user = await requireUserWithProfile();
  if (!isStaff(user)) {
    redirect("/athlete/dashboard");
  }
  const ctx = await getAuthContext();

  return (
    <TenantProvider tenant={tenantPublic}>
      <BrandStyle colors={branding.colors} />
      <AppShell
        user={user}
        role={getDemoRole()}
        workspaceLabel="Team Workspace"
        nav={
          <StaffNav
            user={user}
            liveRoster={
              ctx?.mode === "tenant"
                ? ctx.isRealAuth && ctx.permissions.has("roster:view")
                : demoLiveRosterAllowed()
            }
          />
        }
        realAuth={ctx?.isRealAuth ?? false}
        fullWidth
      >
        {children}
      </AppShell>
    </TenantProvider>
  );
}
