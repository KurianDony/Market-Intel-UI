export const LISTING_MIX_FIELDS = [
  "share_houses",
  "granny_flats",
  "studios",
  "one_beds",
  "whole_properties",
  "student_accommodation",
  "homestays",
] as const;

export type ListingMixField = (typeof LISTING_MIX_FIELDS)[number];

export const LISTING_MIX_LABELS: Record<ListingMixField, string> = {
  share_houses: "Share houses",
  granny_flats: "Granny flats",
  studios: "Studios",
  one_beds: "One-beds",
  whole_properties: "Whole props",
  student_accommodation: "Student",
  homestays: "Homestays",
};

/** Greyscale donut / bar palette from dashboard_proposal_v2.html */
export const LISTING_MIX_COLORS = [
  "#ffffff",
  "#bbbbbb",
  "#888888",
  "#666666",
  "#444444",
  "#333333",
  "#555555",
] as const;

export function listingMixSlice(
  row: Record<ListingMixField, number | null | undefined>,
): { field: ListingMixField; label: string; value: number; color: string }[] {
  return LISTING_MIX_FIELDS.map((field, i) => ({
    field,
    label: LISTING_MIX_LABELS[field],
    value: row[field] ?? 0,
    color: LISTING_MIX_COLORS[i],
  }));
}
