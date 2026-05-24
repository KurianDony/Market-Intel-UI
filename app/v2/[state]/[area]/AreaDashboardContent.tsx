import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ClassificationPill } from "@/components/dashboard/ClassificationPill";
import { SupplyPercentileChart } from "@/components/dashboard/charts/SupplyPercentileChart";
import { ListingMixDonut } from "@/components/dashboard/charts/ListingMixDonut";
import { HistogramChart } from "@/components/dashboard/charts/HistogramChart";
import { ListingMixStackedBar } from "@/components/dashboard/charts/ListingMixStackedBar";
import { fetchAreaPageData } from "@/lib/dash/queries";
import {
  formatCount,
  formatCurrency,
  formatRatio,
  formatSnapshotDate,
} from "@/lib/dash/format";
import { stateFromSlug } from "@/lib/dash/slugs";
import { INK_20, INK_60, INK_100 } from "@/lib/palette/v2";

type Props = { params: Promise<{ state: string; area: string }> };

export async function AreaDashboardContent({ params }: Props) {
  await connection();
  const { state: stateSlug, area: areaSlug } = await params;
  const data = await fetchAreaPageData(stateSlug, areaSlug);
  if (!data) notFound();

  const { summary, leaderboard, supplyPercentiles, listingMix, listingMixBySuburb, histogram } =
    data;

  const stateLabel = stateFromSlug(stateSlug);

  return (
    <DashboardShell snapshotDate={formatSnapshotDate(summary.snapshot_date)}>
      <h1 className="mb-1 text-[32px] font-bold tracking-tight">{summary.area.toUpperCase()}</h1>
      <p className="mb-6 text-xs uppercase tracking-[0.15em]" style={{ color: INK_60 }}>
        {summary.suburb_count} suburbs · {stateLabel}
      </p>

      <StatStrip
        items={[
          {
            label: "Suburbs in Area",
            value: formatCount(summary.suburb_count),
            sub: "tracked weekly",
            wow: summary.wow_suburb_count,
          },
          {
            label: "Median Avg Listing",
            value: formatCurrency(summary.median_avg_listing),
            sub: "supply-side",
            wow: summary.wow_median_avg_listing,
            wowCurrency: true,
          },
          {
            label: "Rooms Offered",
            value: formatCount(summary.rooms_offered_total),
            sub: "total supply",
            wow: summary.wow_rooms_offered,
          },
          {
            label: "Total Listings",
            value: formatCount(summary.total_listings),
            sub: "all G2 types",
            wow: summary.wow_total_listings,
          },
        ]}
      />

      <div className="mb-6 grid grid-cols-2 gap-6">
        <DashboardCard title="Suburb Leaderboard" subtitle="click a row to drill into that suburb" span={2} autoHeight>
          <div className="overflow-auto" style={{ maxHeight: 480 }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${INK_100}` }}>
                  {["#", "Suburb", "Avg Listing", "Seekers", "Supply", "Demand Ratio", "Listings", "State"].map(
                    (h) => (
                      <th
                        key={h}
                        className={`px-3 py-2.5 text-[10px] font-medium uppercase tracking-widest ${h !== "Suburb" && h !== "#" && h !== "State" ? "text-right" : "text-left"}`}
                        style={{ color: INK_60 }}
                      >
                        {h}
                        {h === "Seekers" && (
                          <span className="ml-1 border px-1 text-[9px] normal-case" style={{ borderColor: INK_60, color: INK_60 }}>
                            no price
                          </span>
                        )}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr
                    key={row.suburb_slug}
                    style={{ borderBottom: `1px solid ${INK_20}` }}
                    className="hover:bg-[#1a1a1a]"
                  >
                    <td className="px-3 py-2.5 tabular-nums">{row.rank_in_area ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/v2/${stateSlug}/${areaSlug}/${row.suburb_slug}`}
                        className="font-medium hover:underline"
                      >
                        {row.suburb}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(row.avg_listing)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCount(row.seekers)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCount(row.supply)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatRatio(row.demand_ratio)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCount(row.total_listings)}</td>
                    <td className="px-3 py-2.5">
                      <ClassificationPill classification={row.classification} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6">
        <DashboardCard
          title="Weekly Range of Supply"
          subtitle={`listing price percentiles · ${supplyPercentiles.length} weeks`}
        >
          <SupplyPercentileChart rows={supplyPercentiles} />
        </DashboardCard>
        <DashboardCard title="Listing Type Mix" subtitle="aggregate · all suburbs in area">
          {listingMix ? (
            <ListingMixDonut mix={listingMix} />
          ) : (
            <p className="text-sm" style={{ color: INK_60 }}>
              No listing mix data for this snapshot.
            </p>
          )}
        </DashboardCard>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6">
        <DashboardCard title="Aggregate Listing Histogram" subtitle="price distribution · area-wide">
          <HistogramChart bars={histogram} />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <DashboardCard
          title="Listing Type Mix · per Suburb"
          subtitle="stacked bar · how composition varies inside the area"
          span={2}
          tall
        >
          <ListingMixStackedBar rows={listingMixBySuburb} />
        </DashboardCard>
      </div>

      <p className="mt-8">
        <Link href="/v2" className="text-xs uppercase tracking-widest hover:underline" style={{ color: INK_60 }}>
          ← Back to map
        </Link>
      </p>
    </DashboardShell>
  );
}
