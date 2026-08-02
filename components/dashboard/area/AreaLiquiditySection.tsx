"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { MetricCard, MetricGrid, MiniTable } from "@/components/dashboard/MetricCard";
import { TypeFilterBar } from "@/components/dashboard/TypeFilterBar";
import { CompositionChart } from "@/components/dashboard/charts/CompositionChart";
import { CohortTrendChart } from "@/components/dashboard/charts/CohortTrendChart";
import { alignToAxis, formatWeekLong } from "@/lib/dash/iso-week";
import { formatCurrency } from "@/lib/dash/format";
import {
  DEFAULT_TYPE_FILTER,
  isFilterActive,
  resolveXFilter,
  typeFilterLabel,
  type TypeFilter,
} from "@/lib/dash/type-filter";
import { suburbDashboardHref } from "@/lib/dash/slugs";
import { INK_20, INK_40, INK_60, INK_100 } from "@/lib/palette/v2";
import type {
  DashAreaCohortX,
  DashAreaMovementLeaderboard,
  DashAreaMovementX,
} from "@/lib/types/dash-phase3";

const FILTER_SCOPE_TAG =
  "bed × tier filter applies to Liquidity only - other area sections stay area-wide";

function recentMoveRows(
  rows: DashAreaMovementX[],
  selectedWeek: string,
  n: number,
): DashAreaMovementX[] {
  return rows
    .filter((r) => r.iso_week <= selectedWeek)
    .sort((a, b) => (a.iso_week < b.iso_week ? 1 : -1))
    .slice(0, n);
}

function latestCohort(
  rows: DashAreaCohortX[],
  cohort: "added" | "removed",
  week: string,
): DashAreaCohortX | null {
  const matching = rows.filter((r) => r.cohort === cohort && r.iso_week === week);
  return matching[0] ?? null;
}

