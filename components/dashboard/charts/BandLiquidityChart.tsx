"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { INK_40, INK_100 } from "@/lib/palette/v2";
import type { DashSuburbBandLiquidity } from "@/lib/types/dash-phase3";
import { CHART_AXIS, CHART_GRID, CHART_LEGEND, CHART_TOOLTIP } from "./chart-theme";
import { ChartViewport, CHART_HEIGHT_TALL } from "./ChartViewport";
import { EmptyChart } from "./WeeklyLineChart";

/** Contract D20 — which price bands clear vs which just sit. */
export function BandLiquidityChart({
  bands,
  height = CHART_HEIGHT_TALL,
}: {
  bands: DashSuburbBandLiquidity[];
  height?: number;
}) {
  if (bands.length === 0) {
    return <EmptyChart height={height} message="No band-liquidity rows for this week." />;
  }

  const data = bands.map((b) => ({
    label: b.band_label,
    standing: b.standing,
    moved: b.moved,
    pct: b.pct_moved == null ? null : Number(b.pct_moved),
  }));

  return (
    <ChartViewport height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 40, left: 0, bottom: 48 }}>
        <CartesianGrid {...CHART_GRID} vertical={false} />
        <XAxis
          dataKey="label"
          {...CHART_AXIS}
          angle={-60}
          textAnchor="end"
          height={70}
          interval={0}
        />
        <YAxis {...CHART_AXIS} width={36} />
        <YAxis
          yAxisId="pct"
          orientation="right"
          {...CHART_AXIS}
          width={40}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip {...CHART_TOOLTIP} />
        <Legend {...CHART_LEGEND} />
        <Bar
          dataKey="standing"
          name="Standing"
          fill={INK_40}
          style={{ fill: INK_40 }}
          isAnimationActive={false}
        />
        <Bar
          dataKey="moved"
          name="Moved"
          fill={INK_100}
          style={{ fill: INK_100 }}
          isAnimationActive={false}
        />
        <Line
          yAxisId="pct"
          type="linear"
          dataKey="pct"
          name="% moved"
          stroke={INK_100}
          style={{ stroke: INK_100 }}
          strokeDasharray="3 3"
          dot={{ r: 2, fill: INK_100, stroke: INK_100 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartViewport>
  );
}
