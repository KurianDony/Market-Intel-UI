"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashAreaListingMixBySuburb } from "@/lib/types/dash";
import {
  LISTING_MIX_COLORS,
  LISTING_MIX_FIELDS,
  LISTING_MIX_LABELS,
} from "@/lib/dash/listing-mix";
import { CHART_AXIS, CHART_GRID, CHART_LEGEND, CHART_TOOLTIP } from "./chart-theme";

export function ListingMixStackedBar({
  rows,
}: {
  rows: DashAreaListingMixBySuburb[];
}) {
  const data = rows.map((r) => {
    const entry: Record<string, string | number> = { suburb: r.suburb };
    for (const f of LISTING_MIX_FIELDS) {
      entry[f] = r[f] ?? 0;
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid {...CHART_GRID} horizontal={false} />
        <XAxis type="number" {...CHART_AXIS} />
        <YAxis type="category" dataKey="suburb" {...CHART_AXIS} width={88} />
        <Tooltip {...CHART_TOOLTIP} />
        <Legend {...CHART_LEGEND} />
        {LISTING_MIX_FIELDS.map((field, i) => (
          <Bar
            key={field}
            dataKey={field}
            name={LISTING_MIX_LABELS[field]}
            stackId="mix"
            fill={LISTING_MIX_COLORS[i]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