function cohortTrend(
  rows: DashAreaCohortX[],
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

export type AreaLiquidityData = {
  areaName: string;
  stateSlug: string;
  areaSlug: string;
  axis: string[];
  gapWeeks: string[];
  selectedWeek: string;
  movementCompleteWeek: string | null;
  movementX: DashAreaMovementX[];
  cohortsX: DashAreaCohortX[];
  leaderboard: DashAreaMovementLeaderboard[];
};

/**
 * Owns the area bed×tier filter. Renders Liquidity first, then a scope tag
 * above the remaining (server-rendered) area sections when the filter is active.
 */
export function AreaAnalyticsClient({
  liquidity,
  children,
}: {
  liquidity: AreaLiquidityData;
  children: ReactNode;
}) {
  const [filter, setFilter] = useState<TypeFilter>(DEFAULT_TYPE_FILTER);
  const filtered = isFilterActive(filter);

  return (
    <>
      <AreaLiquiditySection
        {...liquidity}
        filter={filter}
        onFilterChange={setFilter}
      />
      {filtered && (
        <p
          className="mb-6 border px-3 py-2 text-[10px] uppercase tracking-[0.1em]"
          style={{ borderColor: INK_20, color: INK_40 }}
          data-area-scope-tag=""
        >
          {FILTER_SCOPE_TAG}
        </p>
      )}
      {children}
    </>
  );
}

function AreaLiquiditySection({
  areaName,
  stateSlug,
  areaSlug,
  axis,
  gapWeeks,
  selectedWeek,
  movementCompleteWeek,
  movementX,
  cohortsX,
  leaderboard,
  filter,
  onFilterChange,
}: AreaLiquidityData & {
  filter: TypeFilter;
  onFilterChange: (next: TypeFilter) => void;
}) {
  const [expandedBoard, setExpandedBoard] = useState(false);
  const xKey = resolveXFilter(filter);
  const filtered = isFilterActive(filter);

  const basisWeek = movementCompleteWeek;
  const basisBehind =
    basisWeek != null && axis.includes(basisWeek) && axis.includes(selectedWeek)
      ? axis.indexOf(selectedWeek) - axis.indexOf(basisWeek)
      : 0;

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

  const move =
    basisWeek != null
      ? (moveTyped.find((r) => r.iso_week === basisWeek) ?? null)
      : null;

  const moveAligned = alignToAxis(moveTyped, axis);
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

  const repriceWeeks = basisWeek ? recentMoveRows(moveTyped, basisWeek, 3) : [];
  const removedLatest = basisWeek ? latestCohort(cohortsTyped, "removed", basisWeek) : null;
  const addedLatest = basisWeek ? latestCohort(cohortsTyped, "added", basisWeek) : null;
  const removedTrend = cohortTrend(cohortsTyped, "removed", axis);
  const addedTrend = cohortTrend(cohortsTyped, "added", axis);

  const boardRows = useMemo(() => {
    if (!basisWeek) return [];
    return leaderboard
      .filter((r) => r.iso_week === basisWeek)
      .slice()
      .sort((a, b) => {
        const ar = a.movement_rank;
        const br = b.movement_rank;
        if (ar == null && br == null) return a.suburb.localeCompare(b.suburb);
        if (ar == null) return 1;
        if (br == null) return -1;
        if (ar !== br) return ar - br;
        return a.suburb.localeCompare(b.suburb);
      });
  }, [leaderboard, basisWeek]);

  const visibleBoard = expandedBoard ? boardRows : boardRows.slice(0, 10);

  const domValue =
    move?.dom_median == null
      ? "-"
      : move.dom_p25 != null && move.dom_p75 != null
        ? `${move.dom_median}d · p25-p75 ${move.dom_p25}-${move.dom_p75}`
        : `${move.dom_median}d`;

  const basisLabel =
    basisWeek == null
      ? "No movement-complete week available"
      : `Movement basis w/c ${formatWeekLong(basisWeek)}${
          basisBehind > 0 ? ` · ${basisBehind} wk behind selected` : ""
        }${filtered ? ` · ${typeFilterLabel(filter)}` : ""}`;

  const moveSeries = (pick: (r: DashAreaMovementX) => number | null) =>
    moveAligned.map(({ week, row }) => ({ week, value: row ? pick(row) : null }));

  return (
    <div className="mb-8" data-area-liquidity="">
      <SectionHeading letter="L" title="Liquidity - area movement" subtitle={basisLabel} />

      <TypeFilterBar
        value={filter}
        onChange={onFilterChange}
        note="Bed range × tier scope Liquidity only this round"
      />

      <p
        className="mb-4 border px-3 py-2 text-[11px] uppercase tracking-[0.1em]"
        style={{ borderColor: INK_20, color: INK_60 }}
        data-liquidity-basis=""
        data-basis-week={basisWeek ?? ""}
      >
        {basisLabel}
      </p>

      <DashboardCard
        title="Weekly composition"
        subtitle="carried · repriced · new above · disappeared below · area rollup from dash_area_movement_x"
        tall
        autoHeight
      >
        <CompositionChart
          points={compositionPoints}
          gapWeeks={gapWeeks}
          selectedWeek={basisWeek ?? selectedWeek}
        />
      </DashboardCard>

      <MetricGrid>
        <MetricCard
          code="L-DOM"
          label="Days on market (median)"
          value={domValue}
          source="dash_area_movement_x.dom_median, .dom_p25, .dom_p75"
          explain="Area-grain median days on market with interquartile band."
          series={moveSeries((r) => r.dom_median)}
          seriesFormat="days"
        />
        <MetricCard
          code="L-REP"
          label="Reprice behaviour"
          value={move ? `${move.reprice_up}↑ / ${move.reprice_down}↓` : "-"}
          source="dash_area_movement_x.reprice_up, .reprice_down, .repriced_count"
          explain="Of listings that changed price across the area, how many rose vs fell."
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
          code="L-TO"
          label="Turnover - share cleared"
          value={move?.turnover == null ? "-" : Number(move.turnover).toFixed(2)}
          source="dash_area_movement_x.turnover (gone ÷ stock)"
          explain="Fraction of area stock that cleared in the basis week."
          series={moveSeries((r) => (r.turnover == null ? null : Number(r.turnover)))}
        />
      </MetricGrid>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DashboardCard
          title="What moved (removed)"
          subtitle={
            removedLatest
              ? `${removedLatest.count} listings · median ${formatCurrency(removedLatest.median_rent)} · p25-p75 ${formatCurrency(removedLatest.p25)}-${formatCurrency(removedLatest.p75)}`
              : "Removed cohort empty for this filter / basis week"
          }
          tall
        >
          <CohortTrendChart points={removedTrend} gapWeeks={gapWeeks} />
          {removedLatest && (
            <div className="mt-3">
              <MiniTable
                cols={["n", "median", "p25", "p75", "DOM"]}
                rows={[
                  [
                    removedLatest.count,
                    removedLatest.median_rent,
                    removedLatest.p25,
                    removedLatest.p75,
                    removedLatest.dom_median,
                  ],
                ]}
              />
            </div>
          )}
        </DashboardCard>
        <DashboardCard
          title="What was added"
          subtitle={
            addedLatest
              ? `${addedLatest.count} listings · median ${formatCurrency(addedLatest.median_rent)} · p25-p75 ${formatCurrency(addedLatest.p25)}-${formatCurrency(addedLatest.p75)}`
              : "No added cohort for this filter / basis week"
          }
          tall
        >
          <CohortTrendChart points={addedTrend} gapWeeks={gapWeeks} />
          {addedLatest && (
            <div className="mt-3">
              <MiniTable
                cols={["n", "median", "p25", "p75"]}
                rows={[
                  [
                    addedLatest.count,
                    addedLatest.median_rent,
                    addedLatest.p25,
                    addedLatest.p75,
                  ],
                ]}
              />
            </div>
          )}
        </DashboardCard>
      </div>

      <div className="mt-3">
        <DashboardCard
          title="Suburb movement leaderboard"
          subtitle={
            filtered
              ? `top ${Math.min(10, boardRows.length)} by disappeared · area-wide (not bed×tier) · ${boardRows.length} suburbs`
              : `ranked by listings disappeared · 1 = most movement · ${boardRows.length} suburbs`
          }
          span={2}
          autoHeight
        >
          {boardRows.length === 0 ? (
            <p className="text-[12px]" style={{ color: INK_60 }}>
              No movement leaderboard rows for the basis week.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto" data-movement-leaderboard="">
                <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
                  <thead>
                    <tr
                      className="border-b text-[10px] uppercase tracking-[0.1em]"
                      style={{ borderColor: INK_20, color: INK_40 }}
                    >
                      <th className="py-2 pr-3 font-normal">Rank</th>
                      <th className="py-2 pr-3 font-normal">Suburb</th>
                      <th className="py-2 pr-3 font-normal tabular-nums">Gone</th>
                      <th className="py-2 pr-3 font-normal tabular-nums">New</th>
                      <th className="py-2 pr-3 font-normal tabular-nums">Net</th>
                      <th className="py-2 font-normal tabular-nums">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBoard.map((row) => (
                      <tr
                        key={row.suburb_id}
                        className="border-b"
                        style={{ borderColor: INK_20 }}
                        data-gone={row.gone_count}
                        data-suburb={row.suburb_slug}
                      >
                        <td className="py-2 pr-3 font-mono tabular-nums">
                          {row.movement_rank != null ? `#${row.movement_rank}` : "-"}
                        </td>
                        <td className="py-2 pr-3">
                          <Link
                            href={suburbDashboardHref(stateSlug, areaSlug, row.suburb_slug)}
                            className="hover:underline"
                            style={{ color: INK_100 }}
                          >
                            {row.suburb}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 font-mono tabular-nums">{row.gone_count}</td>
                        <td className="py-2 pr-3 font-mono tabular-nums">{row.new_count}</td>
                        <td className="py-2 pr-3 font-mono tabular-nums">{row.net_flow}</td>
                        <td className="py-2 font-mono tabular-nums">{row.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {boardRows.length > 10 && (
                <button
                  type="button"
                  className="mt-3 text-[11px] uppercase tracking-[0.1em] hover:underline"
                  style={{ color: INK_60 }}
                  data-leaderboard-expand=""
                  onClick={() => setExpandedBoard((v) => !v)}
                >
                  {expandedBoard
                    ? "Show top 10"
                    : `Show all ${boardRows.length} suburbs`}
                </button>
              )}
            </>
          )}
        </DashboardCard>
      </div>

      {filtered && (
        <p
          className="mt-3 text-[10px] uppercase tracking-[0.1em]"
          style={{ color: INK_40 }}
          data-liquidity-filter-tag=""
        >
          Filter active: {typeFilterLabel(filter)} · composition / DOM / reprice / turnover /
          cohorts from dash_area_movement_x · leaderboard stays area-wide
        </p>
      )}

      <p className="sr-only">{areaName} liquidity</p>
    </div>
  );
}
