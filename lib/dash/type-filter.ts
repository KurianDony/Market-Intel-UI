/**
 * Bed-range × tier filter — contract v4 / ROUND4B.
 *
 * UI scale is six positions: 1 < 2 < 3 < 4 < 5 < 6plus.
 * The bare `6` level exists only as a legacy contiguous-scale key in `_x`
 * tables; the UI never references it. Full range = (1, 6plus).
 */

/** UI bedroom levels — never include bare `"6"`. */
export type BedLevel = "1" | "2" | "3" | "4" | "5" | "6plus";
export type TierKey = "all" | "premium" | "basic";

export type TypeFilter = {
  bedMin: BedLevel;
  bedMax: BedLevel;
  tier: TierKey;
};

/** Resolved keys for `_x` table lookups. */
export type XFilterKey = {
  bed_min: BedLevel;
  bed_max: BedLevel;
  tier: TierKey;
};

/** Ordered UI thumb positions (index 0..5). */
export const BED_LEVELS: BedLevel[] = ["1", "2", "3", "4", "5", "6plus"];

export const BED_LEVEL_LABELS: Record<BedLevel, string> = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6plus": "6+",
};

export const TIER_OPTIONS: { key: TierKey; label: string }[] = [
  { key: "all", label: "All ads" },
  { key: "premium", label: "Premium" },
  { key: "basic", label: "Basic" },
];

export const DEFAULT_TYPE_FILTER: TypeFilter = {
  bedMin: "1",
  bedMax: "6plus",
  tier: "all",
};

export function bedLevelIndex(level: BedLevel): number {
  return BED_LEVELS.indexOf(level);
}

export function bedLevelAt(index: number): BedLevel {
  const clamped = Math.max(0, Math.min(BED_LEVELS.length - 1, index));
  return BED_LEVELS[clamped]!;
}

export function resolveXFilter(filter: TypeFilter): XFilterKey {
  const minIdx = bedLevelIndex(filter.bedMin);
  const maxIdx = bedLevelIndex(filter.bedMax);
  const lo = Math.min(minIdx, maxIdx);
  const hi = Math.max(minIdx, maxIdx);
  return {
    bed_min: bedLevelAt(lo),
    bed_max: bedLevelAt(hi),
    tier: filter.tier,
  };
}

export function isFullBedRange(filter: TypeFilter): boolean {
  const key = resolveXFilter(filter);
  return key.bed_min === "1" && key.bed_max === "6plus";
}

export function isFilterActive(filter: TypeFilter): boolean {
  return !isFullBedRange(filter) || filter.tier !== "all";
}

export function typeFilterLabel(filter: TypeFilter): string {
  const key = resolveXFilter(filter);
  const bed =
    key.bed_min === "1" && key.bed_max === "6plus"
      ? "all bedrooms"
      : key.bed_min === key.bed_max
        ? key.bed_min === "6plus"
          ? "6+-bed"
          : `${key.bed_min}-bed`
        : `${BED_LEVEL_LABELS[key.bed_min]}-${BED_LEVEL_LABELS[key.bed_max]}-bed`;
  if (filter.tier === "all") return bed;
  if (key.bed_min === "1" && key.bed_max === "6plus") return `${filter.tier} ads`;
  return `${bed} · ${filter.tier}`;
}

export function bedRangeLabel(filter: TypeFilter): string {
  const key = resolveXFilter(filter);
  if (key.bed_min === "1" && key.bed_max === "6plus") return "All";
  if (key.bed_min === key.bed_max) return BED_LEVEL_LABELS[key.bed_min];
  return `${BED_LEVEL_LABELS[key.bed_min]}-${BED_LEVEL_LABELS[key.bed_max]}`;
}

/** @deprecated Round 2 single-dimension resolve — residual callers only. */
export type TypeDimKey = {
  type_dim: "all" | "bedrooms" | "tile_kind";
  type_key: string;
};

export function resolveTypeDim(filter: TypeFilter): TypeDimKey {
  const key = resolveXFilter(filter);
  if (!(key.bed_min === "1" && key.bed_max === "6plus")) {
    // Single-bucket only; ranges have no `_by_type` equivalent.
    if (key.bed_min === key.bed_max) {
      return { type_dim: "bedrooms", type_key: key.bed_min };
    }
  }
  if (filter.tier !== "all") {
    return { type_dim: "tile_kind", type_key: filter.tier };
  }
  return { type_dim: "all", type_key: "all" };
}

export const LISTING_CATEGORY_LABELS: Record<string, string> = {
  share_houses: "Share houses",
  granny_flats: "Granny flats",
  studios: "Studios",
  one_beds: "1-beds",
  whole_properties: "Whole properties",
  student_accommodation: "Student accom.",
  homestays: "Homestays",
};
