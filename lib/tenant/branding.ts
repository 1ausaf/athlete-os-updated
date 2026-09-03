import "server-only";

import { cache } from "react";

import { getResolvedTenant, getTenantMode } from "@/lib/tenant/context";
import type { BrandColors, TenantPublic } from "@/lib/tenant/types";

/**
 * Per-request branding facade. Demo/platform hosts get the built-in brands;
 * tenant hosts get the tenant's record. Server components call these; client
 * components get the same values via <TenantProvider>.
 */

export interface TenantBranding extends TenantPublic {
  colors: BrandColors | null;
  iconUrl: string | null;
  supportEmail: string | null;
  currency: string;
  locale: string;
  /** True on tenant hosts (drives white-label chrome vs demo chrome). */
  isTenantHost: boolean;
}

/** The demo/legacy brand — what the app has always shown, verbatim. */
const DEMO_BRANDING: TenantBranding = {
  id: "demo",
  slug: "demo",
  name: "LPS Athletic",
  logoUrl: null,
  whiteLabel: true,
  supportLine: "billing@lpsathletic.com — LPS Athletic, North York, ON",
  colors: null,
  iconUrl: null,
  supportEmail: null,
  currency: "CAD",
  locale: "en-CA",
  isTenantHost: false,
};

/** The platform brand for the powa.com marketing surface. */
const PLATFORM_BRANDING: TenantBranding = {
  ...DEMO_BRANDING,
  id: "platform",
  slug: "powa",
  name: "POWA Coach",
};

interface ThemeShape {
  colors?: BrandColors;
  supportEmail?: string;
  currency?: string;
  locale?: string;
}

export const getTenantBranding = cache(async (): Promise<TenantBranding> => {
  const mode = getTenantMode();
  if (mode === "demo") return DEMO_BRANDING;
  if (mode === "platform") return PLATFORM_BRANDING;

  const tenant = await getResolvedTenant();
  if (!tenant) return DEMO_BRANDING;

  const theme = (tenant.theme ?? {}) as ThemeShape;
  const supportEmail = theme.supportEmail ?? null;
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.displayName,
    logoUrl: tenant.logoUrl,
    whiteLabel: Boolean(tenant.entitlements?.powa_badge_removal),
    supportLine: supportEmail
      ? `${supportEmail} — ${tenant.displayName}`
      : `Contact ${tenant.displayName}`,
    colors: theme.colors ?? null,
    iconUrl: tenant.iconUrl,
    supportEmail,
    currency: theme.currency ?? "CAD",
    locale: theme.locale ?? "en-CA",
    isTenantHost: true,
  };
});

/** Nested-layout metadata: the portal carries the workspace's identity —
 *  the tenant's on tenant hosts, LPS Athletic's on demo hosts (the root
 *  layout's POWA metadata covers only the platform marketing surface). */
export async function tenantMetadata(): Promise<{
  title?: { default: string; template: string };
  icons?: string;
}> {
  const b = await getTenantBranding();
  if (!b.isTenantHost) {
    if (getTenantMode() === "demo") {
      return {
        title: {
          default: "LPS Athletic — Athlete Operating System",
          template: "%s · AOS",
        },
      };
    }
    return {};
  }
  return {
    title: { default: `${b.name} — Athlete OS`, template: `%s · ${b.name}` },
    ...(b.iconUrl ? { icons: b.iconUrl } : {}),
  };
}

/** The client-safe slice for <TenantProvider>. */
export async function getTenantPublic(): Promise<TenantPublic> {
  const b = await getTenantBranding();
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    logoUrl: b.logoUrl,
    whiteLabel: b.whiteLabel,
    supportLine: b.supportLine,
  };
}
