import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { ConfidenceBadge } from "@/components/dashboard/ConfidenceBadge";
import { MetricCard, MetricGrid, MiniTable } from "@/components/dashboard/MetricCard";
import { WeekNav, WeekNavFootnote } from "@/components/dashboard/WeekNav";
import { WeeklyLineChart } from "@/components/dashboard/charts/WeeklyLineChart";
import { BandLiquidityChart } from "@/components/dashboard/charts/BandLiquidityChart";
import { HistogramChart } from "@/components/dashboard/charts/HistogramChart";
import {
  fetchSuburbExplorerData,
  type SuburbExplorerData,
  type SuburbNoMarketData,
} from "@/lib/dash/explorer-queries";
import {
  alignToAxis,
  formatWeekLong,
  formatWeekTick,
  indexByWeek,
  rowAsOf,
} from "@/lib/dash/iso-week";
import {
  bestClearingBand,
  firstLastChange,
  formatFirstLastCount,
  formatFirstLastCurrency,
  formatSignedCurrency,
  formatSignedPct,
  listingMixEntries,
  ratioBand,
  vsBaselinePct,
} from "@/lib/dash/metrics";
import { formatCount, formatCurrency, formatRatio } from "@/lib/dash/format";
import { stateFromSlug } from "@/lib/dash/slugs";
import { INK_20, INK_40, INK_60 } from "@/lib/palette/v2";

type Props = {
  params: Promise<{ state: string; area: string; suburb: string }>;
  searchParams: Promise<{ week?: string }>;
};

export async function SuburbDashboardContent({ params, searchParams }: Props) {
  await connection();
  const { state: stateSlug, area: areaSlug, suburb: suburbSlug } = await params;
  const { week } = await searchParams;

  const result = await fetchSuburbExplorerData(stateSlug, areaSlug, suburbSlug, week);
  if (!result) notFound();
  if (result.kind === "no-market-data") {
    return <NoMarketDataView data={result} stateSlug={stateSlug} areaSlug={areaSlug} />;
  }
  return <ExplorerView data={result} stateSlug={stateSlug} areaSlug={areaSlug} />;
}

