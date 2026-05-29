"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DashAreaListingMix } from "@/lib/types/dash";
import { listingMixSlice } from "@/lib/dash/listing-mix";
import { CHART_LEGEND, CHART_TOOLTIP } from "./chart-theme";
import { INK_0 } from "@/lib/palette/v2";

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
          stroke={INK_0}
          strokeWidth={1.5}
        >
          {slices.map((s) => (
            <Cell key={s.field} fill={s.color} />
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
