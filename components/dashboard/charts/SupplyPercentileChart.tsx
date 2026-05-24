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
import type { DashAreaSupplyPercentileWeekly } from "@/lib/types/dash";
import { formatChartWeek } from "@/lib/dash/format";
import { CHART_AXIS, CHART_GRID, CHART_LEGEND, CHART_TOOLTIP } from "./chart-theme";
import { INK_60, INK_80, INK_100 } from "@/lib/palette/v2";

export function SupplyPercentileChart({
  rows,
}: {
  rows: DashAreaSupplyPercentileWeekly[];
}) {
  const data = rows.map((r) => ({
    week: formatChartWeek(r.snapshot_date),
    p10: r.p10,
    p30: r.p30,
    p50: r.p50,
    p70: r.p70,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...CHART_GRID} vertical={false} />
        <XAxis dataKey="week" {...CHART_AXIS} />
        <YAxis {...CHART_AXIS} tickFormatter={(v) => `$${v}`} width={48} />
        <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => [`$${v}`, ""]} />
        <Legend {...CHART_LEGEND} />
        <Line type="monotone" dataKey="p10" name="p10" stroke={INK_60} dot={{ r: 2 }} strokeWidth={1} />
        <Line type="monotone" dataKey="p30" name="p30" stroke="#999999" dot={{ r: 2 }} strokeWidth={1} />
        <Line type="monotone" dataKey="p50" name="p50" stroke={INK_100} dot={{ r: 3 }} strokeWidth={2} />
        <Line type="monotone" dataKey="p70" name="p70" stroke={INK_80} dot={{ r: 2 }} strokeWidth={1} />
      </LineChart>
    </ResponsiveContainer>
  );
}
