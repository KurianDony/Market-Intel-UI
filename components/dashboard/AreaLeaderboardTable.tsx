"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DashAreaLeaderboard } from "@/lib/types/dash";
import { formatCount, formatCurrency, formatRatio } from "@/lib/dash/format";
import { stateFromSlug, suburbDashboardHref } from "@/lib/dash/slugs";
import { ClassificationPill } from "@/components/dashboard/ClassificationPill";
import { INK_20, INK_40, INK_60, INK_100 } from "@/lib/palette/v2";

type SortKey =
  | "rank"
  | "avg_listing"
  | "seekers"
  | "demand_ratio"
  | "total_listings"
  | "wow_rent";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Area rank" },
  { key: "avg_listing", label: "Avg listing" },
  { key: "seekers", label: "Seekers" },
  { key: "demand_ratio", label: "Demand ratio" },
  { key: "total_listings", label: "Total listings" },
  { key: "wow_rent", label: "WoW rent" },
];

/** Week-on-week deltas from `dash_suburb_weekly`, keyed by suburb_id. */
export type LeaderboardMovement = Record<
  number,
  { wowAvgRent: number | null; wowTotalListings: number | null }
>;

function sortDescNullsLast(
  rows: DashAreaLeaderboard[],
  pick: (r: DashAreaLeaderboard) => number | null,
): DashAreaLeaderboard[] {
  return [...rows].sort((a, b) => {
    const av = pick(a);
    const bv = pick(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
}

function sortByAreaRank(rows: DashAreaLeaderboard[]): DashAreaLeaderboard[] {
  return [...rows].sort((a, b) => {
    const ar = a.rank_in_area;
    const br = b.rank_in_area;
    if (ar == null && br == null) return a.suburb.localeCompare(b.suburb);
    if (ar == null) return 1;
    if (br == null) return -1;
    if (ar !== br) return ar - br;
    return a.suburb.localeCompare(b.suburb);
  });
}

export function AreaLeaderboardTable({
  rows,
  stateSlug,
  areaSlug,
  movement,
}: {
  rows: DashAreaLeaderboard[];
  stateSlug: string;
  areaSlug: string;
  movement?: LeaderboardMovement;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");

  const sorted = useMemo(() => {
    switch (sortKey) {
      case "avg_listing":
        return sortDescNullsLast(rows, (r) => r.avg_listing);
      case "seekers":
        return sortDescNullsLast(rows, (r) => r.seekers);
      case "demand_ratio":
        return sortDescNullsLast(rows, (r) => r.demand_ratio);
      case "total_listings":
        return sortDescNullsLast(rows, (r) => r.total_listings);
      case "wow_rent":
        return sortDescNullsLast(rows, (r) => movement?.[r.suburb_id]?.wowAvgRent ?? null);
      default:
        return sortByAreaRank(rows);
    }
  }, [rows, sortKey, movement]);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: INK_60 }}>
          Sort by
        </span>
        {SORT_OPTIONS.map(({ key, label }) => {
          const active = sortKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              className="border px-2 py-1 text-[10px] uppercase tracking-widest transition-colors"
              style={{
                borderColor: active ? INK_100 : INK_20,
                color: active ? INK_100 : INK_60,
                background: active ? INK_20 : "transparent",
              }}
            >
              {label}
              {key !== "rank" ? " ↓" : ""}
            </button>
          );
        })}
      </div>
      <div className="overflow-auto" style={{ maxHeight: 480 }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: `1px solid ${INK_100}` }}>
              {[
                "#",
                "Suburb",
                "Avg Listing",
                "WoW Rent",
                "Seekers",
                "Supply",
                "Demand Ratio",
                "Listings",
                "WoW Listings",
                "State",
              ].map((h) => (
                <th
                  key={h}
                  className={`px-3 py-2.5 text-[10px] font-medium uppercase tracking-widest ${h !== "Suburb" && h !== "#" && h !== "State" ? "text-right" : "text-left"}`}
                  style={{ color: INK_60 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr
                key={row.suburb_slug}
                style={{ borderBottom: `1px solid ${INK_20}` }}
                className="hover:bg-[#1a1a1a]"
              >
                <td className="px-3 py-2.5 tabular-nums">
                  {sortKey === "rank" ? (row.rank_in_area ?? "—") : index + 1}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={suburbDashboardHref(stateFromSlug(stateSlug), areaSlug, row.suburb_slug)}
                    className="font-medium hover:underline"
                  >
                    {row.suburb}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(row.avg_listing)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <DeltaCell value={movement?.[row.suburb_id]?.wowAvgRent ?? null} currency />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCount(row.seekers)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCount(row.supply)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatRatio(row.demand_ratio)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCount(row.total_listings)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <DeltaCell value={movement?.[row.suburb_id]?.wowTotalListings ?? null} />
                </td>
                <td className="px-3 py-2.5">
                  <ClassificationPill classification={row.classification} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DeltaCell({ value, currency }: { value: number | null; currency?: boolean }) {
  if (value == null) return <span style={{ color: INK_40 }}>—</span>;
  const rounded = Number(value);
  if (rounded === 0) return <span style={{ color: INK_60 }}>→ 0</span>;
  const abs = Math.abs(rounded);
  const body = currency ? formatCurrency(abs) : formatCount(abs);
  return (
    <span style={{ color: INK_100 }}>
      {rounded > 0 ? "↑ " : "↓ "}
      {body}
    </span>
  );
}
