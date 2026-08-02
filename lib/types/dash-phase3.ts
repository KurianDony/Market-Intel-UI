/**
 * Phase-3 dashboard row types — ISO-week keyed (`iso_week` = Monday of the week).
 * Mirrors docs/phase4/G3_DATA_CONTRACT.md §2. Read-only; the UI never writes.
 */

export type Confidence = "GREEN" | "AMBER" | "RED";

export type DashSuburbWeekly = {
  suburb_id: number;
  suburb_slug: string;
  suburb: string;
  area_slug: string;
  iso_week: string;
  avg_rent: number | null;
  p50_bars: number | null;
  demand_ratio: number | null;
  /** @deprecated v2 — always NULL; use implied_seekers. */
  seekers: number | null;
  /** @deprecated v2 — always NULL. */
  rooms_offered: number | null;
  total_listings: number | null;
  live_listings: number | null;
  /** @deprecated v2 — always NULL; show demand_ratio instead. */
  listings_per_seeker: number | null;
  rank_in_area: number | null;
  wow_avg_rent: number | null;
  mom_avg_rent: number | null;
  qoq_avg_rent: number | null;
  wow_demand_ratio: number | null;
  /** @deprecated v2 — always NULL. */
  wow_seekers: number | null;
  wow_total_listings: number | null;
  alltime_avg_rent_delta: number | null;
  avg_rent_vol_8w: number | null;
  /** v2 — strict-WoW fallback when the −7d row is missing. */
  delta_vs_prev_obs: number | null;
  prev_obs_week: string | null;
  prev_obs_gap_weeks: number | null;
  /** v2 — mode-invariant seeker estimate. */
  implied_seekers: number | null;
  implied_seekers_basis_week: string | null;
  implied_seekers_stale_weeks: number | null;
  alltime_first_ratio: number | null;
  alltime_latest_ratio: number | null;
  alltime_ratio_delta: number | null;
};

export type DashSuburbPriceStatsByType = {
  suburb_id: number;
  suburb_slug: string;
  area_slug: string;
  iso_week: string;
  type_dim: string;
  type_key: string;
  sample_n: number;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  mean_rent: number | null;
  dispersion_9010: number | null;
  iqr_7525: number | null;
};

/** v3 — bed × tier cross grain for combined filters. */
export type DashSuburbPriceStatsX = {
  suburb_id: number;
  suburb_slug: string;
  area_slug: string;
  iso_week: string;
  bed_bucket: string;
  tier: string;
  sample_n: number;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  mean_rent: number | null;
};

export type DashSuburbSupplyByType = {
  suburb_id: number;
  suburb_slug: string;
  area_slug: string;
  iso_week: string;
  type_dim: string;
  type_key: string;
  listings: number;
  share_of_suburb: number | null;
  source: string;
  basis_week: string | null;
  stale_weeks: number | null;
};

/** v3 — bed × tier live/new/gone. */
export type DashSuburbSupplyX = {
  suburb_id: number;
  suburb_slug: string;
  area_slug: string;
  iso_week: string;
  bed_bucket: string;
  tier: string;
  live_count: number;
  new_count: number;
  gone_count: number;
};

export type DashSuburbCohort = {
  suburb_id: number;
  suburb_slug: string;
  area_slug: string;
  iso_week: string;
  cohort: "added" | "removed";
  type_dim: string;
  type_key: string;
  count: number;
  median_rent: number | null;
  p25: number | null;
  p75: number | null;
  dom_median: number | null;
  repriced_share: number | null;
  median_weeks_on_market: number | null;
};

/** v3 — same metrics as cohorts, keyed by bed_bucket × tier. */
export type DashSuburbCohortX = {
  suburb_id: number;
  suburb_slug: string;
  area_slug: string;
  iso_week: string;
  cohort: "added" | "removed";
  bed_bucket: string;
  tier: string;
  count: number;
  median_rent: number | null;
  p25: number | null;
  p75: number | null;
  dom_median: number | null;
  repriced_share: number | null;
  median_weeks_on_market: number | null;
};

