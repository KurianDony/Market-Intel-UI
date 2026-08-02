"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ExpandableStatStrip } from "@/components/dashboard/ExpandableStatStrip";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { ConfidenceBadge } from "@/components/dashboard/ConfidenceBadge";
import { MetricCard, MetricGrid, MiniTable } from "@/components/dashboard/MetricCard";
import { WeekNav, WeekNavFootnote } from "@/components/dashboard/WeekNav";
import { TypeFilterBar } from "@/components/dashboard/TypeFilterBar";
import { DeltaChip } from "@/components/dashboard/DeltaChip";
import { WeeklyLineChart } from "@/components/dashboard/charts/WeeklyLineChart";
import { BandLiquidityChart } from "@/components/dashboard/charts/BandLiquidityChart";
import { PercentileBandChart } from "@/components/dashboard/charts/PercentileBandChart";
import { CompositionChart } from "@/components/dashboard/charts/CompositionChart";
import { NetSupplyChart } from "@/components/dashboard/charts/NetSupplyChart";
import { DemandRatioBandChart } from "@/components/dashboard/charts/DemandRatioBandChart";
import { CohortTrendChart } from "@/components/dashboard/charts/CohortTrendChart";
import type { SuburbExplorerData } from "@/lib/dash/explorer-queries";
import {
  alignToAxis,
  formatWeekLong,
  indexByWeek,
  rowAsOf,
} from "@/lib/dash/iso-week";
import { resolveDelta, seriesDelta } from "@/lib/dash/deltas";
import {
  bestClearingBand,
  fillBandLadder,
  formatSignedNumber,
  formatSignedPct,
  ratioBand,
  vsBaselinePct,
} from "@/lib/dash/metrics";
import { formatCount, formatCurrency, formatRatio } from "@/lib/dash/format";
import {
  DEFAULT_TYPE_FILTER,
  LISTING_CATEGORY_LABELS,
  isCategoryFilterActive,
  isFilterActive,
  resolveXFilter,
  typeFilterLabel,
  type CategoryFilter,
  type TypeFilter,
} from "@/lib/dash/type-filter";
import { INK_20, INK_40, INK_60 } from "@/lib/palette/v2";
import type { DashSuburbCohortX, DashSuburbMovementX } from "@/lib/types/dash-phase3";

const CATEGORY_SCOPE_TAG =
  "category filter applies to supply - listing-level analytics cover rooms data";

