import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { CoverageBadge } from "@/components/dashboard/ConfidenceBadge";
import { MetricCard, MetricGrid, MiniTable } from "@/components/dashboard/MetricCard";
import { WeekNav, WeekNavFootnote } from "@/components/dashboard/WeekNav";
import {
  AreaLeaderboardTable,
  type LeaderboardMovement,
} from "@/components/dashboard/AreaLeaderboardTable";
import { WeeklyLineChart } from "@/components/dashboard/charts/WeeklyLineChart";
import { HistogramChart } from "@/components/dashboard/charts/HistogramChart";
import { ListingMixDonut } from "@/components/dashboard/charts/ListingMixDonut";
import { SupplyPercentileChart } from "@/components/dashboard/charts/SupplyPercentileChart";
import { CHART_HEIGHT_COMPACT } from "@/components/dashboard/charts/ChartViewport";
import { fetchAreaAnalyticsData } from "@/lib/dash/explorer-queries";
import { alignToAxis, formatWeekLong, formatWeekTick, indexByWeek } from "@/lib/dash/iso-week";
import {
  firstLastChange,
  formatFirstLastCount,
  formatFirstLastCurrency,
  formatSignedCurrency,
  formatSignedNumber,
  formatSignedPct,
  ratioBand,
  vsBaselinePct,
} from "@/lib/dash/metrics";
import { formatCount, formatCurrency, formatRatio } from "@/lib/dash/format";
import { INK_20, INK_40, INK_60 } from "@/lib/palette/v2";

type Props = {
  params: Promise<{ state: string; area: string }>;
  searchParams: Promise<{ week?: string }>;
};