/** Lightweight peer row for the rank-in-area expander table. */
export type DashSuburbRankPeer = {
  suburb_id: number;
  suburb: string;
  suburb_slug: string;
  rank_in_area: number | null;
  live_listings: number | null;
  total_listings: number | null;
  avg_rent: number | null;
  demand_ratio: number | null;
};

export type DashSuburbPriceStats = {
  suburb_id: number;
  suburb_slug: string;
  area_slug: string;
  iso_week: string;
  sample_n: number;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  mean_rent: number | null;
  dispersion_9010: number | null;
  iqr_7525: number | null;
  bills_incl_premium: number | null;
};

export type DashSuburbMovement = {
  suburb_id: number;
  suburb_slug: string;
  area_slug: string;
  iso_week: string;
  stock: number;
  new_count: number;
  gone_count: number;
  repriced_count: number;
  net_flow: number;
  reprice_up: number;
  reprice_down: number;
  /** v3 — stock − new_count − repriced_count (precomputed). */
  carried_count: number | null;
  new_median_rent: number | null;
  gone_median_rent: number | null;
  turnover: number | null;
  dom_median_days: number | null;
  weeks_on_market_median: number | null;
  closing_rent: number | null;
};

export type DashSuburbBandLiquidity = {
  suburb_id: number;
  suburb_slug: string;
  area_slug: string;
  iso_week: string;
  band_ord: number;
  band_label: string;
  standing: number;
  moved: number;
  pct_moved: number | null;
};

export type DashSuburbCoverage = {
  suburb_id: number;
  suburb_slug: string;
  area_slug: string;
  iso_week: string;
  g1_capable: boolean;
  g1_present: boolean;
  g2_present: boolean;
  sample_n: number | null;
  weeks_present_4: number | null;
  confidence: Confidence | null;
};

export type DashAreaWeekly = {
  area_slug: string;
  area: string;
  iso_week: string;
  suburb_count: number;
  median_avg_rent: number | null;
  median_p50: number | null;
  mean_demand_ratio: number | null;
  /** @deprecated v2 — always NULL; use total_implied_seekers. */
  total_seekers: number | null;
  /** @deprecated v2 — always NULL. */
  total_rooms: number | null;
  total_listings: number | null;
  wow_median_avg_rent: number | null;
  mom_median_avg_rent: number | null;
  qoq_median_avg_rent: number | null;
  median_avg_rent_vol_8w: number | null;
  delta_vs_prev_obs: number | null;
  prev_obs_week: string | null;
  prev_obs_gap_weeks: number | null;
  total_implied_seekers: number | null;
};

export type DashAreaPriceStats = {
  area_slug: string;
  iso_week: string;
  sample_n: number;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  mean_rent: number | null;
  dispersion_9010: number | null;
  iqr_7525: number | null;
};

export type DashAreaMovement = {
  area_slug: string;
  iso_week: string;
  stock: number;
  new_count: number;
  gone_count: number;
  repriced_count: number;
  net_flow: number;
  turnover: number | null;
  dom_median_days: number | null;
};

export type DashAreaCoverage = {
  area_slug: string;
  iso_week: string;
  capable_suburbs: number;
  g1_captured: number;
  g2_captured: number;
  coverage_pct: number | null;
};

export type DashCityWeekly = {
  iso_week: string;
  suburb_count: number;
  capable_ceiling: number;
  median_avg_rent: number | null;
  median_p50: number | null;
  mean_demand_ratio: number | null;
  /** @deprecated v2 — always NULL; use total_implied_seekers. */
  total_seekers: number | null;
  total_listings: number | null;
  capable_captured: number | null;
  coverage_pct: number | null;
  wow_median_avg_rent: number | null;
  delta_vs_prev_obs: number | null;
  prev_obs_week: string | null;
  prev_obs_gap_weeks: number | null;
  total_implied_seekers: number | null;
};

/** Roster identity — `suburbs` row, minus operational columns (never `room_count`). */
export type SuburbIdentity = {
  id: number;
  suburb: string;
  slug: string;
  postcode: string;
  area: string;
  state: string;
  g1_capable: boolean;
};
