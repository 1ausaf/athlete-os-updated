/** Client-safe tenant types — no next/headers, importable anywhere. */

export type TenantStatus = "active" | "pilot" | "suspended" | "archived";

/** The subset of tenant identity that client components may see. */
export interface TenantPublic {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  /** True when the tenant's tier removes the "Powered by POWA" badge. */
  whiteLabel: boolean;
  /** "Questions?" line for printed/PDF invoices and receipts. */
  supportLine: string;
}

/** Brand color tokens as HSL triplets ("353 78% 44%") — the app's CSS format. */
export interface BrandColorSet {
  brand: string;
  brandForeground: string;
  brandSoft: string;
  brandInk: string;
}

export interface BrandColors {
  light?: Partial<BrandColorSet>;
  dark?: Partial<BrandColorSet>;
}

/** Validates one HSL triplet — the CSS-injection guard for brand tokens. */
export function isHslTriplet(v: unknown): v is string {
  return typeof v === "string" && /^\d{1,3}(?:\.\d+)? \d{1,3}(?:\.\d+)?% \d{1,3}(?:\.\d+)?%$/.test(v);
}
