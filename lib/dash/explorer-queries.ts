import { createClient } from "@/lib/supabase/server";
import { slugifyName, stateFromSlug, suburbSlugShort } from "@/lib/dash/slugs";
import { buildWeekAxis, findGapWeeks, latestRow, rowAsOf } from "@/lib/dash/iso-week";
import type {
  DashAreaCoverage,
  DashAreaMovement,
  DashAreaPriceStats,
  DashAreaWeekly,
  DashCityWeekly,
  DashSuburbBandLiquidity,
  DashSuburbCohortX,
  DashSuburbCoverage,
  DashSuburbMovement,
  DashSuburbPriceStats,
  DashSuburbPriceStatsX,
  DashSuburbRankPeer,
  DashSuburbSupplyByType,
  DashSuburbSupplyX,
  DashSuburbWeekly,
  SuburbIdentity,
} from "@/lib/types/dash-phase3";
import type {
  DashAreaLeaderboard,
  DashAreaListingHistogram,
  DashAreaListingMix,
  DashAreaListingMixBySuburb,
  DashAreaSupplyPercentileWeekly,
  DashBandDefinition,
  DashSuburbListingHistogram,
} from "@/lib/types/dash";

const SUBURB_IDENTITY_COLS = "id, suburb, slug, postcode, area, state, g1_capable";

/**
 * G2 (listing-level) capture lags the G1 spine: at w/c 2026-07-27 only 4 of 226
 * suburbs carry listing data. Blocks fed by G2 therefore resolve to their own
 * most recent row at or before the selected week and are dated independently.
 */
export type AsOf = {
  week: string;
  weeksBehind: number;
  stale: boolean;
};

export type SuburbExplorerData = {
  kind: "market-data";
  identity: SuburbIdentity;
  areaName: string;
  /** Continuous Monday axis across the observed range, gap weeks included. */
  axis: string[];
  gapWeeks: string[];
  /** Weeks that actually carry a spine row, ascending. */
  dataWeeks: string[];
  selectedWeek: string;
  weekly: DashSuburbWeekly[];
  priceStats: DashSuburbPriceStats[];
  /** v3 bed × tier — prefer for combined filters. */
  priceStatsX: DashSuburbPriceStatsX[];
  /** listing_category rows only (B8); bed/tier supply lives on supplyX. */
  supplyByType: DashSuburbSupplyByType[];
  supplyX: DashSuburbSupplyX[];
  cohortsX: DashSuburbCohortX[];
  movement: DashSuburbMovement[];
  coverage: DashSuburbCoverage[];
  bandLiquidity: DashSuburbBandLiquidity[];
  histogram: DashSuburbListingHistogram[];
  bandDefinitions: DashBandDefinition[];
  areaWeekly: DashAreaWeekly[];
  cityWeekly: DashCityWeekly[];
  /** Area peers for the selected week — rank-in-area expander. */
  areaPeers: DashSuburbRankPeer[];
  listingMix: DashAreaListingMixBySuburb | null;
};

export type SuburbNoMarketData = {
  kind: "no-market-data";
  identity: SuburbIdentity;
};

export type SuburbPageResult = SuburbExplorerData | SuburbNoMarketData;

export type AreaAnalyticsData = {
  areaSlug: string;
  areaName: string;
  state: string;
  axis: string[];
  gapWeeks: string[];
  dataWeeks: string[];
  selectedWeek: string;
  weekly: DashAreaWeekly[];
  priceStats: DashAreaPriceStats[];
  movement: DashAreaMovement[];
  coverage: DashAreaCoverage[];
  cityWeekly: DashCityWeekly[];
  leaderboard: DashAreaLeaderboard[];
  /** Latest spine row per suburb in the area — supplies leaderboard WoW. */
  suburbWeekly: DashSuburbWeekly[];
  listingMix: DashAreaListingMix | null;
  histogram: DashAreaListingHistogram[];
  supplyPercentiles: DashAreaSupplyPercentileWeekly[];
  bandDefinitions: DashBandDefinition[];
};

