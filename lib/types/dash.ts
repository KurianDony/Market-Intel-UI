/** G3 dashboard aggregate row types — mirrors `20260518000000_dash_aggregates.sql`. */

export type DashAreaSummary = {
  id: number;
  area_slug: string;
  area: string;
  state: string;
  snapshot_date: string;
  suburb_count: number;
  median_avg_listing: number;
  rooms_offered_total: number;
  total_listings: number | null;
  wow_suburb_count: number | null;
  wow_median_avg_listing: number | null;
  wow_rooms_offered: number | null;
  wow_total_listings: number | null;
  computed_at: string;
};

export type DashAreaLeaderboard = {
  id: number;
  area_slug: string;
  suburb_id: number;
  suburb_slug: string;
  suburb_slug_pc: string;
  suburb: string;
  snapshot_date: string;
  avg_listing: number | null;
  seekers: number | null;
  supply: number | null;
  demand_ratio: number | null;
  total_listings: number | null;
  classification: "HOT" | "WARM" | "COOL" | "NO_DATA";
  rank_in_area: number | null;
  computed_at: string;
};

export type DashAreaSupplyPercentileWeekly = {
  id: number;
  area_slug: string;
  snapshot_date: string;
  p10: number | null;
  p30: number | null;
  p50: number | null;
  p70: number | null;
  computed_at: string;
};

export type DashAreaListingMix = {
  id: number;
  area_slug: string;
  snapshot_date: string;
  share_houses: number | null;
  granny_flats: number | null;
  studios: number | null;
  one_beds: number | null;
  whole_properties: number | null;
  student_accommodation: number | null;
  homestays: number | null;
  computed_at: string;
};

export type DashAreaListingMixBySuburb = {
  id: number;
  area_slug: string;
  suburb_id: number;
  suburb_slug: string;
  suburb_slug_pc: string;
  suburb: string;
  snapshot_date: string;
  share_houses: number | null;
  granny_flats: number | null;
  studios: number | null;
  one_beds: number | null;
  whole_properties: number | null;
  student_accommodation: number | null;
  homestays: number | null;
  total_listings: number | null;
  computed_at: string;
};

export type DashBandDefinition = {
  band_ord: number;
  band_label: string;
  band_low: number | null;
  band_high: number | null;
  width_hint: number | null;
  created_at: string;
};

export type DashAreaListingHistogram = {
  id: number;
  area_slug: string;
  snapshot_date: string;
  band_ord: number;
  band_label: string;
  listing_count: number;
  computed_at: string;
};

export type DashSuburbSummary = {
  id: number;
  suburb_id: number;
  suburb_slug: string;
  suburb_slug_pc: string;
  suburb: string;
  area_slug: string;
  state: string;
  snapshot_date: string;
  avg_listing: number | null;
  demand_ratio: number | null;
  min_price: number | null;
  max_price: number | null;
  total_listings: number | null;
  active_rooms: number | null;
  wow_avg_listing: number | null;
  wow_demand_ratio: number | null;
  wow_min_price: number | null;
  wow_max_price: number | null;
  wow_total_listings: number | null;
  wow_active_rooms: number | null;
  computed_at: string;
};

export type DashSuburbSummaryTrendRow = Pick<
  DashSuburbSummary,
  | "snapshot_date"
  | "avg_listing"
  | "min_price"
  | "max_price"
  | "total_listings"
  | "active_rooms"
  | "demand_ratio"
>;

export type DashSuburbListingHistogram = {
  id: number;
  suburb_id: number;
  suburb_slug: string;
  suburb_slug_pc: string;
  area_slug: string;
  snapshot_date: string;
  band_ord: number;
  band_label: string;
  listing_count: number;
  computed_at: string;
};

export type DashSuburbListingLongevity = {
  id: number;
  suburb_id: number;
  suburb_slug_pc: string;
  listing_id: string;
  first_seen: string;
  last_seen: string;
  weeks_seen: number;
  current_rent_pw: number | null;
  activated_at: string | null;
  status: "active" | "gone";
  computed_at: string;
};
