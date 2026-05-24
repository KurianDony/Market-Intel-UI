import { createClient } from "@/lib/supabase/server";
import type {
  DashAreaLeaderboard,
  DashAreaListingHistogram,
  DashAreaListingMix,
  DashAreaListingMixBySuburb,
  DashAreaSummary,
  DashAreaSupplyPercentileWeekly,
  DashBandDefinition,
  DashSuburbListingHistogram,
  DashSuburbListingLongevity,
  DashSuburbSummary,
  DashSuburbSummaryTrendRow,
} from "@/lib/types/dash";
import { stateFromSlug } from "@/lib/dash/slugs";

export type AreaPageData = {
  summary: DashAreaSummary;
  leaderboard: DashAreaLeaderboard[];
  supplyPercentiles: DashAreaSupplyPercentileWeekly[];
  listingMix: DashAreaListingMix | null;
  listingMixBySuburb: DashAreaListingMixBySuburb[];
  histogram: DashAreaListingHistogram[];
  bandDefinitions: DashBandDefinition[];
};

export type SuburbPageData = {
  summary: DashSuburbSummary;
  trend: DashSuburbSummaryTrendRow[];
  histogram: DashSuburbListingHistogram[];
  bandDefinitions: DashBandDefinition[];
  longevityActive: DashSuburbListingLongevity[];
  longevityGone: DashSuburbListingLongevity[];
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

export async function fetchAreaPageData(
  stateSlug: string,
  areaSlug: string,
): Promise<AreaPageData | null> {
  const supabase = await createClient();
  const state = stateFromSlug(stateSlug);

  const { data: summary, error: summaryErr } = await supabase
    .from("dash_area_summary")
    .select("*")
    .eq("area_slug", areaSlug)
    .eq("state", state)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (summaryErr) throw summaryErr;
  if (!summary) return null;

  const latest = (summary as DashAreaSummary).snapshot_date;

  const [
    leaderboardRes,
    supplyRes,
    mixRes,
    mixSuburbRes,
    histRes,
    bands,
  ] = await Promise.all([
    supabase
      .from("dash_area_leaderboard")
      .select("*")
      .eq("area_slug", areaSlug)
      .eq("snapshot_date", latest)
      .order("rank_in_area", { ascending: true, nullsFirst: false }),
    supabase
      .from("dash_area_supply_percentile_weekly")
      .select("*")
      .eq("area_slug", areaSlug)
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("dash_area_listing_mix")
      .select("*")
      .eq("area_slug", areaSlug)
      .eq("snapshot_date", latest)
      .maybeSingle(),
    supabase
      .from("dash_area_listing_mix_by_suburb")
      .select("*")
      .eq("area_slug", areaSlug)
      .eq("snapshot_date", latest)
      .order("total_listings", { ascending: false, nullsFirst: false }),
    supabase
      .from("dash_area_listing_histogram")
      .select("*")
      .eq("area_slug", areaSlug)
      .eq("snapshot_date", latest)
      .order("band_ord", { ascending: true }),
    fetchBandDefinitions(supabase),
  ]);

  for (const res of [leaderboardRes, supplyRes, mixRes, mixSuburbRes, histRes]) {
    if (res.error) throw res.error;
  }

  return {
    summary: summary as DashAreaSummary,
    leaderboard: (leaderboardRes.data ?? []) as DashAreaLeaderboard[],
    supplyPercentiles: (supplyRes.data ?? []) as DashAreaSupplyPercentileWeekly[],
    listingMix: (mixRes.data as DashAreaListingMix | null) ?? null,
    listingMixBySuburb: (mixSuburbRes.data ?? []) as DashAreaListingMixBySuburb[],
    histogram: (histRes.data ?? []) as DashAreaListingHistogram[],
    bandDefinitions: bands,
  };
}

export async function fetchSuburbPageData(
  stateSlug: string,
  areaSlug: string,
  suburbSlug: string,
): Promise<SuburbPageData | null> {
  const supabase = await createClient();
  const state = stateFromSlug(stateSlug);

  const { data: summary, error: summaryErr } = await supabase
    .from("dash_suburb_summary")
    .select("*")
    .eq("suburb_slug", suburbSlug)
    .eq("area_slug", areaSlug)
    .eq("state", state)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (summaryErr) throw summaryErr;
  if (!summary) return null;

  const row = summary as DashSuburbSummary;
  const latest = row.snapshot_date;
  const slugPc = row.suburb_slug_pc;

  const twoWeeksAgo = new Date(latest + "T00:00:00");
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const goneSince = twoWeeksAgo.toISOString().slice(0, 10);

  const [trendRes, histRes, activeRes, goneRes, bands] = await Promise.all([
    supabase
      .from("dash_suburb_summary")
      .select(
        "snapshot_date, avg_listing, min_price, max_price, total_listings, active_rooms, demand_ratio",
      )
      .eq("suburb_slug", suburbSlug)
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("dash_suburb_listing_histogram")
      .select("*")
      .eq("suburb_slug", suburbSlug)
      .eq("snapshot_date", latest)
      .order("band_ord", { ascending: true }),
    supabase
      .from("dash_suburb_listing_longevity")
      .select("*")
      .eq("suburb_slug_pc", slugPc)
      .eq("status", "active")
      .order("weeks_seen", { ascending: false })
      .limit(5),
    supabase
      .from("dash_suburb_listing_longevity")
      .select("*")
      .eq("suburb_slug_pc", slugPc)
      .eq("status", "gone")
      .gte("last_seen", goneSince)
      .order("last_seen", { ascending: false })
      .limit(5),
    fetchBandDefinitions(supabase),
  ]);

  for (const res of [trendRes, histRes, activeRes, goneRes]) {
    if (res.error) throw res.error;
  }

  return {
    summary: row,
    trend: (trendRes.data ?? []) as DashSuburbSummaryTrendRow[],
    histogram: (histRes.data ?? []) as DashSuburbListingHistogram[],
    bandDefinitions: bands,
    longevityActive: (activeRes.data ?? []) as DashSuburbListingLongevity[],
    longevityGone: (goneRes.data ?? []) as DashSuburbListingLongevity[],
  };
}
