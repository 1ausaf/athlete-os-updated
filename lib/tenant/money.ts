/**
 * Tenant-aware money formatting. The legacy money()/money2() helpers in
 * lib/demo/data.ts delegate here with CAD/en-CA defaults; tenant-facing
 * surfaces pass the tenant's currency/locale as they convert.
 */

export interface MoneyOptions {
  currency?: string;
  locale?: string;
}

export function formatMoney(cents: number, opts: MoneyOptions = {}): string {
  return new Intl.NumberFormat(opts.locale ?? "en-CA", {
    style: "currency",
    currency: opts.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(Math.round(cents) / 100);
}

export function formatMoney2(cents: number, opts: MoneyOptions = {}): string {
  return new Intl.NumberFormat(opts.locale ?? "en-CA", {
    style: "currency",
    currency: opts.currency ?? "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round(cents) / 100);
}