export function SuburbExplorerClient({
  data,
  stateSlug,
  areaSlug,
}: {
  data: SuburbExplorerData;
  stateSlug: string;
  areaSlug: string;
}) {
  const [filter, setFilter] = useState<TypeFilter>(DEFAULT_TYPE_FILTER);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const xKey = resolveXFilter(filter);
  const filtered = isFilterActive(filter);
  const categoryActive = isCategoryFilterActive(category);

  const {
    identity,
    areaName,
    axis,
    gapWeeks,
    dataWeeks,
    selectedWeek,
    weekly,
    priceStats,
    priceStatsX,
    supplyByType,
    supplyX,
    cohortsX,
    movementX,
    coverage,
    bandLiquidity,
    bandDefinitions,
    areaWeekly,
    cityWeekly,
    areaPeers,
    movementBasisWeek,
  } = data;

  const basePath = `/${stateSlug}/${areaSlug}/${identity.slug.replace(/-\d+$/, "")}`;
  const spine = indexByWeek(weekly).get(selectedWeek) ?? null;
  const cov = indexByWeek(coverage).get(selectedWeek) ?? null;

  const priceTyped = useMemo(
    () =>
      priceStatsX.filter(
        (r) =>
          r.bed_min === xKey.bed_min &&
          r.bed_max === xKey.bed_max &&
          r.tier === xKey.tier,
      ),
    [priceStatsX, xKey],
  );
  const supplyTyped = useMemo(
    () =>
      supplyX.filter(
        (r) =>
          r.bed_min === xKey.bed_min &&
          r.bed_max === xKey.bed_max &&
          r.tier === xKey.tier,
      ),
    [supplyX, xKey],
  );
  const cohortsTyped = useMemo(
    () =>
      cohortsX.filter(
        (r) =>
          r.bed_min === xKey.bed_min &&
          r.bed_max === xKey.bed_max &&
          r.tier === xKey.tier,
      ),
    [cohortsX, xKey],
  );
  const moveTyped = useMemo(
    () =>
      movementX.filter(
        (r) =>
          r.bed_min === xKey.bed_min &&
          r.bed_max === xKey.bed_max &&
          r.tier === xKey.tier,
      ),
    [movementX, xKey],
  );

  // Unfiltered: G1-canonical price_stats. Under filter: matching _x segment.
  type PriceRow = {
    iso_week: string;
    sample_n: number;
    p10: number | null;
    p25: number | null;
    p50: number | null;
    p75: number | null;
    p90: number | null;
    mean_rent: number | null;
  };
  const priceSource: PriceRow[] = !filtered
    ? priceStats
    : priceTyped.length > 0
      ? priceTyped
      : [];

  const price = rowAsOf(priceSource, selectedWeek);
  const move = rowAsOf(moveTyped, selectedWeek);
  const supplyRow = rowAsOf(supplyTyped, selectedWeek);

  const g2Week =
    [price?.iso_week, move?.iso_week, supplyRow?.iso_week].filter(Boolean).sort().pop() ?? null;
  const g2Behind = g2Week ? axis.indexOf(selectedWeek) - axis.indexOf(g2Week) : null;
  const g2Label = g2Week
    ? `G2 listing data as at w/c ${formatWeekLong(g2Week)}${g2Behind && g2Behind > 0 ? ` · ${g2Behind} wk behind the demand spine` : ""}`
    : "No listing-level (G2) data recorded for this suburb";

  const bands = fillBandLadder(
    g2Week ? bandLiquidity.filter((b) => b.iso_week === g2Week) : [],
    bandDefinitions,
  );

  const areaRow = areaWeekly.find((r) => r.iso_week === selectedWeek) ?? null;
  const cityRow = cityWeekly.find((r) => r.iso_week === selectedWeek) ?? null;
  const areaSeekerAvg =
    areaRow?.total_implied_seekers != null && areaRow.suburb_count > 0
      ? areaRow.total_implied_seekers / areaRow.suburb_count
      : null;
  const citySeekerAvg =
    cityRow?.total_implied_seekers != null && cityRow.suburb_count > 0
      ? cityRow.total_implied_seekers / cityRow.suburb_count
      : null;
  const areaListingAvg =
    areaRow?.total_listings != null && areaRow.suburb_count > 0
      ? areaRow.total_listings / areaRow.suburb_count
      : null;

  const weeklyAligned = alignToAxis(weekly, axis);
  const priceAligned = alignToAxis(priceSource, axis);
  const moveAligned = alignToAxis(moveTyped, axis);
  const supplyAligned = alignToAxis(supplyTyped, axis);

  const series = (pick: (r: (typeof weekly)[number]) => number | null) =>
    weeklyAligned.map(({ week, row }) => ({ week, value: row ? pick(row) : null }));
  const priceSeries = (pick: (r: (typeof priceSource)[number]) => number | null) =>
    priceAligned.map(({ week, row }) => ({ week, value: row ? pick(row) : null }));
  const moveSeries = (pick: (r: DashSuburbMovementX) => number | null) =>
    moveAligned.map(({ week, row }) => ({ week, value: row ? pick(row) : null }));

  const p50Series = priceSeries((r) => r.p50);
  const supplySeries =
    supplyTyped.length > 0
      ? supplyAligned.map(({ week, row }) => ({ week, value: row?.live_count ?? null }))
      : series((r) => r.live_listings ?? r.total_listings);

  const segmentLive = supplyRow?.live_count ?? null;
  const bannerSeekers =
    filtered
      ? spine?.demand_ratio == null || segmentLive == null
        ? null
        : Math.round(Number(spine.demand_ratio) * segmentLive)
      : spine?.implied_seekers ?? null;

  const impliedSeries = filtered
    ? supplyAligned.map(({ week, row }) => {
        const w = indexByWeek(weekly).get(week);
        if (w?.demand_ratio == null || row?.live_count == null) {
          return { week, value: null };
        }
        return {
          week,
          value: Math.round(Number(w.demand_ratio) * row.live_count),
        };
      })
    : series((r) => r.implied_seekers);

  const demandSeries = series((r) => (r.demand_ratio == null ? null : Number(r.demand_ratio)));

  const supplyValue = filtered
    ? segmentLive
    : (supplyRow?.live_count ?? spine?.live_listings ?? spine?.total_listings ?? null);
  const supplyBasis = filtered
    ? typeFilterLabel(filter)
    : spine?.live_listings != null
      ? "live"
      : "carry-forward";

  const topBand = bestClearingBand(bands);

  const rentDelta1w = seriesDelta(p50Series, price?.iso_week ?? selectedWeek, 1);
  const rentDelta4w = seriesDelta(p50Series, price?.iso_week ?? selectedWeek, 4);
  const bandDelta1w = seriesDelta(
    priceSeries((r) => (r.p10 != null && r.p90 != null ? r.p90 - r.p10 : null)),
    price?.iso_week ?? selectedWeek,
    1,
  );
  const bandDelta4w = seriesDelta(
    priceSeries((r) => (r.p10 != null && r.p90 != null ? r.p90 - r.p10 : null)),
    price?.iso_week ?? selectedWeek,
    4,
  );

  const supplyDelta = resolveDelta({
    wow: filtered ? null : spine?.wow_total_listings,
    deltaVsPrevObs:
      supplySeries.length > 1
        ? (() => {
            const pts = supplySeries.filter((p) => p.value != null && p.week <= selectedWeek);
            if (pts.length < 2) return null;
            const cur = pts[pts.length - 1];
            const prev = pts[pts.length - 2];
            if (cur.week !== selectedWeek && !filtered) return null;
            return (cur.value ?? 0) - (prev.value ?? 0);
          })()
        : null,
    prevObsGapWeeks: spine?.prev_obs_gap_weeks,
    prevObsWeek: spine?.prev_obs_week,
  });

  const seekerDelta = resolveDelta({
    wow: null,
    deltaVsPrevObs: (() => {
      const pts = impliedSeries.filter((p) => p.value != null && p.week <= selectedWeek);
      if (pts.length < 2) return null;
      const cur = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      return (cur.value ?? 0) - (prev.value ?? 0);
    })(),
    prevObsGapWeeks: filtered
      ? spine?.prev_obs_gap_weeks
      : spine?.implied_seekers_stale_weeks
        ? spine.implied_seekers_stale_weeks + 1
        : spine?.prev_obs_gap_weeks,
    prevObsWeek: filtered
      ? spine?.prev_obs_week
      : (spine?.implied_seekers_basis_week ?? spine?.prev_obs_week),
  });

  const demandDelta = resolveDelta({
    wow: spine?.wow_demand_ratio == null ? null : Number(spine.wow_demand_ratio),
    deltaVsPrevObs: null,
    prevObsGapWeeks: spine?.prev_obs_gap_weeks,
    prevObsWeek: spine?.prev_obs_week,
  });

  const rankDelta = resolveDelta({
    wow: null,
    deltaVsPrevObs: (() => {
      const pts = series((r) => r.movement_rank).filter(
        (p) => p.value != null && p.week <= selectedWeek,
      );
      if (pts.length < 2) return null;
      const cur = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      return (cur.value ?? 0) - (prev.value ?? 0);
    })(),
    prevObsGapWeeks: spine?.prev_obs_gap_weeks,
    prevObsWeek: spine?.prev_obs_week,
  });

  const rentStripDelta = filtered
    ? rentDelta1w
    : resolveDelta({
        wow: spine?.wow_avg_rent == null ? null : Number(spine.wow_avg_rent),
        deltaVsPrevObs: spine?.delta_vs_prev_obs == null ? null : Number(spine.delta_vs_prev_obs),
        prevObsGapWeeks: spine?.prev_obs_gap_weeks,
        prevObsWeek: spine?.prev_obs_week,
        currency: true,
      });

  const categorySupply = supplyByType
    .filter((r) => r.iso_week === (supplyRow?.iso_week ?? g2Week))
    .filter((r) => (categoryActive ? r.type_key === category : true));

  const movementRankRow =
    movementBasisWeek != null
      ? (indexByWeek(weekly).get(movementBasisWeek) ?? null)
      : spine;
  const movementRank = movementRankRow?.movement_rank ?? null;
  const movementRankBehind =
    movementBasisWeek != null && axis.includes(movementBasisWeek)
      ? axis.indexOf(selectedWeek) - axis.indexOf(movementBasisWeek)
      : 0;
  const movementRankSub =
    movementRank == null
      ? "no movement data"
      : [
          filtered ? "suburb-wide" : null,
          movementRankBehind > 0
            ? `stale ${movementRankBehind}w · basis ${formatWeekLong(movementBasisWeek!)}`
            : areaRow
              ? `of ${areaRow.suburb_count}`
              : null,
          "1 = most disappeared",
        ]
          .filter(Boolean)
          .join(" · ");

  const addedLatest = latestCohort(cohortsTyped, "added", selectedWeek);
  const removedLatest = latestCohort(cohortsTyped, "removed", selectedWeek);

  const addedTrend = cohortTrend(cohortsTyped, "added", axis);
  const removedTrend = cohortTrend(cohortsTyped, "removed", axis);

  const compositionPoints = moveAligned.map(({ week, row }) => {
    if (!row) return { week, carried: null, repriced: null, newCount: null, gone: null };
    const carried =
      row.carried_count != null
        ? row.carried_count
        : Math.max(0, row.stock - row.new_count - row.repriced_count);
    return {
      week,
      carried,
      repriced: row.repriced_count,
      repriceUp: row.reprice_up,
      repriceDown: row.reprice_down,
      newCount: row.new_count,
      gone: row.gone_count,
    };
  });

  const netPoints = moveAligned.map(({ week, row }) => ({
    week,
    net: row ? row.new_count - row.gone_count : null,
  }));

  const percentileWeeks = priceAligned.map(({ week, row }) => ({
    week,
    p10: row?.p10 ?? null,
    p25: row?.p25 ?? null,
    p50: row?.p50 ?? null,
    p75: row?.p75 ?? null,
    p90: row?.p90 ?? null,
  }));

  const volNote =
    spine?.avg_rent_vol_8w == null
      ? null
      : `Typical weekly move ±${formatCurrency(Number(spine.avg_rent_vol_8w))} (8-week volatility)`;

  const bannerRent = filtered
    ? price?.p50 ?? null
    : (price?.p50 ?? (spine?.avg_rent == null ? null : Number(spine.avg_rent)));

  const ratioChangeLabel =
    spine?.alltime_ratio_delta == null
      ? null
      : `${formatRatio(spine.alltime_first_ratio)} → ${formatRatio(spine.alltime_latest_ratio)}`;

  const demandDelta4w = seriesDelta(demandSeries, selectedWeek, 4);

  const repriceWeeks = recentMoveRows(moveTyped, selectedWeek, 3);
  const domValue =
    move?.dom_median == null
      ? "-"
      : move.dom_p25 != null && move.dom_p75 != null
        ? `${move.dom_median}d · p25-p75 ${move.dom_p25}-${move.dom_p75}`
        : `${move.dom_median}d`;

  return (
    <DashboardShell snapshotDate={formatWeekLong(selectedWeek)}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight">
          {identity.suburb.toUpperCase()}
        </h1>
        <ConfidenceBadge
          confidence={cov?.confidence ?? null}
          sampleN={cov?.sample_n}
          weeksPresent={cov?.weeks_present_4}
        />
      </div>
      <p className="mb-5 text-xs uppercase tracking-[0.15em]" style={{ color: INK_60 }}>
        {identity.postcode} · {areaName} · {identity.state}
      </p>

      <WeekNav
        basePath={basePath}
        axis={axis}
        dataWeeks={dataWeeks}
        selectedWeek={selectedWeek}
      />
      <WeekNavFootnote gapWeeks={gapWeeks} />

      <TypeFilterBar
        value={filter}
        onChange={setFilter}
        category={category}
        onCategoryChange={setCategory}
        showCategory
        note="Bed range × tier combine freely · type selector scopes supply counts only"
      />

      <ExpandableStatStrip
        items={[
          {
            label: "Typical rent",
            value: formatCurrency(bannerRent),
            sub: [
              filtered
                ? `listings-basis · ${typeFilterLabel(filter)}${price ? ` · n=${price.sample_n}` : ""}`
                : price
                  ? `G2 p50 · n=${price.sample_n}`
                  : "G1 avg",
              categoryActive ? CATEGORY_SCOPE_TAG : null,
            ]
              .filter(Boolean)
              .join(" · "),
            delta: rentStripDelta,
            series: p50Series.some((p) => p.value != null)
              ? p50Series
              : series((r) => (r.avg_rent == null ? null : Number(r.avg_rent))),
          },
          {
            label: "Supply",
            value: formatCount(supplyValue),
            sub: [
              `${supplyBasis} listings`,
              categoryActive ? CATEGORY_SCOPE_TAG : null,
            ]
              .filter(Boolean)
              .join(" · "),
            delta: supplyDelta,
            series: supplySeries,
          },
          {
            label: "Implied seekers",
            value: formatCount(bannerSeekers),
            sub: [
              filtered
                ? "estimate · demand_ratio × segment live"
                : spine?.implied_seekers_stale_weeks && spine.implied_seekers_stale_weeks > 0
                  ? `stale ${spine.implied_seekers_stale_weeks}w · basis ${spine.implied_seekers_basis_week ? formatWeekLong(spine.implied_seekers_basis_week) : "-"}`
                  : "demand_ratio × live listings",
              categoryActive ? CATEGORY_SCOPE_TAG : null,
            ]
              .filter(Boolean)
              .join(" · "),
            delta: seekerDelta,
            series: impliedSeries,
          },
          {
            label: "Demand ratio",
            value: formatRatio(spine?.demand_ratio),
            sub: [
              filtered ? "suburb-wide · seekers per room" : "seekers per room",
              categoryActive ? CATEGORY_SCOPE_TAG : null,
            ]
              .filter(Boolean)
              .join(" · "),
            delta: demandDelta,
            series: demandSeries,
          },
          {
            label: "Movement rank",
            value: movementRank != null ? `#${movementRank}` : "-",
            sub: movementRankSub,
            tooltip:
              "Ranked by listings disappeared within the area that week - 1 = most movement",
            delta: movementRank != null ? rankDelta : null,
            series: series((r) => r.movement_rank),
            expanderExtra: (
              <div>
                <p
                  className="mb-2 text-[10px] uppercase tracking-[0.1em]"
                  style={{ color: INK_60 }}
                >
                  Movement rank · {areaName}
                  {movementBasisWeek
                    ? ` · w/c ${formatWeekLong(movementBasisWeek)}`
                    : ""}
                </p>
                <MiniTable
                  cols={["rank", "suburb", "gone", "new", "stock"]}
                  rows={areaPeers
                    .slice()
                    .sort((a, b) => {
                      const ar = a.movement_rank;
                      const br = b.movement_rank;
                      if (ar == null && br == null) return a.suburb.localeCompare(b.suburb);
                      if (ar == null) return 1;
                      if (br == null) return -1;
                      if (ar !== br) return ar - br;
                      return a.suburb.localeCompare(b.suburb);
                    })
                    .map((p) => [
                      p.movement_rank,
                      p.suburb,
                      p.gone_count ?? null,
                      p.new_count ?? null,
                      p.stock ?? p.live_listings ?? p.total_listings,
                    ])}
                />
              </div>
            ),
          },
        ]}
      />

      <div className="mb-8 space-y-2">
        <p
          className="border px-3 py-2 text-[11px] uppercase tracking-[0.1em]"
          style={{ borderColor: INK_20, color: INK_60 }}
          data-g2-banner=""
        >
          {g2Label}
        </p>
        {!identity.g1_capable && (
          <p
            className="border px-3 py-2 text-[11px] uppercase tracking-[0.1em]"
            style={{ borderColor: INK_40, color: INK_60 }}
          >
            Outside the G1-capable set - no seeker, demand-ratio, average-rent or rank series
            is collected here. Every G1 field below reads &quot;-&quot;; the listing-level figures are real.
          </p>
        )}
        {identity.g1_capable && spine == null && (
          <p
            className="border px-3 py-2 text-[11px] uppercase tracking-[0.1em]"
            style={{ borderColor: INK_40, color: INK_60 }}
          >
            No G1 spine row for w/c {formatWeekLong(selectedWeek)} - demand fields read &quot;-&quot; for
            this week.
          </p>
        )}
      </div>

      {/* ── A · MOVEMENT ──────────────────────────────────────────── */}
      <SectionHeading
        letter="A"
        title="Movement - liquidity"
        subtitle={categoryActive ? CATEGORY_SCOPE_TAG : undefined}
      />

      <DashboardCard
        title="Weekly composition"
        subtitle="carried old stock · repriced · new supply above · disappeared below · click a bar for detail"
        tall
        autoHeight
      >
        <CompositionChart
          points={compositionPoints}
          gapWeeks={gapWeeks}
          selectedWeek={move?.iso_week ?? selectedWeek}
        />
      </DashboardCard>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <CohortPanel
          title="What moved (removed)"
          cohort={removedLatest}
          trend={removedTrend}
          gapWeeks={gapWeeks}
          emptyHint="Removed cohort is empty in the live week by design - pick an earlier week."
        />
        <CohortPanel
          title="What was added"
          cohort={addedLatest}
          trend={addedTrend}
          gapWeeks={gapWeeks}
          emptyHint="No added cohort for this filter / week."
        />
      </div>

      <MetricGrid>
        <MetricCard
          code="D24"
          label="Days on market (median)"
          value={domValue}
          source="dash_suburb_movement_x.dom_median, .dom_p25, .dom_p75"
          explain="Median days a live room has been on the market, with the interquartile band."
          series={moveSeries((r) => r.dom_median)}
          seriesFormat="days"
        />
        <MetricCard
          code="D21"
          label="Reprice behaviour"
          value={move ? `${move.reprice_up}↑ / ${move.reprice_down}↓` : "-"}
          source="dash_suburb_movement_x.reprice_up, .reprice_down, .repriced_count"
          explain="Of listings that changed price, how many rose vs fell. Mostly down = softening."
          table={
            repriceWeeks.length > 0
              ? {
                  cols: ["week", "repriced", "up", "down"],
                  rows: repriceWeeks.map((r) => [
                    formatWeekLong(r.iso_week),
                    r.repriced_count,
                    r.reprice_up,
                    r.reprice_down,
                  ]),
                }
              : undefined
          }
        />
        <MetricCard
          code="D17"
          label="Turnover - share cleared"
          value={move?.turnover == null ? "-" : Number(move.turnover).toFixed(2)}
          source="dash_suburb_movement_x.turnover (gone ÷ stock)"
          explain="Fraction of stock that cleared this week. 0.20 ≈ a fifth turned over."
          series={moveSeries((r) => (r.turnover == null ? null : Number(r.turnover)))}
        />
      </MetricGrid>

      <div className="mt-3">
        <DashboardCard
          title="Liquidity by price band"
          subtitle={
            topBand
              ? `clears most at ${topBand.band_label} (${Number(topBand.pct_moved).toFixed(0)}% moved)`
              : "standing vs moved per band"
          }
          tall
        >
          <BandLiquidityChart bands={bands} />
        </DashboardCard>
      </div>

      {/* ── B · PRICE ─────────────────────────────────────────────── */}
      <SectionHeading
        letter="B"
        title="Price - what rooms cost"
        subtitle={categoryActive ? CATEGORY_SCOPE_TAG : undefined}
      />
      <MetricGrid>
        <MetricCard
          code="A1"
          label="Typical rent (p50)"
          value={formatCurrency(price?.p50)}
          source={
            filtered
              ? "dash_suburb_price_stats_x.p50"
              : "dash_suburb_price_stats.p50"
          }
          explain="The middle live-listing rent for the selected filter - half ask more, half less."
          series={p50Series}
          seriesFormat="currency"
          showSpark={false}
          deltas={
            <>
              <DeltaChip delta={rentDelta1w} />
              <DeltaChip delta={rentDelta4w} />
            </>
          }
          expanderExtra={
            volNote ? (
              <p style={{ color: INK_60 }}>
                {volNote} - pending director keep/kill.
              </p>
            ) : null
          }
          span={1}
        />
        <MetricCard
          code="A2"
          label="Percentile band"
          value={
            price?.p10 != null && price?.p90 != null
              ? `${formatCurrency(price.p10)} – ${formatCurrency(price.p90)}`
              : "-"
          }
          source={
            filtered
              ? "dash_suburb_price_stats_x.p10…p90"
              : "dash_suburb_price_stats.p10…p90"
          }
          explain="The realistic price range across current listings, cheap end to premium end."
          showSpark={false}
          span={2}
          deltas={
            <>
              <DeltaChip delta={bandDelta1w} />
              <DeltaChip delta={bandDelta4w} />
            </>
          }
          table={{
            cols: ["p10", "p25", "p50", "p75", "p90"],
            rows: [[
              price?.p10 ?? null,
              price?.p25 ?? null,
              price?.p50 ?? null,
              price?.p75 ?? null,
              price?.p90 ?? null,
            ]],
          }}
        />
      </MetricGrid>

      <div className="mt-3">
        <DashboardCard
          title="Percentile bands over time"
          subtitle="Stacked p20/p40/p60/p80/p100 greys · white separators · gap weeks break · hover dims other bands"
          span={2}
          tall
        >
          <PercentileBandChart weeks={percentileWeeks} gapWeeks={gapWeeks} />
        </DashboardCard>
      </div>

      {/* ── C · SUPPLY ────────────────────────────────────────────── */}
      <SectionHeading letter="C" title="Supply - how much stock" />
      {categoryActive && (
        <p
          className="mb-3 text-[10px] uppercase tracking-[0.1em]"
          style={{ color: INK_60 }}
          data-category-supply-note=""
        >
          Category filter active: {LISTING_CATEGORY_LABELS[category] ?? category} · count-only
          from dash_suburb_supply_by_type
        </p>
      )}
      <MetricGrid>
        <MetricCard
          code="B7"
          label="Supply level"
          value={
            supplyValue == null
              ? "-"
              : `${supplyValue} · area avg ${areaListingAvg == null ? "-" : areaListingAvg.toFixed(1)} (${formatSignedPct(vsBaselinePct(supplyValue, areaListingAvg))})`
          }
          source={
            filtered
              ? "dash_suburb_supply_x.live_count"
              : "dash_suburb_supply_x.live_count · dash_suburb_weekly.live_listings"
          }
          explain="How many listings compete under the selected filter, against the area average."
          series={supplySeries}
          span={2}
          caveat={categoryActive ? CATEGORY_SCOPE_TAG : undefined}
          table={{
            cols: ["suburb", "area total", "area avg", "Sydney total"],
            rows: [[
              supplyValue,
              areaRow?.total_listings ?? null,
              areaListingAvg == null ? null : areaListingAvg.toFixed(1),
              cityRow?.total_listings ?? null,
            ]],
          }}
        />
        <MetricCard
          code="B9"
          label="New-supply inflow"
          value={
            addedLatest
              ? `${addedLatest.count} new @ ${formatCurrency(addedLatest.median_rent)}`
              : "-"
          }
          source="dash_suburb_cohorts_x (cohort=added)"
          explain="Fresh listings arriving and the prices they entered at (first observed rent)."
          showSpark={false}
          caveat={categoryActive ? CATEGORY_SCOPE_TAG : undefined}
          table={
            addedLatest
              ? {
                  cols: ["n", "median", "p25", "p75"],
                  rows: [[
                    addedLatest.count,
                    addedLatest.median_rent,
                    addedLatest.p25,
                    addedLatest.p75,
                  ]],
                }
              : undefined
          }
        />
      </MetricGrid>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DashboardCard
          title="Supply by type"
          subtitle={
            categoryActive
              ? `${LISTING_CATEGORY_LABELS[category] ?? category} · listing_category counts (g2_counts)`
              : "listing_category counts (g2_counts) - count-only, not price-filterable"
          }
        >
          {categorySupply.length === 0 ? (
            <p className="text-[12px]" style={{ color: INK_60 }}>
              No category supply row for this week
              {categoryActive ? ` (${LISTING_CATEGORY_LABELS[category] ?? category})` : ""}.
            </p>
          ) : (
            <MiniTable
              cols={["type", "n", "share"]}
              rows={categorySupply
                .slice()
                .sort((a, b) => b.listings - a.listings)
                .map((r) => [
                  LISTING_CATEGORY_LABELS[r.type_key] ?? r.type_key,
                  r.listings,
                  r.share_of_suburb == null
                    ? null
                    : `${(Number(r.share_of_suburb) * 100).toFixed(1)}%`,
                ])}
            />
          )}
        </DashboardCard>
        <DashboardCard
          title="Weekly net supply"
          subtitle="positive above axis · negative below · click a bar for the exact delta"
        >
          <NetSupplyChart points={netPoints} gapWeeks={gapWeeks} />
        </DashboardCard>
      </div>

      <div className="mt-3">
        <DashboardCard
          title="Supply trend (weekly)"
          subtitle="listings competing under the selected filter"
        >
          <WeeklyLineChart
            axis={axis}
            gapWeeks={gapWeeks}
            series={[
              {
                key: "supply",
                name: "listings",
                values: supplySeries.map((p) => p.value),
                emphasis: "primary",
              },
            ]}
          />
        </DashboardCard>
      </div>

      {/* ── D · DEMAND ────────────────────────────────────────────── */}
      <SectionHeading
        letter="D"
        title="Demand - suburb-wide"
        subtitle={categoryActive ? CATEGORY_SCOPE_TAG : undefined}
      />
      <MetricGrid>
        <MetricCard
          code="C12"
          label="Demand ratio"
          value={spine?.demand_ratio == null ? "-" : ratioBand(Number(spine.demand_ratio))}
          source="dash_suburb_weekly.demand_ratio (band = [r−0.5, r+0.4])"
          explain="Seekers per available room - the landlord's view of competition. Shown as a band because the source value is coarse."
          showSpark={false}
          seriesChart="line"
          series={demandSeries}
          span={2}
          deltas={
            <>
              <DeltaChip delta={demandDelta} />
              {demandDelta4w ? <DeltaChip delta={demandDelta4w} /> : null}
            </>
          }
          expanderExtra={
            ratioChangeLabel ? (
              <p style={{ color: INK_60 }}>
                All-time ratio change: {ratioChangeLabel}
                {spine?.alltime_ratio_delta != null
                  ? ` (${formatSignedNumber(Number(spine.alltime_ratio_delta), 1)})`
                  : ""}
              </p>
            ) : null
          }
        />
        <MetricCard
          code="C11"
          label="Implied seekers"
          value={formatCount(bannerSeekers)}
          source={
            filtered
              ? "round(demand_ratio × dash_suburb_supply_x.live_count)"
              : "dash_suburb_weekly.implied_seekers"
          }
          explain={
            filtered
              ? "Estimate under the selected bed×tier: suburb demand_ratio × segment live listings."
              : "Mode-invariant seeker estimate = demand_ratio × live listings at the basis week."
          }
          series={impliedSeries}
          seriesChart="line"
          showSpark={false}
          span={1}
          caveat={
            filtered
              ? "estimate"
              : spine?.implied_seekers_stale_weeks && spine.implied_seekers_stale_weeks > 0
                ? `Basis week ${spine.implied_seekers_basis_week ? formatWeekLong(spine.implied_seekers_basis_week) : "-"} · stale ${spine.implied_seekers_stale_weeks}w`
                : undefined
          }
          expanderExtra={
            !filtered ? (
              <p style={{ color: INK_60 }}>
                Area avg {areaSeekerAvg == null ? "-" : areaSeekerAvg.toFixed(1)}
                {" · "}
                Syd avg {citySeekerAvg == null ? "-" : citySeekerAvg.toFixed(1)}
              </p>
            ) : null
          }
        />
      </MetricGrid>

      <div className="mt-3">
        <DashboardCard
          title="Demand ratio range"
          subtitle="forex-style high-low band [r−0.5, r+0.4] · gap weeks break"
        >
          <DemandRatioBandChart
            axis={axis}
            values={demandSeries.map((p) => p.value)}
            gapWeeks={gapWeeks}
          />
        </DashboardCard>
      </div>

      {/* ── E · CONFIDENCE ────────────────────────────────────────── */}
      <SectionHeading
        letter="E"
        title="Confidence & data quality"
        subtitle={categoryActive ? CATEGORY_SCOPE_TAG : undefined}
      />
      <MetricGrid>
        <MetricCard
          code="E25"
          label="Confidence"
          value={cov?.confidence ?? "RED"}
          source="dash_suburb_coverage.confidence, sample_n, weeks_present_4, g1_capable"
          explain="Whether this suburb has enough data to trust. RED under 3 listings · AMBER under 8, or fewer than 4 of the trailing 4 weeks present · else GREEN."
          span={2}
          table={{
            cols: ["check", "value"],
            rows: [
              ["live listings (sample_n)", cov?.sample_n ?? null],
              ["weeks present (28d)", cov?.weeks_present_4 ?? null],
              ["G1 capable", cov?.g1_capable ? "yes" : "no"],
              ["G1 present this week", cov?.g1_present ? "yes" : "no"],
              ["G2 present this week", cov?.g2_present ? "yes" : "no"],
            ],
          }}
        />
        <MetricCard
          code="E—"
          label="Sample size trend"
          value={cov?.sample_n == null ? "-" : `n=${cov.sample_n}`}
          source="dash_suburb_price_stats.sample_n"
          explain="Listings priced each week - the basis behind every percentile on this page."
          series={priceSeries((r) => r.sample_n)}
        />
      </MetricGrid>

      <div className="mt-8 border-t pt-4" style={{ borderColor: INK_20 }}>
        <p className="mb-3 text-[10px] uppercase tracking-[0.1em]" style={{ color: INK_40 }}>
          Week-indexed figures read the Phase-3 ISO-week tables - one row per week. Under a
          bed-range × tier filter, banner rent/supply/seekers and movement resolve from `_x`
          segments; movement rank and demand ratio stay suburb-wide and are tagged. Category
          type scopes supply counts only. Section order: Movement → Price → Supply → Demand →
          Confidence.
        </p>
        <MiniTable
          cols={["axis weeks", "weeks with data", "gap weeks", "selected", "filter"]}
          rows={[[
            axis.length,
            dataWeeks.length,
            gapWeeks.length,
            formatWeekLong(selectedWeek),
            typeFilterLabel(filter),
          ]]}
        />
      </div>

      <p className="mt-8 flex flex-wrap gap-6">
        <Link
          href={`/${stateSlug}/${areaSlug}`}
          className="text-xs uppercase tracking-widest hover:underline"
          style={{ color: INK_60 }}
        >
          ← Area analytics
        </Link>
        <Link
          href="/"
          className="text-xs uppercase tracking-widest hover:underline"
          style={{ color: INK_60 }}
        >
          ← Back to map
        </Link>
      </p>
    </DashboardShell>
  );
}

