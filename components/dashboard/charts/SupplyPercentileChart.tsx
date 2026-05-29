"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashAreaSupplyPercentileWeekly } from "@/lib/types/dash";
import { formatChartWeek } from "@/lib/dash/format";
import {
  CHART_AREA_BAND_FILL,
  CHART_AXIS,
  CHART_GRID,
  CHART_LEGEND,
  CHART_LINE_PRIMARY,
  CHART_TOOLTIP,
  chartAreaBandStyle,
  chartLinePrimaryStyle,
} from "./chart-theme";
import { ChartViewport, CHART_HEIGHT_DEFAULT } from "./ChartViewport";

export function SupplyPercentileChart({
  rows,
  height = CHART_HEIGHT_DEFAULT,
}: {
  rows: DashAreaSupplyPercentileWeekly[];
  height?: number;
}) {
  const data = rows.map((r) => ({
    week: formatChartWeek(r.snapshot_date),
    p10: r.p10,
    p50: r.p50,
    p70: r.p70,
    bandBase: r.p10,
    bandSpread: r.p70 != null && r.p10 != null ? r.p70 - r.p10 : null,
  }));

  return (
    <ChartViewport height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...CHART_GRID} vertical={false} />
        <XAxis dataKey="week" {...CHART_AXIS} />
        <YAxis {...CHART_AXIS} tickFormatter={(v) => `$${v}`} width={48} />
        <Tooltip
          {...CHART_TOOLTIP}
          formatter={(v: number, name: string) => {
            if (name === "bandSpread" || name === "bandBase") return null;
            return [`$${v}`, name === "p50" ? "Median (p50)" : name];
          }}
          labelFormatter={(label) => label}
        />
        <Legend
          {...CHART_LEGEND}
          formatter={(value) => {
            if (value === "bandSpread") return "p10–p70 range";
            if (value === "p50") return "Median (p50)";
            return value;
          }}
        />
        <Area
          type="monotone"
          dataKey="bandBase"
          stackId="band"
          stroke="none"
          fill="transparent"
          legendType="none"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="bandSpread"
          name="bandSpread"
          stackId="band"
          stroke="none"
          fill={CHART_AREA_BAND_FILL}
          style={chartAreaBandStyle}
          fillOpacity={0.55}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="p50"
          name="p50"
          stroke={CHART_LINE_PRIMARY}
          style={chartLinePrimaryStyle}
          dot={{ r: 3, fill: CHART_LINE_PRIMARY, stroke: CHART_LINE_PRIMARY }}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartViewport>
  );
}
