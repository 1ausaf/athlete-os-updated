import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { StaffNav } from "@/components/nav/staff-nav";
import { AppShell } from "@/components/shell/app-shell";
import { BrandStyle } from "@/components/tenant/brand-style";
import { TenantProvider } from "@/components/tenant/tenant-provider";
import { requireUserWithProfile } from "@/lib/auth";
import { liveRosterConfigured } from "@/lib/data/members";
import { getDemoRole } from "@/lib/demo/session";
import { isStaff } from "@/lib/rbac";
import {
  getTenantBranding,
  getTenantPublic,
  tenantMetadata,
} from "@/lib/tenant/branding";
import { requireTenantIfTenantHost } from "@/lib/tenant/context";

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

  return (
    <TenantProvider tenant={tenantPublic}>
      <BrandStyle colors={branding.colors} />
      <AppShell
        user={user}
        role={getDemoRole()}
        workspaceLabel="Team Workspace"
        nav={<StaffNav user={user} liveRoster={liveRosterConfigured()} />}
        fullWidth
      >
        {children}
      </AppShell>
    </TenantProvider>
  );
}
