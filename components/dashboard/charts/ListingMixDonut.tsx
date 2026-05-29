"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DashAreaListingMix } from "@/lib/types/dash";
import { listingMixSlice } from "@/lib/dash/listing-mix";
import { CHART_LEGEND, CHART_PIE_STROKE, CHART_TOOLTIP } from "./chart-theme";

export function ListingMixDonut({ mix }: { mix: DashAreaListingMix }) {
  const slices = listingMixSlice(mix).filter((s) => s.value > 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          cx="38%"
          cy="50%"
          innerRadius={28}
          outerRadius={44}
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
    </ResponsiveContainer>
  );
}