export async function AreaDashboardContent({ params, searchParams }: Props) {
  await connection();
  const { state: stateSlug, area: areaSlug } = await params;
  const { week } = await searchParams;

  const data = await fetchAreaAnalyticsData(stateSlug, areaSlug, week);
  if (!data) notFound();

  const {
    areaName,
    state,
    axis,
    gapWeeks,
    dataWeeks,
    selectedWeek,
    weekly,
    priceStats,
    movement,
    coverage,
    cityWeekly,
    leaderboard,
    suburbWeekly,
    listingMix,
    histogram,
    supplyPercentiles,
  } = data;

  const basePath = `/${stateSlug}/${areaSlug}`;
  const spine = indexByWeek(weekly).get(selectedWeek) ?? null;
  const price = indexByWeek(priceStats).get(selectedWeek) ?? null;
  const move = indexByWeek(movement).get(selectedWeek) ?? null;
  const cov = indexByWeek(coverage).get(selectedWeek) ?? null;
  const city = indexByWeek(cityWeekly).get(selectedWeek) ?? null;

  // Listing-level capture is uneven across the area: state the basis rather
  // than presenting a 1-suburb sample as an area-wide percentile.
  const g2Basis =
    cov == null
      ? "G2 capture unknown for this week"
      : `G2 basis: ${cov.g2_captured} of ${cov.capable_suburbs} capable suburbs captured`;

  const weeklyAligned = alignToAxis(weekly, axis);
  const priceAligned = alignToAxis(priceStats, axis);
  const moveAligned = alignToAxis(movement, axis);
  const cityAligned = alignToAxis(cityWeekly, axis);
  const covAligned = alignToAxis(coverage, axis);

  const series = (pick: (r: (typeof weekly)[number]) => number | null) =>
    weeklyAligned.map(({ week: w, row }) => ({ week: w, value: row ? pick(row) : null }));
  const pSeries = (pick: (r: (typeof priceStats)[number]) => number | null) =>
    priceAligned.map(({ week: w, row }) => ({ week: w, value: row ? pick(row) : null }));
  const mSeries = (pick: (r: (typeof movement)[number]) => number | null) =>
    moveAligned.map(({ week: w, row }) => ({ week: w, value: row ? pick(row) : null }));
  const cSeries = (pick: (r: (typeof cityWeekly)[number]) => number | null) =>
    cityAligned.map(({ week: w, row }) => ({ week: w, value: row ? pick(row) : null }));

  const medianRentSeries = series((r) =>
    r.median_avg_rent == null ? null : Number(r.median_avg_rent),
  );
  const listingsSeries = series((r) => r.total_listings);
  const seekersSeries = series((r) => r.total_seekers);
  const demandSeries = series((r) =>
    r.mean_demand_ratio == null ? null : Number(r.mean_demand_ratio),
  );
  const cityRentSeries = cSeries((r) =>
    r.median_avg_rent == null ? null : Number(r.median_avg_rent),
  );

  const rentChange = firstLastChange(medianRentSeries);
  const listingsChange = firstLastChange(listingsSeries);

  const vsSydneyRent = vsBaselinePct(
    spine?.median_avg_rent == null ? null : Number(spine.median_avg_rent),
    city?.median_avg_rent == null ? null : Number(city.median_avg_rent),
  );
  const vsSydneyDemand = vsBaselinePct(
    spine?.mean_demand_ratio == null ? null : Number(spine.mean_demand_ratio),
    city?.mean_demand_ratio == null ? null : Number(city.mean_demand_ratio),
  );

  const leaderboardMovement: LeaderboardMovement = Object.fromEntries(
    suburbWeekly.map((r) => [
      r.suburb_id,
      {
        wowAvgRent: r.wow_avg_rent == null ? null : Number(r.wow_avg_rent),
        wowTotalListings: r.wow_total_listings ?? null,
      },
    ]),
  );

  const recentMovement = movement.slice(-9);

  return (
    <DashboardShell snapshotDate={formatWeekLong(selectedWeek)}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight">
          {areaName.toUpperCase()}
        </h1>
        <CoverageBadge
          label="G1"
          captured={cov?.g1_captured ?? null}
          capable={cov?.capable_suburbs ?? null}
        />
      </div>
      <p className="mb-5 text-xs uppercase tracking-[0.15em]" style={{ color: INK_60 }}>
        {spine?.suburb_count ?? 0} suburbs reporting · {state}
      </p>

      <WeekNav
        basePath={basePath}
        axis={axis}
        dataWeeks={dataWeeks}
        selectedWeek={selectedWeek}
      />
      <WeekNavFootnote gapWeeks={gapWeeks} />

      {/* ── vs SYDNEY ─────────────────────────────────────────────── */}
      <SectionHeading
        letter="S"
        title="Versus Sydney"
        subtitle={`City-wide baseline from dash_city_weekly · ${city?.capable_captured ?? 0} of ${city?.capable_ceiling ?? 226} capable suburbs captured this week`}
      />
      <div
        className="mb-2 grid grid-cols-2 gap-px border lg:grid-cols-4"
        style={{ borderColor: INK_20, background: INK_20 }}
      >
        <VsCell
          label="Median rent"
          area={formatCurrency(spine?.median_avg_rent)}
          city={formatCurrency(city?.median_avg_rent)}
          delta={formatSignedPct(vsSydneyRent)}
        />
        <VsCell
          label="Demand ratio"
          area={formatRatio(spine?.mean_demand_ratio)}
          city={formatRatio(city?.mean_demand_ratio)}
          delta={formatSignedPct(vsSydneyDemand)}
        />
        <VsCell
          label="Seekers"
          area={formatCount(spine?.total_seekers)}
          city={formatCount(city?.total_seekers)}
          delta={
            spine?.total_seekers != null && city?.total_seekers
              ? `${((100 * spine.total_seekers) / city.total_seekers).toFixed(1)}% of Sydney`
              : "—"
          }
        />
        <VsCell
          label="Listings"
          area={formatCount(spine?.total_listings)}
          city={formatCount(city?.total_listings)}
          delta={
            spine?.total_listings != null && city?.total_listings
              ? `${((100 * spine.total_listings) / city.total_listings).toFixed(1)}% of Sydney`
              : "—"
          }
        />
      </div>

      <div className="mb-8">
        <DashboardCard
          title="Area rent against Sydney"
          subtitle="median avg rent · weekly · gap weeks break the line"
          span={2}
        >
          <WeeklyLineChart
            axis={axis}
            gapWeeks={gapWeeks}
            valuePrefix="$"
            series={[
              { key: "area", name: areaName, values: medianRentSeries.map((p) => p.value), emphasis: "primary" },
              { key: "city", name: "Sydney", values: cityRentSeries.map((p) => p.value), emphasis: "faint", dashed: true },
            ]}
          />
        </DashboardCard>
      </div>

      <StatStrip
        items={[
          {
            label: "Median rent",
            value: formatCurrency(spine?.median_avg_rent),
            sub: "median of suburb averages",
            wow: spine?.wow_median_avg_rent == null ? null : Number(spine.wow_median_avg_rent),
            wowCurrency: true,
          },
          {
            label: "Suburbs reporting",
            value: formatCount(spine?.suburb_count),
            sub: `of ${cov?.capable_suburbs ?? "—"} capable`,
          },
          {
            label: "Total listings",
            value: formatCount(spine?.total_listings),
            sub: "G2 all types",
          },
          {
            label: "Seekers",
            value: formatCount(spine?.total_seekers),
            sub: "G1 people looking",
          },
          {
            label: "Demand ratio",
            value: formatRatio(spine?.mean_demand_ratio),
            sub: "mean across suburbs",
          },
        ]}
      />

      {/* ── A · PRICE ─────────────────────────────────────────────── */}
      <SectionHeading letter="A" title="Price — area-wide" subtitle={g2Basis} />
      <MetricGrid>
        <MetricCard
          code="A1"
          label="Median rent"
          value={formatCurrency(spine?.median_avg_rent)}
          source="dash_area_weekly.median_avg_rent"
          explain="Median of the suburb-level average rents inside this area."
          series={medianRentSeries}
          seriesFormat={(v) => `$${v}`}
        />
        <MetricCard
          code="A2"
          label="Percentile band"
          value={
            price?.p10 != null && price?.p90 != null
              ? `${formatCurrency(price.p10)} – ${formatCurrency(price.p90)}`
              : "—"
          }
          source="dash_area_price_stats.p10, p25, p50, p75, p90"
          explain="Area-wide live-rent spread, cheap end to premium end."
          caveat={`Sample n=${price?.sample_n ?? 0} · ${g2Basis}`}
          table={{
            cols: ["p10", "p25", "p50", "p75", "p90"],
            rows: [[price?.p10 ?? null, price?.p25 ?? null, price?.p50 ?? null, price?.p75 ?? null, price?.p90 ?? null]],
          }}
        />
        <MetricCard
          code="A3"
          label="Dispersion (p90 − p10)"
          value={formatCurrency(price?.dispersion_9010)}
          source="dash_area_price_stats.dispersion_9010, .iqr_7525"
          explain="How wide pricing runs across the area's listings."
          series={pSeries((r) => r.dispersion_9010)}
          seriesFormat={(v) => `$${v}`}
          table={{
            cols: ["p90−p10", "IQR p75−p25", "mean"],
            rows: [[
              price?.dispersion_9010 ?? null,
              price?.iqr_7525 ?? null,
              price?.mean_rent == null ? null : Math.round(Number(price.mean_rent)),
            ]],
          }}
        />
        <MetricCard
          code="A5"
          label="All-time rent change"
          value={formatFirstLastCurrency(rentChange)}
          source="dash_area_weekly.median_avg_rent — first vs latest by iso_week"
          explain="Net move in the area median since the earliest recorded week."
          series={medianRentSeries}
          seriesFormat={(v) => `$${v}`}
        />
        <MetricCard
          code="A—"
          label="8-week volatility"
          value={
            spine?.median_avg_rent_vol_8w == null
              ? "—"
              : `±${formatCurrency(Number(spine.median_avg_rent_vol_8w))}`
          }
          source="dash_area_weekly.median_avg_rent_vol_8w"
          explain="Standard deviation of the area median over the trailing 8 rows."
          series={series((r) =>
            r.median_avg_rent_vol_8w == null ? null : Number(r.median_avg_rent_vol_8w),
          )}
        />
        <MetricCard
          code="A—"
          label="Median p50 (G1 bars)"
          value={formatCurrency(spine?.median_p50)}
          source="dash_area_weekly.median_p50"
          explain="Median of the suburb p50s read off the G1 price curve."
          series={series((r) => r.median_p50)}
          seriesFormat={(v) => `$${v}`}
        />
      </MetricGrid>

      <div className="mt-3">
        <DashboardCard
          title="Price percentiles (weekly)"
          subtitle="p10 / p50 / p90 across the area's live listings"
          span={2}
          tall
        >
          <WeeklyLineChart
            axis={axis}
            gapWeeks={gapWeeks}
            valuePrefix="$"
            height={320}
            series={[
              { key: "p90", name: "p90", values: pSeries((r) => r.p90).map((p) => p.value), emphasis: "faint", dashed: true },
              { key: "p50", name: "p50", values: pSeries((r) => r.p50).map((p) => p.value), emphasis: "primary" },
              { key: "p10", name: "p10", values: pSeries((r) => r.p10).map((p) => p.value), emphasis: "faint", dashed: true },
            ]}
          />
        </DashboardCard>
      </div>

      {/* ── B · SUPPLY & DEMAND ───────────────────────────────────── */}
      <SectionHeading letter="B" title="Supply & demand" />
      <MetricGrid>
        <MetricCard
          code="B7"
          label="Total listings"
          value={formatCount(spine?.total_listings)}
          source="dash_area_weekly.total_listings"
          explain="All G2 listings across the area's reporting suburbs."
          series={listingsSeries}
        />
        <MetricCard
          code="B10"
          label="All-time supply change"
          value={formatFirstLastCount(listingsChange)}
          source="dash_area_weekly.total_listings — first vs latest by iso_week"
          explain="How area listing volume has moved over the whole recorded history."
          series={listingsSeries}
        />
        <MetricCard
          code="B—"
          label="Rooms offered"
          value={formatCount(spine?.total_rooms)}
          source="dash_area_weekly.total_rooms"
          explain="G1 rooms-offered total. Supply maths uses G2 listings, never this figure."
          series={series((r) => r.total_rooms)}
        />
        <MetricCard
          code="C11"
          label="Seekers"
          value={formatCount(spine?.total_seekers)}
          source="dash_area_weekly.total_seekers"
          explain="People searching across the area's suburbs this week."
          series={seekersSeries}
        />
        <MetricCard
          code="C12"
          label="Mean demand ratio"
          value={
            spine?.mean_demand_ratio == null ? "—" : ratioBand(Number(spine.mean_demand_ratio))
          }
          source="dash_area_weekly.mean_demand_ratio (band = [r−0.5, r+0.4])"
          explain="Average seekers per room across the area's suburbs."
          series={demandSeries}
        />
        <MetricCard
          code="C—"
          label="Listings per seeker"
          value={
            spine?.total_listings != null && spine?.total_seekers
              ? (spine.total_listings / spine.total_seekers).toFixed(2)
              : "—"
          }
          source="dash_area_weekly.total_listings ÷ .total_seekers"
          explain="Competing supply each seeker faces across the area. Higher = looser market."
        />
      </MetricGrid>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DashboardCard title="Supply trend" subtitle="total G2 listings · weekly">
          <WeeklyLineChart
            axis={axis}
            gapWeeks={gapWeeks}
            series={[
              { key: "listings", name: "listings", values: listingsSeries.map((p) => p.value), emphasis: "primary" },
            ]}
          />
        </DashboardCard>
        <DashboardCard title="Demand trend" subtitle="G1 seekers and mean demand ratio">
          <WeeklyLineChart
            axis={axis}
            gapWeeks={gapWeeks}
            series={[
              { key: "seekers", name: "seekers", values: seekersSeries.map((p) => p.value), emphasis: "primary" },
              { key: "ratio", name: "demand ratio", values: demandSeries.map((p) => p.value), emphasis: "faint", dashed: true },
            ]}
          />
        </DashboardCard>
      </div>

      {/* ── D · MOVEMENT ──────────────────────────────────────────── */}
      <SectionHeading letter="D" title="Movement — area rollup" subtitle={g2Basis} />
      <MetricGrid>
        <MetricCard
          code="D15"
          label="Weekly movement"
          value={
            move
              ? `${move.new_count} new · ${move.gone_count} gone · ${move.repriced_count} repriced`
              : "—"
          }
          source="dash_area_movement.new_count, gone_count, repriced_count, net_flow, stock"
          explain="Area-wide listing flow per week. The current week always shows 0 gone by design."
          span={3}
          table={{
            cols: ["week", "new", "gone", "repriced", "net", "stock"],
            rows: recentMovement.map((m) => [
              formatWeekTick(m.iso_week),
              m.new_count,
              m.gone_count,
              m.repriced_count,
              m.net_flow,
              m.stock,
            ]),
          }}
        />
        <MetricCard
          code="D17"
          label="Turnover — share cleared"
          value={move?.turnover == null ? "—" : Number(move.turnover).toFixed(2)}
          source="dash_area_movement.turnover"
          explain="Fraction of area stock that cleared this week."
          series={mSeries((r) => (r.turnover == null ? null : Number(r.turnover)))}
        />
        <MetricCard
          code="D24"
          label="Days on market (median)"
          value={move?.dom_median_days == null ? "—" : `${move.dom_median_days}d`}
          source="dash_area_movement.dom_median_days"
          explain="Median days a live room in this area has been on the market."
          series={mSeries((r) => r.dom_median_days)}
          seriesFormat={(v) => `${v}d`}
        />
        <MetricCard
          code="D—"
          label="Net flow"
          value={formatSignedNumber(move?.net_flow)}
          source="dash_area_movement.net_flow (new − gone)"
          explain="Whether the area gained or shed listings this week."
          series={mSeries((r) => r.net_flow)}
        />
      </MetricGrid>

      {/* ── E · COVERAGE ──────────────────────────────────────────── */}
      <SectionHeading letter="E" title="Coverage & data quality" />
      <MetricGrid>
        <MetricCard
          code="E25"
          label="Area coverage"
          value={
            cov ? `${cov.g1_captured}/${cov.capable_suburbs} suburbs · ${Number(cov.coverage_pct ?? 0).toFixed(0)}%` : "—"
          }
          source="dash_area_coverage.capable_suburbs, g1_captured, g2_captured, coverage_pct"
          explain="How much of the capable roster reported this week. Capable suburbs — never the full 253 roster — are the denominator."
          span={2}
          table={{
            cols: ["check", "value"],
            rows: [
              ["capable suburbs", cov?.capable_suburbs ?? null],
              ["G1 captured", cov?.g1_captured ?? null],
              ["G2 captured", cov?.g2_captured ?? null],
              ["coverage", cov?.coverage_pct == null ? null : `${Number(cov.coverage_pct).toFixed(1)}%`],
            ],
          }}
        />
        <MetricCard
          code="E—"
          label="Coverage trend"
          value={cov?.coverage_pct == null ? "—" : `${Number(cov.coverage_pct).toFixed(0)}%`}
          source="dash_area_coverage.coverage_pct"
          explain="Weekly capture rate against the capable roster."
          series={covAligned.map(({ week: w, row }) => ({
            week: w,
            value: row?.coverage_pct == null ? null : Number(row.coverage_pct),
          }))}
          seriesFormat={(v) => `${v}%`}
        />
      </MetricGrid>

      {/* ── F · HORIZONS ──────────────────────────────────────────── */}
      <SectionHeading letter="F" title="Time horizons" />
      <MetricGrid>
        <MetricCard
          code="F26"
          label="Week-on-week"
          value={
            spine?.wow_median_avg_rent == null
              ? "—"
              : formatSignedCurrency(Number(spine.wow_median_avg_rent))
          }
          source="dash_area_weekly.wow_median_avg_rent"
          explain="Area median rent against the previous ISO week."
          series={series((r) =>
            r.wow_median_avg_rent == null ? null : Number(r.wow_median_avg_rent),
          )}
        />
        <MetricCard
          code="F26"
          label="1-month change (≈28d)"
          value={
            spine?.mom_median_avg_rent == null
              ? "—"
              : formatSignedCurrency(Number(spine.mom_median_avg_rent))
          }
          source="dash_area_weekly.mom_median_avg_rent"
          explain="Area median rent against 28 days ago."
          series={medianRentSeries}
          seriesFormat={(v) => `$${v}`}
        />
        <MetricCard
          code="F26"
          label="3-month change (≈91d)"
          value={
            spine?.qoq_median_avg_rent == null
              ? "—"
              : formatSignedCurrency(Number(spine.qoq_median_avg_rent))
          }
          source="dash_area_weekly.qoq_median_avg_rent"
          explain="Area median rent against 91 days ago."
          series={medianRentSeries}
          seriesFormat={(v) => `$${v}`}
        />
        <MetricCard
          code="F26"
          label="2-month change"
          value="Not available"
          source="—"
          explain="A fixed 2-month horizon is not persisted by the data layer."
          caveat="Omitted, not estimated (contract §6)."
        />
      </MetricGrid>

      {/* ── G · SUBURBS ───────────────────────────────────────────── */}
      <SectionHeading
        letter="G"
        title="Suburb leaderboard"
        subtitle="ranked within the area · week-on-week deltas from the Phase-3 spine"
      />
      <DashboardCard
        title="Suburbs in this area"
        subtitle="click a row to open its explorer"
        span={2}
        autoHeight
      >
        <AreaLeaderboardTable
          rows={leaderboard}
          stateSlug={stateSlug}
          areaSlug={areaSlug}
          movement={leaderboardMovement}
        />
      </DashboardCard>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DashboardCard
          title="Price ladder — 14 bands"
          subtitle="area-wide live-listing distribution · legacy snapshot"
          tall
        >
          <HistogramChart bars={histogram} height={320} />
        </DashboardCard>
        <DashboardCard
          title="Weekly range of supply"
          subtitle={`G1 supply percentiles · ${supplyPercentiles.length} snapshots`}
          tall
        >
          <SupplyPercentileChart rows={supplyPercentiles} height={320} />
        </DashboardCard>
      </div>

      <div className="mt-3">
        <DashboardCard
          title="Listing type mix"
          subtitle="aggregate across the area · legacy snapshot"
          compact
        >
          {listingMix ? (
            <ListingMixDonut mix={listingMix} height={CHART_HEIGHT_COMPACT} />
          ) : (
            <p className="text-sm" style={{ color: INK_60 }}>
              No listing mix data for this snapshot.
            </p>
          )}
        </DashboardCard>
      </div>

      <div className="mt-8 border-t pt-4" style={{ borderColor: INK_20 }}>
        <p className="mb-3 text-[10px] uppercase tracking-[0.1em]" style={{ color: INK_40 }}>
          Week-indexed figures read the Phase-3 ISO-week tables — one row per week, so
          split-fetch weeks contribute exactly one point. Legacy snapshot tables supply only
          the price ladder, supply percentiles and listing-type mix.
        </p>
        <MiniTable
          cols={["axis weeks", "weeks with data", "gap weeks", "selected"]}
          rows={[[axis.length, dataWeeks.length, gapWeeks.length, formatWeekLong(selectedWeek)]]}
        />
      </div>

      <p className="mt-8">
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

function VsCell({
  label,
  area,
  city,
  delta,
}: {
  label: string;
  area: string;
  city: string;
  delta: string;
}) {
  return (
    <div className="px-4 py-3" style={{ background: "#0a0a0a" }}>
      <div className="text-[10px] uppercase tracking-[0.15em]" style={{ color: INK_60 }}>
        {label}
      </div>
      <div className="mt-1 text-[22px] font-semibold tabular-nums leading-tight">{area}</div>
      <div className="mt-1 text-[11px] tabular-nums" style={{ color: INK_60 }}>
        Sydney {city} · {delta}
      </div>
    </div>
  );
}
