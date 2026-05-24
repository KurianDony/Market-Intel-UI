"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "./chart-theme";
import { INK_100 } from "@/lib/palette/v2";

export type HistogramBar = {
  band_ord: number;
  band_label: string;
  listing_count: number;
};

/** Equal category width per band_ord — not proportional to width_hint. */
export function HistogramChart({ bars }: { bars: HistogramBar[] }) {
  const data = bars.map((b) => ({
    ord: b.band_ord,
    label: b.band_label,
    count: b.listing_count,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid {...CHART_GRID} vertical={false} />
        <XAxis
          dataKey="ord"
          {...CHART_AXIS}
          tickFormatter={(_, i) => data[i]?.label ?? ""}
          angle={-60}
          textAnchor="end"
          height={70}
          interval={0}
        />
        <YAxis {...CHART_AXIS} width={36} />
        <Tooltip
          {...CHART_TOOLTIP}
          labelFormatter={(_, payload) =>
            payload?.[0]?.payload?.label ?? ""
          }
        />
        <Bar dataKey="count" fill={INK_100} />
      </BarChart>
    </ResponsiveContainer>
  );
}
