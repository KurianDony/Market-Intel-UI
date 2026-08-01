/**
 * Derivations the contract asks the client to compute (ratio bands, lens
 * percentages, first-vs-latest changes). Everything else is read straight off
 * the Phase-3 tables.
 */

import { formatCurrency } from "@/lib/dash/format";

/** Contract C12/C13: coarse source ratios display as an asymmetric band. */
export const RATIO_BAND_LOW = -0.5;
export const RATIO_BAND_HIGH = 0.4;

export function ratioBand(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  const lo = (value + RATIO_BAND_LOW).toFixed(digits);
  const hi = (value + RATIO_BAND_HIGH).toFixed(digits);
  return `${lo} – ${hi}`;
}

export function vsBaselinePct(
  value: number | null | undefined,
  baseline: number | null | undefined,
): number | null {
  if (value == null || baseline == null || baseline === 0) return null;
  return (100 * (value - baseline)) / baseline;
}

export function formatSignedPct(pct: number | null): string {
  if (pct == null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

export function formatSignedNumber(value: number | null | undefined, digits = 0): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}`;
}

export function formatSignedCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

export type FirstLast = {
  first: number;
  last: number;
  delta: number;
  firstWeek: string;
  lastWeek: string;
};

/** First vs latest non-null point of a weekly series (contract A5/B10/C14). */
export function firstLastChange(
  points: { week: string; value: number | null }[],
): FirstLast | null {
  const withValues = points.filter(
    (p): p is { week: string; value: number } => p.value != null,
  );
  if (withValues.length < 2) return null;
  const first = withValues[0];
  const last = withValues[withValues.length - 1];
  return {
    first: first.value,
    last: last.value,
    delta: last.value - first.value,
    firstWeek: first.week,
    lastWeek: last.week,
  };
}

export function formatFirstLastCurrency(change: FirstLast | null): string {
  if (!change) return "—";
  return `${formatCurrency(change.first)} → ${formatCurrency(change.last)} (${formatSignedCurrency(change.delta)})`;
}

export function formatFirstLastCount(change: FirstLast | null): string {
  if (!change) return "—";
  return `${change.first} → ${change.last} (${formatSignedNumber(change.delta)})`;
}

/** Contract D20: the band that clears the highest share of its standing stock. */
export function bestClearingBand<T extends { band_label: string; standing: number; moved: number; pct_moved: number | null }>(
  bands: T[],
): T | null {
  const candidates = bands.filter((b) => b.moved > 0 && b.pct_moved != null);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, b) =>
    (b.pct_moved ?? 0) > (best.pct_moved ?? 0) ? b : best,
  );
}

export type MixEntry = { label: string; count: number; share: number };

const MIX_LABELS: Record<string, string> = {
  share_houses: "Share houses",
  granny_flats: "Granny flats",
  studios: "Studios",
  one_beds: "1-beds",
  whole_properties: "Whole properties",
  student_accommodation: "Student accom.",
  homestays: "Homestays",
};

/** Contract B8: this suburb's live listings split by type, as shares. */
export function listingMixEntries(
  mix: Partial<Record<string, number | null>> | null,
): MixEntry[] {
  if (!mix) return [];
  const rows = Object.entries(MIX_LABELS).map(([key, label]) => ({
    label,
    count: mix[key] ?? 0,
  }));
  const total = rows.reduce((sum, r) => sum + (r.count ?? 0), 0);
  if (total === 0) return [];
  return rows
    .filter((r) => (r.count ?? 0) > 0)
    .map((r) => ({ ...r, count: r.count ?? 0, share: (100 * (r.count ?? 0)) / total }))
    .sort((a, b) => b.count - a.count);
}
