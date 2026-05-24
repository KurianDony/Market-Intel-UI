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
import { CHART_AXIS, CHART_GRID, CHART_LEGEND, CHART_TOOLTIP } from "./chart-theme";
import { INK_60, INK_100 } from "@/lib/palette/v2";

export function SupplyDemandChart({ rows }: { rows: DashSuburbSummaryTrendRow[] }) {
  const data = rows.map((r) => ({
    week: formatChartWeek(r.snapshot_date),
    listings: r.total_listings,
    rooms: r.active_rooms,
    ratio: r.demand_ratio,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...CHART_GRID} vertical={false} />
        <XAxis dataKey="week" {...CHART_AXIS} />
        <YAxis {...CHART_AXIS} width={36} />
        <Tooltip {...CHART_TOOLTIP} />
        <Legend {...CHART_LEGEND} />
        <Line
          type="monotone"
          dataKey="listings"
          name="Total listings"
          stroke={INK_100}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="rooms"
          name="Active rooms"
          stroke={INK_60}
          dot={{ r: 2 }}
          strokeDasharray="4 3"
        />
        <Line
          type="monotone"
          dataKey="ratio"
          name="Demand ratio"
          stroke="#888888"
          dot={{ r: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
