import "server-only";

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import {
  TENANT_HOST_HEADER,
  TENANT_MODE_HEADER,
  TENANT_SLUG_HEADER,
  type TenantMode,
} from "@/lib/tenant/host";
import { resolveTenant, type ResolvedTenant } from "@/lib/tenant/resolve";

/**
 * Server-side accessors for the trusted x-powa-* headers the middleware
 * stamps on every request. These are the ONLY way app code learns which
 * hostname/mode a request belongs to.
 */

export function getTenantMode(): TenantMode {
  const raw = headers().get(TENANT_MODE_HEADER);
  if (raw === "platform" || raw === "tenant") return raw;
  // Absent header (e.g. a route the matcher skipped) fails safe to demo
  // only for local/vercel hosts — the middleware matcher covers all pages,
  // so this is effectively unreachable in practice.
  return "demo";
}

export function getTenantHost(): string {
  return headers().get(TENANT_HOST_HEADER) ?? "";
}

export function getTenantSlug(): string | null {
  return headers().get(TENANT_SLUG_HEADER);
}

/**
 * The resolved tenant for this request, or null on platform/demo hosts and
 * unknown/unverified tenant hosts. Cached per-request + regionally.
 */
export async function getResolvedTenant(): Promise<ResolvedTenant | null> {
  if (getTenantMode() !== "tenant") return null;
  return resolveTenant(getTenantHost());
}

/**
 * Tenant-host pages call this: unknown hostname → "workspace not found".
 * Demo/platform hosts return null (callers fall back to demo behavior).
 */
export async function requireTenantIfTenantHost(): Promise<ResolvedTenant | null> {
  if (getTenantMode() !== "tenant") return null;
  const tenant = await resolveTenant(getTenantHost());
  if (!tenant) notFound();
  return tenant;
}