function recentMoveRows(
  rows: DashSuburbMovementX[],
  selectedWeek: string,
  n: number,
): DashSuburbMovementX[] {
  return rows
    .filter((r) => r.iso_week <= selectedWeek)
    .sort((a, b) => (a.iso_week < b.iso_week ? 1 : -1))
    .slice(0, n);
}

function latestCohort(
  rows: DashSuburbCohortX[],
  cohort: "added" | "removed",
  selectedWeek: string,
): DashSuburbCohortX | null {
  const matching = rows.filter((r) => r.cohort === cohort && r.iso_week <= selectedWeek);
  return matching.sort((a, b) => (a.iso_week < b.iso_week ? 1 : -1))[0] ?? null;
}

function cohortTrend(
  rows: DashSuburbCohortX[],
  cohort: "added" | "removed",
  axis: string[],
) {
  const byWeek = new Map(
    rows.filter((r) => r.cohort === cohort).map((r) => [r.iso_week, r]),
  );
  return axis.map((week) => {
    const r = byWeek.get(week);
    return {
      week,
      median: r?.median_rent ?? null,
      p25: r?.p25 ?? null,
      p75: r?.p75 ?? null,
    };
  });
}

function CohortPanel({
  title,
  cohort,
  trend,
  gapWeeks,
  emptyHint,
}: {
  title: string;
  cohort: DashSuburbCohortX | null;
  trend: { week: string; median: number | null; p25: number | null; p75: number | null }[];
  gapWeeks: string[];
  emptyHint: string;
}) {
  return (
    <DashboardCard
      title={title}
      subtitle={
        cohort
          ? `${cohort.count} listings · median ${formatCurrency(cohort.median_rent)} · w/c ${formatWeekLong(cohort.iso_week)}`
          : emptyHint
      }
      tall
    >
      <CohortTrendChart points={trend} gapWeeks={gapWeeks} />
      {cohort && (
        <div className="mt-3">
          <MiniTable
            cols={["n", "median", "p25", "p75", "DOM", "repriced %", "wks on mkt"]}
            rows={[[
              cohort.count,
              cohort.median_rent,
              cohort.p25,
              cohort.p75,
              cohort.dom_median,
              cohort.repriced_share == null
                ? null
                : `${(Number(cohort.repriced_share) * 100).toFixed(0)}%`,
              cohort.median_weeks_on_market == null
                ? null
                : Number(cohort.median_weeks_on_market).toFixed(1),
            ]]}
          />
        </div>
      )}
    </DashboardCard>
  );
}
