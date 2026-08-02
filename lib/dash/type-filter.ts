/**
 * Bed × tier filter — contract v3 / ROUND3B.
 *
 * Filters combine freely via the `_x` tables (bed_bucket × tier).
 * `listing_category` (whole property, studio, …) is count-only (B8) and never
 * drives price or cohort charts.
 */

export type BedroomKey = "all" | "1" | "2" | "3" | "4" | "5" | "6plus";
export type TierKey = "all" | "premium" | "basic";

export type TypeFilter = {
  bedrooms: BedroomKey;
  tier: TierKey;
};

/** Resolved keys for `_x` table lookups. */
export type XFilterKey = {
  bed_bucket: BedroomKey;
  tier: TierKey;
};

export const BEDROOM_OPTIONS: { key: BedroomKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "1", label: "1" },
  { key: "2", label: "2" },
  { key: "3", label: "3" },
  { key: "4", label: "4" },
  { key: "5", label: "5" },
  { key: "6plus", label: "6+" },
];

export const TIER_OPTIONS: { key: TierKey; label: string }[] = [
  { key: "all", label: "All ads" },
  { key: "premium", label: "Premium" },
  { key: "basic", label: "Basic" },
];

export const DEFAULT_TYPE_FILTER: TypeFilter = { bedrooms: "all", tier: "all" };

export function resolveXFilter(filter: TypeFilter): XFilterKey {
  return { bed_bucket: filter.bedrooms, tier: filter.tier };
}

export function isFilterActive(filter: TypeFilter): boolean {
  return filter.bedrooms !== "all" || filter.tier !== "all";
}

export function typeFilterLabel(filter: TypeFilter): string {
  const bed =
    filter.bedrooms === "all"
      ? "all bedrooms"
      : filter.bedrooms === "6plus"
        ? "6+-bed"
        : `${filter.bedrooms}-bed`;
  if (filter.tier === "all") return bed;
  if (filter.bedrooms === "all") return `${filter.tier} ads`;
  return `${bed} · ${filter.tier}`;
}

/** @deprecated Round 2 single-dimension resolve — kept for any residual callers. */
export type TypeDimKey = {
  type_dim: "all" | "bedrooms" | "tile_kind";
  type_key: string;
};

export function resolveTypeDim(filter: TypeFilter): TypeDimKey {
  if (filter.bedrooms !== "all") {
    return { type_dim: "bedrooms", type_key: filter.bedrooms };
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