let bandDefinitionsCache: DashBandDefinition[] | null = null;

async function fetchBandDefinitions(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<DashBandDefinition[]> {
  if (bandDefinitionsCache) return bandDefinitionsCache;
  const { data, error } = await supabase
    .from("dash_band_definitions")
    .select("*")
    .order("band_ord", { ascending: true });
  if (error) throw error;
  bandDefinitionsCache = (data ?? []) as DashBandDefinition[];
  return bandDefinitionsCache;
}

function pickWeek(dataWeeks: string[], requested?: string): string {
  const latest = dataWeeks[dataWeeks.length - 1];
  if (!requested) return latest;
  return dataWeeks.includes(requested) ? requested : latest;
}

export function asOf(rowWeek: string, selectedWeek: string, axis: string[]): AsOf {
  const from = axis.indexOf(rowWeek);
  const to = axis.indexOf(selectedWeek);
  const weeksBehind = from >= 0 && to >= 0 ? to - from : 0;
  return { week: rowWeek, weeksBehind, stale: weeksBehind > 0 };
}

/** Resolves the roster row behind a `/[state]/[area]/[suburb]` URL. */
async function resolveSuburbIdentity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stateSlug: string,
  areaSlug: string,
  suburbSlug: string,
): Promise<SuburbIdentity | null> {
  const { data, error } = await supabase
    .from("suburbs")
    .select(SUBURB_IDENTITY_COLS)
    .eq("state", stateFromSlug(stateSlug))
    .like("slug", `${suburbSlug}-%`);
  if (error) throw error;

  const rows = (data ?? []) as SuburbIdentity[];
  const exact = rows.filter((r) => suburbSlugShort(r.slug) === suburbSlug);
  return exact.find((r) => slugifyName(r.area) === areaSlug) ?? exact[0] ?? null;
}

