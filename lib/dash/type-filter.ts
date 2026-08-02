/**
 * Bedroom-primary + ad-tier secondary filter — contract §7 / ROUND2 amendment.
 *
 * `listing_category` (whole property, studio, …) is count-only and must never
 * drive price or cohort charts; those stay on bedrooms / tile_kind / all.
 */

export type BedroomKey = "all" | "1" | "2" | "3" | "4" | "5" | "6";
export type TierKey = "all" | "premium" | "basic";

export type TypeFilter = {
  bedrooms: BedroomKey;
  tier: TierKey;
};

export type TypeDimKey = {
  type_dim: "all" | "bedrooms" | "tile_kind";
  type_key: string;
};

export const BEDROOM_OPTIONS: { key: BedroomKey; label: string }[] = [
  { key: "all", label: "All beds" },
  { key: "1", label: "1 bed" },
  { key: "2", label: "2 bed" },
  { key: "3", label: "3 bed" },
  { key: "4", label: "4 bed" },
  { key: "5", label: "5 bed" },
  { key: "6", label: "6 bed" },
];

export const TIER_OPTIONS: { key: TierKey; label: string }[] = [
  { key: "all", label: "All ads" },
  { key: "premium", label: "Premium" },
  { key: "basic", label: "Basic" },
];

export const DEFAULT_TYPE_FILTER: TypeFilter = { bedrooms: "all", tier: "all" };

/**
 * Resolve the (type_dim, type_key) the price / cohort / g2_listings supply
 * tables should be read at. Bedrooms win when set; tier applies only when
 * bedrooms = all (no cross-product in the data).
 */
export function resolveTypeDim(filter: TypeFilter): TypeDimKey {
  if (filter.bedrooms !== "all") {
    return { type_dim: "bedrooms", type_key: filter.bedrooms };
  }
  if (filter.tier !== "all") {
    return { type_dim: "tile_kind", type_key: filter.tier };
  }
  return { type_dim: "all", type_key: "all" };
}

export function typeFilterLabel(filter: TypeFilter): string {
  const bed =
    filter.bedrooms === "all" ? "all bedrooms" : `${filter.bedrooms}-bed`;
  if (filter.bedrooms !== "all") return bed;
  if (filter.tier === "all") return "all listings";
  return `${filter.tier} ads`;
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
