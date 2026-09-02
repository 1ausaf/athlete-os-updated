import { isHslTriplet, type BrandColors } from "@/lib/tenant/types";

/**
 * Per-tenant brand tokens, injected as an inline <style> over the existing
 * CSS-custom-property system (--brand family; the data-accent="volt" toggle
 * proved the pattern). Zero component changes — every color in the app
 * already flows through these tokens.
 *
 * Every value is validated as an HSL triplet before emission — the
 * CSS-injection guard. Invalid/absent values emit nothing (the LPS-red
 * defaults in globals.css stand).
 */
export function BrandStyle({ colors }: { colors: BrandColors | null }) {
  if (!colors) return null;

  const light = colors.light ?? {};
  const dark = colors.dark ?? {};

  const decls = (set: Partial<Record<string, unknown>>, map: Record<string, string>) =>
    Object.entries(map)
      .map(([key, cssVar]) => {
        const v = set[key];
        return isHslTriplet(v) ? `${cssVar}:${v};` : "";
      })
      .join("");

  const TOKENS = {
    brand: "--brand",
    brandForeground: "--brand-foreground",
    brandSoft: "--brand-soft",
    brandInk: "--brand-ink",
  };

  const lightDecls = decls(light, TOKENS);
  // Dark mode also re-points --primary/--ring at the brand, matching the
  // volt-accent precedent in globals.css.
  const darkBrand = isHslTriplet(dark.brand) ? dark.brand : null;
  const darkDecls =
    decls(dark, TOKENS) +
    (darkBrand ? `--primary:${darkBrand};--ring:${darkBrand};` : "");

  if (!lightDecls && !darkDecls) return null;

  const css =
    (lightDecls ? `:root{${lightDecls}}` : "") +
    (darkDecls ? `.dark{${darkDecls}}` : "");

  return <style id="tenant-brand">{css}</style>;
}