export async function fetchSuburbExplorerData(
  stateSlug: string,
  areaSlug: string,
  suburbSlug: string,
  requestedWeek?: string,
): Promise<SuburbPageResult | null> {
  const supabase = await createClient();
  const identity = await resolveSuburbIdentity(supabase, stateSlug, areaSlug, suburbSlug);
  if (!identity) return null;

  const [
    weeklyRes,
    priceRes,
    priceXRes,
    supplyByTypeRes,
    supplyXRes,
    cohortXRes,
    moveRes,
    covRes,
    bandRes,
    histRes,
    areaRes,
    cityRes,
    mixRes,
    bands,
  ] = await Promise.all([
    supabase
      .from("dash_suburb_weekly")
      .select("*")
      .eq("suburb_id", identity.id)
      .order("iso_week", { ascending: true }),
    supabase
      .from("dash_suburb_price_stats")
      .select("*")
      .eq("suburb_id", identity.id)
      .order("iso_week", { ascending: true }),
    supabase
      .from("dash_suburb_price_stats_x")
      .select("*")
      .eq("suburb_id", identity.id)
      .order("iso_week", { ascending: true }),
    supabase
      .from("dash_suburb_supply_by_type")
      .select("*")
      .eq("suburb_id", identity.id)
      .eq("type_dim", "listing_category")
      .order("iso_week", { ascending: true }),
    supabase
      .from("dash_suburb_supply_x")
      .select("*")
      .eq("suburb_id", identity.id)
      .order("iso_week", { ascending: true }),
    supabase
      .from("dash_suburb_cohorts_x")
      .select("*")
      .eq("suburb_id", identity.id)
      .order("iso_week", { ascending: true }),
    supabase
      .from("dash_suburb_movement")
      .select("*")
      .eq("suburb_id", identity.id)
      .order("iso_week", { ascending: true }),
    supabase
      .from("dash_suburb_coverage")
      .select("*")
      .eq("suburb_id", identity.id)
      .order("iso_week", { ascending: true }),
    supabase
      .from("dash_suburb_band_liquidity")
      .select("*")
      .eq("suburb_id", identity.id)
      .order("iso_week", { ascending: true })
      .order("band_ord", { ascending: true }),
    supabase
      .from("dash_suburb_listing_histogram")
      .select("*")
      .eq("suburb_id", identity.id)
      .order("snapshot_date", { ascending: false })
      .order("band_ord", { ascending: true })
      .limit(14),
    supabase
      .from("dash_area_weekly")
      .select("*")
      .eq("area_slug", areaSlug)
      .order("iso_week", { ascending: true }),
    supabase.from("dash_city_weekly").select("*").order("iso_week", { ascending: true }),
    supabase
      .from("dash_area_listing_mix_by_suburb")
      .select("*")
      .eq("suburb_id", identity.id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchBandDefinitions(supabase),
  ]);

  for (const res of [
    weeklyRes,
    priceRes,
    priceXRes,
    supplyByTypeRes,
    supplyXRes,
    cohortXRes,
    moveRes,
    covRes,
    bandRes,
    histRes,
    areaRes,
    cityRes,
  ]) {
    if (res.error) throw res.error;
  }
  if (mixRes.error) throw mixRes.error;

  const weekly = (weeklyRes.data ?? []) as DashSuburbWeekly[];
  const priceStats = (priceRes.data ?? []) as DashSuburbPriceStats[];
  const movement = (moveRes.data ?? []) as DashSuburbMovement[];
  const coverage = (covRes.data ?? []) as DashSuburbCoverage[];

  // The G1 spine and the G2 listing tables are populated independently: a
  // suburb outside the capable set can still carry listing weeks. Only a
  // suburb absent from all four is genuinely without market data.
  const dataWeeks = [
    ...new Set([
      ...weekly.map((r) => r.iso_week),
      ...priceStats.map((r) => r.iso_week),
      ...movement.map((r) => r.iso_week),
      ...coverage.map((r) => r.iso_week),
    ]),
  ].sort();
  if (dataWeeks.length === 0) {
    return { kind: "no-market-data", identity };
  }

  const axis = buildWeekAxis(dataWeeks);
  const selectedWeek = pickWeek(dataWeeks, requestedWeek);
  const areaWeekly = (areaRes.data ?? []) as DashAreaWeekly[];

  const { data: peerData, error: peerErr } = await supabase
    .from("dash_suburb_weekly")
    .select(
      "suburb_id, suburb, suburb_slug, rank_in_area, live_listings, total_listings, avg_rent, demand_ratio",
    )
    .eq("area_slug", areaSlug)
    .eq("iso_week", selectedWeek)
    .order("rank_in_area", { ascending: true });
  if (peerErr) throw peerErr;

  return {
    kind: "market-data",
    identity,
    areaName: areaWeekly[0]?.area ?? identity.area,
    axis,
    gapWeeks: findGapWeeks(dataWeeks),
    dataWeeks,
    selectedWeek,
    weekly,
    priceStats,
    priceStatsX: (priceXRes.data ?? []) as DashSuburbPriceStatsX[],
    supplyByType: (supplyByTypeRes.data ?? []) as DashSuburbSupplyByType[],
    supplyX: (supplyXRes.data ?? []) as DashSuburbSupplyX[],
    cohortsX: (cohortXRes.data ?? []) as DashSuburbCohortX[],
    movement,
    coverage,
    bandLiquidity: (bandRes.data ?? []) as DashSuburbBandLiquidity[],
    histogram: (histRes.data ?? []) as DashSuburbListingHistogram[],
    bandDefinitions: bands,
    areaWeekly,
    cityWeekly: (cityRes.data ?? []) as DashCityWeekly[],
    areaPeers: (peerData ?? []) as DashSuburbRankPeer[],
    listingMix: (mixRes.data as DashAreaListingMixBySuburb | null) ?? null,
  };
}

export async function fetchAreaAnalyticsData(
  stateSlug: string,
  areaSlug: string,
  requestedWeek?: string,
): Promise<AreaAnalyticsData | null> {
  const supabase = await createClient();

  const { data: weeklyData, error: weeklyErr } = await supabase
    .from("dash_area_weekly")
    .select("*")
    .eq("area_slug", areaSlug)
    .order("iso_week", { ascending: true });
  if (weeklyErr) throw weeklyErr;

  const weekly = (weeklyData ?? []) as DashAreaWeekly[];
  if (weekly.length === 0) return null;

  const dataWeeks = weekly.map((r) => r.iso_week);
  const axis = buildWeekAxis(dataWeeks);
  const selectedWeek = pickWeek(dataWeeks, requestedWeek);

  const [priceRes, moveRes, covRes, cityRes, boardRes, subRes, mixRes, histRes, supplyRes, bands] =
    await Promise.all([
      supabase
        .from("dash_area_price_stats")
        .select("*")
        .eq("area_slug", areaSlug)
        .order("iso_week", { ascending: true }),
      supabase
        .from("dash_area_movement")
        .select("*")
        .eq("area_slug", areaSlug)
        .order("iso_week", { ascending: true }),
      supabase
        .from("dash_area_coverage")
        .select("*")
        .eq("area_slug", areaSlug)
        .order("iso_week", { ascending: true }),
      supabase.from("dash_city_weekly").select("*").order("iso_week", { ascending: true }),
      supabase
        .from("dash_area_leaderboard")
        .select("*")
        .eq("area_slug", areaSlug)
        .order("snapshot_date", { ascending: false })
        .limit(300),
      supabase
        .from("dash_suburb_weekly")
        .select("*")
        .eq("area_slug", areaSlug)
        .eq("iso_week", selectedWeek),
      supabase
        .from("dash_area_listing_mix")
        .select("*")
        .eq("area_slug", areaSlug)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("dash_area_listing_histogram")
        .select("*")
        .eq("area_slug", areaSlug)
        .order("snapshot_date", { ascending: false })
        .order("band_ord", { ascending: true })
        .limit(14),
      supabase
        .from("dash_area_supply_percentile_weekly")
        .select("*")
        .eq("area_slug", areaSlug)
        .order("snapshot_date", { ascending: true }),
      fetchBandDefinitions(supabase),
    ]);

  for (const res of [priceRes, moveRes, covRes, cityRes, boardRes, subRes, histRes, supplyRes]) {
    if (res.error) throw res.error;
  }
  if (mixRes.error) throw mixRes.error;

  const allBoardRows = (boardRes.data ?? []) as DashAreaLeaderboard[];
  const boardDate = allBoardRows[0]?.snapshot_date;

  return {
    areaSlug,
    areaName: weekly[weekly.length - 1].area,
    state: stateFromSlug(stateSlug),
    axis,
    gapWeeks: findGapWeeks(dataWeeks),
    dataWeeks,
    selectedWeek,
    weekly,
    priceStats: (priceRes.data ?? []) as DashAreaPriceStats[],
    movement: (moveRes.data ?? []) as DashAreaMovement[],
    coverage: (covRes.data ?? []) as DashAreaCoverage[],
    cityWeekly: (cityRes.data ?? []) as DashCityWeekly[],
    leaderboard: allBoardRows.filter((r) => r.snapshot_date === boardDate),
    suburbWeekly: (subRes.data ?? []) as DashSuburbWeekly[],
    listingMix: (mixRes.data as DashAreaListingMix | null) ?? null,
    histogram: (histRes.data ?? []) as DashAreaListingHistogram[],
    supplyPercentiles: (supplyRes.data ?? []) as DashAreaSupplyPercentileWeekly[],
    bandDefinitions: bands,
  };
}

export { latestRow, rowAsOf };
