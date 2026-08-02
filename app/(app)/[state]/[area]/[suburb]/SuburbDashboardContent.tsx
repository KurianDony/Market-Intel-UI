import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MiniTable } from "@/components/dashboard/MetricCard";
import { SuburbExplorerClient } from "@/components/dashboard/suburb/SuburbExplorerClient";
import {
  fetchSuburbExplorerData,
  type SuburbNoMarketData,
} from "@/lib/dash/explorer-queries";
import { stateFromSlug } from "@/lib/dash/slugs";
import { INK_20, INK_60 } from "@/lib/palette/v2";

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
  return (
    <SuburbExplorerClient data={result} stateSlug={stateSlug} areaSlug={areaSlug} />
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
          {identity.suburb} is on the roster
          {identity.g1_capable ? "" : " but sits outside the G1-capable set"} — no weekly rent,
          demand, listing or coverage row has ever been recorded for it, so there is nothing to
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
