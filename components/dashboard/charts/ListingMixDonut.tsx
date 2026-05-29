"use client";

import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import type { DashAreaListingMix } from "@/lib/types/dash";
import { listingMixSlice } from "@/lib/dash/listing-mix";
import { CHART_LEGEND, CHART_PIE_STROKE, CHART_TOOLTIP } from "./chart-theme";
import { ChartViewport, CHART_HEIGHT_COMPACT, CHART_HEIGHT_DEFAULT } from "./ChartViewport";

export function ListingMixDonut({
  mix,
  height = CHART_HEIGHT_DEFAULT,
}: {
  mix: DashAreaListingMix;
  height?: number;
}) {
  const slices = listingMixSlice(mix).filter((s) => s.value > 0);

  return (
    <ChartViewport height={height}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          cx="38%"
          cy="50%"
          innerRadius={height <= CHART_HEIGHT_COMPACT ? 28 : 55}
          outerRadius={height <= CHART_HEIGHT_COMPACT ? 44 : 85}
          stroke={CHART_PIE_STROKE}
          strokeWidth={1.5}
          isAnimationActive={false}
        >
          {slices.map((s) => (
            <Cell key={s.field} fill={s.color} style={{ fill: s.color }} />
          ))}
        </Pie>
        <Tooltip {...CHART_TOOLTIP} />
        <Legend
          {...CHART_LEGEND}
          wrapperStyle={{ ...CHART_LEGEND.wrapperStyle, fontSize: 10 }}
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconSize={8}
        />
      </PieChart>
    </ChartViewport>
  );
}