function ExplorerView({
  data,
  stateSlug,
  areaSlug,
}: {
  data: SuburbExplorerData;
  stateSlug: string;
  areaSlug: string;
}) {
  const {
    identity,
    areaName,
    axis,
    gapWeeks,
    dataWeeks,
    selectedWeek,
    weekly,
    priceStats,
    movement,
    coverage,
    bandLiquidity,
    histogram,
    areaWeekly,
    cityWeekly,
    listingMix,
  } = data;

  const basePath = `/${stateSlug}/${areaSlug}/${identity.slug.replace(/-\d+$/, "")}`;
  const spine = indexByWeek(weekly).get(selectedWeek) ?? null;
  const cov = indexByWeek(coverage).get(selectedWeek) ?? null;

  // Listing-level (G2) capture lags the G1 spine, so price/movement/liquidity
  // resolve to their own latest row at or before the selected week.
  const price = rowAsOf(priceStats, selectedWeek);
  const move = rowAsOf(movement, selectedWeek);
  const g2Week = [price?.iso_week, move?.iso_week].filter(Boolean).sort().pop() ?? null;
  const g2Behind = g2Week ? axis.indexOf(selectedWeek) - axis.indexOf(g2Week) : null;
  const g2Label = g2Week
    ? `G2 listing data as at w/c ${formatWeekLong(g2Week)}${g2Behind && g2Behind > 0 ? ` · ${g2Behind} wk behind the demand spine` : ""}`
    : "No listing-level (G2) data recorded for this suburb";
  const bands = g2Week ? bandLiquidity.filter((b) => b.iso_week === g2Week) : [];

  const areaRow = areaWeekly.find((r) => r.iso_week === selectedWeek) ?? null;
  const cityRow = cityWeekly.find((r) => r.iso_week === selectedWeek) ?? null;
  const areaSeekerAvg =
    areaRow?.total_seekers != null && areaRow.suburb_count > 0
      ? areaRow.total_seekers / areaRow.suburb_count
      : null;
  const citySeekerAvg =
    cityRow?.total_seekers != null && cityRow.suburb_count > 0
      ? cityRow.total_seekers / cityRow.suburb_count
      : null;
  const areaListingAvg =
    areaRow?.total_listings != null && areaRow.suburb_count > 0
      ? areaRow.total_listings / areaRow.suburb_count
      : null;

  // Every series is aligned to the continuous Monday axis so gap weeks stay null.
  const weeklyAligned = alignToAxis(weekly, axis);
  const priceAligned = alignToAxis(priceStats, axis);
  const moveAligned = alignToAxis(movement, axis);

  const series = (pick: (r: (typeof weekly)[number]) => number | null) =>
    weeklyAligned.map(({ week, row }) => ({ week, value: row ? pick(row) : null }));
  const priceSeries = (pick: (r: (typeof priceStats)[number]) => number | null) =>
    priceAligned.map(({ week, row }) => ({ week, value: row ? pick(row) : null }));
  const moveSeries = (pick: (r: (typeof movement)[number]) => number | null) =>
    moveAligned.map(({ week, row }) => ({ week, value: row ? pick(row) : null }));

  const p50Series = priceSeries((r) => r.p50);
  const avgRentSeries = series((r) => (r.avg_rent == null ? null : Number(r.avg_rent)));
  const supplySeries = series((r) => r.live_listings ?? r.total_listings);
  const seekersSeries = series((r) => r.seekers);
  const demandSeries = series((r) => (r.demand_ratio == null ? null : Number(r.demand_ratio)));
  const newCountSeries = moveSeries((r) => r.new_count);

  const priceChange = firstLastChange(p50Series.some((p) => p.value != null) ? p50Series : avgRentSeries);
  const supplyChange = firstLastChange(supplySeries);
  const seekerChange = firstLastChange(seekersSeries);

  const supplyValue = spine?.live_listings ?? spine?.total_listings ?? null;
  const supplyBasis = spine?.live_listings != null ? "live" : "carry-forward";
  const mix = listingMixEntries(listingMix as Record<string, number | null> | null);
  const topBand = bestClearingBand(bands);

  const recentMovement = movement.slice(-9);

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

      <StatStrip
        items={[
          {
            label: "Typical rent (p50)",
            value: formatCurrency(price?.p50),
            sub: g2Week ? `G2 live · n=${price?.sample_n ?? 0}` : "no G2 sample",
          },
          {
            label: "Supply",
            value: formatCount(supplyValue),
            sub: `${supplyBasis} listings`,
            wow: spine?.wow_total_listings,
          },
          {
            label: "Seekers",
            value: formatCount(spine?.seekers),
            sub: "G1 people looking",
            wow: spine?.wow_seekers,
          },
          {
            label: "Demand ratio",
            value: formatRatio(spine?.demand_ratio),
            sub: "seekers per room",
            wow: spine?.wow_demand_ratio,
          },
          {
            label: "Rank in area",
            value: spine?.rank_in_area != null ? `#${spine.rank_in_area}` : "—",
            sub: areaRow ? `of ${areaRow.suburb_count} suburbs` : "by supply",
          },
        ]}
      />

      <p
        className="mb-8 border px-3 py-2 text-[11px] uppercase tracking-[0.1em]"
        style={{ borderColor: INK_20, color: INK_60 }}
      >
        {g2Label}
      </p>

      {/* ── A · PRICE ─────────────────────────────────────────────── */}
      <SectionHeading letter="A" title="Price — what rooms cost" subtitle={g2Label} />
      <MetricGrid>
        <MetricCard
          code="A1"
          label="Typical rent (p50)"
          value={formatCurrency(price?.p50)}
          source="dash_suburb_price_stats.p50"
          explain="The middle live-listing rent for all rooms — half ask more, half less."
          series={p50Series}
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
          source="dash_suburb_price_stats.p10, p25, p50, p75, p90"
          explain="The realistic price range across current listings, cheap end to premium end."
          table={{
            cols: ["p10", "p25", "p50", "p75", "p90"],
            rows: [[price?.p10 ?? null, price?.p25 ?? null, price?.p50 ?? null, price?.p75 ?? null, price?.p90 ?? null]],
          }}
        />
        <MetricCard
          code="A3"
          label="Dispersion (p90 − p10)"
          value={formatCurrency(price?.dispersion_9010)}
          source="dash_suburb_price_stats.dispersion_9010"
          explain="How tight or wide pricing is. Narrow = predictable; wide = lots of positioning room."
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
          label="All-time price change"
          value={formatFirstLastCurrency(priceChange)}
          source="dash_suburb_weekly.alltime_avg_rent_delta · p50 series first vs latest"
          explain="Net move in the typical rent since the earliest recorded week."
          series={p50Series}
          seriesFormat={(v) => `$${v}`}
          table={{
            cols: ["all-time avg-rent delta"],
            rows: [[
              spine?.alltime_avg_rent_delta == null
                ? null
                : formatSignedCurrency(Number(spine.alltime_avg_rent_delta)),
            ]],
          }}
        />
        <MetricCard
          code="A6"
          label="Bills-included premium"
          value={price?.bills_incl_premium == null ? "—" : formatSignedCurrency(price.bills_incl_premium)}
          source="dash_suburb_price_stats.bills_incl_premium"
          explain="Extra rent bills-inclusive rooms command. Negative = bills-incl rooms sit cheaper (often smaller rooms)."
          caveat={
            price?.bills_incl_premium == null
              ? "Point-in-time only — populated on the latest ISO week per suburb, null elsewhere"
              : undefined
          }
        />
        <MetricCard
          code="A—"
          label="8-week volatility"
          value={
            spine?.avg_rent_vol_8w == null
              ? "—"
              : `±${formatCurrency(Number(spine.avg_rent_vol_8w))}`
          }
          source="dash_suburb_weekly.avg_rent_vol_8w"
          explain="Standard deviation of the weekly average rent over the trailing 8 rows."
          series={series((r) => (r.avg_rent_vol_8w == null ? null : Number(r.avg_rent_vol_8w)))}
        />
      </MetricGrid>

      <div className="mt-3">
        <DashboardCard
          title="A4 · Price trend (weekly)"
          subtitle="G2 median (p50) against the G1 average rent · gap weeks break the line"
          span={2}
          tall
        >
          <WeeklyLineChart
            axis={axis}
            gapWeeks={gapWeeks}
            valuePrefix="$"
            height={320}
            series={[
              { key: "p50", name: "p50 (G2 live)", values: p50Series.map((p) => p.value), emphasis: "primary" },
              { key: "avg", name: "avg rent (G1)", values: avgRentSeries.map((p) => p.value), emphasis: "secondary", dashed: true },
            ]}
          />
        </DashboardCard>
      </div>

      {/* ── B · SUPPLY ────────────────────────────────────────────── */}
      <SectionHeading letter="B" title="Supply — how much stock" />
      <MetricGrid>
        <MetricCard
          code="B7"
          label="Supply level"
          value={
            supplyValue == null
              ? "—"
              : `${supplyValue} ${supplyBasis} · area avg ${areaListingAvg == null ? "—" : areaListingAvg.toFixed(1)} (${formatSignedPct(vsBaselinePct(supplyValue, areaListingAvg))})`
          }
          source="dash_suburb_weekly.live_listings / .total_listings · dash_area_weekly.total_listings"
          explain="How many listings compete in the suburb, against its area average. Falls back to the G2 carry-forward count when the live reconstruction is unavailable."
          series={supplySeries}
          span={2}
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
          code="B8"
          label="Share of supply (by type)"
          value={mix.length > 0 ? `${mix[0].label} ${mix[0].share.toFixed(0)}%` : "—"}
          source="dash_area_listing_mix_by_suburb.<type> ÷ that row's total"
          explain="How this suburb's live listings split across listing types."
          table={
            mix.length > 0
              ? {
                  cols: ["type", "n", "share"],
                  rows: mix.map((m) => [m.label, m.count, `${m.share.toFixed(1)}%`]),
                }
              : undefined
          }
          caveat={mix.length === 0 ? "No listing-mix row for this suburb" : undefined}
        />
        <MetricCard
          code="B9"
          label="New-supply inflow + price"
          value={
            move
              ? `${move.new_count} new @ ${formatCurrency(move.new_median_rent)}`
              : "—"
          }
          source="dash_suburb_movement.new_count, .new_median_rent"
          explain="Fresh listings arriving this week and the price they enter at."
          series={newCountSeries}
        />
        <MetricCard
          code="B10"
          label="All-time supply change"
          value={formatFirstLastCount(supplyChange)}
          source="dash_suburb_weekly.live_listings — first vs latest by iso_week"
          explain="How the listing count has moved over the whole recorded history."
          series={supplySeries}
        />
      </MetricGrid>

      {/* ── C · DEMAND ────────────────────────────────────────────── */}
      <SectionHeading
        letter="C"
        title="Demand — seekers (suburb-wide)"
        subtitle="Seekers are a suburb-level G1 figure — never split by listing type."
      />
      <MetricGrid>
        <MetricCard
          code="C11"
          label="Seekers"
          value={
            spine?.seekers == null
              ? "—"
              : `${spine.seekers} · area avg ${areaSeekerAvg == null ? "—" : areaSeekerAvg.toFixed(1)} (${formatSignedPct(vsBaselinePct(spine.seekers, areaSeekerAvg))}) · syd avg ${citySeekerAvg == null ? "—" : citySeekerAvg.toFixed(1)} (${formatSignedPct(vsBaselinePct(spine.seekers, citySeekerAvg))})`
          }
          source="dash_suburb_weekly.seekers · dash_area_weekly.total_seekers ÷ suburb_count · dash_city_weekly.total_seekers ÷ suburb_count"
          explain="People searching in the suburb now, against its area and Sydney averages."
          series={seekersSeries}
          span={2}
        />
        <MetricCard
          code="C12"
          label="G1 demand ratio"
          value={spine?.demand_ratio == null ? "—" : ratioBand(Number(spine.demand_ratio))}
          source="dash_suburb_weekly.demand_ratio (band = [r−0.5, r+0.4])"
          explain="Seekers per available room — the landlord's view of competition. Shown as a band because the source value is coarse."
          series={demandSeries}
        />
        <MetricCard
          code="C13"
          label="Listings per seeker"
          value={
            spine?.listings_per_seeker == null
              ? "—"
              : ratioBand(Number(spine.listings_per_seeker), 2)
          }
          source="dash_suburb_weekly.listings_per_seeker (band = [v−0.5, v+0.4])"
          explain="Competing supply per seeker — the tenant's view. Higher = looser market."
          series={series((r) =>
            r.listings_per_seeker == null ? null : Number(r.listings_per_seeker),
          )}
        />
        <MetricCard
          code="C14"
          label="All-time demand change"
          value={formatFirstLastCount(seekerChange)}
          source="dash_suburb_weekly.seekers — first vs latest by iso_week"
          explain="How seeker numbers have moved over the whole recorded history."
          series={seekersSeries}
        />
      </MetricGrid>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DashboardCard
          title="Supply trend (weekly)"
          subtitle="listings competing in this suburb · gap weeks break the line"
        >
          <WeeklyLineChart
            axis={axis}
            gapWeeks={gapWeeks}
            series={[
              { key: "supply", name: "listings", values: supplySeries.map((p) => p.value), emphasis: "primary" },
            ]}
          />
        </DashboardCard>
        <DashboardCard
          title="Demand trend (weekly)"
          subtitle="G1 seekers and demand ratio"
        >
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
      <SectionHeading
        letter="D"
        title="Movement — listings that moved (per room)"
        subtitle={g2Label}
      />
      <MetricGrid>
        <MetricCard
          code="D15"
          label="Weekly movement"
          value={
            move
              ? `${move.new_count} new · ${move.gone_count} gone · ${move.repriced_count} repriced`
              : "—"
          }
          source="dash_suburb_movement.new_count, gone_count, repriced_count, net_flow, stock"
          explain="What every movement figure looked like each week. The current week always shows 0 gone by design — a listing cannot have disappeared in the live week."
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
          code="D16"
          label="Flow (new / rented / standing)"
          value={move ? `${move.new_count} / ${move.gone_count} / ${move.stock}` : "—"}
          source="dash_suburb_movement.new_count, .gone_count, .stock"
          explain="Appeared / cleared (gone ≈ rented) / still live this week."
          table={
            move
              ? {
                  cols: ["cohort", "n", "median $"],
                  rows: [
                    ["new in", move.new_count, move.new_median_rent],
                    ["rented (gone)", move.gone_count, move.gone_median_rent],
                    ["standing", move.stock, null],
                  ],
                }
              : undefined
          }
        />
        <MetricCard
          code="D17"
          label="Turnover — share cleared"
          value={move?.turnover == null ? "—" : Number(move.turnover).toFixed(2)}
          source="dash_suburb_movement.turnover (gone ÷ stock)"
          explain="Fraction of stock that cleared this week. 0.20 ≈ a fifth turned over."
          series={moveSeries((r) => (r.turnover == null ? null : Number(r.turnover)))}
        />
        <MetricCard
          code="D18"
          label="Cohort profiles — what rents"
          value={move?.gone_median_rent == null ? "—" : `rented median ${formatCurrency(move.gone_median_rent)}`}
          source="dash_suburb_movement.new_median_rent, .gone_median_rent"
          explain="Median entry price of new stock against the median price of stock that cleared."
          caveat="Partial — per-cohort p10/p90 and top-bedroom breakdown are not persisted (contract §6); only the medians shown here exist."
          table={
            move
              ? {
                  cols: ["cohort", "n", "median $"],
                  rows: [
                    ["new", move.new_count, move.new_median_rent],
                    ["rented", move.gone_count, move.gone_median_rent],
                  ],
                }
              : undefined
          }
        />
        <MetricCard
          code="D19"
          label="Weeks on market"
          value={
            move?.weeks_on_market_median == null
              ? "—"
              : `${Number(move.weeks_on_market_median).toFixed(1)} wks`
          }
          source="dash_suburb_movement.weeks_on_market_median"
          explain="Median first-seen → last-seen span of rooms that disappeared. Left-censored."
          series={moveSeries((r) =>
            r.weeks_on_market_median == null ? null : Number(r.weeks_on_market_median),
          )}
        />
        <MetricCard
          code="D21"
          label="Reprice behaviour"
          value={move ? `${move.reprice_up}↑ / ${move.reprice_down}↓` : "—"}
          source="dash_suburb_movement.reprice_up, .reprice_down, .repriced_count"
          explain="Of listings that changed price, how many rose vs fell. Mostly down = softening."
          table={
            move
              ? {
                  cols: ["repriced", "up", "down"],
                  rows: [[move.repriced_count, move.reprice_up, move.reprice_down]],
                }
              : undefined
          }
        />
        <MetricCard
          code="D22"
          label="Reprice on disappeared"
          value={
            move?.gone_median_rent != null && move?.new_median_rent != null
              ? `${formatSignedCurrency(move.gone_median_rent - move.new_median_rent)} vs new median`
              : "—"
          }
          source="dash_suburb_movement.gone_median_rent vs .new_median_rent; reprice_up / reprice_down"
          explain="How the price of cleared stock compares with the price new stock enters at."
          caveat="Partial — per-listing cut/rise counts on the disappeared cohort are not persisted (contract §6). Shown as an aggregate gap, not a cut count."
        />
        <MetricCard
          code="D23"
          label="Closing rent (achieved)"
          value={formatCurrency(move?.closing_rent)}
          source="dash_suburb_movement.closing_rent (0.95 × gone median)"
          explain="Estimated what these rooms actually let for — 5% under the last ask."
          series={moveSeries((r) => r.closing_rent)}
          seriesFormat={(v) => `$${v}`}
        />
        <MetricCard
          code="D24"
          label="Days on market (median)"
          value={move?.dom_median_days == null ? "—" : `${move.dom_median_days}d`}
          source="dash_suburb_movement.dom_median_days (capped at 120)"
          explain="Median days a live room has been on the market."
          series={moveSeries((r) => r.dom_median_days)}
          seriesFormat={(v) => `${v}d`}
        />
      </MetricGrid>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DashboardCard
          title="D20 · Liquidity by price band"
          subtitle={
            topBand
              ? `clears most at ${topBand.band_label} (${Number(topBand.pct_moved).toFixed(0)}% moved)`
              : "standing vs moved per band"
          }
          tall
        >
          <BandLiquidityChart bands={bands} />
        </DashboardCard>
        <DashboardCard
          title="Price ladder — 14 bands"
          subtitle="live-listing distribution · legacy point-in-time snapshot"
          tall
        >
          <HistogramChart bars={histogram} height={320} />
        </DashboardCard>
      </div>

      {/* ── E · CONFIDENCE ────────────────────────────────────────── */}
      <SectionHeading letter="E" title="Confidence & data quality" />
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
          value={cov?.sample_n == null ? "—" : `n=${cov.sample_n}`}
          source="dash_suburb_price_stats.sample_n"
          explain="Listings priced each week — the basis behind every percentile on this page."
          series={priceSeries((r) => r.sample_n)}
        />
      </MetricGrid>

      {/* ── F · TIME HORIZONS ─────────────────────────────────────── */}
      <SectionHeading letter="F" title="Time horizons" />
      <MetricGrid>
        <MetricCard
          code="F26"
          label="1-month change (≈28d)"
          value={
            spine?.mom_avg_rent == null ? "—" : formatSignedCurrency(Number(spine.mom_avg_rent))
          }
          source="dash_suburb_weekly.mom_avg_rent"
          explain="Average rent now against 28 days ago."
          series={avgRentSeries}
          seriesFormat={(v) => `$${v}`}
        />
        <MetricCard
          code="F26"
          label="3-month change (≈91d)"
          value={
            spine?.qoq_avg_rent == null ? "—" : formatSignedCurrency(Number(spine.qoq_avg_rent))
          }
          source="dash_suburb_weekly.qoq_avg_rent"
          explain="Average rent now against 91 days ago."
          series={avgRentSeries}
          seriesFormat={(v) => `$${v}`}
        />
        <MetricCard
          code="F26"
          label="2-month change"
          value="Not available"
          source="—"
          explain="A fixed 2-month horizon is not persisted by the data layer."
          caveat="Omitted, not estimated (contract §6). The weekly series above supports any client-side horizon."
        />
        <MetricCard
          code="F—"
          label="Week-on-week change"
          value={
            spine?.wow_avg_rent == null ? "—" : formatSignedCurrency(Number(spine.wow_avg_rent))
          }
          source="dash_suburb_weekly.wow_avg_rent"
          explain="Average rent against the previous ISO week."
          series={series((r) => (r.wow_avg_rent == null ? null : Number(r.wow_avg_rent)))}
        />
      </MetricGrid>

      {/* ── G · GEOGRAPHY ─────────────────────────────────────────── */}
      <SectionHeading letter="G" title="Geography" />
      <MetricGrid>
        <MetricCard
          code="G27"
          label="Area & supply rank"
          value={
            spine?.rank_in_area == null
              ? areaName
              : `${areaName} · rank #${spine.rank_in_area}${areaRow ? ` of ${areaRow.suburb_count}` : ""}`
          }
          source="suburbs.area · dash_suburb_weekly.rank_in_area"
          explain="Where this suburb sits within its area, ranked by supply (1 = most supply)."
          span={2}
          series={series((r) => r.rank_in_area)}
        />
        <MetricCard
          code="G—"
          label="Area coverage this week"
          value={areaRow ? `${areaRow.suburb_count} suburbs captured` : "—"}
          source="dash_area_weekly.suburb_count"
          explain="How many suburbs in this area reported in the selected week."
        />
      </MetricGrid>

      <div className="mt-8 border-t pt-4" style={{ borderColor: INK_20 }}>
        <p className="mb-3 text-[10px] uppercase tracking-[0.1em]" style={{ color: INK_40 }}>
          Week-indexed figures read the Phase-3 ISO-week tables — one row per week, so
          split-fetch weeks contribute exactly one point. Legacy snapshot tables are used
          only for the point-in-time price ladder and the listing-type mix.
        </p>
        <MiniTable
          cols={["axis weeks", "weeks with data", "gap weeks", "selected"]}
          rows={[[axis.length, dataWeeks.length, gapWeeks.length, formatWeekLong(selectedWeek)]]}
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

/**
 * The 27 `g1_capable=false` suburbs stay reachable from search — they render an
 * explicit empty state rather than a 404, and never a fabricated figure.
 */
function NoMarketDataView({
  data,
  stateSlug,
  areaSlug,
}: {
  data: SuburbNoMarketData;
  stateSlug: string;
  areaSlug: string;
}) {
  const { identity } = data;

  return (
    <DashboardShell>
      <h1 className="mb-1 text-[32px] font-bold tracking-tight">
        {identity.suburb.toUpperCase()}
      </h1>
      <p className="mb-8 text-xs uppercase tracking-[0.15em]" style={{ color: INK_60 }}>
        {identity.postcode} · {identity.area} · {stateFromSlug(stateSlug)}
      </p>

      <div className="max-w-2xl border p-6" style={{ borderColor: INK_20 }}>
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em]">
          No market data for this suburb
        </h2>
        <p className="mb-4 text-[13px] leading-relaxed" style={{ color: INK_60 }}>
          {identity.suburb} is on the roster but is not part of the capable set — the upstream
          source carries no weekly rent, demand or listing series for it, so there is nothing to
          chart. This is an absence of data, not a zero market.
        </p>
        <MiniTable
          cols={["check", "value"]}
          rows={[
            ["on roster", "yes"],
            ["G1 capable", identity.g1_capable ? "yes" : "no"],
            ["weekly rows recorded", 0],
            ["capable suburbs tracked", 226],
          ]}
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
