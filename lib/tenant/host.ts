/**
 * Hostname classification — pure string logic, safe for the edge runtime
 * (zero network calls, zero secrets). The middleware runs this on every
 * request and stamps the result into trusted x-powa-* request headers.
 *
 * Modes:
 * - "platform": the POWA apex (marketing + platform admin).
 * - "tenant":   {slug}.powa.com or a customer's custom domain — the app,
 *               scoped to whichever tenant the hostname resolves to.
 * - "demo":     the legacy .vercel.app host, previews and localhost — the
 *               original cookie-persona demo, byte-for-byte unchanged.
 */

export type TenantMode = "platform" | "tenant" | "demo";

export interface HostInfo {
  /** Sanitized hostname (lowercase, port stripped); "" when invalid. */
  host: string;
  mode: TenantMode;
  /** Subdomain slug when the host is {slug}.<apex>; custom domains omit it. */
  slug?: string;
  /** True for www.<apex> — the middleware 308s it to the apex. */
  isWww?: boolean;
}

/** The platform apex. Overridable per environment; powa.co in production. */
export function platformApex(): string {
  return (process.env.NEXT_PUBLIC_PLATFORM_APEX ?? "powa.co").toLowerCase();
}

/** Hosts that always run the cookie-persona demo (comma-separated env). */
function demoHosts(): string[] {
  const raw =
    process.env.DEMO_HOSTS ?? "athlete-os-updated.vercel.app,localhost,127.0.0.1";
  return raw.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}

/** Lowercase, strip the port, reject junk. Returns "" for invalid input. */
export function sanitizeHost(raw: string | null | undefined): string {
  if (!raw) return "";
  const host = raw.split(":")[0]!.trim().toLowerCase();
  return /^[a-z0-9.-]{1,253}$/.test(host) ? host : "";
}

export function classifyHost(rawHost: string | null | undefined): HostInfo {
  const host = sanitizeHost(rawHost);
  const apex = platformApex();

  // Invalid host: treat as an unknown tenant candidate — resolution fails
  // downstream and the layout renders "workspace not found".
  if (!host) return { host: "", mode: "tenant" };

  // Demo surface: the legacy demo host, every *.vercel.app (only our own
  // deployments can serve this app), and local dev.
  if (
    demoHosts().includes(host) ||
    host.endsWith(".vercel.app") ||
    host === "localhost" ||
    host.endsWith(".localhost")
  ) {
    return { host, mode: "demo" };
  }

  if (host === apex) return { host, mode: "platform" };
  if (host === `www.${apex}`) return { host, mode: "platform", isWww: true };

  if (host.endsWith(`.${apex}`)) {
    const slug = host.slice(0, -(apex.length + 1));
    // Deep subdomains (a.b.powa.com) are not tenant hosts.
    if (!slug || slug.includes(".")) return { host, mode: "tenant" };
    return { host, mode: "tenant", slug };
  }

  // Anything else that reaches this deployment is a custom-domain candidate;
  // the DB decides whether it maps to a verified tenant.
  return { host, mode: "tenant" };
}

/** Trusted header names — always overwritten by the middleware. */
export const TENANT_HOST_HEADER = "x-powa-host";
export const TENANT_MODE_HEADER = "x-powa-mode";
export const TENANT_SLUG_HEADER = "x-powa-slug";
