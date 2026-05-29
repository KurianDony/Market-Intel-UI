import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { HistogramChart } from "@/components/dashboard/charts/HistogramChart";
import { SuburbTrendChart } from "@/components/dashboard/charts/SuburbTrendChart";
import { fetchSuburbPageData } from "@/lib/dash/queries";
import {
  formatActivatedAt,
  formatCount,
  formatCurrency,
  formatRatio,
  formatSnapshotDate,
} from "@/lib/dash/format";
import { stateFromSlug } from "@/lib/dash/slugs";
import { INK_20, INK_40, INK_60, INK_100 } from "@/lib/palette/v2";

type Props = { params: Promise<{ state: string; area: string; suburb: string }> };

export async function SuburbDashboardContent({ params }: Props) {
  await connection();
  const { state: stateSlug, area: areaSlug, suburb: suburbSlug } = await params;
  const data = await fetchSuburbPageData(stateSlug, areaSlug, suburbSlug);
  if (!data) notFound();

  const { summary, trend, histogram, longevityActive, longevityGone } = data;
  const postcode = summary.suburb_slug_pc.split("-").pop();

  return (
    <DashboardShell snapshotDate={formatSnapshotDate(summary.snapshot_date)}>
      <h1 className="mb-1 text-[32px] font-bold tracking-tight">{summary.suburb.toUpperCase()}</h1>
      <p className="mb-6 text-xs uppercase tracking-[0.15em]" style={{ color: INK_60 }}>
        {postcode} · {summary.area_slug.replace(/-/g, " ")} · {stateFromSlug(stateSlug)}
      </p>

      <StatStrip
        items={[
          {
            label: "Avg Listing",
            value: formatCurrency(summary.avg_listing),
            sub: "supply median",
            wow: summary.wow_avg_listing,
            wowCurrency: true,
          },
          {
            label: "Demand Ratio",
            value: formatRatio(summary.demand_ratio),
            sub: "seekers / rooms · no price",
            wow: summary.wow_demand_ratio,
          },
          {
            label: "Min · Max",
            value:
              summary.min_price != null && summary.max_price != null
                ? `${formatCurrency(summary.min_price)}·${formatCurrency(summary.max_price)}`
                : "—",
            sub: "range of listings",
            wow: summary.wow_min_price,
          },
          {
            label: "Total Listings",
            value: formatCount(summary.total_listings),
            sub: "G2 all types",
            wow: summary.wow_total_listings,
          },
          {
            label: "Active Rooms",
            value: formatCount(summary.active_rooms),
            sub: "share_houses only",
            wow: summary.wow_active_rooms,
          },
        ]}
      />

      <div className="mb-6 grid grid-cols-2 gap-6">
        <DashboardCard title="Rent Histogram" subtitle="14-band distribution · equal category width">
          <HistogramChart bars={histogram} />
        </DashboardCard>
        <DashboardCard title="Avg Listing Trend" subtitle={`supply · ${trend.length} weeks · min/max bands`}>
          <SuburbTrendChart rows={trend} />
        </DashboardCard>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6">
        <DashboardCard title="Listing Longevity & Churn" subtitle="how fast does this suburb move?" span={2} autoHeight>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4
                className="mb-2 border-b pb-1.5 text-[11px] font-medium uppercase tracking-widest"
                style={{ borderColor: INK_20, color: INK_60 }}
              >
                Longest active — still listed
              </h4>
              <LongevityTable rows={longevityActive} mode="active" />
            </div>
            <div>
              <h4
                className="mb-2 border-b pb-1.5 text-[11px] font-medium uppercase tracking-widest"
                style={{ borderColor: INK_20, color: INK_60 }}
              >
                Recently disappeared — last seen ≤ 2 weeks
              </h4>
              <LongevityTable rows={longevityGone} mode="gone" />
            </div>
          </div>
        </DashboardCard>
      </div>

      <p className="mt-8 flex gap-6">
        <Link
          href={`/v2/${stateSlug}/${areaSlug}`}
          className="text-xs uppercase tracking-widest hover:underline"
          style={{ color: INK_60 }}
        >
          ← Area dashboard
        </Link>
        <Link href="/v2" className="text-xs uppercase tracking-widest hover:underline" style={{ color: INK_60 }}>
          ← Back to map
        </Link>
      </p>
    </DashboardShell>
  );
}

function LongevityTable({
  rows,
  mode,
}: {
  rows: {
    listing_id: string;
    current_rent_pw: number | null;
    weeks_seen: number;
    activated_at: string | null;
    last_seen: string;
  }[];
  mode: "active" | "gone";
}) {
  if (rows.length === 0) {
    return <p className="text-xs" style={{ color: INK_60 }}>No rows for this filter.</p>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr style={{ borderBottom: `1px solid ${INK_100}` }}>
          <th className="px-2 py-2 text-left text-[10px] uppercase tracking-widest" style={{ color: INK_60 }}>ID</th>
          <th className="px-2 py-2 text-right text-[10px] uppercase tracking-widest" style={{ color: INK_60 }}>
            {mode === "active" ? "Rent" : "Last Rent"}
          </th>
          <th className="px-2 py-2 text-right text-[10px] uppercase tracking-widest" style={{ color: INK_60 }}>Wks Active</th>
          <th className="px-2 py-2 text-left text-[10px] uppercase tracking-widest" style={{ color: INK_60 }}>
            {mode === "active" ? "Activated" : "Last Seen"}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.listing_id} style={{ borderBottom: `1px solid ${INK_20}` }}>
            <td className="px-2 py-2 font-mono">{row.listing_id}</td>
            <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(row.current_rent_pw)}</td>
            <td className="px-2 py-2 text-right tabular-nums">{row.weeks_seen}</td>
            <td className="px-2 py-2">
              {mode === "active" ? (
                formatActivatedAt(row.activated_at)
              ) : (
                <>
                  {formatSnapshotDate(row.last_seen)}{" "}
                  <span
                    className="ml-1 border px-1 text-[9px] uppercase line-through"
                    style={{ borderColor: INK_40, color: INK_40 }}
                  >
                    GONE
                  </span>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
