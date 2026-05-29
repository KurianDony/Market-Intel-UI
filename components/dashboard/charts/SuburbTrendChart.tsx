"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashSuburbSummaryTrendRow } from "@/lib/types/dash";
import { formatChartWeek } from "@/lib/dash/format";
import {
  CHART_AXIS,
  CHART_GRID,
  CHART_LEGEND,
  CHART_LINE_PRIMARY,
  CHART_LINE_SECONDARY,
  CHART_TOOLTIP,
  chartLinePrimaryStyle,
  chartLineSecondaryStyle,
} from "./chart-theme";

export function SuburbTrendChart({ rows }: { rows: DashSuburbSummaryTrendRow[] }) {
  const data = rows.map((r) => ({
    week: formatChartWeek(r.snapshot_date),
    avg: r.avg_listing,
    min: r.min_price,
    max: r.max_price,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...CHART_GRID} vertical={false} />
        <XAxis dataKey="week" {...CHART_AXIS} />
        <YAxis {...CHART_AXIS} tickFormatter={(v) => `$${v}`} width={48} />
        <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => [`$${v}`, ""]} />
        <Legend {...CHART_LEGEND} />
        <Line
          type="monotone"
          dataKey="avg"
          name="Avg"
          stroke={CHART_LINE_PRIMARY}
          style={chartLinePrimaryStyle}
          dot={{ r: 3, fill: CHART_LINE_PRIMARY, stroke: CHART_LINE_PRIMARY }}
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="min"
          name="Min"
          stroke={CHART_LINE_SECONDARY}
          style={chartLineSecondaryStyle}
          dot={false}
          strokeDasharray="3 3"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="max"
          name="Max"
          stroke={CHART_LINE_SECONDARY}
          style={chartLineSecondaryStyle}
          dot={false}
          strokeDasharray="3 3"
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
