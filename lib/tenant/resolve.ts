import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import type { TenantStatus } from "@/lib/tenant/types";
import { sanitizeHost } from "@/lib/tenant/host";

/**
 * Hostname → tenant resolution. The middleware only CLASSIFIES the host;
 * this module does the actual lookup, from layouts and server components:
 *
 *   React.cache (per-request dedupe)
 *     → unstable_cache (regional data cache, tag `tenant:{host}`, 5 min TTL)
 *       → one anon-key fetch to the SECURITY DEFINER RPC
 *         get_tenant_public_branding (verified domains of live tenants only).
 *
 * Settings-save / domain-verify actions call revalidateTenantHost(); the TTL
 * self-heals missed invalidations. Uses bare fetch (not supabase-js) because
 * cookies() is off-limits inside unstable_cache and no user context is
 * needed — the RPC is anon-safe by design.
 */

export interface ResolvedTenant {
  id: string;
  slug: string;
  status: TenantStatus;
  displayName: string;
  logoUrl: string | null;
  iconUrl: string | null;
  theme: Record<string, unknown>;
  entitlements: Record<string, unknown>;
}

interface BrandingRow {
  tenant_id: string;
  slug: string;
  status: TenantStatus;
  display_name: string;
  logo_url: string | null;
  icon_url: string | null;
  theme: Record<string, unknown> | null;
  entitlements: Record<string, unknown> | null;
}

async function fetchTenantByHost(host: string): Promise<ResolvedTenant | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Unconfigured environment (local demo checkout) — no tenants resolvable.
  if (!url || !anonKey) return null;

  const res = await fetch(`${url}/rest/v1/rpc/get_tenant_public_branding`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ p_hostname: host }),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const rows = (await res.json()) as BrandingRow[];
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.tenant_id,
    slug: row.slug,
    status: row.status,
    displayName: row.display_name,
    logoUrl: row.logo_url,
    iconUrl: row.icon_url,
    theme: row.theme ?? {},
    entitlements: row.entitlements ?? {},
  };
}

// Cache-key version. Vercel's Data Cache persists across deployments, so a
// null cached under a host key (e.g. from a build-time render before the
// domain's DB row was matchable) would survive redeploys and pin that host to
// a permanent 404. Bump this to abandon every prior entry and force a fresh
// resolve. (force-dynamic on the tenant layouts stops builds re-poisoning it.)
const CACHE_VERSION = "v2";

const cachedFetch = (host: string) =>
  unstable_cache(() => fetchTenantByHost(host), ["tenant-host", CACHE_VERSION, host], {
    tags: [`tenant:${host}`],
    revalidate: 300,
  })();

/** Resolve a hostname to its tenant; null when unknown/unverified/archived. */
export const resolveTenant = cache(
  async (rawHost: string): Promise<ResolvedTenant | null> => {
    const host = sanitizeHost(rawHost);
    if (!host) return null;
    return cachedFetch(host);
  },
);

/** Tag helper for settings/domain actions: import revalidateTag where used. */
export function tenantHostTag(host: string): string {
  return `tenant:${sanitizeHost(host)}`;
}
