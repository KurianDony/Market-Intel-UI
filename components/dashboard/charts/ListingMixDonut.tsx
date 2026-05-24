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
          cx="40%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          stroke={INK_0}
          strokeWidth={2}
        >
          {slices.map((s) => (
            <Cell key={s.field} fill={s.color} />
          ))}
        </Pie>
        <Tooltip {...CHART_TOOLTIP} />
        <Legend {...CHART_LEGEND} layout="vertical" align="right" verticalAlign="middle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
