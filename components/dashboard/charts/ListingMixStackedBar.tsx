"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { ChartViewport, CHART_HEIGHT_COMPACT, CHART_HEIGHT_DEFAULT } from "./ChartViewport";

export function ListingMixStackedBar({
  rows,
  height = CHART_HEIGHT_DEFAULT,
}: {
  rows: DashAreaListingMixBySuburb[];
  height?: number;
}) {
  const data = rows.map((r) => {
    const entry: Record<string, string | number> = { suburb: r.suburb };
    for (const f of LISTING_MIX_FIELDS) {
      entry[f] = r[f] ?? 0;
    }
    return entry;
  });

  return (
    <ChartViewport height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid {...CHART_GRID} horizontal={false} />
        <XAxis type="number" {...CHART_AXIS} />
        <YAxis
          type="category"
          dataKey="suburb"
          {...CHART_AXIS}
          width={72}
          tick={{ fill: CHART_AXIS.tick.fill, fontSize: 10 }}
        />
        <Tooltip {...CHART_TOOLTIP} />
        <Legend
          {...CHART_LEGEND}
          wrapperStyle={{ ...CHART_LEGEND.wrapperStyle, fontSize: 10 }}
          iconSize={8}
        />
        {LISTING_MIX_FIELDS.map((field, i) => (
          <Bar
            key={field}
            dataKey={field}
            name={LISTING_MIX_LABELS[field]}
            stackId="mix"
            fill={LISTING_MIX_COLORS[i]}
            style={{ fill: LISTING_MIX_COLORS[i] }}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartViewport>
  );
}
